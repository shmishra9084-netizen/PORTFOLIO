import {OrbitCarousel} from './orbit-carousel.js';
const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;};
export class ProjectDecks {
  constructor(root,{motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches,onOpen=()=>{},prefix='workOrbit',singleProject=false}={}){
    this.root=root;this.singleProject=singleProject;this.motion=motion;this.onOpen=onOpen;this.prefix=prefix;this.projects=[];this.category=null;this.project=null;this.wantsPlay=false;this.visible=false;this.focused=false;this.lastInteraction=0;this.grid=false;this.filterRevision=0;
    root.classList.add('project-decks');if(singleProject)root.classList.add('is-single-gallery');
    root.innerHTML=`<div class="deck-filters"><p class="deck-filter-label">Browse categories</p><div class="deck-tabs" data-categories role="tablist" aria-label="Project categories"></div><p class="deck-filter-label">Choose a project deck</p><div class="deck-tabs deck-project-tabs" data-projects role="tablist" aria-label="Project decks"></div></div><div data-panel role="tabpanel" tabindex="0"><div data-stage aria-label="Project render cover flow"></div><div class="orbit-caption"><div class="deck-render-label" data-label></div><span class="tag" data-category></span><h3 data-title></h3><p data-description></p></div><dl class="deck-meta" data-meta></dl><div class="orbit-navigation"><button type="button" data-prev aria-label="Previous project render">←</button><span class="orbit-count" data-count></span><button type="button" data-next aria-label="Next project render">→</button><button type="button" data-play>Auto-rotate</button><button type="button" data-open>Open project ↗</button></div><p class="orbit-hint">Scroll, drag or swipe · Arrow keys to browse</p></div>`;
    if(singleProject)root.querySelector('.deck-filters').hidden=true;
    this.elements=Object.fromEntries(['categories','projects','panel','stage','label','category','title','description','meta','prev','count','next','play','open'].map(key=>[key,root.querySelector(`[data-${key}]`)]));
    for(const key of ['stage','category','title','description','prev','count','next','play','open'])this.elements[key].id=prefix+key[0].toUpperCase()+key.slice(1);
    this.elements.panel.id=prefix+'Panel';
    this.carousel=new OrbitCarousel(this.elements.stage,{motion,onChange:i=>this.updateDetails(i),onActivate:(i,card)=>{const item=this.carousel.items[i];if(item)this.onOpen(item.project,card,item.imageIndex)},onInteract:()=>this.interacted()});
    this.elements.prev.addEventListener('click',()=>{this.interacted();this.carousel.step(-1)});this.elements.next.addEventListener('click',()=>{this.interacted();this.carousel.step(1)});
    this.elements.play.addEventListener('click',()=>{this.wantsPlay=!this.wantsPlay;this.sync()});
    this.elements.open.addEventListener('click',()=>{const item=this.carousel.items[this.carousel.index];if(item)this.onOpen(item.project,this.elements.open,item.imageIndex)});
    this.elements.stage.addEventListener('focusin',()=>{this.focused=this.elements.stage.matches(':focus-visible')||Boolean(this.elements.stage.querySelector(':focus-visible'));this.sync()});this.elements.stage.addEventListener('focusout',event=>{this.focused=this.elements.stage.contains(event.relatedTarget)&&Boolean(event.relatedTarget?.matches(':focus-visible'));this.sync()});
    this.keydown=event=>{if((event.key==='ArrowRight'||event.key==='ArrowLeft')&&this.elements.panel.contains(event.target)){event.preventDefault();this.interacted();this.carousel.step(event.key==='ArrowRight'?1:-1)}};this.root.addEventListener('keydown',this.keydown);
    this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.sync()},{threshold:.1});this.observer.observe(root);
    this.visibilityChange=()=>this.sync();document.addEventListener('visibilitychange',this.visibilityChange);
  }
  tabs(container,entries,selected,choose){
    container.replaceChildren();
    entries.forEach((entry,index)=>{
      const button=make('button','',entry.label);button.type='button';button.setAttribute('role','tab');button.dataset.value=JSON.stringify(entry.value);button.id=`${this.prefix}-${container===this.elements.categories?'category':'project'}-${index}`;button.setAttribute('aria-controls',this.elements.panel.id);
      button.setAttribute('aria-selected',String(entry.value===selected));button.tabIndex=entry.value===selected?0:-1;
      button.addEventListener('click',()=>choose(entry.value));
      button.addEventListener('keydown',event=>{
        const buttons=[...container.children],position=buttons.indexOf(button);let next;
        if(event.key==='ArrowRight')next=(position+1)%buttons.length;else if(event.key==='ArrowLeft')next=(position-1+buttons.length)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
        event.preventDefault();event.stopPropagation();buttons[next].focus();buttons[next].click();
      });container.append(button);
    });
  }
  markTabs(container,value){for(const button of container.children){const active=button.dataset.value===JSON.stringify(value);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active)this.elements.panel.setAttribute('aria-labelledby',button.id)}}
  filteredProjects(){return this.projects.filter(p=>this.category===null||p.category===this.category)}
  projectTabs(){this.tabs(this.elements.projects,this.filteredProjects().map(p=>({value:p.id,label:p.title})),this.project,value=>{this.project=value;this.markTabs(this.elements.projects,value);this.switchDeck()});this.markTabs(this.elements.projects,this.project)}
  setProjects(projects){
    if(this.singleProject&&projects.length!==1)throw Error('A project gallery must contain exactly one project.');
    this.projects=projects;this.category=null;this.project=projects[0]?.id||null;
    this.tabs(this.elements.categories,[{value:null,label:'All'},...[...new Set(projects.map(p=>p.category))].map(category=>({value:category,label:category||'Uncategorized'}))],null,value=>{this.category=value;this.project=this.filteredProjects()[0]?.id||null;this.markTabs(this.elements.categories,value);this.projectTabs();this.switchDeck()});
    this.projectTabs();this.wantsPlay=this.motion();return this.switchDeck(false);
  }
  async switchDeck(animated=true){
    const version=++this.filterRevision;clearTimeout(this.timer);this.wantsPlay=animated?false:this.wantsPlay;
    const projects=this.filteredProjects().filter(p=>p.id===this.project);
    const items=projects.flatMap(project=>project.images.map((image,imageIndex)=>({...image,title:image.label?`${project.title} — ${image.label}`:`${project.title} · ${imageIndex+1}`,project,imageIndex})));
    this.elements.open.disabled=true;
    if(!items.length){this.elements.title.textContent='No renders yet';this.elements.description.textContent='Add images to a project to start this deck.';this.elements.label.textContent=this.elements.category.textContent='';this.elements.meta.replaceChildren();this.elements.count.textContent='0 / 0'}
    if(animated)await this.carousel.replaceItems(items);else this.carousel.setItems(items);
    if(version!==this.filterRevision)return;
    this.elements.prev.disabled=this.elements.next.disabled=this.elements.play.disabled=items.length<2;this.elements.open.disabled=!items.length;
    this.elements.panel.dataset.deckProject=this.project||'';this.sync();
    this.root.dispatchEvent(new CustomEvent('deckfilterchange',{detail:{projects},bubbles:true}));
  }
  updateDetails(index){
    const item=this.carousel?.items[index];if(!item)return;
    const project=item.project;
    this.elements.label.textContent=item.label||`Render ${item.imageIndex+1} of ${project.images.length}`;
    this.elements.title.textContent=project.title;this.elements.category.textContent=project.category;this.elements.description.textContent=project.description;
    this.elements.count.textContent=`${index+1} / ${this.carousel.items.length}`;
    this.elements.meta.replaceChildren();
    for(const [label,value] of [['Software',project.software],['Asset breakdown',project.breakdown],['Lighting / render',project.renderInfo]]){const group=make('div');group.append(make('dt','',label),make('dd','',value||'Not specified'));this.elements.meta.append(group)}
    this.elements.title.getAnimations().forEach(animation=>animation.cancel());
    if(this.motion())this.elements.title.animate([{opacity:.25,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'cubic-bezier(.25,1,.5,1)'});
  }
  interacted(){this.lastInteraction=performance.now();this.sync()}
  pause(){this.wantsPlay=false;this.sync()}
  sync(){
    clearTimeout(this.timer);this.timer=null;this.elements.play.textContent=this.wantsPlay?'Pause rotation':'Auto-rotate';
    const overlay=document.querySelector('dialog[open],.modal.open');
    if(this.disposed||!this.wantsPlay||!this.visible||this.focused||this.grid||document.hidden||(overlay&&!overlay.contains(this.root))||this.carousel.pointer||this.carousel.transitioning||this.carousel.items.length<2)return;
    const delay=Math.max(2400,3000-(performance.now()-this.lastInteraction));
    this.timer=setTimeout(()=>{this.carousel.step(1);this.sync()},delay);
  }
  destroy(){this.disposed=true;this.filterRevision++;clearTimeout(this.timer);this.observer.disconnect();this.carousel.destroy();this.root.removeEventListener('keydown',this.keydown);document.removeEventListener('visibilitychange',this.visibilityChange);this.root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());this.root.replaceChildren()}
  motionChanged(){if(!this.motion()){this.root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());this.pause();this.carousel.cancelAnimations();this.carousel.deckAnimation?.cancel()}this.sync()}
}
