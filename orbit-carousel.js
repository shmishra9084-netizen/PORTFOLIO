// Circular coverflow, shared by the public portfolio and owner preview.
// Transitions run only when the selected image changes; there is no idle frame loop.
export class OrbitCarousel {
  constructor(root,{items=[],motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches,onChange=()=>{},onActivate=()=>{}}={}){
    this.root=root;this.motion=motion;this.onChange=onChange;this.onActivate=onActivate;this.slot=0;this.index=0;this.animations=[];this.suppressClick=false;
    root.classList.add('orbit-stage');root.setAttribute('role','region');root.setAttribute('aria-roledescription','carousel');
    this.ring=document.createElement('div');this.ring.className='orbit-ring';root.replaceChildren(this.ring);
    this.resizeObserver=new ResizeObserver(()=>this.layout(false));this.resizeObserver.observe(root);
    this.pointerDown=event=>{if(event.button!==0||this.items.length<2)return;this.pointer={id:event.pointerId,x:event.clientX,y:event.clientY};};
    this.pointerMove=event=>{if(!this.pointer||this.pointer.id!==event.pointerId)return;if(Math.abs(event.clientX-this.pointer.x)>12&&Math.abs(event.clientX-this.pointer.x)>Math.abs(event.clientY-this.pointer.y)){root.setPointerCapture(event.pointerId);root.classList.add('is-dragging')}};
    this.pointerUp=event=>{if(!this.pointer||event.pointerId!==this.pointer.id)return;const dx=event.clientX-this.pointer.x,dy=event.clientY-this.pointer.y;this.pointer=null;root.classList.remove('is-dragging');if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){this.suppressClick=true;this.step(dx<0?1:-1);setTimeout(()=>this.suppressClick=false,0)}};
    this.pointerCancel=()=>{this.pointer=null;root.classList.remove('is-dragging')};
    root.addEventListener('pointerdown',this.pointerDown);root.addEventListener('pointermove',this.pointerMove);root.addEventListener('pointerup',this.pointerUp);root.addEventListener('pointercancel',this.pointerCancel);
    this.setItems(items);
  }
  setItems(items){
    this.items=items;this.slot=0;this.index=0;this.ring.replaceChildren();this.cancelAnimations();
    const slots=items.length===2?4:items.length;
    this.cards=Array.from({length:slots},(_,slot)=>{
      const item=items[slot%items.length],card=document.createElement('button');card.type='button';card.className='orbit-slide';card.dataset.itemIndex=slot%items.length;
      const image=document.createElement('img');image.src=item.src;image.alt=item.alt||item.title||'';image.draggable=false;image.loading=slot===0?'eager':'lazy';image.decoding='async';
      const caption=document.createElement('span');caption.className='orbit-slide-caption';caption.textContent=item.title||`Image ${slot%items.length+1}`;
      card.append(image,caption);card.addEventListener('click',()=>{if(this.suppressClick)return;if(slot===this.normalizedSlot())this.onActivate(this.index,card);else this.selectSlot(slot)});
      this.ring.append(card);return card;
    });this.layout(false);this.onChange(this.index);
  }
  normalizedSlot(){return this.cards.length?(this.slot%this.cards.length+this.cards.length)%this.cards.length:0}
  distance(slot,center=this.normalizedSlot()){
    const n=this.cards.length;let distance=(slot-center+n)%n;if(distance>n/2)distance-=n;return distance;
  }
  position(distance){
    const w=this.root.clientWidth,abs=Math.abs(distance),direction=Math.sign(distance);
    const x=direction*w*(abs===0?0:abs===1?.31:.49+(abs-2)*.1);
    const z=-w*Math.min(.4,abs*.15),rotation=-direction*Math.min(48,abs*28),scale=Math.max(.52,1-abs*.12);
    return `translate(-50%,-50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotation}deg) scale(${scale})`;
  }
  cancelAnimations(){this.animations.forEach(animation=>animation.cancel());this.animations=[];}
  layout(animated=true,previousSlot=this.normalizedSlot()){
    if(!this.cards?.length)return;this.cancelAnimations();const n=this.cards.length;
    this.cards.forEach((card,slot)=>{
      const distance=this.distance(slot),abs=Math.abs(distance),old=this.distance(slot,previousSlot),transform=this.position(distance),opacity=abs>2?0:abs===0?1:abs===1?.78:.36;
      const visible=abs<=2,active=distance===0;
      if(visible)card.querySelector('img').loading='eager';
      card.style.transform=transform;card.style.opacity=opacity;card.style.zIndex=String(100-Math.round(abs*20));card.style.pointerEvents=visible?'auto':'none';
      card.tabIndex=active?0:-1;card.setAttribute('aria-current',String(active));card.setAttribute('aria-label',(active?'Open ':'Show ')+(this.items[slot%this.items.length].title||`image ${slot%this.items.length+1}`));card.setAttribute('aria-hidden',String(!visible));
      if(animated&&this.motion()&&card.animate){
        const from={transform:this.position(old),opacity:Math.abs(old)>2?0:old===0?1:Math.abs(old)===1?.78:.36};
        const frames=Math.abs(old-distance)>n/2&&n>2?[from,{transform:'translate(-50%,-50%) translateZ(-500px) scale(.5)',opacity:0},{transform,opacity}]:[from,{transform,opacity}];
        this.animations.push(card.animate(frames,{duration:800,easing:'cubic-bezier(.22,.68,.2,1)'}));
      }
    });
  }
  step(delta){if(this.items.length<2)return;const old=this.normalizedSlot();this.slot+=delta;this.index=this.normalizedSlot()%this.items.length;this.layout(true,old);this.onChange(this.index)}
  selectSlot(slot){const delta=this.distance(slot);this.step(delta)}
  show(index){if(!this.items.length)return;const candidates=this.cards.map((_,i)=>i).filter(i=>i%this.items.length===index);const nearest=candidates.sort((a,b)=>Math.abs(this.distance(a))-Math.abs(this.distance(b)))[0];if(nearest!==undefined)this.selectSlot(nearest)}
  destroy(){this.cancelAnimations();this.resizeObserver.disconnect();this.root.removeEventListener('pointerdown',this.pointerDown);this.root.removeEventListener('pointermove',this.pointerMove);this.root.removeEventListener('pointerup',this.pointerUp);this.root.removeEventListener('pointercancel',this.pointerCancel);this.root.replaceChildren()}
}
