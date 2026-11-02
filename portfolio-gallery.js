import {loadProjects} from './project-data.js';
const ui=window.portfolioUI,grid=document.querySelector('#work .grid'),filters=document.getElementById('workCategoryFilters');
const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;};
function galleryURL(id){return 'gallery.html?project='+encodeURIComponent(id)}
function renderProjects(data){
 grid.querySelectorAll('video').forEach(video=>{video.pause();ui.videoObserver.unobserve(video);ui.visibleVideos.delete(video);const index=ui.ambientVideos.indexOf(video);if(index>=0)ui.ambientVideos.splice(index,1)});
 const fragment=document.createDocumentFragment();
 data.projects.forEach(project=>{
  const card=make('a','project '+project.layout);card.href=galleryURL(project.id);card.dataset.projectId=project.id;card.dataset.category=project.category;card.setAttribute('aria-label','Open '+project.title+' gallery');
  const media=make('div','media'),image=make('img');image.src=project.images[0].src;image.alt=project.images[0].alt||project.title;image.loading='lazy';image.decoding='async';media.append(image);
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
