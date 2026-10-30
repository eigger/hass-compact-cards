const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
function setup(t,type,config){
  const window=new Window({url:'http://homeassistant.local/'});window.eval(readFileSync('compact-cards.js','utf8'));
  const hass={states:{'image.floor':{entity_id:'image.floor',state:'2026-10-30',attributes:{access_token:'a&b',friendly_name:'평면도'}},'camera.door':{entity_id:'camera.door',state:'idle',attributes:{friendly_name:'현관'}}},hassUrl:url=>new URL(url,'http://homeassistant.local/').href};
  const card=window.document.createElement(type);card.setConfig(config);card.hass=hass;
  t.after(()=>{card.remove();window.happyDOM.abort();});return {window,hass,card,q:s=>card.shadowRoot.querySelector(s)};
}
const tick=()=>new Promise(setImmediate);
test('image validates sources; loading, error, retry and alt text',t=>{
  const {window,card,q}=setup(t,'compact-image-card',{image:'/local/room.jpg',alt_text:'거실 사진'});
  for(const image of ['javascript:alert(1)','data:image/svg+xml,hi','//example.com/x','/\\example.com/x'])assert.throws(()=>card.setConfig({image}));
  assert.throws(()=>card.setConfig({image:'/local/a.jpg',entity:'image.floor'}));
  assert.equal(q('img').alt,'거실 사진');assert.equal(q('img').hidden,true);
  q('img').dispatchEvent(new window.Event('error'));assert.match(q('.message').textContent,/이미지 없음/);assert.equal(q('.retry').hidden,false);
  const old=q('img');q('.retry').click();assert.notEqual(q('img'),old);
  old.dispatchEvent(new window.Event('load'));assert.equal(q('img').hidden,true);
  q('img').dispatchEvent(new window.Event('load'));assert.equal(q('img').hidden,false);assert.equal(q('.message').hidden,true);
});
test('image entity refreshes token/state without replacing unchanged image; unavailable clears stale image',t=>{
  const {window,hass,card,q}=setup(t,'compact-image-card',{entity:'image.floor',fit_mode:'contain'});
  assert.match(q('img').src,/token=a%26b/);const initial=q('img');card.hass=hass;assert.equal(q('img'),initial);
  hass.states['image.floor'].state='new';card.hass=hass;assert.notEqual(q('img'),initial);
  let detail;card.addEventListener('hass-more-info',e=>detail=e.detail);q('.info').click();assert.equal(detail.entityId,'image.floor');
  hass.states['image.floor'].state='unavailable';card.hass=hass;assert.equal(q('img'),null);assert.match(q('.message').textContent,/사용 불가/);
  hass.states['image.floor'].state='restored';card.hass=hass;assert.ok(q('img'));
});
test('camera delegates playback to native card and survives updates, detach, recovery and config changes',async t=>{
  const {window,hass,card,q}=setup(t,'compact-camera-card',{entity:'camera.door'});const configs=[];
  window.loadCardHelpers=async()=>({createCardElement:config=>{configs.push(config);return window.document.createElement('native-camera-test');}});
  window.document.body.append(card);await tick();assert.equal(configs.length,1);assert.equal(configs[0].camera_view,'auto');assert.equal(configs[0].tap_action.action,'more-info');
  const child=q('.native').firstElementChild;card.hass=hass;assert.equal(q('.native').firstElementChild,child);assert.equal(child.hass,hass);
  assert.throws(()=>card.setConfig({entity:'camera.door',camera_view:'live'}),/미리보기/);card.setConfig({entity:'camera.door',fit_mode:'contain'});await tick();assert.equal(configs.at(-1).camera_view,'auto');assert.equal(configs.at(-1).fit_mode,'contain');
  hass.states['camera.door'].state='unavailable';card.hass=hass;assert.equal(q('.native').childElementCount,0);assert.match(q('.state').textContent,/확인 불가/);
  hass.states['camera.door'].state='idle';card.hass=hass;await tick();assert.equal(q('.native').childElementCount,1);
  card.remove();assert.equal(q('.native').childElementCount,0);window.document.body.append(card);await tick();assert.equal(q('.native').childElementCount,1);
});
test('late camera helper response cannot restore detached or outdated stream; helper errors can retry',async t=>{
  const {window,card,q}=setup(t,'compact-camera-card',{entity:'camera.door'});let resolve;
  window.loadCardHelpers=()=>new Promise(r=>resolve=r);window.document.body.append(card);card.remove();
  resolve({createCardElement:()=>assert.fail('detached stream created')});await tick();assert.equal(q('.native').childElementCount,0);
  window.loadCardHelpers=async()=>{throw new Error('offline');};window.document.body.append(card);await tick();assert.equal(q('.retry').hidden,false);
  window.loadCardHelpers=async()=>({createCardElement:()=>window.document.createElement('native-camera-test')});q('.retry').click();await tick();assert.equal(q('.native').childElementCount,1);
  assert.throws(()=>card.setConfig({entity:'image.floor'}));assert.throws(()=>card.setConfig({entity:'camera.door',camera_view:'snapshot'}));
});
test('picture editors expose domain-aware fields, preserve YAML and work without ha-form',async t=>{
  for(const type of ['compact-image-card','compact-camera-card']){
    const {window,card,hass}=setup(t,type,type.includes('image')?{image:'/local/test.jpg'}:{entity:'camera.door'});
    window.customElements.define('ha-form',class extends window.HTMLElement{});
    const editor=await card.constructor.getConfigElement();editor.setConfig({...card._config,future:{keep:1}});editor.hass=hass;
    const form=editor.shadowRoot.querySelector('ha-form');assert.ok(form.schema.some(s=>s.name==='entity'&&s.selector.entity.domain===(type.includes('image')?'image':'camera')));
    let config;editor.addEventListener('config-changed',e=>config=e.detail.config);form.dispatchEvent(new window.CustomEvent('value-changed',{detail:{value:{name:'새 이름'}},bubbles:true}));assert.equal(config.name,'새 이름');assert.equal(config.future.keep,1);
  }
  const {card,hass}=setup(t,'compact-image-card',{image:'/local/test.jpg'});const editor=await card.constructor.getConfigElement();editor.setConfig(card._config);editor.hass=hass;assert.ok(editor.shadowRoot.querySelector('input[data-field="image"]'));
});

