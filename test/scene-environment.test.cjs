const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { Window } = require('happy-dom');
const source = readFileSync('compact-cards.js','utf8');
const state = (entity_id,value,attributes={}) => ({entity_id,state:value,attributes});
function setup(type,config,states={}) {
  const window = new Window(); window.eval(source);
  const calls = [], hass = {states,callService:async (...args) => {calls.push(args);}};
  const card = window.document.createElement(type); card.setConfig(config); card.hass = hass;
  return {window,card,hass,calls};
}
test('scene allows never-activated scene, blocks unavailable and running scripts, and targets correct domain',async () => {
  const {card,hass,calls} = setup('compact-scene-panel',{items:[{entity:'scene.relax'},{entity:'script.night'}]}, {
    'scene.relax':state('scene.relax','unknown'), 'script.night':state('script.night','on'),
  });
  const [scene,script] = card._refs;
  assert.equal(scene.button.disabled,false); assert.equal(script.button.disabled,true);
  await card._activate(scene); await card._activate(script);
  assert.equal(calls.length,1); assert.deepEqual(calls[0].slice(0,2),['scene','turn_on']);
  assert.equal(calls[0][2].entity_id,'scene.relax');
  hass.states['scene.relax'] = state('scene.relax','unavailable'); card.hass=hass;
  assert.equal(scene.button.disabled,true); await card._activate(scene); assert.equal(calls.length,1);
  hass.states['script.night'] = state('script.night','off'); card.hass=hass; await card._activate(script);
  assert.equal(calls[1][0],'script');
});
test('scene confirmation cancels, duplicate requests are blocked, and errors release controls',async () => {
  const {window,card,hass,calls} = setup('compact-scene-panel',{items:[{entity:'scene.relax',confirmation:'실행?'}]}, {'scene.relax':state('scene.relax','unknown')});
  window.confirm = () => false; await card._activate(card._refs[0]); assert.equal(calls.length,0);
  window.confirm = () => true;
  let reject; hass.callService = () => new Promise((resolve,failure) => {reject=failure;});
  let message; card.addEventListener('hass-notification',event => {message=event.detail.message;});
  const pending = card._activate(card._refs[0]);
  assert.equal(card._refs[0].button.disabled,true); assert.equal(card._refs[0].button.getAttribute('aria-busy'),'true');
  await card._activate(card._refs[0]); reject(new Error('offline')); await pending;
  assert.match(message,/offline/); assert.equal(card._refs[0].button.disabled,false);
});
test('environment thresholds have explicit direction, critical precedence, text and accessible context', () => {
  const {card,hass} = setup('compact-environment-panel',{items:[{entity:'sensor.co2',name:'거실 CO₂',thresholds:[
    {value:1000,direction:'above',level:'warning'},{value:1500,direction:'above',level:'critical'},
  ]}]},{'sensor.co2':state('sensor.co2','1600',{unit_of_measurement:'ppm',device_class:'carbon_dioxide'})});
  const ref=card._refs[0]; assert.equal(ref.button.dataset.level,'critical'); assert.equal(ref.detail.textContent,'위험');
  assert.match(ref.button.getAttribute('aria-label'),/거실 CO₂ · 1600 ppm · 위험/);
  hass.states['sensor.co2'] = state('sensor.co2','1000',{unit_of_measurement:'ppm'}); card.hass=hass;
  assert.equal(ref.button.dataset.level,'warning');
  hass.states['sensor.co2'] = state('sensor.co2','900',{unit_of_measurement:'ppm'}); card.hass=hass;
  assert.equal(ref.button.dataset.level,''); assert.equal(ref.detail.hidden,true);
});
test('environment handles unavailable numeric values, localized units and more-info', () => {
  const {card,hass} = setup('compact-environment-panel',{items:[{entity:'sensor.room',thresholds:[{value:10,direction:'below',level:'warning'}]}]}, {'sensor.room':state('sensor.room','5',{unit_of_measurement:'°C'})});
  const ref=card._refs[0]; assert.equal(ref.button.dataset.level,'warning');
  hass.formatEntityState = () => '5 °C'; card.hass=hass;
  assert.equal(ref.number.textContent,'5 °C'); assert.equal(ref.unit.textContent,'');
  let id; card.addEventListener('hass-more-info',event => {id=event.detail.entityId;}); ref.button.click(); assert.equal(id,'sensor.room');
  for(const value of ['unknown','unavailable','NaN','', 'Infinity']) {
    hass.states['sensor.room']=state('sensor.room',value);card.hass=hass;
    assert.equal(ref.number.textContent,'—');assert.equal(ref.button.dataset.level,'');assert.equal(ref.detail.textContent,'확인 불가');
  }
});
test('new panels reject invalid nested config and preserve untrusted names as text', () => {
  for(const config of [{items:[]},{items:[null]},{items:[{entity:'sensor.a'}],columns:0},{items:[{entity:'sensor.a',thresholds:[{value:'10',direction:'above',level:'warning'}]}]}]) {
    assert.throws(() => setup('compact-environment-panel',config));
  }
  assert.throws(() => setup('compact-scene-panel',{items:[{entity:'light.a'}]}));
  assert.throws(() => setup('compact-scene-panel',{items:[{entity:'scene.a',confirmation:true}]}));
  const {card}=setup('compact-environment-panel',{items:[{entity:'sensor.a',name:'<img src=x>'}]});
  assert.equal(card.shadowRoot.querySelector('img'),null);assert.equal(card._refs[0].label.textContent,'<img src=x>');
});
