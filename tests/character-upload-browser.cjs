const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const base=process.env.PORTFOLIO_TEST_BASE_URL||'http://127.0.0.1:8000';
(async()=>{
 const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/projects.json'))),project=data.projects.find(p=>p.id==='male-character-01');
 if(project.images.length!==5)throw Error('Fifth character render is not registered');
 for(const image of project.images){const bytes=fs.readFileSync(path.join(root,image.src));if(!image.src.endsWith('.jpg')||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error('JPEG extension/content mismatch '+image.src)}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const image of project.images){const response=await page.request.get(base+'/'+image.src);if(!response.ok()||!response.headers()['content-type'].includes('image/jpeg'))throw Error('Wrong image response '+image.src)}
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('.project-card-bar').length===10);await page.getByRole('button',{name:'Characters',exact:true}).click();
 const card=page.getByRole('link',{name:'Open Male Character 01 gallery',exact:true});await card.scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('[data-project-id="male-character-01"] img')].every(image=>image.complete&&image.naturalWidth===3840));
 if(await card.locator('.orbit-slide').count()!==5)throw Error('Homepage preview omitted an uploaded render');
 await card.click();await page.locator('#overlayCount').filter({hasText:'1 / 5'}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('#overlayStage img')].every(image=>image.complete&&image.naturalWidth===3840));
 const sources=await page.locator('#overlayStage img').evaluateAll(images=>images.map(image=>image.getAttribute('src')));if(sources.length!==5||!sources.includes('assets/projects/characters/male-01/render-05.jpg'))throw Error('Gallery did not include fifth render');
 await page.locator('#overlayNext').click();await page.locator('#overlayCount').filter({hasText:'2 / 5'}).waitFor();await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});
 await page.goto(base+'/gallery.html?project=male-character-01');await page.locator('#galleryCount').filter({hasText:'1 / 5'}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('#galleryStage img')].every(image=>image.complete&&image.naturalWidth===3840));
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: all 5 original JPEGs, correct HTTP MIME types, new image URLs, loaded homepage character preview, 5-image centered overlay, carousel navigation, direct gallery.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
