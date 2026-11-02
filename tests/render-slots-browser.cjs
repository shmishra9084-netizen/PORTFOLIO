const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const base=process.env.PORTFOLIO_TEST_BASE_URL||'http://127.0.0.1:8000';
const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/projects.json')));
(async()=>{
 if(data.projects.length!==10||data.projects.some(p=>p.images.length!==4))throw Error('Expected 10 independent four-slot galleries');
 const characters=data.projects.filter(p=>p.category==='Characters');if(characters.length!==4)throw Error('Expected two male and two female galleries');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const project of data.projects){
  const folder=path.posix.dirname(project.images[0].src);
  if(project.images.some(image=>path.posix.dirname(image.src)!==folder))throw Error('Cross-project image folder '+project.id);
  if(!fs.existsSync(path.join(root,folder,'README.md')))throw Error('Missing replacement instructions');
  for(const image of project.images){if(!fs.existsSync(path.join(root,image.src)))throw Error('Missing slot '+image.src);const response=await page.request.get(base+'/'+image.src);if(!response.ok())throw Error('Broken image URL '+image.src)}
  if(project.video){const response=await page.request.head(base+'/'+project.video);if(!response.ok())throw Error('Broken project film '+project.id)}
  await page.goto(base+'/gallery.html?project='+project.id);await page.locator('#galleryCount').filter({hasText:'1 / 4'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('#galleryStage img')].every(img=>img.complete&&img.naturalWidth>0));
  const sources=await page.locator('#galleryStage img').evaluateAll(images=>images.map(img=>img.getAttribute('src')));
  if(sources.length!==4||sources.some(src=>!src.startsWith(folder+'/')))throw Error('Gallery images are mixed '+project.id);
 }
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('#work .project-orbit-preview').length===10);
 for(const project of data.projects){const card=page.locator(`[data-project-id="${project.id}"]`);if(await card.locator('.orbit-slide').count()!==4||await card.locator('button').count())throw Error('Invalid animated project card '+project.id)}
 const mocha=page.locator('[data-project-id="project-2"]');await mocha.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await page.waitForFunction(()=>document.querySelector('[data-project-id="project-2"] .orbit-slide[aria-current="true"]').dataset.itemIndex!=='0',{},{timeout:8000});
 await page.getByRole('button',{name:'Characters',exact:true}).click();if(await page.locator('#work .project:visible').count()!==4)throw Error('Character grouping incorrect');
 await page.getByRole('link',{name:'Open Male Character 01 gallery',exact:true}).click();await page.locator('#galleryCount').filter({hasText:'1 / 4'}).waitFor();await page.mouse.move(0,0);await page.locator('#galleryCount').filter({hasText:'2 / 4'}).waitFor({timeout:8000});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('#galleryCount').filter({hasText:'1 / 4'}).waitFor();if(await page.locator('#galleryPlay').textContent()!=='Auto-rotate')throw Error('Reduced-motion animation not paused');
 await page.locator('#galleryMotion').click();await page.locator('#galleryNext').click();if(!await page.locator('#galleryStage .orbit-slide').evaluateAll(cards=>cards.some(card=>card.getAnimations().length)))throw Error('Explicit motion choice ignored');await page.reload();await page.getByRole('button',{name:'Animations: On',exact:true}).waitFor();
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: all 10 project folders, 40 valid image slots, preserved film URLs, per-folder instructions, isolated galleries, four distinct characters, independent animated homepage previews, placeholder-gallery autoplay, reduced motion.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
