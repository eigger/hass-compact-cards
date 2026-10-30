const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
const source=readFileSync('compact-cards.js','utf8');
const state=(entity_id,value,attributes={})=>({entity_id,state:value,attributes});
function setup(t,items,states={}){
 const window=new Window({url:'http://homeassistant.local/'});window.eval(source);
 const calls=[],info=[],hass={states,callService:async(...args)=>calls.push(args)};
 const card=window.document.createElement('compact-home-panel');card.setConfig({items});card.hass=hass;window.document.body.append(card);
 card.addEventListener('hass-more-info',event=>info.push(event.detail.entityId));
 t.after(()=>{card.remove();window.happyDOM.abort();});
 return {window,card,hass,calls,info};
}
const flush=()=>new Promise(setImmediate);

test('explicit more-info label is a native button usable for known unavailable or unknown entities',async t=>{
 const {card,hass,calls,info}=setup(t,[{entity:'sensor.room',tap_action:{action:'more-info'}}],{'sensor.room':state('sensor.room','23.4')});
 const label=card._refs[0].label;assert.equal(label.tagName,'BUTTON');assert.notEqual(label.getAttribute('tabindex'),'-1');
 for(const value of ['23.4','unknown','unavailable']){hass.states['sensor.room']=state('sensor.room',value);card.hass=hass;assert.equal(label.disabled,false);label.click();await flush();}
 assert.deepEqual(info,['sensor.room','sensor.room','sensor.room']);assert.equal(calls.length,0);
 delete hass.states['sensor.room'];card.hass=hass;assert.equal(label.disabled,true);label.click();label.onclick();await flush();assert.equal(info.length,3);
});

test('explicit toggle label dispatches once to the configured entity and leaves its value display intact',async t=>{
 const {card,calls,info}=setup(t,[{entity:'input_boolean.away',name:'외출',tap_action:{action:'toggle'}}],{'input_boolean.away':state('input_boolean.away','off')});
 const ref=card._refs[0];assert.equal(ref.label.tagName,'BUTTON');assert.equal(ref.label.disabled,false);assert.ok(ref.value);assert.equal(ref.value.tagName,'SPAN');
 ref.label.click();await flush();assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(0,2),['homeassistant','toggle']);assert.equal(calls[0][2].entity_id,'input_boolean.away');assert.equal(info.length,0);
});

test('explicit toggle label and right switch share confirmation and pending duplicate guards, then recover after failure',async t=>{
 const {window,card,hass,calls}=setup(t,[{entity:'light.room',tap_action:{action:'toggle',confirmation:{text:'조명을 전환할까요?'}}}],{'light.room':state('light.room','off')});
 const ref=card._refs[0];let confirmations=0;window.confirm=()=>{confirmations++;return false;};
 ref.label.click();ref.control.click();await flush();assert.equal(confirmations,2);assert.equal(calls.length,0);
 window.confirm=()=>{confirmations++;return true;};let reject;hass.callService=(...args)=>{calls.push(args);return new Promise((resolve,fail)=>reject=fail);};
 let notice;card.addEventListener('hass-notification',event=>notice=event.detail.message);
 const pending=ref.label.onclick();assert.equal(calls.length,1);assert.equal(ref.label.disabled,true);assert.equal(ref.control.disabled,true);assert.equal(ref.label.getAttribute('aria-busy'),'true');
 ref.label.onclick();ref.control.onclick();assert.equal(calls.length,1);assert.equal(confirmations,3);
 reject(new Error('connection failed'));await pending;await flush();assert.match(notice,/connection failed/);assert.equal(ref.label.disabled,false);assert.equal(ref.control.disabled,false);
 hass.callService=async(...args)=>calls.push(args);ref.control.click();await flush();assert.equal(calls.length,2);assert.equal(confirmations,4);assert.equal(calls[1][2].entity_id,'light.room');
});

