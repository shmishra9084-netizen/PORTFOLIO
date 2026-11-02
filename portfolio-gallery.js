import {OrbitCarousel} from './orbit-carousel.js';
import {loadProjects} from './project-data.js';
const ui=window.portfolioUI,grid=document.querySelector('#work .grid'),filters=document.getElementById('workCategoryFilters');
const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;};
const previews=new Map();
function syncPreviews(){
 for(const [card,state] of previews){
  clearInterval(state.timer);state.timer=null;
  if(!state.visible||state.hovered||state.focused||document.hidden||!ui.motionEnabled())continue;
  state.timer=setInterval(()=>state.carousel.step(1),4200+state.order*90);
 }
}
const previewObserver=new IntersectionObserver(entries=>{for(const {target,isIntersecting} of entries){const state=previews.get(target);if(state)state.visible=isIntersecting}syncPreviews()},{threshold:.15});
window.addEventListener('portfolio-motion-change',()=>{if(!ui.motionEnabled())for(const state of previews.values()){state.carousel.cancelAnimations();state.carousel.show(0)}syncPreviews()});
document.addEventListener('visibilitychange',syncPreviews);
function galleryURL(id){return 'gallery.html?project='+encodeURIComponent(id)}
function renderProjects(data){
 previewObserver.disconnect();for(const state of previews.values()){clearInterval(state.timer);state.carousel.destroy()}previews.clear();
 grid.querySelectorAll('video').forEach(video=>{video.pause();ui.videoObserver.unobserve(video);ui.visibleVideos.delete(video);const index=ui.ambientVideos.indexOf(video);if(index>=0)ui.ambientVideos.splice(index,1)});
 const fragment=document.createDocumentFragment();
 data.projects.forEach((project,order)=>{
  const card=make('a','project '+project.layout);card.href=galleryURL(project.id);card.dataset.projectId=project.id;card.dataset.category=project.category;card.setAttribute('aria-label','Open '+project.title+' gallery');
  const media=make('div','media project-preview-media'),stage=make('div','project-orbit-preview');stage.setAttribute('aria-hidden','true');media.append(stage);
  const carousel=new OrbitCarousel(stage,{items:project.images.map((image,i)=>({...image,title:image.label||`Render ${i+1}`})),motion:ui.motionEnabled,interactive:false});
  const state={carousel,visible:false,hovered:false,focused:false,order,timer:null};previews.set(card,state);previewObserver.observe(card);
  card.addEventListener('pointerenter',()=>{state.hovered=true;syncPreviews()});card.addEventListener('pointerleave',()=>{state.hovered=false;syncPreviews()});card.addEventListener('focusin',()=>{state.focused=true;syncPreviews()});card.addEventListener('focusout',()=>{state.focused=false;syncPreviews()});
  const copy=make('div','project-copy');copy.append(make('span','tag',project.category),make('h3','',project.title),make('p','',project.description));
  card.append(media,copy,make('span','project-watch','Open gallery ↗'));
  const count=project.images.length;card.append(make('span','gallery-badge',`${count} ${count===1?'image':'images'}${project.video?' · film':''}`));fragment.append(card);ui.revealObserver.observe(card);
 });grid.replaceChildren(fragment);
 filters.replaceChildren();filters.hidden=!data.projects.length;
 for(const category of [null,...new Set(data.projects.map(p=>p.category))]){
  const button=make('button','',category===null?'All projects':category||'Uncategorized');button.type='button';button.setAttribute('aria-pressed',String(category===null));
  button.addEventListener('click',()=>{for(const card of grid.querySelectorAll('.project'))card.hidden=category!==null&&card.dataset.category!==category;for(const sibling of filters.children)sibling.setAttribute('aria-pressed',String(sibling===button))});filters.append(button);
 }
 if(!data.projects.length)grid.append(make('p','','New projects will appear here when they are uploaded.'));
}
loadProjects().then(renderProjects).catch(error=>console.warn(error.message));
