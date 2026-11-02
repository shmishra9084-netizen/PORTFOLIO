const {chromium}=require('playwright');const fs=require('fs');
const path=require('path');
const base=process.env.PORTFOLIO_TEST_BASE_URL||'http://127.0.0.1:8000',image=fs.readFileSync(path.join(__dirname,'../assets/product-hero.jpg'));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let errors=[];
 const plain=await browser.newPage();plain.on('pageerror',e=>errors.push(e.message));
 await plain.goto(base+'/admin.html');await plain.locator('#setup-panel').waitFor();if(!await plain.locator('#login-button').isDisabled())throw Error('Unconfigured login enabled');
 await plain.goto(base+'/');await plain.waitForFunction(()=>document.querySelectorAll('#work .project[role="button"]').length===6);await plain.locator('.project').first().click();await plain.locator('.modal.open').waitFor();await plain.keyboard.press('Escape');await plain.locator('.modal').waitFor({state:'hidden'});
 let documentData=null,revision=null,uploads=0,failPublish=false;
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/cms-config.js',route=>route.fulfill({contentType:'text/javascript',body:"export const cmsConfig={url:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_key'}"}));
 await context.route('https://test-project.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();let data;try{data=req.postDataJSON()}catch{}
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/v1/token')return json({access_token:data.email==='stranger@example.com'?'not-owner':'owner-access',refresh_token:'refresh',expires_in:3600,user:{email:data.email||'owner@example.com'}});
  if(path==='/auth/v1/logout')return json({});
  if(path==='/rest/v1/rpc/is_portfolio_admin')return json(req.headers().authorization==='Bearer owner-access');
  if(path==='/rest/v1/portfolio_content'){
   if(method==='GET')return json(documentData?[{data:documentData,revision}]:[]);
   if(req.headers().authorization!=='Bearer owner-access')return json({message:'forbidden'},403);
   if(failPublish)return json([]);
   documentData=data.data;revision=data.revision;return json([{data:documentData,revision}]);
  }
  if(path.startsWith('/storage/v1/object/public/'))return route.fulfill({contentType:'image/jpeg',body:image});
  if(path.startsWith('/storage/v1/object/')){if(req.headers().authorization!=='Bearer owner-access')return json({},403);uploads++;return json({Key:'image'});}
  return json({},404);
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(base+'/admin.html');await page.locator('#email').fill('stranger@example.com');await page.locator('#password').fill('password');await page.locator('#login-button').click();await page.getByRole('status').filter({hasText:'not the portfolio owner'}).waitFor();if(await page.locator('#workspace').isVisible())throw Error('Non-owner shown workspace');
 await page.locator('#email').fill('owner@example.com');await page.locator('#password').fill('password');await page.locator('#login-button').click();await page.locator('#workspace').waitFor();
 await page.locator('#new-project').click();await page.locator('#title').fill('My Model <script>alert(1)</script>');await page.locator('#category').fill('Character');await page.locator('#description').fill('Two angles of my model.');
 await page.locator('#image-upload').setInputFiles([{name:'front.jpg',mimeType:'image/jpeg',buffer:image},{name:'back.jpg',mimeType:'image/jpeg',buffer:image}]);
 if(await page.locator('.image-tile').count()!==2)throw Error('Multi-upload failed');
 await page.getByRole('button',{name:'Move image 2 earlier'}).click();await page.getByRole('button',{name:'Save project changes',exact:true}).click();
 await page.locator('#publish').click();await page.getByRole('status').filter({hasText:'Published!'}).waitFor();if(uploads!==2||documentData.projects.length!==7)throw Error('Publish incomplete');
 if(!documentData.projects.at(-1).images.every(i=>i.src.startsWith('https://test-project.supabase.co/')))throw Error('Local blobs persisted');
 const visitor=await context.newPage();visitor.on('pageerror',e=>errors.push(e.message));await visitor.goto(base+'/');await visitor.waitForFunction(()=>document.querySelectorAll('#work .project').length===7);
 const model=visitor.getByRole('button',{name:/Open My Model/});await model.scrollIntoViewIfNeeded();await model.click();await visitor.locator('#galleryView').waitFor();await visitor.locator('#galleryCount').filter({hasText:'1 / 2'}).waitFor();await visitor.locator('#galleryNext').click();await visitor.locator('#galleryCount').filter({hasText:'2 / 2'}).waitFor();await visitor.keyboard.press('ArrowLeft');await visitor.locator('#galleryCount').filter({hasText:'1 / 2'}).waitFor();await visitor.locator('#galleryPlay').click();await visitor.locator('#galleryCount').filter({hasText:'2 / 2'}).waitFor({timeout:7000});await visitor.keyboard.press('Escape');await visitor.locator('.modal').waitFor({state:'hidden'});if(!await model.evaluate(e=>e===document.activeElement))throw Error('Gallery focus not restored');
 await page.locator('#title').fill('Updated model title');await page.getByRole('button',{name:'Save project changes',exact:true}).click();failPublish=true;await page.locator('#publish').click();await page.getByRole('status').filter({hasText:'Another edit was published first'}).waitFor();failPublish=false;await page.locator('#publish').click();await page.getByRole('status').filter({hasText:'Published!'}).waitFor();if(documentData.projects.at(-1).title!=='Updated model title')throw Error('Editing failed');
 await page.getByRole('button',{name:'Delete Updated model title',exact:true}).click();await page.locator('#publish').click();await page.getByRole('status').filter({hasText:'Published!'}).waitFor();if(documentData.projects.length!==6)throw Error('Delete failed');
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Editor overflow '+width);await visitor.setViewportSize({width,height:900});if(await visitor.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Portfolio overflow '+width)}
 await page.locator('#logout').click();await page.locator('#login-panel').waitFor();if(await page.evaluate(()=>sessionStorage.getItem('portfolio-session')))throw Error('Session retained after logout');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: unconfigured setup, original videos, login owner/non-owner, multiple uploads/reorder, atomic publish with public URLs, public gallery/thumbnails/arrows/autoplay/focus, edit/delete, conflict handling, logout, four viewport sizes; no JS errors. Backend simulated; real Supabase setup still required.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