test('offline and missing toggle targets are blocked even through programmatic label or right-switch handlers',async t=>{
 const {window,card,hass,calls}=setup(t,[{entity:'switch.room',tap_action:{action:'toggle',confirmation:{text:'전환?'}}}],{});
 let confirmations=0;window.confirm=()=>{confirmations++;return true;};const ref=card._refs[0];
 for(const value of [undefined,'unknown','unavailable']){
  if(value===undefined)delete hass.states['switch.room'];else hass.states['switch.room']=state('switch.room',value);
  card.hass=hass;assert.equal(ref.label.disabled,true);assert.equal(ref.control.disabled,true);await ref.label.onclick();await ref.control.onclick();
 }
 assert.equal(calls.length,0);assert.equal(confirmations,0);
 hass.states['switch.room']=state('switch.room','off');card.hass=hass;ref.label.click();await flush();assert.equal(calls.length,1);assert.equal(confirmations,1);
});

test('default and legacy perform-action labels retain more-info while dedicated controls keep their behavior',async t=>{
 const {card,calls,info}=setup(t,[
  {entity:'light.room'},
  {entity:'script.night',tap_action:{action:'perform-action',perform_action:'script.turn_on',target:{entity_id:'script.other'},data:{variables:{mode:'quiet'}}}},
  {entity:'select.preset',tap_action:{action:'more-info'}},
 ],{'light.room':state('light.room','on'),'script.night':state('script.night','off'),'select.preset':state('select.preset','Eco',{options:['Eco','Comfort']})});
 for(const ref of card._refs)ref.label.click();await flush();assert.deepEqual(info,['light.room','script.night','select.preset']);assert.equal(calls.length,0);
 card._refs[0].control.click();await flush();assert.equal(calls[0][1],'toggle');
 card._refs[1].control.click();await flush();assert.deepEqual(calls[1].slice(0,2),['script','turn_on']);assert.equal(calls[1][4].entity_id,'script.other');assert.equal(calls[1][2].variables.mode,'quiet');
 const select=card._refs[2].select;select.value='Comfort';select.onchange();await flush();assert.equal(calls[2][1],'select_option');assert.equal(calls[2][2].option,'Comfort');
});

test('unsupported actions, invalid services and name-only toggles fail source configuration validation',t=>{
 const {card}=setup(t,[]);
 for(const item of [
  {entity:'light.room',tap_action:{action:'navigate'}},
  {entity:'light.room',tap_action:{action:'none'}},
  {entity:'light.room',tap_action:{action:'call-service',service:'light.toggle'}},
  {entity:'script.night',tap_action:{action:'perform-action',perform_action:'invalid'}},
  {find_name:'외출',tap_action:{action:'toggle'}},
  {entity:42,find_name:'외출',tap_action:{action:'toggle'}},
  {entity:'',tap_action:{action:'toggle'}},
 ])assert.throws(()=>card.setConfig({items:[item]}),/items\[0\]/);
 assert.doesNotThrow(()=>card.setConfig({items:[{find_name:'실내 온도',tap_action:{action:'more-info'}}]}));
});

test('toggle ignores foreign targets and service data while always using the row entity',async t=>{
 const {card,calls}=setup(t,[{entity:'light.room',tap_action:{action:'toggle',target:{entity_id:'light.other'},data:{entity_id:'light.other',brightness_pct:1}}}],{'light.room':state('light.room','off'),'light.other':state('light.other','on')});
 card._refs[0].label.click();await flush();assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(0,2),['homeassistant','toggle']);assert.equal(calls[0][2].entity_id,'light.room');assert.equal(calls[0][2].brightness_pct,undefined);assert.equal(calls[0][4],undefined);
});

test('more-info honors optional confirmation and name lookup without sending a service',async t=>{
 const {window,card,calls,info}=setup(t,[{find_name:'실내 온도',tap_action:{action:'more-info',confirmation:{text:'상세 정보를 열까요?'}}}],{'sensor.room':state('sensor.room','unavailable',{friendly_name:'실내 온도'})});
 let text;window.confirm=message=>{text=message;return false;};card._refs[0].label.click();await flush();assert.equal(text,'상세 정보를 열까요?');assert.equal(info.length,0);
 window.confirm=()=>true;card._refs[0].label.click();await flush();assert.deepEqual(info,['sensor.room']);assert.equal(calls.length,0);
});
