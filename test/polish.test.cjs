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
  assert.equal(card.dataset.feedback,'error');assert.equal(card._feedbackText.textContent,'요청 실패');assert.equal(card._refs[0].detail.textContent,'요청 실패');
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
test('climate icon falls back to the selected mode when hvac_action is not reported',t=>{
  const {card,hass}=setup(t,'compact-climate-row',{entity:'climate.room'},{'climate.room':state('climate.room','cool',{hvac_modes:['off','cool']})});
  const icon=card.shadowRoot.querySelector('[data-mode=cool] ha-icon');assert.equal(icon.dataset.motion,'cooling');
  hass.states['climate.room'].attributes.hvac_action='idle';card.hass=hass;assert.equal(icon.classList.contains('running'),false);
});
test('samsung fan_only without hvac_action rotates the fan icon',t=>{
  const {card}=setup(t,'compact-climate-row',{entity:'climate.room'},{'climate.room':state('climate.room','fan_only',{hvac_modes:['off','cool','fan_only','dry','auto'],fan_mode:'low'})});
  const icon=card.shadowRoot.querySelector('[data-mode=fan_only] ha-icon');assert.equal(icon.dataset.motion,'fan');assert.equal(icon.classList.contains('running'),true);
});
test('home panel icons move only while a fan, vacuum or humidifier is actually active',t=>{
  const {card,hass}=setup(t,'compact-home-panel',{items:[{entity:'fan.a'},{entity:'vacuum.b'},{entity:'humidifier.c'},{entity:'light.d'}]},{'fan.a':state('fan.a','on'),'vacuum.b':state('vacuum.b','cleaning'),'humidifier.c':state('humidifier.c','on'),'light.d':state('light.d','on')});
  const motions=()=>[...card.shadowRoot.querySelectorAll('.label>ha-state-icon')].map(i=>i.dataset.motion||'');
  assert.deepEqual(motions(),['fan','sweep','pulse','glow']);
  hass.states['fan.a'].state='off';hass.states['vacuum.b'].state='docked';hass.states['humidifier.c'].state='unavailable';card.hass=hass;
  assert.deepEqual(motions(),['','','','glow']);
  assert.equal(card.shadowRoot.querySelector('.label>ha-state-icon').classList.contains('motion'),false);
});
test('home panel climate and water heater follow the same rules as the climate row',t=>{
  const {card,hass}=setup(t,'compact-home-panel',{items:[{entity:'climate.a'},{entity:'climate.b'},{entity:'climate.c'},{entity:'water_heater.d'},{entity:'water_heater.e'}]},{'climate.a':state('climate.a','fan_only'),'climate.b':state('climate.b','cool',{hvac_action:'idle'}),'climate.c':state('climate.c','heat',{hvac_action:'heating'}),'water_heater.d':state('water_heater.d','eco'),'water_heater.e':state('water_heater.e','off')});
  assert.deepEqual([...card.shadowRoot.querySelectorAll('.label>ha-state-icon')].map(i=>i.dataset.motion||''),['fan','','pulse','pulse','']);
});
test('scene items never get icon motion unless they are running scripts',t=>{
  const {card}=setup(t,'compact-scene-panel',{items:[{entity:'scene.a'}]},{'scene.a':state('scene.a','2026-01-01T00:00:00Z')});
  assert.equal(card.shadowRoot.querySelector('ha-icon').classList.contains('motion'),false);
});
test('home panel flashes a changed row once and gives locks and open doors a one-shot effect',t=>{
  const {card,hass}=setup(t,'compact-home-panel',{items:[{entity:'lock.a'},{entity:'binary_sensor.b'},{entity:'sensor.c'}]},{'lock.a':state('lock.a','locked'),'binary_sensor.b':state('binary_sensor.b','off',{device_class:'door'}),'sensor.c':state('sensor.c','20')});
  const rows=()=>[...card.shadowRoot.querySelectorAll('.row')],icons=()=>[...card.shadowRoot.querySelectorAll('.label>ha-state-icon')];
  assert.deepEqual(rows().map(r=>r.classList.contains('changed')),[false,false,false]);
  hass.states['lock.a'].state='unlocked';hass.states['binary_sensor.b'].state='on';hass.states['sensor.c'].state='21';card.hass=hass;
  assert.deepEqual(rows().map(r=>r.classList.contains('changed')),[true,true,true]);
  assert.equal(icons()[0].classList.contains('pop'),true);assert.equal(icons()[1].classList.contains('shake'),true);assert.equal(icons()[2].classList.contains('pop')||icons()[2].classList.contains('shake'),false);
});
test('flash effects clean up on animationend only for their own element and are not re-added on unchanged renders',t=>{
  const {window,card,hass}=setup(t,'compact-home-panel',{items:[{entity:'binary_sensor.b'},{entity:'light.l'}]},{'binary_sensor.b':state('binary_sensor.b','off',{device_class:'door'}),'light.l':state('light.l','off')});
  const row=card.shadowRoot.querySelector('.row'),icon=row.querySelector('ha-state-icon');
  hass.states['binary_sensor.b'].state='on';card.hass=hass;card.hass=hass;
  assert.equal(row.classList.contains('changed'),true);assert.equal(icon.classList.contains('shake'),true);
  icon.dispatchEvent(new window.Event('animationend',{bubbles:true}));
  assert.equal(icon.classList.contains('shake'),false);assert.equal(row.classList.contains('changed'),true);
  row.dispatchEvent(new window.Event('animationend',{bubbles:true}));assert.equal(row.classList.contains('changed'),false);
  hass.states['binary_sensor.b'].state='off';hass.states['light.l'].state='on';card.hass=hass;
  const rows=card.shadowRoot.querySelectorAll('.row');
  assert.equal(rows[0].classList.contains('changed'),true);assert.equal(icon.classList.contains('shake'),false);
  assert.equal(rows[1].classList.contains('changed'),true);assert.equal(rows[1].querySelector('ha-state-icon').classList.contains('pop'),false);
});
test('a change into unavailable does not flash',t=>{
  const {card,hass}=setup(t,'compact-home-panel',{items:[{entity:'lock.a'}]},{'lock.a':state('lock.a','locked')});
  hass.states['lock.a'].state='unavailable';card.hass=hass;
  assert.equal(card.shadowRoot.querySelector('.row').classList.contains('changed'),false);
});
test('home panel does not flash when an entity merely recovers from unavailable',t=>{
  const {card,hass}=setup(t,'compact-home-panel',{items:[{entity:'lock.a'}]},{'lock.a':state('lock.a','unavailable')});
  hass.states['lock.a'].state='locked';card.hass=hass;
  assert.equal(card.shadowRoot.querySelector('.row').classList.contains('changed'),false);
});
test('scene script icon pulses only while the script runs',t=>{
  const {card,hass}=setup(t,'compact-scene-panel',{items:[{entity:'script.go'}]},{'script.go':state('script.go','on')});
  const icon=card.shadowRoot.querySelector('ha-icon');assert.equal(icon.dataset.motion,'pulse');
  hass.states['script.go'].state='off';card.hass=hass;assert.equal(icon.classList.contains('motion'),false);
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

test('home toggle dims only its controls while pending and waits for HA state before showing on',async t=>{
  const {window,card,hass,calls}=setup(t,'compact-home-panel',{items:[
    {entity:'switch.purifier',name:'전원',tap_action:{action:'toggle'}},
    {entity:'switch.other',name:'다른 기기',tap_action:{action:'toggle'}}
  ]},{'switch.purifier':state('switch.purifier','off'),'switch.other':state('switch.other','off')});
  const [ref,other]=card._refs;
  const offColor=ref.row.style.getPropertyValue('--entity-color');
  let resolve;hass.callService=(...args)=>{calls.push(args);return new Promise(done=>resolve=done);};
  const pending=card._toggle(ref);
  assert.equal(ref.label.getAttribute('aria-busy'),'true');assert.equal(ref.control.getAttribute('aria-busy'),'true');
  assert.equal(ref.label.disabled,true);assert.equal(ref.control.disabled,true);assert.equal(other.label.disabled,false);
  for(const button of [ref.label,ref.control]){const style=window.getComputedStyle(button);assert.equal(Number(style.opacity),.65);assert.equal(style.cursor,'progress');assert.doesNotMatch(style.outline,/dotted|dashed/);}
  assert.equal(ref.control.getAttribute('aria-checked'),'false');assert.equal(ref.row.style.getPropertyValue('--entity-color'),offColor);
  await card._toggle(ref);assert.equal(calls.length,1);
  resolve();await pending;
  assert.equal(ref.label.getAttribute('aria-busy'),'false');assert.equal(ref.control.disabled,false);
  assert.equal(ref.control.getAttribute('aria-checked'),'false');assert.equal(ref.row.style.getPropertyValue('--entity-color'),offColor);
  hass.states['switch.purifier'].state='on';card.hass=hass;
  assert.equal(ref.control.getAttribute('aria-checked'),'true');assert.notEqual(ref.row.style.getPropertyValue('--entity-color'),offColor);
});
