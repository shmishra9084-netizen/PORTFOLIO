import {ProjectDecks} from './project-decks.js';
export function createProjectOverlay({motion,onStateChange=()=>{}}){
  const dialog=document.getElementById('modal'),shell=dialog.querySelector('.dialog-shell'),root=document.getElementById('overlayDeck'),video=document.getElementById('modalVideo'),film=document.getElementById('overlayFilm'),filmButton=document.getElementById('overlayFilmToggle'),closeButton=document.getElementById('closeModal');
  let deck=null,trigger=null,project=null,closing=false,openingAnimation=null,previousOverflow='',originalScroll=0;
  const transition=(frames,options)=>motion()?shell.animate(frames,options):null;
  function sourceTransform(){
    const from=trigger?.querySelector('.project-orbit-preview')?.getBoundingClientRect()||trigger?.getBoundingClientRect(),to=shell.getBoundingClientRect();
    if(!from||!from.width)return 'translateY(20px) scale(.96)';
    const scale=Math.max(.35,Math.min(.8,from.width/to.width));return `translate(${from.x+from.width/2-to.x-to.width/2}px,${from.y+from.height/2-to.y-to.height/2}px) scale(${scale})`;
  }
  function sync(){deck?.sync();onStateChange(dialog.open)}
  async function open(selected,button){
    if(dialog.open||closing)return;
    project=selected;trigger=button;previousOverflow=document.body.style.overflow;window.scrollTo({top:window.scrollY,left:window.scrollX,behavior:'instant'});originalScroll=window.scrollY;
    document.getElementById('modalTitle').textContent=project.title;document.getElementById('overlayCategory').textContent=project.category;
    film.hidden=true;root.hidden=false;filmButton.hidden=!project.video;filmButton.textContent='Watch film';filmButton.setAttribute('aria-pressed','false');dialog.classList.remove('is-focused');
    dialog.showModal();dialog.classList.add('open');document.body.style.overflow='hidden';
    deck=new ProjectDecks(root,{prefix:'overlay',singleProject:true,motion,onOpen:()=>{
      const focused=dialog.classList.toggle('is-focused');deck.elements.open.textContent=focused?'Restore view':'Enlarge image';
    }});
    await deck.setProjects([project]);deck.elements.open.textContent='Enlarge image';
    const transform=sourceTransform();openingAnimation=transition([{transform,opacity:.12},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
    closeButton.focus({preventScroll:true});sync();
  }
  async function close(){
    if(!dialog.open||closing)return;closing=true;deck?.pause();video.pause();
    const from={transform:getComputedStyle(shell).transform,opacity:getComputedStyle(shell).opacity};openingAnimation?.cancel();
    const animation=transition([from,{transform:sourceTransform(),opacity:0}],{duration:260,easing:'cubic-bezier(.4,0,.2,1)'});
    if(animation)await animation.finished.catch(()=>{});
    dialog.close();dialog.classList.remove('open','is-focused');animation?.cancel();deck?.destroy();deck=null;video.removeAttribute('src');video.load();film.hidden=true;
    document.body.style.overflow=previousOverflow;window.scrollTo({top:originalScroll,behavior:'instant'});closing=false;trigger?.focus({preventScroll:true});sync();
  }
  filmButton.addEventListener('click',()=>{
    const show=film.hidden;film.hidden=!show;root.hidden=show;filmButton.textContent=show?'View images':'Watch film';filmButton.setAttribute('aria-pressed',String(show));
    if(show){deck.pause();deck.grid=true;video.src=project.video;video.poster=project.images[0].src;video.play().catch(()=>{})}else{video.pause();deck.grid=false;deck.sync()}
  });
  dialog.addEventListener('keydown',event=>{if(!event.defaultPrevented&&!root.hidden&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();deck.interacted();deck.carousel.step(event.key==='ArrowRight'?1:-1)}});
  closeButton.addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close()});dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  window.addEventListener('portfolio-motion-change',()=>{deck?.motionChanged();if(!motion()){openingAnimation?.cancel();shell.getAnimations().forEach(animation=>animation.cancel())}});
  return {open,close,get isOpen(){return dialog.open}};
}
