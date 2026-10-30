// Preview-only English substitution for the Korean sample text. English by default; add ?lang=ko for the Korean originals.
// The card bundle itself is Korean-only, so card-rendered labels are swapped in the DOM after rendering.
(()=>{
const english=new URLSearchParams(location.search).get('lang')!=='ko';
const dictionary={
 '거실 냉난방':'Living room climate','거실 조명':'Living room light','거실 커튼':'Curtain','거실 스피커':'Living room speaker','간접 조명':'Accent light','실내 온도':'Room temperature','습도':'Humidity','온도':'Temp','휴식':'Relax','취침':'Bedtime','가벼운 오후의 음악':'Light Afternoon Music','전기':'Electricity','거실':'Living room','환경':'Environment','냉난방':'Climate','홈 패널':'Home panel','조명':'Light','커튼':'Curtain','장면':'Scenes','미디어':'Media',
 '보일러':'Boiler','에어컨':'Air conditioner',
 '모의 상태를 사용한 브라우저 미리보기 · 실제 기기에 명령을 보내지 않습니다.':'Browser preview with mocked states · No commands are sent to real devices.','미리보기 너비':'Preview width','테마 변경':'Toggle theme','연결 상태 변경':'Toggle connection',
 '처리 중…':'Working…','설정 미리보기 반영 완료':'Config preview updated',
 '냉난방 너비·높이 확인':'Climate width and height check','냉난방 카드의 너비·높이':'Climate card width and height','같은 실제 카드 구현을 패널과 고정 높이 미리보기 부모 안에서 비교합니다.':'Compares the same real card in a panel and in a fixed-height preview parent.','패널 너비':'Panel width','냉난방 크기 검증용 모의 화면':'Mock view for climate size checks','실제 카드 코드 · 모의 상태 · 실제 기기 제어 없음':'Real card code · Mocked states · No real device control','홈 패널 · 보일러 2모드 / 에어컨 5모드':'Home panel · Boiler 2 modes / AC 5 modes','단독 카드 · 280 × 320px 그리드 부모':'Standalone card · 280 × 320px grid parent',
 '엔티티':'Entity','표시 설정':'Display','표시 이름':'Display name','열 수':'Columns','기본값':'Default','1열':'1 column','2열':'2 columns','3열':'3 columns','4열':'4 columns','위로':'Up','아래로':'Down','삭제':'Delete','항목 유형':'Item type','이름으로 센서 찾기':'Find sensor by name','제목':'Heading','메모':'Note','사용량 비교':'Usage comparison','페이지 이동':'Navigate','배지':'Badges','센서':'Sensor','배지 추가':'Add badge','아이콘':'Icon','터치 동작':'Tap action','이름 터치 동작':'Name tap action','기본 (상세 정보)':'Default (more info)','상세 정보':'More info','켜기/끄기 전환':'Toggle on/off','켜기/끄기':'Toggle on/off','이름 터치와 별개로 오른쪽 전용 제어를 사용할 수 있습니다. 기존 서비스 설정은 보존되며 전용 제어가 우선합니다.':'A dedicated control on the right can be used separately from the name tap. Existing service settings are preserved and the dedicated control takes priority.','실행 전 확인':'Confirm before running','확인 메시지 사용':'Use confirmation message','서비스 실행 버튼':'Service run button','이름을 누르면 엔티티 상세 정보를 엽니다.':'Tapping the name opens the entity details.','비교 항목':'Comparison row','항목 이름':'Item name','이번 달 센서':'This month sensor','지난달 센서':'Last month sensor','비교 항목 추가':'Add comparison row','항목 추가':'Add item','패널 이름':'Panel name','임계값':'Threshold','임계값 추가':'Add threshold','음량 표시':'Show volume','다음 곡 표시':'Show next track','항목':'Item',
 '음소거':'Muted','기준값':'Value','비교 방향':'Direction','강조 수준':'Emphasis','이상':'or above','이하':'or below','주의':'Warning','위험':'Critical','실내 환경':'Room environment',
 '실행':'Run','열기':'Open','정지':'Stop','닫기':'Close','이번 달 누적':'This month','지난달 전체':'Last month','차이':'Change','항목':'Item','재생 중':'Playing','난방':'Heating','냉방':'Cooling','송풍':'Fan','제습':'Dry','자동':'Auto','끄기':'Off','켜짐':'On','꺼짐':'Off','열림':'Open','닫힘':'Closed','일시정지':'Paused','대기':'Idle','확인 불가':'Unavailable'
};
const terms=Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
const translate=value=>{
 if(!english)return value;
 if(typeof value==='string')return dictionary[value]??value;
 if(Array.isArray(value))return value.map(translate);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,translate(item)]));
 return value;
};
function localize(root=document.body){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  let text=node.nodeValue;for(const [ko,en] of terms)text=text.split(ko).join(en);
  if(text!==node.nodeValue)node.nodeValue=text;
 }
 for(const element of root.querySelectorAll('*')){
  for(const name of ['data-label','aria-label','placeholder','title']){const value=element.getAttribute(name);if(value){let text=value;for(const [ko,en] of terms)text=text.split(ko).join(en);if(text!==value)element.setAttribute(name,text);}}
  if(element.shadowRoot)localize(element.shadowRoot);
 }
}
const start=()=>{if(!english)return;document.documentElement.lang='en';document.title=translate(document.title);localize();setInterval(localize,200);};
window.compactPreviewLocale={english,translate,localize,start,dictionary};
if(english&&new URLSearchParams(location.search).get('debug')==='ko')setTimeout(()=>{const found=new Set();const scan=root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode())if(/[가-힣]/.test(n.nodeValue)&&!['SCRIPT','STYLE','TITLE'].includes(n.parentNode.nodeName))found.add(n.nodeValue.trim());for(const e of root.querySelectorAll('*'))if(e.shadowRoot)scan(e.shadowRoot);};scan(document.body);document.title='KO:'+[...found].join('|');},2500);
})();