test('thumbnail activation opens native entity details; static image opens a native picture card in a closable dialog',async t=>{
  const {window,card,hass,q}=setup(t,'compact-image-card',{image:'/local/floor.png',name:'평면도'});window.document.body.append(card);
  const configs=[];window.loadCardHelpers=async()=>({createCardElement:config=>{configs.push(config);return window.document.createElement('native-picture-test');}});
  let shown=0,closed=0;const dialog=q('dialog');dialog.showModal=()=>{shown++;dialog.setAttribute('open','');};dialog.close=()=>{closed++;dialog.removeAttribute('open');dialog.dispatchEvent(new window.Event('close'));};
  q('.surface').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await tick();assert.equal(shown,1);assert.equal(configs[0].type,'picture');assert.equal(configs[0].image,'/local/floor.png');assert.equal(q('.full').firstElementChild.hass,hass);
  q('.close').click();assert.equal(closed,1);assert.equal(q('.full').childElementCount,0);
  card.setConfig({entity:'image.floor'});let details;card.addEventListener('hass-more-info',event=>details=event.detail);q('.surface').click();assert.equal(details.entityId,'image.floor');
  assert.equal(card.getCardSize(),1);assert.equal(card.getGridOptions().min_rows,1);
});
test('loss of image credentials clears the previous thumbnail instead of leaving a stale picture',t=>{
  const {card,hass,q}=setup(t,'compact-image-card',{entity:'image.floor'});delete hass.states['image.floor'].attributes.access_token;card.hass=hass;assert.equal(q('img'),null);
});
