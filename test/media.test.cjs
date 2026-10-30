const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
const source=readFileSync('compact-cards.js','utf8');
function setup(t,features=16384|1|4|32){
  const window=new Window({url:'http://homeassistant.local/'});window.eval(source);
  const calls=[],hass={states:{'media_player.room':{entity_id:'media_player.room',state:'playing',attributes:{friendly_name:'거실',media_title:'긴 곡 이름',volume_level:.4,supported_features:features}}},callService:async(...args)=>calls.push(args)};
  const element=window.document.createElement('compact-media-row');element.setConfig({entity:'media_player.room'});element.hass=hass;window.document.body.append(element);
  t.after(()=>{element.remove();window.happyDOM.abort();});
  return {window,hass,calls,element,q:s=>element.shadowRoot.querySelector(s)};
}
test('media exposes supported controls and dispatches state-specific actions',async t=>{
  const {hass,calls,element,q}=setup(t);
  assert.equal(q('.title').textContent,'긴 곡 이름');assert.equal(q('.play').getAttribute('aria-label'),'거실 일시정지');
  q('.play').click();await new Promise(setImmediate);assert.equal(calls[0][1],'media_pause');
  hass.states['media_player.room'].state='paused';element.hass=hass;
  q('.play').click();await new Promise(setImmediate);assert.equal(calls[1][1],'media_play');
  hass.states['media_player.room'].attributes.supported_features=128;hass.states['media_player.room'].state='off';element.hass=hass;
  assert.equal(q('.next').hidden,true);assert.equal(q('.volume').hidden,true);assert.equal(q('.play').disabled,false);
  q('.play').click();await new Promise(setImmediate);assert.equal(calls[2][1],'turn_on');
});
test('unsupported media actions are hidden and cannot be invoked programmatically',async t=>{
  const {element,calls,q}=setup(t,0);assert.equal(q('.play').hidden,true);assert.equal(q('.next').hidden,true);assert.equal(q('.volume').hidden,true);
  assert.equal(await element._call('media_pause'),false);assert.equal(calls.length,0);
});
test('volume drag survives hass updates and sends one bounded value on commit',async t=>{
  const {window,element,hass,calls,q}=setup(t);const slider=q('input');
  slider.value='67';slider.dispatchEvent(new window.Event('input'));assert.equal(q('output').textContent,'67%');assert.equal(calls.length,0);
  hass.states['media_player.room'].attributes.volume_level=.41;element.hass=hass;assert.equal(slider.value,'67');
  slider.dispatchEvent(new window.Event('change'));await new Promise(setImmediate);assert.equal(calls.length,1);assert.equal(calls[0][1],'volume_set');assert.equal(calls[0][2].volume_level,.67);
  element.hass=hass;assert.equal(slider.value,'67');
  hass.states['media_player.room'].attributes.volume_level=.67;element.hass=hass;assert.equal(element._pendingVolume,undefined);
  await element._commitVolume(101);assert.equal(calls.length,1);
});
test('pending media command disables controls, rejects duplicates, recovers on failure',async t=>{
  const {element,hass,calls,q}=setup(t);let reject;
  hass.callService=(...args)=>{calls.push(args);return new Promise((resolve,rejectCall)=>{reject=rejectCall;});};
  let notice;element.addEventListener('hass-notification',e=>{notice=e.detail.message;});
  const request=element._call('media_pause');assert.equal(q('.play').disabled,true);assert.equal(q('input').disabled,false);assert.match(q('.state').textContent,/처리 중/);
  await element._call('media_pause');assert.equal(calls.length,1);reject(new Error('network failed'));await request;
  assert.match(notice,/network failed/);assert.equal(q('.play').disabled,false);assert.equal(element._busy.size,0);
});
test('media unavailable and missing volume disable controls and recover',t=>{
  const {element,hass,q}=setup(t);hass.states['media_player.room'].state='unavailable';element.hass=hass;assert.equal(q('.play').disabled,true);assert.equal(q('.title').textContent,'확인 불가');
  hass.states['media_player.room'].state='playing';delete hass.states['media_player.room'].attributes.volume_level;element.hass=hass;
  assert.equal(q('.play').disabled,false);assert.equal(q('input').disabled,true);assert.equal(q('output').textContent,'—');
  hass.states['media_player.room'].attributes.volume_level=.3;element.hass=hass;assert.equal(q('input').disabled,false);
});
test('media rejects invalid configuration and optional booleans',t=>{
  const {element}=setup(t);assert.throws(()=>element.setConfig({entity:'light.room'}),/media_player/);assert.throws(()=>element.setConfig({entity:'media_player.room',show_next:'false'}),/show_next/);
});

test('volume pointer release without a change resumes live updates',t=>{
  const {window,element,hass,q}=setup(t);const slider=q('input');
  for(const release of ['pointerup','lostpointercapture']){
    slider.dispatchEvent(new window.Event('pointerdown'));
    hass.states['media_player.room'].attributes.volume_level=.52;element.hass=hass;assert.equal(slider.value,release==='pointerup'?'40':'52');
    slider.dispatchEvent(new window.Event(release));assert.equal(element._editingVolume,false);assert.equal(slider.value,'52');
  }
});
test('pointer release preserves a changed draft until the native change commits it',async t=>{
  const {window,element,hass,calls,q}=setup(t);const slider=q('input');
  slider.dispatchEvent(new window.Event('pointerdown'));slider.value='63';slider.dispatchEvent(new window.Event('input'));
  hass.states['media_player.room'].attributes.volume_level=.42;element.hass=hass;
  slider.dispatchEvent(new window.Event('pointerup'));slider.dispatchEvent(new window.Event('lostpointercapture'));
  assert.equal(slider.value,'63');assert.equal(calls.length,0);
  slider.dispatchEvent(new window.Event('change'));await new Promise(setImmediate);
  assert.equal(calls[0][2].volume_level,.63);assert.equal(element._editingVolume,false);
});
test('a one-percent volume adjustment waits for its exact rounded acknowledgment',async t=>{
  const {element,hass,q}=setup(t);await element._commitVolume(41);
  assert.equal(q('input').value,'41');assert.equal(element._pendingVolume,41);
  element.hass=hass;assert.equal(q('input').value,'41');assert.equal(element._pendingVolume,41);
  hass.states['media_player.room'].attributes.volume_level=.41;element.hass=hass;
  assert.equal(q('input').value,'41');assert.equal(element._pendingVolume,undefined);
});

test('volume drag returning to its starting value resumes updates without change event',t=>{
  const {window,element,hass,q}=setup(t);const slider=q('input');
  slider.dispatchEvent(new window.Event('pointerdown'));slider.value='59';slider.dispatchEvent(new window.Event('input'));
  slider.value='40';slider.dispatchEvent(new window.Event('input'));
  hass.states['media_player.room'].attributes.volume_level=.52;element.hass=hass;
  slider.dispatchEvent(new window.Event('pointerup'));assert.equal(element._editingVolume,false);assert.equal(slider.value,'52');
});
test('media embeds in home panels and preserves optional controls',t=>{
  const {window,hass}=setup(t);
  const panel=window.document.createElement('compact-home-panel');panel.setConfig({items:[{type:'media',entity:'media_player.room',show_volume:false,show_next:false}]});panel.hass=hass;
  const child=panel._refs[0].child;assert.equal(child.hasAttribute('embedded'),true);assert.equal(child._config.show_volume,false);assert.equal(child._q('.volume').hidden,true);assert.equal(child._q('.next').hidden,true);
});
