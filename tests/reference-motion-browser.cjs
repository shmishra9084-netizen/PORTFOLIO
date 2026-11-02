const {chromium}=require('playwright');
const base=process.env.PORTFOLIO_TEST_BASE_URL||'http://127.0.0.1:8000';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:900},...(process.env.PORTFOLIO_RECORD_MOTION?{recordVideo:{dir:process.env.PORTFOLIO_RECORD_MOTION,size:{width:1280,height:900}}}:{})});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('.project-card-bar').length===9);await page.getByRole('link',{name:'Open Mocha Wood gallery',exact:true}).click();await page.locator('#overlayCount').filter({hasText:'1 / 4'}).waitFor();
 const stage=page.locator('#overlayStage');await stage.hover({position:{x:900,y:150}});
 const initial=await stage.locator('.orbit-slide').evaluateAll(cards=>cards.map(card=>({index:card.dataset.itemIndex,filter:getComputedStyle(card).filter,position:card.dataset.position})));
 if(!initial.find(card=>card.position==='front').filter.includes('blur(0px)'))throw Error('Front render is not sharp');
 if(!initial.filter(card=>['left','right'].includes(card.position)).every(card=>card.filter.includes('blur(1.8px)')))throw Error('Missing reference side-card depth');
 // Hover remains over the deck for the entire automatic centre/side exchange.
 await page.locator('#overlayCount').filter({hasText:'2 / 4'}).waitFor({timeout:6000});
 const incoming=stage.locator('[data-item-index="1"]'),outgoing=stage.locator('[data-item-index="0"]');
 const transition=await incoming.evaluate(card=>{const animation=card.getAnimations()[0];return animation?{frames:animation.effect.getKeyframes(),duration:animation.effect.getTiming().duration,easing:animation.effect.getTiming().easing}:null});
 if(!transition||transition.duration!==900||!transition.frames.every(frame=>frame.filter)||!transition.easing.includes('1.12'))throw Error('Missing spring depth transition');
 await page.waitForFunction(()=>document.querySelector('#overlayStage [data-item-index="1"]').getAnimations().length===0);
 if(!await incoming.getAttribute('data-position').then(value=>value==='front')||!await outgoing.getAttribute('data-position').then(value=>value==='left'))throw Error('Cards did not exchange centre and side positions');
 if(!await incoming.evaluate(card=>getComputedStyle(card).filter.includes('blur(0px)'))||!await outgoing.evaluate(card=>getComputedStyle(card).filter.includes('blur(1.8px)')))throw Error('Incoming card did not sharpen as outgoing card receded');
 await page.locator('#overlayCount').filter({hasText:'3 / 4'}).waitFor({timeout:5000});
 await page.locator('#overlayPlay').click();const paused=await page.locator('#overlayCount').textContent();
 await page.locator('#overlayNext').click();const manuallyChanged=await page.locator('#overlayCount').textContent();if(manuallyChanged===paused||await page.locator('#overlayPlay').textContent()!=='Auto-rotate')throw Error('Explicit Pause was not retained after manual input');
 await page.locator('#overlayPlay').click();await stage.hover({position:{x:900,y:150}});await page.locator('#overlayCount').filter({hasText:'1 / 4'}).waitFor({timeout:5000});
 // A held drag must suspend auto-rotation; its release schedules the next automatic slide.
 const bounds=await stage.boundingBox();await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.48,bounds.y+bounds.height*.5,{steps:8});
 const during=await page.locator('#overlayCount').textContent();await page.waitForTimeout(3200);if(await page.locator('#overlayCount').textContent()!==during)throw Error('Autoplay advanced during a held drag');await page.mouse.up();
 const afterRelease=await page.locator('#overlayCount').textContent();await page.waitForFunction(text=>document.getElementById('overlayCount').textContent!==text,afterRelease,{timeout:5000});
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: reference-style blur/sharp depth, spring transition, centre/side exchange, autoplay while hovered, explicit pause, auto-resume after input, held-drag safety.');
 const recording=page.video();await context.close();if(recording)console.log('Recording:',await recording.path());await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
