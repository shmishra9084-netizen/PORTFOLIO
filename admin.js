import {CMSClient,configured} from './cms-client.js';
import {validateDocument} from './project-store.js';
const $=id=>document.getElementById(id), client=new CMSClient();
let data={version:1,projects:[]},current=null,images=[],dirty=false,formDirty=false,busy=false,previewIndex=0,previewTimer;
const files=new Map(),urls=new Map();
const fields=['title','category','description','layout','video'];
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function markDirty(){dirty=true;$('publish-summary').textContent='You have unpublished changes.';$('draft-state').textContent='Unpublished changes';updatePublish();}
function updatePublish(){$('publish').disabled=busy||!client.session||!dirty;$('new-project').disabled=busy;}
function imageURL(image){return urls.get(image.src)||image.src;}
function button(text,label,action){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',action);return b;}
function renderList(){
 $('project-list').replaceChildren();
 data.projects.forEach((project,index)=>{
  const row=document.createElement('div');row.className='project-row';
  const select=document.createElement('button');select.type='button';select.className='project-select';select.setAttribute('aria-pressed',String(current===project.id));
  const image=document.createElement('img');image.src=imageURL(project.images[0]);image.alt='';
  const title=document.createElement('span');title.textContent=project.title;select.append(image,title);select.addEventListener('click',()=>{if(canLeaveForm())edit(project.id)});
  const actions=document.createElement('div');actions.className='project-row-actions';
  const up=button('↑','Move '+project.title+' up',()=>moveProject(index,-1));up.disabled=index===0;
  const down=button('↓','Move '+project.title+' down',()=>moveProject(index,1));down.disabled=index===data.projects.length-1;
  actions.append(up,down,button('Delete','Delete '+project.title,()=>{if(!confirm('Remove “'+project.title+'” from your portfolio? This takes effect after publishing.'))return;data.projects.splice(index,1);markDirty();if(current===project.id)edit(data.projects[0]?.id||null);renderList()}));
  row.append(select,actions);$('project-list').append(row);
 });
 if(!data.projects.length){const text=document.createElement('p');text.textContent='No projects yet. Add your first model.';$('project-list').append(text);}
}
function moveProject(index,offset){[data.projects[index],data.projects[index+offset]]=[data.projects[index+offset],data.projects[index]];markDirty();renderList();}
function canLeaveForm(){return !formDirty||confirm('Discard unsaved changes in this project form? Use “Save project changes” to keep them before switching.');}
function edit(id){
 stopPreview();current=id;const project=data.projects.find(p=>p.id===id);
 fields.forEach(key=>$(key).value=project?.[key]||(key==='layout'?'large':''));
 images=project?structuredClone(project.images):[];formDirty=false;previewIndex=0;
 $('editor-heading').textContent=project?'Edit project':'New project';renderImages();renderList();
}
function renderImages(){
 $('image-list').replaceChildren();images.forEach((image,index)=>{
  const tile=document.createElement('div');tile.className='image-tile';const img=document.createElement('img');img.src=imageURL(image);img.alt=image.alt;
  const badge=document.createElement('small');badge.textContent=index===0?'Cover image':'Image '+(index+1);
  const alt=document.createElement('input');alt.value=image.alt;alt.placeholder='Describe this angle';alt.setAttribute('aria-label','Image '+(index+1)+' description');alt.maxLength=250;
  alt.addEventListener('input',()=>{image.alt=alt.value;formDirty=true});
  const actions=document.createElement('div');actions.className='tile-actions';
  const left=button('←','Move image '+(index+1)+' earlier',()=>swapImage(index,-1));left.disabled=index===0;
  const right=button('→','Move image '+(index+1)+' later',()=>swapImage(index,1));right.disabled=index===images.length-1;
  actions.append(left,right,button('Remove','Remove image '+(index+1),()=>{images.splice(index,1);formDirty=true;previewIndex=0;renderImages()}));tile.append(badge,img,alt,actions);$('image-list').append(tile);
 });renderPreview();
}
function swapImage(index,offset){[images[index],images[index+offset]]=[images[index+offset],images[index]];formDirty=true;previewIndex=0;renderImages();}
function renderPreview(){
 const image=images[previewIndex%Math.max(images.length,1)];document.querySelector('.preview').hidden=!image;
 if(!image)return;const element=$('preview-image');element.src=imageURL(image);element.alt=image.alt;$('preview-count').textContent=(previewIndex+1)+' / '+images.length;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)element.animate([{opacity:.2,transform:'scale(1.02)'},{opacity:1,transform:'scale(1)'}],{duration:450,easing:'ease-out'});
 $('preview-prev').disabled=$('preview-next').disabled=$('preview-play').disabled=images.length<2;
}
function stopPreview(){clearInterval(previewTimer);previewTimer=null;$('preview-play').textContent='Play slideshow';}
$('preview-prev').addEventListener('click',()=>{stopPreview();previewIndex=(previewIndex-1+images.length)%images.length;renderPreview()});
$('preview-next').addEventListener('click',()=>{stopPreview();previewIndex=(previewIndex+1)%images.length;renderPreview()});
$('preview-play').addEventListener('click',()=>{if(previewTimer){stopPreview();return}$('preview-play').textContent='Pause slideshow';previewTimer=setInterval(()=>{previewIndex=(previewIndex+1)%images.length;renderPreview()},3500)});
$('image-upload').addEventListener('change',event=>{
 const chosen=[...event.target.files];event.target.value='';
 const types=['image/jpeg','image/png','image/webp','image/avif'];
 if(images.length+chosen.length>12){status('A project can have up to 12 images.',true);return}
 if(chosen.some(file=>!types.includes(file.type)||file.size>8*1024*1024)){status('Choose JPG, PNG, WebP or AVIF images under 8 MB each.',true);return}
 if([...files.values(),...chosen].reduce((n,f)=>n+f.size,0)>40*1024*1024){status('Publish this batch first; image uploads are limited to 40 MB per batch.',true);return}
 chosen.forEach(file=>{const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'},path=`assets/uploads/${crypto.randomUUID()}.${extensions[file.type]}`;files.set(path,file);urls.set(path,URL.createObjectURL(file));images.push({src:path,alt:$('title').value.trim()||file.name})});
 formDirty=true;renderImages();status('Images added. Reorder them below, then save this project.');
});
fields.forEach(key=>$(key).addEventListener('input',()=>formDirty=true));
function saveForm(){
 if(!$('project-form').reportValidity())return false;
 const project={id:current||'model-'+crypto.randomUUID(),...Object.fromEntries(fields.map(key=>[key,$(key).value.trim()])),images:structuredClone(images)};
 try{validateDocument({version:1,projects:[project]})}catch(error){status(error.message,true);return false}
 const index=data.projects.findIndex(p=>p.id===current);if(index<0)data.projects.push(project);else data.projects[index]=project;
 current=project.id;formDirty=false;markDirty();renderList();status('Project saved in this editing session. Publish to make it visible to visitors.');return true;
}
$('project-form').addEventListener('submit',event=>{event.preventDefault();saveForm()});
$('new-project').addEventListener('click',()=>{if(canLeaveForm()){edit(null);$('title').focus()}});
async function loadProjects(){
 const remote=await client.read();
 data=remote||validateDocument(await (await fetch('data/projects.json',{cache:'no-store'})).json());
 dirty=false;formDirty=false;edit(data.projects[0]?.id||null);$('publish-summary').textContent='Your portfolio is up to date.';$('draft-state').textContent='Published version';updatePublish();
}
function showOwner(){
 $('login-panel').hidden=true;$('workspace').hidden=false;$('publish-bar').hidden=false;$('account-bar').hidden=false;$('account-email').textContent=client.session.user?.email||'Portfolio owner';
}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('login-button').disabled=true;
 try{status('Signing in…');await client.login($('email').value.trim(),$('password').value);$('password').value='';await loadProjects();showOwner();status('Signed in. Add a project or edit an existing one.')}catch(error){status(error.message,true)}finally{$('login-button').disabled=false}
});
$('logout').addEventListener('click',async()=>{
 if((dirty||formDirty)&&!confirm('Sign out and discard unpublished edits?'))return;
 try{await client.logout()}catch{}finally{location.reload()}
});
$('publish').addEventListener('click',async()=>{
 if(formDirty&&!saveForm())return;
 busy=true;document.body.setAttribute('aria-busy','true');updatePublish();$('logout').disabled=true;
 try{
  const publication=structuredClone(data),used=new Set(publication.projects.flatMap(p=>p.images.map(i=>i.src)));
  for(const [path,file] of files){if(!used.has(path))continue;status('Uploading '+file.name+'…');const url=await client.upload(file);publication.projects.forEach(p=>p.images.forEach(image=>{if(image.src===path)image.src=url}));}
  status('Publishing projects…');await client.publish(publication);data=publication;dirty=false;files.clear();urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();edit(current);$('draft-state').textContent='Published';$('publish-summary').textContent='Your portfolio is up to date.';status('Published! Your images and project details are saved. Visitors see them on their next page load.');
 }catch(error){status(error.message,true)}finally{busy=false;document.body.removeAttribute('aria-busy');$('logout').disabled=false;updatePublish()}
});
window.addEventListener('beforeunload',event=>{if(dirty||formDirty||busy){event.preventDefault();event.returnValue=''}});
(async()=>{
 if(!configured){$('setup-panel').hidden=false;$('login-button').disabled=true;$('email').disabled=true;$('password').disabled=true;status('CMS code is installed. Connect your free Supabase project to enable login and uploads.');return}
 try{if(await client.restore()){await loadProjects();showOwner();status('Welcome back. Your published projects are loaded.')}else status('Sign in with your portfolio owner account.')}catch(error){status(error.message,true)}
})();
