import {CMSClient,configured} from './cms-client.js';
import {validateDocument} from './project-store.js';
const ui=window.portfolioUI,$=id=>document.getElementById(id),modal=$('modal'),video=$('modalVideo');
let activeCard=null,activeProject=null,index=0,galleryTimer=null,closing=false,playing=false,inGallery=false;
const slideshows=new Map();
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
function stopGallery(){clearInterval(galleryTimer);galleryTimer=null;playing=false;$('galleryPlay').textContent='Play slideshow';}
function showImage(next){
 const count=activeProject.images.length;index=(next+count)%count;const image=activeProject.images[index],target=$('galleryImage');
 target.getAnimations().forEach(animation=>animation.cancel());target.src=image.src;target.alt=image.alt||activeProject.title;
 ui.animate(target,[{opacity:.1,transform:'scale(1.025)'},{opacity:1,transform:'scale(1)'}],{duration:650,easing:'ease-out'});
 $('galleryCount').textContent=`${index+1} / ${count}`;
 [...$('galleryThumbs').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
}
function startGallery(){
 stopGallery();if(activeProject.images.length<2||document.hidden)return;
 playing=true;$('galleryPlay').textContent='Pause slideshow';galleryTimer=setInterval(()=>showImage(index+1),4200);
}
function showGallery(){
 video.pause();video.hidden=true;$('galleryView').hidden=false;inGallery=true;
 $('mediaSwitch').hidden=!activeProject.video;$('mediaSwitch').textContent='Watch film';
 $('galleryThumbs').replaceChildren();
 activeProject.images.forEach((image,i)=>{const button=element('button');button.type='button';button.setAttribute('aria-label',`View image ${i+1}: ${image.alt||activeProject.title}`);const thumbnail=element('img');thumbnail.src=image.src;thumbnail.alt='';button.append(thumbnail);button.addEventListener('click',()=>{stopGallery();showImage(i)});$('galleryThumbs').append(button)});
 const single=activeProject.images.length<2;$('galleryPrev').disabled=$('galleryNext').disabled=$('galleryPlay').disabled=single;
 showImage(0);if(ui.motionEnabled())startGallery();
}
function showVideo(){
 stopGallery();inGallery=false;$('galleryView').hidden=true;video.hidden=false;video.src=activeProject.video;video.play().catch(()=>{});
 $('mediaSwitch').hidden=!activeProject.images.length;$('mediaSwitch').textContent='View images';
}
function syncCards(){
 slideshows.forEach((state,card)=>{
  clearInterval(state.timer);state.timer=null;
  if(!state.visible||!ui.motionEnabled()||document.hidden||modal.classList.contains('open')||state.project.images.length<2)return;
  state.timer=setInterval(()=>{
   const next=(state.index+1)%state.project.images.length,image=state.project.images[next];
   const img=element('img','slide-image');img.alt=image.alt||state.project.title;img.src=image.src;
   img.onload=()=>{if(!card.isConnected)return;const old=card.querySelectorAll('.media img');old.forEach(i=>i.getAnimations().forEach(a=>a.cancel()));card.querySelector('.media').append(img);const animation=ui.animate(img,[{opacity:0,transform:'scale(1.04)'},{opacity:1,transform:'scale(1)'}],{duration:1000,easing:'ease-out'});const cleanup=()=>old.forEach(node=>node.remove());if(animation)animation.finished.then(cleanup,cleanup);else cleanup();state.index=next;};
  },4600);
 });
}
const cardObserver=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{const state=slideshows.get(target);if(state)state.visible=isIntersecting});syncCards()},{threshold:.15});
function openProject(card,project){
 if(closing||modal.classList.contains('open'))return;activeCard=card;activeProject=project;$('modalTitle').textContent=project.title;
 modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
 if(project.images.length>1||!project.video)showGallery();else showVideo();
 ui.animate(modal,[{opacity:0},{opacity:1}],{duration:220,easing:'ease-out'});
 ui.animate(modal.querySelector('.modal-shell'),[{opacity:0,transform:'translateY(20px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:300,easing:'ease-out'});
 ui.syncMotion();syncCards();$('closeModal').focus();
}
async function closeProject(){
 if(closing||!modal.classList.contains('open'))return;closing=true;stopGallery();video.pause();
 modal.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
 const exit=ui.animate(modal,[{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});if(exit)await exit.finished.catch(()=>{});
 modal.classList.remove('open');modal.setAttribute('aria-hidden','true');modal.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
 video.removeAttribute('src');video.load();$('galleryImage').removeAttribute('src');$('galleryThumbs').replaceChildren();document.body.style.overflow='';closing=false;
 ui.syncMotion();syncCards();activeCard?.focus();
}
function bindCard(card,project){
 card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-label',`Open ${project.title}${project.images.length>1?`, ${project.images.length} images`:''}`);
 const label=element('span','project-watch',project.images.length>1||!project.video?'View gallery ↗':'▶ Watch film');label.setAttribute('aria-hidden','true');card.append(label);
 if(project.images.length>1){const badge=element('span','gallery-badge',project.images.length+' images');card.append(badge);slideshows.set(card,{project,index:0,visible:false,timer:null});cardObserver.observe(card)}
 card.addEventListener('click',()=>openProject(card,project));card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openProject(card,project)}});
 ui.revealObserver.observe(card);
}
function renderProjects(data){
 const grid=document.querySelector('#work .grid');cardObserver.disconnect();slideshows.forEach(state=>clearInterval(state.timer));slideshows.clear();
 grid.querySelectorAll('video').forEach(v=>{v.pause();ui.videoObserver.unobserve(v);ui.visibleVideos.delete(v);const i=ui.ambientVideos.indexOf(v);if(i>=0)ui.ambientVideos.splice(i,1)});
 const fragment=document.createDocumentFragment();
 data.projects.forEach(project=>{
  const card=element('article','project '+project.layout),media=element('div','media');
  if(project.video&&project.images.length===1){const v=element('video');v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.poster=project.images[0].src;const source=element('source');source.dataset.src=project.video;v.append(source);media.append(v);ui.ambientVideos.push(v);ui.videoObserver.observe(v)}
  else{const image=element('img');image.src=project.images[0].src;image.alt=project.images[0].alt||project.title;image.loading='lazy';image.decoding='async';media.append(image)}
  const copy=element('div','project-copy');copy.append(element('span','tag',project.category),element('h3','',project.title),element('p','',project.description));card.append(media,copy);bindCard(card,project);fragment.append(card);
 });grid.replaceChildren(fragment);
 if(!data.projects.length)grid.append(element('p','','New work is on its way. Check back soon.'));
}
$('galleryPrev').addEventListener('click',()=>{stopGallery();showImage(index-1)});$('galleryNext').addEventListener('click',()=>{stopGallery();showImage(index+1)});
$('galleryPlay').addEventListener('click',()=>playing?stopGallery():startGallery());
$('mediaSwitch').addEventListener('click',()=>{inGallery?showVideo():showGallery();$('mediaSwitch').focus()});
$('closeModal').addEventListener('click',closeProject);modal.addEventListener('click',event=>{if(event.target===modal)closeProject()});
let touchX=null;$('galleryFrame').addEventListener('touchstart',event=>touchX=event.touches[0].clientX,{passive:true});$('galleryFrame').addEventListener('touchend',event=>{if(touchX===null)return;const dx=event.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>45){stopGallery();showImage(index+(dx<0?1:-1))}},{passive:true});
document.addEventListener('keydown',event=>{
 if(!modal.classList.contains('open'))return;
 if(event.key==='Escape')closeProject();
 if(inGallery&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();stopGallery();showImage(index+(event.key==='ArrowRight'?1:-1))}
 if(event.key==='Tab'){
  const nodes=[...modal.querySelectorAll('button:not([disabled]),video[controls]')].filter(n=>!n.hidden&&n.getClientRects().length),first=nodes[0],last=nodes.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 }
});
window.addEventListener('portfolio-motion-change',()=>{syncCards();if(!ui.motionEnabled())stopGallery()});
document.addEventListener('visibilitychange',()=>{syncCards();if(document.hidden)stopGallery()});
// Keep the original cards functional if remote data cannot load.
document.querySelectorAll('#work .project').forEach((card,i)=>{const cover=card.querySelector('img')?.getAttribute('src')||card.querySelector('video')?.poster;bindCard(card,{id:'fallback-'+i,title:card.querySelector('h3').textContent,video:card.dataset.video,images:[{src:cover,alt:card.querySelector('h3').textContent}]})});
(async()=>{
 try{
  let data=null;if(configured){try{data=await new CMSClient().read()}catch(error){console.warn('CMS unavailable; showing repository projects.')}}
  if(!data){const response=await fetch('data/projects.json',{cache:'no-store'});if(!response.ok)throw Error('Cannot load project data');data=validateDocument(await response.json())}
  renderProjects(data);
 }catch(error){console.warn('Using the original project gallery.',error.message)}
})();
