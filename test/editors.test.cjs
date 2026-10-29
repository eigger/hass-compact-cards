const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
const source=readFileSync('compact-cards.js','utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const types=['compact-climate-row','compact-home-panel','compact-light-row','compact-cover-row','compact-scene-panel','compact-environment-panel','compact-media-row'];
async function setup(t,type,config,forms=true){
  const window=new Window({url:'http://homeassistant.local/'});if(forms)window.customElements.define('ha-form',class extends window.HTMLElement{});window.eval(source);
  const hass={states:{'sensor.room':{entity_id:'sensor.room',state:'22',attributes:{friendly_name:'Room'}},'scene.relax':{entity_id:'scene.relax',state:'unknown',attributes:{}}},callService:()=>assert.fail('configuration must not call services')};
  const editor=await window.customElements.get(type).getConfigElement();editor.setConfig(config);editor.hass=hass;window.document.body.append(editor);
  const events=[];editor.addEventListener('config-changed',event=>events.push(event));
  const form=path=>[...editor.shadowRoot.querySelectorAll('ha-form')].find(node=>node.dataset.path===JSON.stringify(path));
  const change=(path,value)=>form(path).dispatchEvent(new window.CustomEvent('value-changed',{detail:{value},bubbles:true,composed:true}));
  const add=path=>[...editor.shadowRoot.querySelectorAll('[data-add]')].find(node=>node.dataset.add===JSON.stringify(path)).click();
  t.after(()=>{editor.remove();window.happyDOM.abort();});
  return {window,editor,hass,events,form,change,add};
}

test('all seven card constructors provide visual editors with domain-aware fields',async t=>{
  for(const type of types){
    const config=type.endsWith('panel')?{type:`custom:${type}`,items:[{entity:type.includes('scene')?'scene.relax':'sensor.room'}]}:{type:`custom:${type}`,entity:`${type.includes('climate')?'climate':type.includes('light')?'light':type.includes('cover')?'cover':'media_player'}.room`};
    const {editor,events,form}=await setup(t,type,config);
    assert.equal(editor.localName,`${type}-editor`);assert.equal(events.length,0);
    assert.ok(form([]));assert.equal(editor.shadowRoot.querySelector('textarea'),null);
    if(type==='compact-media-row'){assert.equal(form([]).data.show_volume,true);assert.equal(form([]).data.show_next,true);}
  }
});

test('editor bootstrap loads native entities editor to make ha-form available',async t=>{
  const window=new Window();window.eval(source);let helpers=0,native=0;
  window.loadCardHelpers=async()=>{helpers++;return {createCardElement:config=>{assert.equal(config.type,'entities');return {constructor:{getConfigElement:async()=>{native++;window.customElements.define('ha-form',class extends window.HTMLElement{});}}};}};};
  const editor=await window.customElements.get('compact-climate-row').getConfigElement();editor.setConfig({entity:'climate.room'});
  assert.equal(helpers,1);assert.equal(native,1);assert.ok(editor.shadowRoot.querySelector('ha-form'));t.after(()=>window.happyDOM.abort());
});

test('form edits emit immutable complete configs preserving unknown YAML and focus nodes',async t=>{
  const original={type:'custom:compact-media-row',entity:'media_player.room',name:'Before',grid_options:{columns:6},future:{nested:[1,2]},show_volume:false};
  const {editor,change,form,events}=await setup(t,'compact-media-row',original);const node=form([]);
  change([],{entity:'media_player.room',name:'After',show_volume:false,show_next:true});
  assert.equal(events.length,1);assert.equal(events[0].bubbles,true);assert.equal(events[0].composed,true);
  const result=events[0].detail.config;assert.equal(result.name,'After');assert.deepEqual(plain(result.future),original.future);assert.deepEqual(plain(result.grid_options),original.grid_options);assert.equal(original.name,'Before');assert.equal(form([]),node);
  result.future.nested.push(3);assert.deepEqual(plain(editor._config.future),original.future);
  editor.setConfig(plain(editor._config));assert.equal(form([]),node);
});

test('scene items add remove reorder and preserve confirmation while editing names',async t=>{
  const {editor,change,add,events}=await setup(t,'compact-scene-panel',{items:[{entity:'scene.first',confirmation:'Sure?',custom:7},{entity:'script.second'}]});
  change(['items',0],{name:'First'});assert.equal(editor._config.items[0].confirmation,'Sure?');assert.equal(editor._config.items[0].custom,7);assert.equal(editor.shadowRoot.querySelector('summary').textContent,'1. First');
  let details=[...editor.shadowRoot.querySelectorAll('details')];details[0].querySelector('button[aria-label$="아래로"]').click();assert.equal(editor._config.items[1].entity,'scene.first');
  add(['items']);assert.equal(editor._config.items.length,3);assert.equal(editor._config.items[2].entity,'scene.relax');
  details=[...editor.shadowRoot.querySelectorAll('details')];details[2].querySelector('button[aria-label$="삭제"]').click();assert.equal(editor._config.items.length,2);assert.equal(events.length,4);
});

test('home editor creates every supported item shape and nested badge/comparison forms',async t=>{
  const {editor,add,form}=await setup(t,'compact-home-panel',{items:[]});
  for(const type of ['entity','lookup','heading','note','climate','light','cover','comparison','navigate','media']){
    const chooser=editor.shadowRoot.querySelector('select[aria-label="추가할 항목 유형"]');chooser.value=type;add(['items']);
    const item=editor._config.items.at(-1);if(type==='entity')assert.equal(item.type,undefined);else if(type==='lookup')assert.equal(item.find_name,'센서 이름');else assert.equal(item.type,type);
  }
  add(['items',2,'badges']);assert.equal(editor._config.items[2].badges[0].entity,'sensor.room');assert.ok(form(['items',2,'badges',0]));
  add(['items',7,'rows']);assert.equal(editor._config.items[7].rows.length,2);assert.ok(form(['items',7,'rows',1]));
});

test('home item type switching repairs domain and preserves unrelated YAML fields',async t=>{
  const {window,editor}=await setup(t,'compact-home-panel',{items:[{entity:'sensor.room',name:'Room',future:{x:1}}]});
  let selector=editor.shadowRoot.querySelector('select[aria-label="항목 유형"]');selector.value='climate';selector.dispatchEvent(new window.Event('change'));
  assert.equal(editor._config.items[0].type,'climate');assert.equal(editor._config.items[0].entity,'climate.living_room');assert.equal(editor._config.items[0].name,'Room');assert.deepEqual(plain(editor._config.items[0].future),{x:1});
  selector=editor.shadowRoot.querySelector('select[aria-label="항목 유형"]');selector.value='lookup';selector.dispatchEvent(new window.Event('change'));assert.equal(editor._config.items[0].entity,undefined);assert.equal(editor._config.items[0].type,undefined);
});

test('environment threshold forms edit numeric direction and level with immutable nested state',async t=>{
  const original={items:[{entity:'sensor.room',thresholds:[{value:25,direction:'above',level:'warning',future:9}]}]};
  const {editor,change,add,form}=await setup(t,'compact-environment-panel',original);
  change(['items',0,'thresholds',0],{value:-2.35,direction:'below',level:'critical'});
  assert.equal(editor._config.items[0].thresholds[0].value,-2.35);assert.equal(editor._config.items[0].thresholds[0].future,9);assert.equal(original.items[0].thresholds[0].value,25);
  add(['items',0,'thresholds']);assert.equal(editor._config.items[0].thresholds.length,2);assert.ok(form(['items',0,'thresholds',1]));
  change([],{columns:'3'});assert.equal(editor._config.columns,3);
});

test('home action UI edits targets confirmations and primitive service data without losing structured data',async t=>{
  const config={items:[{entity:'script.night',tap_action:{action:'perform-action',perform_action:'script.turn_on',target:{entity_id:'script.night'},confirmation:{text:'Go?',extra:5},data:{brightness:30,enabled:true,nested:{preserve:[1,2]}}}}]};
  const {window,editor,change}=await setup(t,'compact-home-panel',config);
  change(['items',0,'tap_action'],{perform_action:'script.turn_on',target:{area_id:'bedroom'}});change(['items',0,'tap_action','confirmation'],{text:'Proceed?'});
  assert.equal(editor._config.items[0].tap_action.action,'perform-action');assert.equal(editor._config.items[0].tap_action.target.area_id,'bedroom');assert.equal(editor._config.items[0].tap_action.confirmation.extra,5);
  const input=editor.shadowRoot.querySelector('input[aria-label="brightness 값"]');input.value='75';input.dispatchEvent(new window.Event('change'));
  assert.equal(editor._config.items[0].tap_action.data.brightness,75);assert.deepEqual(plain(editor._config.items[0].tap_action.data.nested),{preserve:[1,2]});assert.equal(config.items[0].tap_action.data.brightness,30);
  const key=editor.shadowRoot.querySelector('input[aria-label="새 데이터 키"]');key.value='transition';editor.shadowRoot.querySelector('select[aria-label="새 데이터 유형"]').value='number';[...editor.shadowRoot.querySelectorAll('button')].find(button=>button.textContent==='데이터 추가').click();assert.equal(editor._config.items[0].tap_action.data.transition,0);
});

test('native fallback stays usable without helpers and exposes correct defaults and entity suggestions',async t=>{
  const {window,editor,events}=await setup(t,'compact-media-row',{entity:'media_player.room',future:'keep'},false);
  assert.equal(editor.shadowRoot.querySelector('ha-form'),null);assert.equal(editor.shadowRoot.querySelector('input[data-field="show_volume"]').checked,true);
  const name=editor.shadowRoot.querySelector('input[data-field="name"]');name.value='Speaker';name.dispatchEvent(new window.Event('change'));assert.equal(events[0].detail.config.name,'Speaker');assert.equal(events[0].detail.config.future,'keep');
  const checkbox=editor.shadowRoot.querySelector('input[data-field="show_volume"]');checkbox.checked=false;checkbox.dispatchEvent(new window.Event('change'));assert.equal(editor._config.show_volume,false);
});

test('existing advanced configuration round trips without unsolicited config changes',async t=>{
  for(const type of types){
    const original={type:`custom:${type}`,name:'Title',entity:'sensor.room',items:[{entity:'scene.relax',name:'Name',future:{array:[1,false]},confirmation:'Continue?',thresholds:[{value:1,direction:'above',level:'critical'}]}],layout_options:{grid_columns:3},future:{x:null}};
    const {editor,events}=await setup(t,type,original);assert.deepEqual(plain(editor._config),original);assert.equal(events.length,0);original.future.x='caller mutation';assert.equal(editor._config.future.x,null);
  }
});

test('native fallback note editor preserves and edits multiline text without flattening YAML',async t=>{
  const original={items:[{type:'note',name:'First line\nSecond line\n\nFourth line',future:'keep'}]};
  const {window,editor,events}=await setup(t,'compact-home-panel',original,false);
  const note=editor.shadowRoot.querySelector('textarea[data-field="name"]');
  assert.ok(note);assert.equal(note.value,original.items[0].name);assert.equal(events.length,0);
  note.value='Updated first line\nSecond line\n';note.dispatchEvent(new window.Event('change'));
  assert.equal(events[0].detail.config.items[0].name,'Updated first line\nSecond line\n');
  assert.equal(editor._config.items[0].future,'keep');assert.equal(original.items[0].name,'First line\nSecond line\n\nFourth line');
  editor.setConfig(events[0].detail.config);assert.equal(editor.shadowRoot.querySelector('textarea').value,'Updated first line\nSecond line\n');
});
test('native text input previews each edit without waiting for blur or replacing focus node',async t=>{
  const {window,editor,events}=await setup(t,'compact-light-row',{entity:'light.room'},false);
  const input=editor.shadowRoot.querySelector('input[data-field="name"]');input.value='거실';input.dispatchEvent(new window.Event('input'));
  assert.equal(events.at(-1).detail.config.name,'거실');assert.equal(editor.shadowRoot.querySelector('input[data-field="name"]'),input);
  input.dispatchEvent(new window.Event('change'));assert.equal(events.length,1);
});
