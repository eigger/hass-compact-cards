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
    assert.equal(ref.input.value,'51');assert.equal(ref.input.disabled,false);assert.equal(ref.input.getAttribute('aria-busy'),'true');
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

test('Kelvin keyboard uses practical increments, exact device bounds and one command per change',async()=>{
  const {window,card,calls}=setup('compact-light-row',{
    supported_color_modes:['color_temp'],min_color_temp_kelvin:2235,max_color_temp_kelvin:6473,color_temp_kelvin:3500,
  });
  const input=card._kelvin.input;
  const press=async(key,options={})=>{
    const event=new window.KeyboardEvent('keydown',{key,cancelable:true,...options});input.dispatchEvent(event);
    await new Promise(resolve=>setImmediate(resolve));return event;
  };
  assert.equal((await press('ArrowRight')).defaultPrevented,true);
  assert.equal(calls.length,1);assert.equal(calls.at(-1)[2].color_temp_kelvin,3600);
  await press('ArrowLeft',{shiftKey:true});assert.equal(calls.at(-1)[2].color_temp_kelvin,3550);
  await press('PageUp');assert.equal(calls.at(-1)[2].color_temp_kelvin,4050);
  await press('Home');assert.equal(calls.at(-1)[2].color_temp_kelvin,2235);
  const atMin=calls.length;await press('ArrowLeft');assert.equal(calls.length,atMin);
  await press('End');assert.equal(calls.at(-1)[2].color_temp_kelvin,6473);
  const atMax=calls.length;await press('ArrowRight');assert.equal(calls.length,atMax);
  assert.equal((await press('ArrowLeft',{ctrlKey:true})).defaultPrevented,false);assert.equal(calls.length,atMax);
  assert.equal(input.step,'1');input.value='3501';input.dispatchEvent(new window.Event('input'));input.dispatchEvent(new window.Event('change'));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.at(-1)[2].color_temp_kelvin,3501);
  window.happyDOM.abort();
});

test('Kelvin shortcuts do not act during a request or for unsupported color temperature',async()=>{
  const {window,card,hass,calls,entity}=setup('compact-light-row',{
    supported_color_modes:['color_temp'],min_color_temp_kelvin:2200,max_color_temp_kelvin:6500,color_temp_kelvin:3500,
  });
  let done;hass.callService=(...args)=>{calls.push(args);return new Promise(resolve=>done=resolve);};
  const input=card._kelvin.input;
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));
  assert.equal(input.disabled,false);assert.equal(input.getAttribute('aria-disabled'),'true');input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));assert.equal(calls.length,1);
  done();await new Promise(resolve=>setImmediate(resolve));
  hass.states[entity].attributes.supported_color_modes=['onoff'];card.hass=hass;
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));assert.equal(calls.length,1);
  window.happyDOM.abort();
});

test('cover action labels preserve direct open stop close actions and capability visibility',async()=>{
  const {window,card,hass,calls,entity}=setup('compact-cover-row',{supported_features:15,current_position:30},'open');
  for(const [key,label,service] of [['_open','열기','open_cover'],['_stop','정지','stop_cover'],['_close','닫기','close_cover']]){
    assert.equal(card[key].querySelector('.control-label').textContent,label);
    card[key].click();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.at(-1)[1],service);assert.equal(calls.at(-1)[2].entity_id,entity);
  }
  hass.states[entity].attributes.supported_features=4;card.hass=hass;
  assert.equal(card._open.hidden,true);assert.equal(card._stop.hidden,true);assert.equal(card._close.hidden,true);
  window.happyDOM.abort();
});

test('focused ranges remain focusable pending requests, reject extra edits and never steal moved focus',async()=>{
  for(const [type,key,attributes,value] of [
    ['compact-light-row','_brightness',{supported_color_modes:['brightness'],brightness:128},'on'],
    ['compact-light-row','_kelvin',{supported_color_modes:['color_temp'],min_color_temp_kelvin:2200,max_color_temp_kelvin:6500,color_temp_kelvin:3500},'on'],
    ['compact-cover-row','_position',{supported_features:4,current_position:50},'open'],
  ]){
    const {window,card,hass,calls,entity}=setup(type,attributes,value);window.document.body.append(card);
    const ref=card[key],input=ref.input,other=window.document.createElement('button');window.document.body.append(other);
    let done;hass.callService=(...args)=>{calls.push(args);return new Promise(resolve=>done=resolve);};
    const start=()=>{input.focus();input.value=key==='_kelvin'?'3600':'51';input.dispatchEvent(new window.Event('input'));input.dispatchEvent(new window.Event('change'));};
    start();assert.equal(input.disabled,false);assert.equal(card.shadowRoot.activeElement,input);assert.equal(input.getAttribute('aria-busy'),'true');
    const requested=input.value;
    input.value=key==='_kelvin'?'4500':'90';input.dispatchEvent(new window.Event('input'));input.dispatchEvent(new window.Event('change'));
    assert.equal(input.value,requested);assert.equal(calls.length,1);
    const keyEvent=new window.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true});input.dispatchEvent(keyEvent);assert.equal(keyEvent.defaultPrevented,true);
    const pointerEvent=new window.Event('pointerdown',{cancelable:true});input.dispatchEvent(pointerEvent);assert.equal(pointerEvent.defaultPrevented,true);
    const tab=new window.KeyboardEvent('keydown',{key:'Tab',cancelable:true});input.dispatchEvent(tab);assert.equal(tab.defaultPrevented,false);
    done();await new Promise(resolve=>setImmediate(resolve));assert.equal(card.shadowRoot.activeElement,input);assert.equal(input.getAttribute('aria-busy'),'false');
    start();other.focus();done();await new Promise(resolve=>setImmediate(resolve));assert.equal(window.document.activeElement,other);
    hass.states[entity].state='unavailable';card.hass=hass;assert.equal(input.disabled,true);
    window.happyDOM.abort();
  }
});
