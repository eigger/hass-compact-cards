const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
function setup(type,attributes={},value='on') {
  const window=new Window();window.eval(readFileSync('compact-cards.js','utf8'));
  const domain=type==='compact-light-row'?'light':'cover',entity=`${domain}.room`,calls=[];
  const hass={states:{[entity]:{entity_id:entity,state:value,attributes}},callService:async(...args)=>calls.push(args)};
  const card=window.document.createElement(type);card.setConfig({entity});card.hass=hass;
  return {window,card,hass,calls,entity};
}
test('light uses supported color modes and commits brightness only on release',async()=>{
  const {window,card,calls}=setup('compact-light-row',{supported_color_modes:['brightness'],brightness:128});
  assert.equal(card._brightness.group.hidden,false);assert.equal(card._kelvin.group.hidden,true);
  const input=card._brightness.input;input.value='75';input.dispatchEvent(new window.Event('input'));
  assert.equal(calls.length,0);assert.equal(card._brightness.output.textContent,'75%');
  input.dispatchEvent(new window.Event('change'));await Promise.resolve();
  assert.equal(calls[0][1],'turn_on');assert.equal(calls[0][2].brightness_pct,75);
});
test('hass updates do not overwrite a light slider being edited',()=>{
  const {window,card,hass}=setup('compact-light-row',{supported_color_modes:['brightness'],brightness:100});
  const input=card._brightness.input;input.value='90';input.dispatchEvent(new window.Event('input'));card.hass={...hass};
  assert.equal(input.value,'90');input.dispatchEvent(new window.Event('blur'));assert.equal(input.value,'39');
});
test('on/off lights hide sliders, color temperature uses device Kelvin bounds',()=>{
  const {card,hass,entity}=setup('compact-light-row',{supported_color_modes:['onoff']});
  assert.equal(card._brightness.group.hidden,true);
  hass.states[entity].attributes={supported_color_modes:['color_temp'],min_color_temp_kelvin:2200,max_color_temp_kelvin:5000,color_temp_kelvin:3000};card.hass=hass;
  assert.equal(card._kelvin.group.hidden,false);assert.equal(card._kelvin.input.min,'2200');assert.equal(card._kelvin.input.max,'5000');
});
test('cover hides unsupported controls and passes integer position',async()=>{
  const {window,card,calls}=setup('compact-cover-row',{supported_features:4,current_position:35},'open');
  assert.equal(card._open.hidden,true);assert.equal(card._stop.hidden,true);assert.equal(card._position.output.textContent,'35%');
  card._position.input.value='80';card._position.input.dispatchEvent(new window.Event('change'));await Promise.resolve();
  assert.equal(calls[0][1],'set_cover_position');assert.equal(calls[0][2].position,80);
});
test('cover stop remains usable during an in-flight opening command',async()=>{
  const {card,hass,calls}=setup('compact-cover-row',{supported_features:15,current_position:0},'closed');
  let resolve;hass.callService=(...args)=>{calls.push(args);return args[1]==='open_cover'?new Promise(done=>resolve=done):Promise.resolve();};
  const pending=card._call('open_cover');assert.equal(card._open.disabled,true);assert.equal(card._stop.disabled,false);
  await card._call('stop_cover',{},true);assert.equal(calls[1][1],'stop_cover');resolve();await pending;
});
test('unavailable recovery, duplicate suppression and failed commands restore controls',async()=>{
  const {card,hass,entity}=setup('compact-light-row',{},'unavailable');assert.equal(card._toggle.disabled,true);
  hass.states[entity].state='on';card.hass=hass;assert.equal(card._toggle.disabled,false);
  let reject,count=0;hass.callService=()=>{count++;return new Promise((_,no)=>reject=no);};
  let message;card.addEventListener('hass-notification',event=>message=event.detail.message);
  const pending=card._call('toggle');await card._call('toggle');assert.equal(count,1);assert.equal(card._toggle.disabled,true);
  reject(new Error('test failure'));await pending;assert.match(message,/test failure/);assert.equal(card._toggle.disabled,false);
});
test('released light and cover slider values remain until acknowledgment and reset on failure',async()=>{
  for(const [type,key,attrs,value] of [
    ['compact-light-row','_brightness',{supported_color_modes:['brightness'],brightness:128},'on'],
    ['compact-cover-row','_position',{supported_features:4,current_position:50},'open']
  ]) {
    const {window,card,hass,entity}=setup(type,attrs,value);const ref=card[key];
    let done;hass.callService=()=>new Promise(resolve=>done=resolve);
    ref.input.value='51';ref.input.dispatchEvent(new window.Event('input'));ref.input.dispatchEvent(new window.Event('change'));
    assert.equal(ref.input.value,'51');assert.equal(ref.input.disabled,true);
    card.hass={...hass};assert.equal(ref.input.value,'51');
    done();await new Promise(resolve=>setImmediate(resolve));assert.equal(ref.input.value,'51');
    if(type==='compact-light-row')hass.states[entity].attributes.brightness=130;else hass.states[entity].attributes.current_position=51;
    card.hass=hass;assert.equal(ref.pending,undefined);assert.equal(ref.input.value,'51');
    hass.callService=async()=>{throw new Error('failed');};
    ref.input.value='80';ref.input.dispatchEvent(new window.Event('change'));await new Promise(resolve=>setImmediate(resolve));
    assert.equal(ref.pending,undefined);assert.equal(ref.input.value,'51');
  }
});
test('light and cover rows embed in the home panel with shared hass and no paired grid',()=>{
  const {window,hass}=setup('compact-light-row',{supported_color_modes:['brightness']});
  const panel=window.document.createElement('compact-home-panel');
  panel.setConfig({items:[{type:'light',entity:'light.room'},{type:'cover',entity:'cover.room'}]});panel.hass=hass;
  assert.equal(panel.shadowRoot.querySelector('.pair-grid'),null);
  assert.equal(panel._refs[0].child._hass,hass);assert.equal(panel._refs[0].child.hasAttribute('embedded'),true);
  assert.equal(panel._refs[1].child._config.entity,'cover.room');
  assert.throws(()=>panel.setConfig({items:[{type:'light',entity:'cover.room'}]}),/items\[0\]/);
});
