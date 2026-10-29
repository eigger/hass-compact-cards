// Compact Cards: Home Assistant dashboard cards.
// Local Home Assistant card. No dependencies or external network requests.
function compactText(el, value) { const text=String(value ?? '');if(el.textContent!==text)el.textContent=text; }
function compactAttr(el, key, value) { const text=String(value);if(el.getAttribute(key)!==text)el.setAttribute(key,text); }
function compactProp(el, key, value) { if(el[key]!==value)el[key]=value; }
function compactStyle(el, key, value) { if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value); }
class CompactClimateRow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._busy = false;
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;height:100%;container-type:inline-size;--row-color:var(--primary-text-color)}
        ha-card{height:100%;min-height:56px;box-sizing:border-box;display:grid;grid-template-columns:minmax(90px,1fr) auto auto;align-items:center;gap:6px;padding:6px 10px;overflow:hidden}
        button{font:inherit;color:var(--row-color);background:transparent;border:0;border-radius:7px;min-height:36px;padding:4px;cursor:pointer;flex:none;touch-action:manipulation;position:relative}
        button:focus-visible{outline:2px solid var(--primary-color);outline-offset:-2px}
        button:disabled{opacity:.35;cursor:default}
        button[aria-busy=true]{cursor:progress;opacity:.65;outline:2px dotted var(--primary-color);outline-offset:-3px}
        .modes button{transition:color 180ms ease,background-color 180ms ease}
        output{transition:color 180ms ease}
        .modes button.just-changed{animation:compact-mode-press 180ms ease-out}
        ha-icon.running[data-motion=fan]{animation:compact-fan 1.8s linear infinite}
        ha-icon.running[data-motion=heating],ha-icon.running[data-motion=cooling]{animation:compact-breathe 2s ease-in-out infinite}
        ha-icon.running[data-motion=drying]{animation:compact-dry 2.2s ease-in-out infinite}
        @keyframes compact-mode-press{0%{transform:scale(.92)}100%{transform:scale(1)}}
        @keyframes compact-fan{to{transform:rotate(360deg)}}
        @keyframes compact-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        @keyframes compact-dry{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
        @media(prefers-reduced-motion:reduce){button,output{transition:none!important}.just-changed,ha-icon.running{animation:none!important}}
        .info{flex:1;min-width:0;text-align:left;overflow:hidden}
        .name,.state{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .name{font-size:14px}.state{font-size:12px;color:var(--secondary-text-color);margin-top:2px}
        .modes,.temperature{display:flex;align-items:center;gap:2px;flex:none}
        .modes button{width:32px;color:var(--secondary-text-color)}
        .modes button[aria-pressed=true]{color:var(--mode-color);background:color-mix(in srgb,var(--mode-color) 18%,transparent)}
        output{color:var(--climate-color,var(--primary-text-color))}
        ha-icon{--mdc-icon-size:18px;width:18px;height:18px}
        .temperature{border-left:1px solid var(--divider-color);padding-left:5px}
        .temperature button{width:32px;font-size:18px}
        output{font-size:14px;font-variant-numeric:tabular-nums;min-width:39px;text-align:center;white-space:nowrap}
        @container(max-width:380px){ha-card{grid-template-columns:minmax(0,1fr) auto;padding:6px 8px;gap:2px 6px}.modes{grid-row:2;grid-column:1/-1;flex-wrap:wrap}.temperature{grid-column:2;grid-row:1;border:0;padding:0}}
        @container(max-width:540px){ha-card.many-modes{grid-template-columns:minmax(0,1fr) auto;gap:2px 6px}.many-modes .modes{grid-row:2;grid-column:1/-1;flex-wrap:wrap}.many-modes .temperature{grid-column:2;grid-row:1;border:0;padding:0}}
        @media(pointer:coarse){button{min-height:44px}.modes button,.temperature button{width:44px}.modes{flex-wrap:wrap;max-width:100%}@container(max-width:440px){ha-card{grid-template-columns:minmax(0,1fr) auto;gap:2px 6px}.modes{grid-row:2;grid-column:1/-1}.temperature{grid-column:2;grid-row:1;border:0;padding:0}}}
        :host([embedded]) ha-card{min-height:48px;border:0;box-shadow:none;background:transparent;padding:4px 0}
      </style>
      <ha-card>
        <button class="info"><span class="name"></span><span class="state"></span></button>
        <div class="modes" role="group" aria-label="운전 모드"></div>
        <div class="temperature" role="group" aria-label="설정 온도">
          <button class="minus" aria-label="설정 온도 낮추기">−</button><output aria-live="polite">—</output><button class="plus" aria-label="설정 온도 높이기">+</button>
        </div>
      </ha-card>`;
    this.shadowRoot.querySelector('.info').onclick = () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    this.shadowRoot.querySelector('.minus').onclick = () => this._step(-1);
    this.shadowRoot.querySelector('.plus').onclick = () => this._step(1);
  }
  setConfig(config) {
    if (typeof config?.entity !== 'string' || !config.entity.startsWith('climate.')) throw new Error('climate 엔티티가 필요합니다.');
    const key=JSON.stringify(config);if(this._configKey===key)return;this._configKey=key;
    this._config = { ...config };
    if(this.hasAttribute('embedded')!==Boolean(config.embedded))this.toggleAttribute('embedded', Boolean(config.embedded));
    this._render();
  }
  set hass(value) { this._hass = value; this._render(); }
  getCardSize() { return (this._hass?.states[this._config?.entity]?.attributes.hvac_modes?.length || 0) > 3 ? 2 : 1; }
  static getStubConfig(hass) {
    return { entity: Object.keys(hass?.states || {}).find(id => id.startsWith('climate.')) || 'climate.living_room' };
  }
  getGridOptions() { return { columns: 12, min_rows: 1 }; }
  _modeColor(mode) {
    // Mirror HA stateColorCss: mode -> domain active/inactive -> global state.
    if (['unknown','unavailable'].includes(mode)) return 'var(--state-unavailable-color)';
    const key = ['off','heat','cool','dry','fan_only','auto','heat_cool'].includes(mode) ? mode : 'unknown';
    const active = key === 'off' || key === 'unknown' ? 'inactive' : 'active';
    const fallback = `var(--state-climate-${active}-color,var(--state-${active}-color))`;
    return key === 'heat_cool'
      ? `var(--state-climate-heat_cool-color,var(--state-climate-heat-cool-color,${fallback}))`
      : `var(--state-climate-${key}-color,${fallback})`;
  }
  _render() {
    if (!this._config || !this._hass) return;
    const s = this._hass.states[this._config.entity];
    const a = s?.attributes || {};
    const offline = !s || ['unknown', 'unavailable'].includes(s.state);
    compactStyle(this.shadowRoot.querySelector('ha-card'),'--climate-color', this._modeColor(offline ? 'unavailable' : s.state));
    compactText(this.shadowRoot.querySelector('.name'),this._config.name || a.friendly_name || this._config.entity);
    compactText(this.shadowRoot.querySelector('.state'),offline ? '확인 불가' : `${this._hass.formatEntityState?.(s) || s.state}${a.current_temperature != null ? ' · 현재 ' + a.current_temperature + '°' : ''}`);
    const defs = { off:['mdi:power','끄기'], heat:['mdi:fire','난방'], cool:['mdi:snowflake','냉방'], dry:['mdi:water-percent','제습'], fan_only:['mdi:fan','송풍'], auto:['mdi:alpha-a-circle','자동'], heat_cool:['mdi:thermostat-auto','냉난방 자동'] };
    const modes = Array.isArray(a.hvac_modes) ? a.hvac_modes : [];
    this.shadowRoot.querySelector('ha-card').classList.toggle('many-modes',modes.length>3);
    const container = this.shadowRoot.querySelector('.modes');
    const key = JSON.stringify(modes);
    if (this._modesKey !== key) {
      this._modesKey = key;
      container.replaceChildren();
      for (const mode of modes) {
        const [icon,label] = defs[mode] || ['mdi:thermostat', mode];
        const b = document.createElement('button');
        b.style.setProperty('--mode-color', this._modeColor(mode));
        b.dataset.mode = mode; b.setAttribute('aria-label', label); b.title = label;
        const i = document.createElement('ha-icon'); i.setAttribute('icon', icon); b.append(i);
        b.addEventListener('animationend',event=>{if(event.target===b)b.classList.remove('just-changed');});
        b.onclick = () => this._perform('set_hvac_mode', { hvac_mode: mode });
        container.append(b);
      }
    }
    for (const b of container.children) {
      const pressed=!offline && b.dataset.mode === s?.state;
      if(this._hasRendered && pressed && b.getAttribute('aria-pressed')==='false')b.classList.add('just-changed');
      compactProp(b,'disabled',offline || this._busy);
      compactAttr(b,'aria-busy',this._busy);
      compactAttr(b,'aria-disabled',offline || this._busy);
      compactAttr(b,'aria-pressed',pressed);
      const i=b.querySelector('ha-icon');
      const action=pressed && s.state!=='off' ? a.hvac_action : undefined;
      const motion=action==='fan' && b.dataset.mode!=='fan_only' ? 'cooling' : ['fan','heating','cooling','drying'].includes(action)?action:'';
      if(i.classList.contains('running')!==Boolean(motion))i.classList.toggle('running',Boolean(motion));
      compactAttr(i,'data-motion',motion);
    }
    const t = a.temperature;
    const valid = typeof t === 'number' && Number.isFinite(t);
    const supported = (Number(a.supported_features) & 1) !== 0;
    compactText(this.shadowRoot.querySelector('output'),valid ? `${t}°` : '—');
    const minus=this.shadowRoot.querySelector('.minus'),plus=this.shadowRoot.querySelector('.plus');
    compactProp(minus,'disabled',offline || this._busy || !valid || !supported || (a.min_temp != null && t <= a.min_temp));
    compactProp(plus,'disabled',offline || this._busy || !valid || !supported || (a.max_temp != null && t >= a.max_temp));
    for(const button of [minus,plus]){compactAttr(button,'aria-busy',this._busy);compactAttr(button,'aria-disabled',button.disabled || this._busy);}
    this._hasRendered=true;
  }
  _step(direction) {
    const s = this._hass?.states[this._config.entity];
    const a = s?.attributes || {};
    if (!s || ['unknown','unavailable'].includes(s.state) || typeof a.temperature !== 'number' || !(Number(a.supported_features) & 1)) return;
    const step = Number(a.target_temp_step) > 0 ? Number(a.target_temp_step) : (this._hass.config?.unit_system?.temperature === '°F' ? 1 : 0.5);
    let target = a.temperature + direction * step;
    if (Number.isFinite(a.min_temp)) target = Math.max(a.min_temp, target);
    if (Number.isFinite(a.max_temp)) target = Math.min(a.max_temp, target);
    target = Number(target.toFixed(3));
    if (target !== a.temperature) return this._perform('set_temperature', { temperature: target });
  }
  async _perform(service, data) {
    if (this._busy || !this._hass || !this._config) return;
    const state = this._hass.states[this._config.entity];
    if (!state || ['unknown','unavailable'].includes(state.state)) return;
    this._busy = true; this._render();
    try { await this._hass.callService('climate', service, { entity_id: this._config.entity, ...data }); }
    catch (error) {
      this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: '냉난방 변경 실패: ' + (error?.message || error) }, bubbles: true, composed: true }));
    } finally { this._busy = false; this._render(); }
  }
}
if (!customElements.get('compact-climate-row')) customElements.define('compact-climate-row', CompactClimateRow);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'compact-climate-row')) window.customCards.push({ type: 'compact-climate-row', name: 'Compact climate row', description: '운전 모드와 온도 −/+를 한 줄에 표시' });

// Compact native-theme panels. Climate rows are included in this bundle.
const compactNameIndexes = new WeakMap();
function compactResolve(hass, item) {
  if (item.entity) return hass.states[item.entity];
  if (!item.find_name) return undefined;
  let index = compactNameIndexes.get(hass);
  if (!index) {
    index = new Map();
    for (const state of Object.values(hass.states)) {
      const key = state.entity_id.split('.')[0] + ':' + state.attributes.friendly_name;
      index.set(key, index.has(key) ? null : state);
    }
    compactNameIndexes.set(hass, index);
  }
  return index.get((item.domain || 'sensor') + ':' + item.find_name) || undefined;
}
function compactStateColor(state) {
  if (!state || ['unknown','unavailable'].includes(state.state)) return 'var(--state-unavailable-color)';
  const domain = state.entity_id.split('.')[0];
  if (domain === 'sensor' || domain === 'select') return 'var(--secondary-text-color)';
  const active = domain === 'lock' ? state.state !== 'locked' : !['off','closed','not_home'].includes(state.state);
  const activity = active ? 'active' : 'inactive';
  const device = state.attributes.device_class;
  const properties = [];
  if (device) properties.push(`--state-${domain}-${device}-${state.state}-color`);
  properties.push(`--state-${domain}-${state.state}-color`, `--state-${domain}-${activity}-color`, `--state-${activity}-color`);
  return properties.reduceRight((fallback, key) => `var(${key},${fallback})`, 'var(--secondary-text-color)');
}
function compactCompare(current, previous) {
  const valid = s => s && s.state.trim() !== '' && Number.isFinite(Number(s.state));
  if (!valid(current) || !valid(previous)) return { text:'—', reason:'비교 데이터 확인 필요' };
  const unit = current.attributes.unit_of_measurement || '';
  if (unit !== (previous.attributes.unit_of_measurement || '')) return { text:'—', reason:'단위 불일치' };
  const a = Number(current.state), b = Number(previous.state), delta = a - b;
  const value = `${delta > 0 ? '+' : ''}${Number(delta.toFixed(2)).toLocaleString()} ${unit}`.trim();
  const percent = b > 0 ? `${delta > 0 ? '+' : ''}${(delta / b * 100).toFixed(1)}%` : '증감률 계산 불가';
  return { text:value, reason:percent };
}
class CompactHomePanel extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'}); this._busy = new Set(); this._refs = [];
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}ha-card{padding:2px 12px;box-shadow:none;overflow:hidden}
      .pair-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px;border-bottom:1px solid var(--divider-color)}
      .pair-grid:last-child{border-bottom:0}.pair-grid>.row{min-width:0;border:0}
      :host{container-type:inline-size}.row{display:flex;align-items:center;gap:8px;min-width:0;min-height:44px;border-bottom:1px solid var(--divider-color)}
      .row:last-child{border-bottom:0}button,select{font:inherit;color:var(--primary-text-color)}
      button{border:0;background:transparent;border-radius:6px;padding:4px;cursor:pointer;min-height:36px}
      button:focus-visible,select:focus-visible{outline:2px solid var(--primary-color);outline-offset:-2px}
      button,select{touch-action:manipulation}button:disabled,select:disabled{opacity:.45;cursor:default}.label{display:flex;align-items:center;gap:9px;text-align:left;flex:1;min-width:0}
      button[aria-busy=true],select[aria-busy=true]{cursor:progress;opacity:.65;outline:2px dotted var(--primary-color);outline-offset:-3px}
      .label span{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      ha-icon{--mdc-icon-size:18px;width:18px;height:18px;flex:none;color:var(--entity-color,var(--secondary-text-color))}
      .value{font-size:14px;min-width:0;max-width:68%;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;color:var(--entity-color,var(--primary-text-color));transition:color 180ms ease}
      .switch{min-width:42px;display:grid;place-items:center}.track{display:block;width:28px;height:16px;background:var(--disabled-color);border-radius:10px;position:relative;transition:background-color 180ms ease}
      .track:after{content:'';position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--card-background-color);transform:translateX(0);transition:transform 180ms cubic-bezier(.2,.8,.2,1)}
      .switch[aria-checked=true] .track{background:var(--entity-color)}.switch[aria-checked=true] .track:after{transform:translateX(12px)}
      ha-icon{transition:color 180ms ease}
      .subheading{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.badge{display:flex;align-items:center;gap:3px;max-width:100%}.badge .badge-name{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.subheading>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.subheading button{font-size:12px;min-height:30px;color:var(--secondary-text-color)}
      .command{font-size:13px;color:var(--primary-color);padding-inline:10px}.subheading{font-size:13px;font-weight:500;color:var(--secondary-text-color);padding:12px 4px 4px}
      select{max-width:48%;min-width:0;font-size:13px;border:1px solid var(--divider-color);border-radius:5px;background:var(--card-background-color);min-height:36px}
      .climate{border-bottom:1px solid var(--divider-color)}.climate:last-child{border:0}
      table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}th,td{text-align:right;padding:9px 3px;border-bottom:1px solid var(--divider-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      th{font-weight:400;color:var(--secondary-text-color)}th:first-child,td:first-child{text-align:left;width:18%}td button{font-size:13px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:32px;padding:0}
      td small{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;color:var(--secondary-text-color);margin-top:2px}.note{font-size:12px;color:var(--secondary-text-color);padding:8px 3px}
      @container(max-width:380px){ha-card{padding:2px 8px}.pair-grid{column-gap:10px}.row{gap:4px}.label{gap:6px;padding-inline:2px}.switch{min-width:42px}.subheading{gap:4px}}
      :host([columns="1"]) .pair-grid{grid-template-columns:minmax(0,1fr)}
      @container(max-width:380px){:host([columns="auto"]) .pair-grid{grid-template-columns:minmax(0,1fr)}}
      @container(max-width:420px){thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}table,tbody{display:block}tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid var(--divider-color);padding-block:4px}td{display:block;border:0;padding:3px;text-align:left;min-width:0}td:first-child{grid-column:1/-1;width:auto;font-weight:500}td:not(:first-child)::before{content:attr(data-label);display:block;font-size:11px;color:var(--secondary-text-color);margin-bottom:2px}td button{min-height:36px;width:100%;text-align:left}}
      @media(pointer:coarse){button,select,.subheading button,td button{min-height:44px}.switch{min-width:44px}}
      @media(prefers-reduced-motion:reduce){.track,.track:after,ha-icon,.value{transition:none!important}}
    </style><ha-card><div class="items"></div></ha-card>`;
  }
  setConfig(config) {
    if (!Array.isArray(config?.items)) throw new Error('items 목록이 필요합니다.');
    if (config.columns !== undefined && !['auto',1,2].includes(config.columns)) throw new Error('columns는 auto, 1, 2 중 하나여야 합니다.');
    for (const [index, item] of config.items.entries()) {
      const fail = message => { throw new Error(`items[${index}]: ${message}`); };
      if (!item || typeof item !== 'object' || Array.isArray(item)) fail('항목은 객체여야 합니다.');
      if (item.type && !['heading','note','climate','comparison','navigate'].includes(item.type)) fail('지원하지 않는 항목 유형입니다.');
      if (['heading','note','navigate'].includes(item.type) && typeof item.name !== 'string') fail('name이 필요합니다.');
      if (item.type === 'heading' && item.badges !== undefined && (!Array.isArray(item.badges) || item.badges.some(b => !b || typeof b.entity !== 'string'))) fail('badges에 entity 목록이 필요합니다.');
      if (item.type === 'climate' && (typeof item.entity !== 'string' || !item.entity.startsWith('climate.'))) fail('climate 엔티티가 필요합니다.');
      if (item.type === 'comparison' && (!Array.isArray(item.rows) || item.rows.some(r => !r || typeof r.entity !== 'string' || typeof r.previous !== 'string'))) fail('rows에 entity와 previous가 필요합니다.');
      if (item.type === 'navigate' && (typeof item.navigation_path !== 'string' || !item.navigation_path.startsWith('/') || item.navigation_path.startsWith('//') || /[\\\\\s]/.test(item.navigation_path))) fail('navigation_path는 로컬 경로여야 합니다.');
      if (!item.type && typeof item.entity !== 'string' && typeof item.find_name !== 'string') fail('entity 또는 find_name이 필요합니다.');
      if (item.tap_action && (item.tap_action.action !== 'perform-action' || typeof item.tap_action.perform_action !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(item.tap_action.perform_action))) fail('tap_action에 perform-action과 domain.service 형식의 perform_action이 필요합니다.');
    }
    const key=JSON.stringify(config);if(this._configKey===key)return;this._configKey=key;
    this._config = config; this.setAttribute('columns',config.columns ?? 'auto'); this._build(); this._render();
  }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return Math.max(1, Math.ceil((this._config?.items.length || 1) * 40 / 50)); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find(id => /^(light|switch|sensor)\./.test(id));
    return { items: entity ? [{ entity }] : [{ type: 'note', name: 'items에 엔티티를 추가하세요.' }] };
  }
  getGridOptions() { return { columns:12 }; }
  _make(tag, cls, text) {
    const el = document.createElement(tag); if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text; return el;
  }
  _more(state) {
    if (state) this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:state.entity_id},bubbles:true,composed:true}));
  }
  _build() {
    const body = this.shadowRoot.querySelector('.items');body.replaceChildren();this._refs=[];
    let pairGroup=null;
    for (const item of this._config.items) {
      const rowDomain=(item.entity || '').split('.')[0];
      const paired=!['heading','note','climate','comparison','navigate'].includes(item.type) && rowDomain!=='select';
      if (!paired) pairGroup=null;
      if (paired && !pairGroup) {pairGroup=this._make('div','pair-grid');body.append(pairGroup);}
      if (item.type === 'heading') {
        const h=this._make('div','subheading');h.append(this._make('span',null,item.name));
        for (const badge of item.badges || []) {const value=this._make('button','badge'),name=this._make('span','badge-name'),reading=this._make('span');value.append(name,reading);value.onclick=()=>this._more(this._hass?.states[badge.entity]);h.append(value);this._refs.push({item:badge,badge:value,badgeName:name,badgeValue:reading});}
        body.append(h);continue;
      }
      if (item.type === 'note') { body.append(this._make('div','note',item.name));continue; }
      if (item.type === 'climate') {
        const child = document.createElement('compact-climate-row');child.className='climate';body.append(child);
        customElements.whenDefined('compact-climate-row').then(()=>this._render());
        this._refs.push({item,child,configured:false});continue;
      }
      if (item.type === 'comparison') {
        const table=this._make('table'),thead=this._make('thead'),head=this._make('tr');table.setAttribute('role','table');thead.setAttribute('role','rowgroup');head.setAttribute('role','row');thead.append(head);table.append(thead);
        for (const label of ['항목','이번 달','지난달','차이']) { const th=this._make('th',null,label);th.scope='col';th.setAttribute('role','columnheader');head.append(th); }
        const tbody=this._make('tbody');tbody.setAttribute('role','rowgroup');table.append(tbody);
        for (const comparison of item.rows) {
          const row=this._make('tr');tbody.append(row);row.append(this._make('td',null,comparison.name));
          const now=this._make('button'),prev=this._make('button'),nowCell=this._make('td'),prevCell=this._make('td');nowCell.append(now);prevCell.append(prev);row.append(nowCell,prevCell);
          now.onclick=()=>this._more(this._hass?.states[comparison.entity]);prev.onclick=()=>this._more(this._hass?.states[comparison.previous]);
          const delta=this._make('span'),percent=this._make('small'),deltaCell=this._make('td');deltaCell.append(delta,percent);row.append(deltaCell);
          row.setAttribute('role','row');
          [...row.children].forEach((cell,index)=>{cell.setAttribute('role','cell');cell.dataset.label=['항목','이번 달','지난달','차이'][index];});
          this._refs.push({item:comparison,now,prev,delta,percent});
        }
        body.append(table,this._make('div','note','이번 달 누적 / 지난달 전체'));continue;
      }
      const row=this._make('div','row'),label=this._make('button','label'),icon=this._make('ha-icon'),name=this._make('span',null,item.name || '');
      label.append(icon,name);row.append(label);
      const ref={item,row,label,icon,name};
      if (item.type === 'navigate') {
        const value=this._make('button','command','열기');ref.control=value;row.append(value);
        const go=()=>{const p=item.navigation_path;if (p?.startsWith('/')&&!p.startsWith('//')) {history.pushState(null,'',p);window.dispatchEvent(new Event('location-changed'));}};
        label.onclick=go;value.onclick=go;icon.setAttribute('icon',item.icon || 'mdi:chevron-right');
      } else {
        label.onclick=()=>this._more(ref.state);
        const domain=(item.entity || '').split('.')[0];
        if (['light','switch'].includes(domain)) {
          const toggle=this._make('button','switch');toggle.setAttribute('role','switch');toggle.append(this._make('span','track'));
          toggle.onclick=()=>this._call(ref,'homeassistant','toggle',{entity_id:item.entity});ref.control=toggle;row.append(toggle);
        } else if (domain === 'select') {
          const select=this._make('select');select.onchange=()=>this._call(ref,'select','select_option',{entity_id:item.entity,option:select.value});ref.select=select;row.append(select);
        } else if (item.tap_action?.action === 'perform-action') {
          const button=this._make('button','command','실행');button.onclick=()=>this._command(ref);ref.control=button;row.append(button);
        } else {ref.value=this._make('span','value');row.append(ref.value);}
      }
      (paired?pairGroup:body).append(row);this._refs.push(ref);
    }
  }
  _format(state) { return !state || ['unknown','unavailable'].includes(state.state) ? '확인 불가' : (this._hass.formatEntityState?.(state) ?? `${state.state} ${state.attributes.unit_of_measurement || ''}`.trim()); }
  _render() {
    if (!this._hass || !this._config) return;
    for (const ref of this._refs) {
      const {item}=ref;
      if (ref.badge) {const state=this._hass.states[item.entity],name=item.name || state?.attributes.friendly_name || item.entity,value=this._format(state);compactText(ref.badgeName,name);compactText(ref.badgeValue,value);compactAttr(ref.badge,'aria-label',`${name}: ${value}`);compactProp(ref.badge,'title',`${name}: ${value}`);compactProp(ref.badge,'disabled',!state);continue;}
      if (ref.child) {
        if (!ref.configured && ref.child.setConfig) {ref.child.setConfig({entity:item.entity,name:item.name,embedded:true});ref.configured=true;}
        if (ref.configured) ref.child.hass=this._hass;
        continue;
      }
      if (ref.now) {
        const now=this._hass.states[item.entity],prev=this._hass.states[item.previous];
        compactText(ref.now,this._format(now));compactText(ref.prev,this._format(prev));compactProp(ref.now,'title',ref.now.textContent);compactProp(ref.prev,'title',ref.prev.textContent);
        const delta=compactCompare(now,prev);compactText(ref.delta,delta.text);compactText(ref.percent,delta.reason);continue;
      }
      if (item.type === 'navigate') continue;
      const state=compactResolve(this._hass,item);ref.state=state;
      const offline=!state || ['unknown','unavailable'].includes(state.state);
      compactText(ref.name,item.name || state?.attributes.friendly_name || item.entity || item.find_name);
      compactProp(ref.label,'title',ref.name.textContent);
      compactStyle(ref.row,'--entity-color',compactStateColor(state));
      const domain=state?.entity_id.split('.')[0];
      const icons={light:'mdi:lightbulb-outline',switch:'mdi:power',lock:'mdi:lock-outline',select:'mdi:tune',button:'mdi:gesture-tap-button',script:'mdi:play',input_button:'mdi:gesture-tap-button'};
      const sensorIcons={temperature:'mdi:thermometer',humidity:'mdi:water-percent',power:'mdi:flash',moisture:'mdi:water-alert',carbon_dioxide:'mdi:molecule-co2'};
      compactAttr(ref.icon,'icon',item.icon || state?.attributes.icon || sensorIcons[state?.attributes.device_class] || icons[domain] || 'mdi:circle-small');
      if (ref.value){compactText(ref.value,this._format(state));compactProp(ref.value,'title',ref.value.textContent);}
      if (ref.control) {
        compactProp(ref.control,'disabled',offline || this._busy.has(item.entity));
        compactAttr(ref.control,'aria-busy',this._busy.has(item.entity));
        compactAttr(ref.control,'aria-disabled',offline || this._busy.has(item.entity));
        compactAttr(ref.control,'aria-label',`${ref.name.textContent} ${['light','switch'].includes(domain)?'켜기/끄기':'실행'}`);
        if (ref.control.getAttribute('role') === 'switch') compactAttr(ref.control,'aria-checked',state?.state==='on');
      }
      if (ref.select) {
        const options=state?.attributes.options || [];
        if (ref.optionsKey!==JSON.stringify(options)) {ref.optionsKey=JSON.stringify(options);ref.select.replaceChildren(...options.map(value=>{const o=this._make('option',null,value);o.value=value;return o;}));}
        if(!this._busy.has(item.entity))compactProp(ref.select,'value',state?.state || '');
        compactProp(ref.select,'disabled',offline || this._busy.has(item.entity));compactAttr(ref.select,'aria-busy',this._busy.has(item.entity));compactAttr(ref.select,'aria-label',ref.name.textContent);
      }
    }
  }
  async _command(ref) {
    const action=ref.item.tap_action;
    if (action.confirmation && !window.confirm(action.confirmation.text || '실행할까요?')) return;
    const service=action.perform_action?.split('.');
    if (service?.length===2) await this._call(ref,service[0],service[1],action.data || {},action.target || {entity_id:ref.item.entity});
  }
  async _call(ref,domain,service,data,target) {
    const id=ref.item.entity,state=this._hass?.states[id];
    if (!state || ['unknown','unavailable'].includes(state.state) || this._busy.has(id)) return;
    this._busy.add(id);this._render();
    try {await this._hass.callService(domain,service,data,undefined,target);}
    catch(error) {this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:'변경 실패: '+(error?.message || error)},bubbles:true,composed:true}));}
    finally {this._busy.delete(id);this._render();}
  }
}
if (!customElements.get('compact-home-panel')) customElements.define('compact-home-panel',CompactHomePanel);
window.customCards=window.customCards || [];
if (!window.customCards.some(c=>c.type==='compact-home-panel')) window.customCards.push({type:'compact-home-panel',name:'Compact home panel',description:'작은 행으로 묶은 홈 제어·센서·사용량 비교'});
