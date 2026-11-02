const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const base=process.env.PORTFOLIO_TEST_BASE_URL||'http://127.0.0.1:8000';
const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/projects.json')));
(async()=>{
 if(data.projects.length!==9||data.projects.some(p=>p.images.length!==((p.id==='male-character-01'||p.id==='project-2')?5:p.id==='female-character-01'?6:4)))throw Error('Expected five Mocha renders, five male renders, six female slots and four slots in other galleries');
 const characters=data.projects.filter(p=>p.category==='Characters');if(characters.length!==3)throw Error('Expected two male galleries and one female gallery');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const project of data.projects){
  const folder=path.posix.dirname(project.images[0].src);
  if(project.images.some(image=>path.posix.dirname(image.src)!==folder))throw Error('Cross-project image folder '+project.id);
  if(!fs.existsSync(path.join(root,folder,'README.md')))throw Error('Missing replacement instructions');
  for(const image of project.images){if(!fs.existsSync(path.join(root,image.src)))throw Error('Missing slot '+image.src);const response=await page.request.get(base+'/'+image.src);if(!response.ok())throw Error('Broken image URL '+image.src)}
  if(project.video){const response=await page.request.head(base+'/'+project.video);if(!response.ok())throw Error('Broken project film '+project.id)}
  await page.goto(base+'/gallery.html?project='+project.id);await page.locator('#galleryCount').filter({hasText:`1 / ${project.images.length}`}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('#galleryStage img')].every(img=>img.complete&&img.naturalWidth>0));
  const sources=await page.locator('#galleryStage img').evaluateAll(images=>images.map(img=>img.getAttribute('src')));
  if(sources.length!==project.images.length||sources.some(src=>!src.startsWith(folder+'/')))throw Error('Gallery images are mixed '+project.id);
 }
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('#work .project-orbit-preview').length===9);
 for(const project of data.projects){const card=page.locator(`[data-project-id="${project.id}"]`);if(await card.locator('.orbit-slide').count()!==project.images.length||await card.locator('button').count())throw Error('Invalid animated project card '+project.id)}
 const mocha=page.locator('[data-project-id="project-2"]');await mocha.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await page.waitForFunction(()=>document.querySelector('[data-project-id="project-2"] .orbit-slide[aria-current="true"]').dataset.itemIndex!=='0',{},{timeout:8000});
 await page.getByRole('button',{name:'Characters',exact:true}).click();if(await page.locator('#work .project:visible').count()!==3)throw Error('Character grouping incorrect');
 await page.getByRole('link',{name:'Open Male Character 01 gallery',exact:true}).click();await page.locator('#overlayCount').filter({hasText:'1 / 5'}).waitFor();await page.mouse.move(0,0);await page.locator('#overlayCount').filter({hasText:'2 / 5'}).waitFor({timeout:8000});await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});await page.goto(base+'/gallery.html?project=male-character-01');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('#galleryCount').filter({hasText:'1 / 5'}).waitFor();if(await page.locator('#galleryPlay').textContent()!=='Auto-rotate')throw Error('Reduced-motion animation not paused');
 await page.locator('#galleryMotion').click();await page.locator('#galleryNext').click();if(!await page.locator('#galleryStage .orbit-slide').evaluateAll(cards=>cards.some(card=>card.getAnimations().length)))throw Error('Explicit motion choice ignored');await page.reload();await page.getByRole('button',{name:'Animations: On',exact:true}).waitFor();
 const female=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});female.on('pageerror',e=>errors.push(e.message));
 await female.goto(base+'/');await female.waitForFunction(()=>document.querySelectorAll('.project-card-bar').length===9);
 if(await female.locator('[data-project-id="female-character-02"]').count())throw Error('Removed female gallery is still on homepage');
 await female.getByRole('button',{name:'Characters',exact:true}).click();await female.getByRole('link',{name:'Open Female Character 01 gallery',exact:true}).click();await female.locator('#overlayCount').filter({hasText:'1 / 6'}).waitFor();
 for(let i=2;i<=6;i++){await female.locator('#overlayNext').click();await female.locator('#overlayCount').filter({hasText:`${i} / 6`}).waitFor()}
 await female.locator('#overlayNext').click();await female.locator('#overlayCount').filter({hasText:'1 / 6'}).waitFor();await female.locator('#overlayPrev').click();await female.locator('#overlayCount').filter({hasText:'6 / 6'}).waitFor();
 await female.waitForFunction(()=>[...document.querySelectorAll('#overlayStage img')].every(img=>img.complete&&img.naturalWidth===1600));
 if(await female.locator('#overlayStage img').count()!==6)throw Error('Female gallery does not contain six images');
 if(await female.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Female gallery overflows mobile');
 await female.goto(base+'/gallery.html?project=female-character-01');await female.locator('#galleryCount').filter({hasText:'1 / 6'}).waitFor();await female.locator('#galleryPrev').click();await female.locator('#galleryCount').filter({hasText:'6 / 6'}).waitFor();await female.locator('#galleryNext').click();await female.locator('#galleryCount').filter({hasText:'1 / 6'}).waitFor();
 await female.goto(base+'/gallery.html?project=female-character-02');await female.getByRole('heading',{name:'Project not found',exact:true}).waitFor();if(await female.locator('#project-gallery').isVisible())throw Error('Removed project shows another gallery');
 await female.goto(base+'/');await female.waitForFunction(()=>document.querySelectorAll('.project-card-bar').length===9);
 const mochaCard=female.getByRole('link',{name:'Open Mocha Wood gallery',exact:true});await mochaCard.scrollIntoViewIfNeeded();
 await female.waitForFunction(()=>{const images=[...document.querySelectorAll('[data-project-id="project-2"] img')];return images.length===5&&images.every(img=>img.complete&&img.naturalWidth>1900)});
 await mochaCard.click();await female.locator('#overlayCount').filter({hasText:'1 / 5'}).waitFor();await female.waitForFunction(()=>[...document.querySelectorAll('#overlayStage img')].every(img=>img.complete&&img.naturalWidth>1900));
 for(let i=2;i<=5;i++){await female.locator('#overlayNext').click();await female.locator('#overlayCount').filter({hasText:`${i} / 5`}).waitFor()}
 await female.locator('#overlayNext').click();await female.locator('#overlayCount').filter({hasText:'1 / 5'}).waitFor();if(await female.locator('#overlayFilmToggle').isVisible())throw Error('Deleted Mocha film offered');
 const expectedMocha=data.projects.find(p=>p.id==='project-2').images.map(img=>img.src);const actualMocha=await female.locator('#overlayStage img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')));if(JSON.stringify(expectedMocha)!==JSON.stringify(actualMocha))throw Error('Mocha uploads missing or out of order');
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: all 9 project folders, 40 valid image slots, including all 5 uploaded Mocha renders in preview/popup and 5 uploaded character renders, preserved film URLs, per-folder instructions, isolated galleries, three distinct characters, six-slot female carousel and removed-gallery empty state, independent animated homepage previews, placeholder-gallery autoplay, reduced motion.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
