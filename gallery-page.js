import {loadProjects} from './project-data.js';
import {ProjectDecks} from './project-decks.js';
const $=id=>document.getElementById(id),motion=matchMedia('(prefers-reduced-motion: reduce)');
let gallery;
(async()=>{
 try{
  const id=new URLSearchParams(location.search).get('project');
  const {projects}=await loadProjects(),project=projects.find(p=>p.id===id);
  if(!project){$('project-title').textContent='Project not found';$('project-status').textContent='This project has not been uploaded, or its link is no longer available. Choose an existing project from the galleries page.';return}
  document.title=project.title+' — Shiva Mishra';$('project-title').textContent=project.title;$('project-category').textContent=project.category;$('project-description').textContent=project.description;
  $('project-gallery').hidden=false;
  gallery=new ProjectDecks($('project-gallery'),{prefix:'gallery',singleProject:true,motion:()=>!motion.matches,onOpen:(selected,button,imageIndex)=>{window.open(selected.images[imageIndex].src,'_blank','noopener')}});
  await gallery.setProjects([project]);gallery.elements.open.textContent='View full image ↗';$('project-status').hidden=true;
  if(project.video){$('project-film').hidden=false;$('project-film-title').textContent=project.title;$('project-video').src=project.video;$('project-video').poster=project.images[0].src}
  motion.addEventListener('change',()=>gallery.motionChanged());
 }catch(error){$('project-title').textContent='Gallery unavailable';$('project-status').textContent=error.message}
})();
