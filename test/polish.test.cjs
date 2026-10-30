const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
function setup(t,type,config,states){
  const window=new Window();window.eval(readFileSync('compact-cards.js','utf8'));
  const calls=[],hass={states,callService:async(...args)=>calls.push(args)};
  const card=window.document.createElement(type);card.setConfig(config);card.hass=hass;window.document.body.append(card);
  t.after(()=>{card.remove();window.happyDOM.abort();});return {window,card,hass,calls};
}
const state=(entity_id,value,attributes={})=>({entity_id,state:value,attributes});
test('scene distinguishes pending and accepted requests, clears its brief success feedback',async t=>{
  const {card,hass}=setup(t,'compact-scene-panel',{items:[{entity:'scene.relax'}]},{'scene.relax':state('scene.relax','unknown')});
  let resolve;hass.callService=()=>new Promise(done=>resolve=done);
  const pending=card._activate(card._refs[0]);assert.equal(card.dataset.feedback,'pending');assert.equal(card._refs[0].detail.textContent,'실행 요청 중…');
  resolve();await pending;assert.equal(card.dataset.feedback,'success');assert.equal(card._refs[0].detail.textContent,'요청 전달됨');
  assert.equal(hass.states['scene.relax'].state,'unknown');
  await new Promise(done=>setTimeout(done,1900));assert.equal(card.hasAttribute('data-feedback'),false);assert.equal(card._refs[0].detail.textContent,'실행');
});
test('failed scene request indicates error and does not claim acceptance',async t=>{
  const {card,hass}=setup(t,'compact-scene-panel',{items:[{entity:'scene.relax'}]},{'scene.relax':state('scene.relax','unknown')});
  hass.callService=async()=>{throw new Error('offline');};await card._activate(card._refs[0]);
  assert.equal(card.dataset.feedback,'error');assert.equal(card._feedbackText.textContent,'요청 실패');assert.equal(card._refs[0].detail.textContent,'실행');
});
test('feedback cleanup prevents pending completion from leaking into another configuration or detached card',async t=>{
  const {card,hass}=setup(t,'compact-scene-panel',{items:[{entity:'scene.a'}]},{'scene.a':state('scene.a','unknown'),'scene.b':state('scene.b','unknown')});
  let resolve;hass.callService=()=>new Promise(done=>resolve=done);
  const pending=card._activate(card._refs[0]);card.setConfig({items:[{entity:'scene.b'}]});resolve();await pending;
  assert.equal(card.hasAttribute('data-feedback'),false);assert.equal(card._refs[0].detail.textContent,'실행');
  const second=card._activate(card._refs[0]);card.remove();resolve();await second;
  assert.equal(card.hasAttribute('data-feedback'),false);assert.equal(card._feedbackTimer,undefined);
});
test('cover arrows move only for actual movement and stop remains available during opening request',async t=>{
  const {card,hass}=setup(t,'compact-cover-row',{entity:'cover.room'},{'cover.room':state('cover.room','closed',{supported_features:15,current_position:0})});
  let resolve;hass.callService=()=>new Promise(done=>resolve=done);
  const pending=card._call('open_cover');assert.equal(card._open.classList.contains('moving'),false);assert.equal(card._stop.disabled,false);
  hass.states['cover.room'].state='opening';card.hass=hass;assert.equal(card._open.classList.contains('moving'),true);assert.equal(card._close.classList.contains('moving'),false);
  hass.states['cover.room'].state='unavailable';card.hass=hass;assert.equal(card._open.classList.contains('moving'),false);resolve();await pending;
});
test('climate fan rotation follows actual fan action and stops on idle or unavailable',t=>{
  const {card,hass}=setup(t,'compact-climate-row',{entity:'climate.room'},{'climate.room':state('climate.room','fan_only',{hvac_modes:['off','fan_only'],hvac_action:'fan'})});
  const icon=card.shadowRoot.querySelector('[data-mode=fan_only] ha-icon');assert.equal(icon.dataset.motion,'fan');assert.equal(icon.classList.contains('running'),true);
  hass.states['climate.room'].attributes.hvac_action='idle';card.hass=hass;assert.equal(icon.classList.contains('running'),false);
  hass.states['climate.room'].state='unavailable';card.hass=hass;assert.equal(icon.classList.contains('running'),false);
});
test('media playback dot follows reported playback without changing state after successful request',async t=>{
  const {card,hass}=setup(t,'compact-media-row',{entity:'media_player.room'},{'media_player.room':state('media_player.room','playing',{supported_features:16385})});
  const play=card.shadowRoot.querySelector('.play');assert.equal(play.classList.contains('playing'),true);
  await card._call('media_pause');assert.equal(play.classList.contains('playing'),true);assert.equal(card.dataset.feedback,'success');
  hass.states['media_player.room'].state='paused';card.hass=hass;assert.equal(play.classList.contains('playing'),false);
});
test('light power label describes the available action, and canceled slider restores actual value',t=>{
  const {window,card,hass}=setup(t,'compact-light-row',{entity:'light.room'},{'light.room':state('light.room','on',{friendly_name:'거실',supported_color_modes:['brightness'],brightness:102})});
  assert.equal(card._toggle.getAttribute('aria-label'),'거실 끄기');
  card._brightness.input.value='80';card._brightness.input.dispatchEvent(new window.Event('input'));card._brightness.input.dispatchEvent(new window.Event('pointercancel'));
  assert.equal(card._brightness.input.value,'40');hass.states['light.room'].state='off';card.hass=hass;assert.equal(card._toggle.getAttribute('aria-label'),'거실 켜기');
});
