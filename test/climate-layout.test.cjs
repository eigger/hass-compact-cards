const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
const source=readFileSync('compact-cards.js','utf8');

function setup(t){
 const window=new Window(),observers=[],frames=new Map(),canceled=[];let nextFrame=0;
 // Frame zero is intentional: pending-work guards must not rely on truthiness.
 window.requestAnimationFrame=callback=>{const id=nextFrame++;frames.set(id,callback);return id;};
 window.cancelAnimationFrame=id=>{canceled.push(id);frames.delete(id);};
 window.ResizeObserver=class{
  constructor(callback){this.callback=callback;this.observed=new Set();this.disconnects=0;observers.push(this);}
  observe(target){this.observed.add(target);}
  disconnect(){this.disconnects++;this.observed.clear();}
  deliver(){if(this.observed.size)this.callback([...this.observed].map(target=>({target})),this);}
 };
 window.eval(source);
 const card=window.document.createElement('compact-climate-row');card.setConfig({entity:'climate.room'});
 card.hass={states:{'climate.room':{entity_id:'climate.room',state:'cool',attributes:{hvac_modes:['off','cool','fan_only','dry','auto'],temperature:24,current_temperature:27.5,supported_features:1}}}};
 const observer=observers[0];
 const flush=()=>{const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(0);};
 t.after(()=>{card.remove();window.happyDOM.abort();});
 return {window,card,observer,frames,canceled,flush};
}

test('climate resize deliveries defer layout and coalesce until the next animation frame',t=>{
 const {window,card,observer,frames,flush}=setup(t);let layouts=0;card._layout=()=>layouts++;
 window.document.body.append(card);assert.equal(layouts,1);layouts=0;
 observer.deliver();observer.deliver();observer.deliver();
 assert.equal(layouts,0,'resize delivery must not synchronously change layout');assert.equal(frames.size,1,'one frame handles repeated host/temperature entries');
 flush();assert.equal(layouts,1);assert.equal(frames.size,0);
 observer.deliver();assert.equal(frames.size,1);flush();assert.equal(layouts,2,'later deliveries remain observable after the frame completes');
});

test('climate disconnect cancels pending frame zero and stops background layout',t=>{
 const {window,card,observer,frames,canceled,flush}=setup(t);let layouts=0;card._layout=()=>layouts++;
 window.document.body.append(card);layouts=0;observer.deliver();assert.equal(frames.has(0),true);
 card.remove();assert.equal(observer.disconnects,1);assert.equal(observer.observed.size,0);assert.deepEqual(canceled,[0]);assert.equal(frames.size,0);
 flush();observer.deliver();flush();assert.equal(layouts,0,'removed cards do not perform queued or unobserved layout');
});

test('climate reconnect observes both its host and temperature control for hidden-to-visible mounts',t=>{
 const {window,card,observer,frames,flush}=setup(t);let layouts=0;card._layout=()=>layouts++;
 const temperature=card.shadowRoot.querySelector('.temperature');
 window.document.body.append(card);assert.equal(observer.observed.size,2);assert.equal(observer.observed.has(card),true);assert.equal(observer.observed.has(temperature),true);
 card.remove();assert.equal(observer.observed.size,0);
 window.document.body.append(card);assert.equal(observer.observed.size,2);assert.equal(observer.observed.has(card),true);assert.equal(observer.observed.has(temperature),true);
 const connectedLayouts=layouts;observer.deliver();assert.equal(frames.size,1);flush();assert.equal(layouts,connectedLayouts+1,'a card mounted at zero width can react when its observed size becomes visible');
});

test('climate size uses rendered mode lines rather than the number of supported modes',t=>{
 const {card}=setup(t),surface=card.shadowRoot.querySelector('ha-card'),buttons=[...card.shadowRoot.querySelector('.modes').children];
 assert.equal(buttons.length,5);assert.equal(card.getCardSize(),1,'five modes still occupy one card unit when they fit inline');
 surface.classList.add('wrap-modes');
 buttons.forEach(button=>Object.defineProperty(button,'offsetTop',{configurable:true,value:42}));
 assert.equal(card.getCardSize(),2,'one rendered mode line follows the information/temperature row');
 buttons.forEach((button,index)=>Object.defineProperty(button,'offsetTop',{configurable:true,value:index<3?42:86}));
 assert.equal(card.getCardSize(),3,'a second rendered mode line increases the reported card size');
 surface.classList.remove('wrap-modes');assert.equal(card.getCardSize(),1,'returning to inline layout restores the compact size');
});
