// Circular coverflow, shared by the public portfolio and owner preview.
// Transitions run only when the selected image changes; there is no idle frame loop.
export class OrbitCarousel {
  constructor(root,{items=[],motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches,onChange=()=>{},onActivate=()=>{},onInteract=()=>{},interactive=true}={}){
    this.root=root;this.interactive=interactive;this.motion=motion;this.onChange=onChange;this.onActivate=onActivate;this.onInteract=onInteract;this.changeId=0;this.transitioning=false;this.slot=0;this.index=0;this.animations=[];this.suppressClick=false;
    root.classList.add('orbit-stage');root.setAttribute('role','region');root.setAttribute('aria-roledescription','carousel');
    this.ring=document.createElement('div');this.ring.className='orbit-ring';root.replaceChildren(this.ring);
    this.resizeObserver=new ResizeObserver(()=>this.layout(false));this.resizeObserver.observe(root);
    this.pointerDown=event=>{if(!this.interactive||event.button!==0||this.items.length<2||this.transitioning)return;this.onInteract();this.pointer={id:event.pointerId,x:event.clientX,y:event.clientY};};
    this.pointerMove=event=>{if(!this.pointer||this.pointer.id!==event.pointerId)return;if(Math.abs(event.clientX-this.pointer.x)>12&&Math.abs(event.clientX-this.pointer.x)>Math.abs(event.clientY-this.pointer.y)){root.setPointerCapture(event.pointerId);root.classList.add('is-dragging')}};
    this.pointerUp=event=>{if(!this.pointer||event.pointerId!==this.pointer.id)return;const dx=event.clientX-this.pointer.x,dy=event.clientY-this.pointer.y;this.pointer=null;root.classList.remove('is-dragging');if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){this.suppressClick=true;this.step(dx<0?1:-1);setTimeout(()=>this.suppressClick=false,0)}};
    this.pointerCancel=()=>{this.pointer=null;root.classList.remove('is-dragging')};
    root.addEventListener('pointerdown',this.pointerDown);root.addEventListener('pointermove',this.pointerMove);root.addEventListener('pointerup',this.pointerUp);root.addEventListener('pointercancel',this.pointerCancel);
    this.wheel=event=>{
      if(!this.interactive||event.ctrlKey||this.items.length<2||this.transitioning)return;
      event.preventDefault();this.onInteract();
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      const now=performance.now();if(now-(this.lastWheel||0)>180)this.wheelDelta=0;
      this.lastWheel=now;this.wheelDelta=(this.wheelDelta||0)+delta*(event.deltaMode===1?16:event.deltaMode===2?this.root.clientHeight:1);
      if(Math.abs(this.wheelDelta)>=35&&now-(this.wheelStepAt||-1000)>420){this.step(Math.sign(this.wheelDelta));this.wheelStepAt=now;this.wheelDelta=0}
    };
    this.keydown=event=>{if(!this.interactive)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();event.stopPropagation();this.onInteract();this.step(event.key==='ArrowRight'?1:-1);this.cards[this.normalizedSlot()]?.focus({preventScroll:true})}};
    root.addEventListener('wheel',this.wheel,{passive:false});root.addEventListener('keydown',this.keydown);
    this.setItems(items);
  }
  setItems(items){
    this.items=items;this.slot=0;this.index=0;this.ring.replaceChildren();this.cancelAnimations();
    const slots=items.length===2?4:items.length;
    this.cards=Array.from({length:slots},(_,slot)=>{
      const item=items[slot%items.length],card=document.createElement(this.interactive?'button':'div');if(this.interactive)card.type='button';card.className='orbit-slide';card.dataset.itemIndex=slot%items.length;
      const image=document.createElement('img');image.src=item.src;image.alt=item.alt||item.title||'';image.draggable=false;image.loading=slot===0?'eager':'lazy';image.decoding='async';
      const caption=document.createElement('span');caption.className='orbit-slide-caption';caption.textContent=item.title||`Image ${slot%items.length+1}`;
      card.append(image,caption);card.addEventListener('click',()=>{if(!this.interactive||this.suppressClick||this.transitioning)return;this.onInteract();if(slot===this.normalizedSlot())this.onActivate(this.index,card);else this.selectSlot(slot)});
      this.ring.append(card);return card;
    });this.layout(false);this.onChange(this.index);
  }
  normalizedSlot(){return this.cards.length?(this.slot%this.cards.length+this.cards.length)%this.cards.length:0}
  distance(slot,center=this.normalizedSlot()){
    const n=this.cards.length;let distance=(slot-center+n)%n;if(distance>n/2)distance-=n;return distance;
  }
  position(distance){
    const abs=Math.abs(distance),direction=Math.sign(distance),x=this.root.clientWidth*(abs===1?.27:abs>1?.7:0)*direction;
    return `translate(-50%,-50%) translateX(${x}px) translateZ(${abs===0?0:-60}px) rotateY(${-direction*(abs?10:0)}deg) scale(${abs===0?1.08:.85})`;
  }
  cancelAnimations(){this.animations.forEach(animation=>animation.cancel());this.animations=[];}
  layout(animated=true,previousSlot=this.normalizedSlot()){
    if(!this.cards?.length)return;
    const previous=this.cards.map(card=>({transform:getComputedStyle(card).transform,opacity:getComputedStyle(card).opacity}));
    this.cancelAnimations();
    this.cards.forEach((card,slot)=>{
      const distance=this.distance(slot),abs=Math.abs(distance),old=this.distance(slot,previousSlot),transform=this.position(distance),opacity=abs===0?1:abs===1?.7:0;
      const visible=abs<=1,active=distance===0;
      if(visible)card.querySelector('img').loading='eager';
      card.style.transform=transform;card.style.opacity=opacity;card.style.zIndex=active?'30':'10';card.style.pointerEvents=visible?'auto':'none';
      card.tabIndex=active&&this.interactive?0:-1;card.setAttribute('aria-current',String(active));card.setAttribute('aria-label',(active?'Open ':'Show ')+(this.items[slot%this.items.length].title||`image ${slot%this.items.length+1}`));card.setAttribute('aria-hidden',String(!visible));card.dataset.position=active?'front':distance===-1?'left':distance===1?'right':'standby';
      if(animated&&this.motion()&&card.animate){
        const frames=Math.abs(old-distance)>this.cards.length/2?[previous[slot],{transform:'translate(-50%,-50%) translateZ(-200px) scale(.7)',opacity:0},{transform,opacity}]:[previous[slot],{transform,opacity}];
        this.animations.push(card.animate(frames,{duration:650,easing:'cubic-bezier(.25,1,.5,1)'}));
      }
    });
  }
  async replaceItems(items){
    const change=++this.changeId;this.transitioning=true;this.root.setAttribute('aria-busy','true');this.deckAnimation?.cancel();
    try{
      if(this.motion()&&this.ring.animate){this.deckAnimation=this.ring.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:140,fill:'forwards',easing:'ease-in'});await this.deckAnimation.finished.catch(()=>{})}
      if(change!==this.changeId)return false;
      this.deckAnimation?.cancel();this.setItems(items);
      if(this.motion()&&this.ring.animate){this.deckAnimation=this.ring.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,easing:'cubic-bezier(.25,1,.5,1)'});await this.deckAnimation.finished.catch(()=>{})}
      return change===this.changeId;
    }finally{if(change===this.changeId){this.transitioning=false;this.root.removeAttribute('aria-busy')}}
  }
  step(delta){if(this.items.length<2||this.transitioning)return;const old=this.normalizedSlot();this.slot+=delta;this.index=this.normalizedSlot()%this.items.length;this.layout(true,old);this.onChange(this.index)}
  selectSlot(slot){const delta=this.distance(slot);this.step(delta)}
  show(index){if(!this.items.length)return;const candidates=this.cards.map((_,i)=>i).filter(i=>i%this.items.length===index);const nearest=candidates.sort((a,b)=>Math.abs(this.distance(a))-Math.abs(this.distance(b)))[0];if(nearest!==undefined)this.selectSlot(nearest)}
  destroy(){this.changeId++;this.transitioning=false;this.root.removeAttribute('aria-busy');this.deckAnimation?.cancel();this.cancelAnimations();this.resizeObserver.disconnect();this.root.removeEventListener('pointerdown',this.pointerDown);this.root.removeEventListener('pointermove',this.pointerMove);this.root.removeEventListener('pointerup',this.pointerUp);this.root.removeEventListener('pointercancel',this.pointerCancel);this.root.removeEventListener('wheel',this.wheel);this.root.removeEventListener('keydown',this.keydown);this.root.replaceChildren()}
}
