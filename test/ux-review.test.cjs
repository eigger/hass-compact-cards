const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const {Window}=require('happy-dom');
const state=(entity_id,value,attributes={})=>({entity_id,state:value,attributes});
function setup(t,type,config,states){const window=new Window();window.eval(readFileSync('compact-cards.js','utf8'));const calls=[],hass={states,callService:async(...args)=>calls.push(args)};const card=window.document.createElement(type);card.setConfig(config);card.hass=hass;window.document.body.append(card);t.after(()=>{card.remove();window.happyDOM.abort();});return {window,hass,card,calls,q:s=>card.shadowRoot.querySelector(s)};}
const mediaFeatures=16385|4|8|32;
test('muted media reports silence and unmutes in existing volume icon slot',async t=>{
 const {card,calls,q,hass}=setup(t,'compact-media-row',{entity:'media_player.room'},{'media_player.room':state('media_player.room','playing',{supported_features:mediaFeatures,is_volume_muted:true,volume_level:.35})});
 assert.match(q('.state').textContent,/음소거/);assert.equal(q('.mute ha-icon').getAttribute('icon'),'mdi:volume-off');assert.equal(q('.mute').getAttribute('aria-pressed'),'true');assert.equal(q('.mute').disabled,false);
 q('.mute').click();await new Promise(setImmediate);assert.equal(calls[0][1],'volume_mute');assert.equal(calls[0][2].is_volume_muted,false);
 hass.states['media_player.room'].attributes.supported_features=4;card.hass=hass;assert.equal(q('.mute').disabled,true);assert.match(q('.state').textContent,/음소거/);
 card.setConfig({entity:'media_player.room',show_volume:false});assert.equal(q('.volume').hidden,true);assert.match(q('.state').textContent,/음소거/);
});
test('audio and transport commands stay independently usable with duplicate suppression',async t=>{
 const {card,hass,calls,q}=setup(t,'compact-media-row',{entity:'media_player.room'},{'media_player.room':state('media_player.room','playing',{supported_features:mediaFeatures,is_volume_muted:false,volume_level:.35})});
 const pending={};hass.callService=(...args)=>{calls.push(args);return new Promise(resolve=>pending[args[1]]=resolve);};
 const audio=card._call('volume_set',{volume_level:.5});assert.equal(q('.play').disabled,false);assert.equal(q('.next').disabled,false);assert.equal(q('input').disabled,true);assert.equal(q('.mute').disabled,true);
 await card._call('volume_mute',{is_volume_muted:true});assert.equal(calls.length,1);
 const transport=card._call('media_pause');assert.equal(calls.length,2);await card._call('media_next_track');assert.equal(calls.length,2);
 pending.media_pause();await transport;assert.equal(q('.play').disabled,false);assert.equal(q('input').disabled,true);pending.volume_set();await audio;assert.equal(card._busy.size,0);
});
test('old audio failures cannot clear a different entity draft or label its state',async t=>{
 const {card,hass,q}=setup(t,'compact-media-row',{entity:'media_player.a'},{'media_player.a':state('media_player.a','playing',{supported_features:mediaFeatures,volume_level:.2}),'media_player.b':state('media_player.b','playing',{supported_features:mediaFeatures,volume_level:.3})});
 let rejectA,resolveB;hass.callService=(d,s,data)=>data.entity_id==='media_player.a'?new Promise((resolve,reject)=>rejectA=reject):new Promise(resolve=>resolveB=resolve);
 const a=card._commitVolume(40);card.setConfig({entity:'media_player.b'});const b=card._commitVolume(70);rejectA(new Error('old failure'));await a;
 assert.equal(card._pendingVolume,70);assert.equal(q('input').value,'70');assert.equal(card.dataset.feedback,'pending');resolveB();await b;assert.equal(card.dataset.feedback,'success');
});
test('scene acceptance and failure remain per entity during concurrent requests',async t=>{
 const {card,hass}=setup(t,'compact-scene-panel',{items:[{entity:'scene.a'},{entity:'scene.b'}]},{'scene.a':state('scene.a','unknown'),'scene.b':state('scene.b','unknown')});
 let resolveA,rejectB;hass.callService=(d,s,data)=>data.entity_id==='scene.a'?new Promise(resolve=>resolveA=resolve):new Promise((resolve,reject)=>rejectB=reject);
 const a=card._activate(card._refs[0]),b=card._activate(card._refs[1]);resolveA();await a;assert.equal(card._refs[0].detail.textContent,'요청 전달됨');assert.equal(card._refs[1].detail.textContent,'실행 요청 중…');
 rejectB(new Error('failure'));await b;assert.equal(card._refs[0].detail.textContent,'요청 전달됨');assert.equal(card._refs[1].detail.textContent,'요청 실패');
 card.remove();assert.equal(card._itemFeedback.size,0);
});
test('localized environmental numbers preserve grouping while units keep separate hierarchy',t=>{
 const {card,hass}=setup(t,'compact-environment-panel',{items:[{entity:'sensor.air'}]},{'sensor.air':state('sensor.air','12345.6',{unit_of_measurement:'µg/m³'})});const ref=card._refs[0];
 hass.formatEntityState=()=> '12\u202f345,6\u00a0µg/m³';card.hass=hass;assert.equal(ref.number.textContent,'12\u202f345,6');assert.equal(ref.unit.textContent,'µg/m³');assert.match(ref.button.getAttribute('aria-label'),/12\u202f345,6\u00a0µg\/m³/);
 hass.states['sensor.air'].attributes.unit_of_measurement='$';hass.formatEntityState=()=>'$12,345.60';card.hass=hass;assert.equal(ref.number.textContent,'12,345.60');assert.equal(ref.unit.textContent,'$');assert.equal(ref.reading.classList.contains('unit-first'),true);
 hass.formatEntityState=()=> 'custom localized reading';card.hass=hass;assert.equal(ref.number.textContent,'custom localized reading');assert.equal(ref.unit.textContent,'');
});
