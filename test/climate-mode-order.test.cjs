const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Window}=require('happy-dom');
const source=readFileSync('compact-cards.js','utf8');
function setup(t){
 const window=new Window();window.eval(source);
 const card=window.document.createElement('compact-climate-row');card.setConfig({entity:'climate.room'});
 t.after(()=>{card.remove();window.happyDOM.abort();});
 return {card};
}

test('climate modes use consistent device-independent order with cooling beside power',async t=>{
 const {card}=setup(t),modes=()=>[...card.shadowRoot.querySelector('.modes').children].map(button=>button.dataset.mode);
 const cases=[
  {input:['off','heat'],expected:['heat','off']},
  {input:['off','cool','fan_only','dry','auto'],expected:['auto','fan_only','dry','cool','off']},
  {input:['cool','off','custom_b','heat_cool','heat','auto','custom_a','dry','fan_only'],expected:['custom_b','custom_a','auto','heat_cool','fan_only','dry','heat','cool','off']},
 ];
 const calls=[];
 for(const {input,expected} of cases){
  const original=[...input];
  card.hass={states:{'climate.room':{state:'cool',attributes:{hvac_modes:input}}},callService:async(...args)=>calls.push(args)};
  assert.deepEqual(modes(),expected);assert.deepEqual(input,original,'rendering must preserve the device mode list');
  for(const button of card.shadowRoot.querySelector('.modes').children){
   await button.onclick();
   const [domain,service,data]=calls.at(-1);
   assert.equal(domain,'climate');assert.equal(service,'set_hvac_mode');
   assert.equal(data.entity_id,'climate.room');assert.equal(data.hvac_mode,button.dataset.mode);
  }
 }
});
