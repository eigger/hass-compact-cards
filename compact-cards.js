// Compact Cards: Home Assistant dashboard cards.
// Local Home Assistant card. No dependencies or external network requests.
function compactText(el, value) { const text=String(value ?? '');if(el.textContent!==text)el.textContent=text; }
function compactAttr(el, key, value) { const text=String(value);if(el.getAttribute(key)!==text)el.setAttribute(key,text); }
function compactProp(el, key, value) { if(el[key]!==value)el[key]=value; }
function compactStyle(el, key, value) { if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value); }
// Feedback describes a service request, never an assumed physical device state.
function compactClearFeedback(host) {
  clearTimeout(host._feedbackTimer);host._feedbackTimer=undefined;
  host._feedbackEpoch=(host._feedbackEpoch||0)+1;host.removeAttribute('data-feedback');
  if(host._feedbackText)compactText(host._feedbackText,'');
}
function compactFeedback(host,status,message,epoch) {
  if(epoch!==undefined && epoch!==host._feedbackEpoch)return;
  clearTimeout(host._feedbackTimer);
  if(epoch===undefined)host._feedbackEpoch=(host._feedbackEpoch||0)+1;
  compactAttr(host,'data-feedback',status);compactText(host._feedbackText,message);
  if(status!=='pending')host._feedbackTimer=setTimeout(()=>{compactClearFeedback(host);host._render();},1800);
  return host._feedbackEpoch;
}
function compactInteractions(host) {
  const style=document.createElement('style');
  style.textContent=`button{touch-action:manipulation;transition:transform 100ms ease,background-color 150ms ease,color 150ms ease}
    button:active:not(:disabled){transform:scale(.96);background:color-mix(in srgb,var(--primary-color) 12%,transparent)}
    :host([data-feedback=pending]) ha-card{box-shadow:inset 0 2px var(--primary-color)}
    :host([data-feedback=success]) ha-card{box-shadow:inset 0 2px var(--success-color,#43a047)}
    :host([data-feedback=error]) ha-card{box-shadow:inset 0 2px var(--error-color,#db4437)}
    .compact-feedback{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    @media(prefers-reduced-motion:reduce){button{transition:none!important}button:active:not(:disabled){transform:none!important}}`;
  const status=document.createElement('span');status.className='compact-feedback';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  host.shadowRoot.append(style,status);host._feedbackText=status;
}
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
        ha-icon.running[data-motion=fan]{animation:compact-fan 2.6s linear infinite}
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
        @media(pointer:coarse){button{min-height:44px}.modes button,.temperature button{width:44px}.modes{flex-wrap:wrap;max-width:100%}@container(max-width:640px){ha-card.many-modes{grid-template-columns:minmax(0,1fr) auto;gap:2px 6px}.many-modes .modes{grid-row:2;grid-column:1/-1}.many-modes .temperature{grid-column:2;grid-row:1;border:0;padding:0}}@container(max-width:440px){ha-card{grid-template-columns:minmax(0,1fr) auto;gap:2px 6px}.modes{grid-row:2;grid-column:1/-1}.temperature{grid-column:2;grid-row:1;border:0;padding:0}}}
        :host([embedded]) ha-card{min-height:48px;border:0;box-shadow:none;background:transparent;padding:4px 0}
      </style>
      <ha-card>
        <button class="info"><span class="name"></span><span class="state"></span></button>
        <div class="modes" role="group" aria-label="운전 모드"></div>
        <div class="temperature" role="group" aria-label="설정 온도">
          <button class="minus" aria-label="설정 온도 낮추기">−</button><output aria-live="polite">—</output><button class="plus" aria-label="설정 온도 높이기">+</button>
        </div>
      </ha-card>`;
    compactInteractions(this);
    this.shadowRoot.querySelector('.info').onclick = () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    this.shadowRoot.querySelector('.minus').onclick = () => this._step(-1);
    this.shadowRoot.querySelector('.plus').onclick = () => this._step(1);
  }
  setConfig(config) {
    if (typeof config?.entity !== 'string' || !config.entity.startsWith('climate.')) throw new Error('climate 엔티티가 필요합니다.');
    const key=JSON.stringify(config);if(this._configKey===key)return;this._configKey=key;
    compactClearFeedback(this);
    this._config = { ...config };
    if(this.hasAttribute('embedded')!==Boolean(config.embedded))this.toggleAttribute('embedded', Boolean(config.embedded));
    this._render();
  }
  set hass(value) { this._hass = value; this._render(); }
  disconnectedCallback(){compactClearFeedback(this);}
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
    const feedback=compactFeedback(this,'pending','변경 요청 중');
    this._busy = true; this._render();
    try { await this._hass.callService('climate', service, { entity_id: this._config.entity, ...data });compactFeedback(this,'success','요청 전달됨',feedback); }
    catch (error) {
      compactFeedback(this,'error','요청 실패',feedback);
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
      td small{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;color:var(--secondary-text-color);margin-top:2px}.note{font-size:12px;color:var(--secondary-text-color);padding:8px 3px;white-space:pre-wrap;overflow-wrap:anywhere}
      @container(max-width:380px){ha-card{padding:2px 8px}.pair-grid{column-gap:10px}.row{gap:4px}.label{gap:6px;padding-inline:2px}.switch{min-width:42px}.subheading{gap:4px}}
      :host([columns="1"]) .pair-grid{grid-template-columns:minmax(0,1fr)}
      @container(max-width:380px){:host([columns="auto"]) .pair-grid{grid-template-columns:minmax(0,1fr)}}
      @container(max-width:420px){thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}table,tbody{display:block}tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid var(--divider-color);padding-block:4px}td{display:block;border:0;padding:3px;text-align:left;min-width:0}td:first-child{grid-column:1/-1;width:auto;font-weight:500}td:not(:first-child)::before{content:attr(data-label);display:block;font-size:11px;color:var(--secondary-text-color);margin-bottom:2px}td button{min-height:36px;width:100%;text-align:left}}
      @media(pointer:coarse){button,select,.subheading button,td button{min-height:44px}.switch{min-width:44px}}
      @media(prefers-reduced-motion:reduce){.track,.track:after,ha-icon,.value{transition:none!important}}
    </style><ha-card><div class="items"></div></ha-card>`;
    compactInteractions(this);
  }
  setConfig(config) {
    if (!Array.isArray(config?.items)) throw new Error('items 목록이 필요합니다.');
    if (config.columns !== undefined && !['auto',1,2].includes(config.columns)) throw new Error('columns는 auto, 1, 2 중 하나여야 합니다.');
    for (const [index, item] of config.items.entries()) {
      const fail = message => { throw new Error(`items[${index}]: ${message}`); };
      if (!item || typeof item !== 'object' || Array.isArray(item)) fail('항목은 객체여야 합니다.');
      if (item.type && !['heading','note','climate','light','cover','media','comparison','navigate'].includes(item.type)) fail('지원하지 않는 항목 유형입니다.');
      if (['heading','note','navigate'].includes(item.type) && typeof item.name !== 'string') fail('name이 필요합니다.');
      if (item.type === 'heading' && item.badges !== undefined && (!Array.isArray(item.badges) || item.badges.some(b => !b || typeof b.entity !== 'string'))) fail('badges에 entity 목록이 필요합니다.');
      if (['climate','light','cover','media'].includes(item.type) && (typeof item.entity !== 'string' || !item.entity.startsWith((item.type==='media'?'media_player':item.type)+'.'))) fail(`${item.type} 엔티티가 필요합니다.`);
      if (item.type === 'comparison' && (!Array.isArray(item.rows) || item.rows.some(r => !r || typeof r.entity !== 'string' || typeof r.previous !== 'string'))) fail('rows에 entity와 previous가 필요합니다.');
      if (item.type === 'navigate' && (typeof item.navigation_path !== 'string' || !item.navigation_path.startsWith('/') || item.navigation_path.startsWith('//') || /[\\\\\s]/.test(item.navigation_path))) fail('navigation_path는 로컬 경로여야 합니다.');
      if (!item.type && typeof item.entity !== 'string' && typeof item.find_name !== 'string') fail('entity 또는 find_name이 필요합니다.');
      if (item.tap_action && (item.tap_action.action !== 'perform-action' || typeof item.tap_action.perform_action !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(item.tap_action.perform_action))) fail('tap_action에 perform-action과 domain.service 형식의 perform_action이 필요합니다.');
    }
    const key=JSON.stringify(config);if(this._configKey===key)return;this._configKey=key;
    compactClearFeedback(this);
    this._config = config; this.setAttribute('columns',config.columns ?? 'auto'); this._build(); this._render();
  }
  set hass(hass) { this._hass = hass; this._render(); }
  disconnectedCallback(){compactClearFeedback(this);}
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
      const paired=!['heading','note','climate','light','cover','media','comparison','navigate'].includes(item.type) && rowDomain!=='select';
      if (!paired) pairGroup=null;
      if (paired && !pairGroup) {pairGroup=this._make('div','pair-grid');body.append(pairGroup);}
      if (item.type === 'heading') {
        const h=this._make('div','subheading');h.append(this._make('span',null,item.name));
        for (const badge of item.badges || []) {const value=this._make('button','badge'),name=this._make('span','badge-name'),reading=this._make('span');value.append(name,reading);value.onclick=()=>this._more(this._hass?.states[badge.entity]);h.append(value);this._refs.push({item:badge,badge:value,badgeName:name,badgeValue:reading});}
        body.append(h);continue;
      }
      if (item.type === 'note') { body.append(this._make('div','note',item.name));continue; }
      if (['climate','light','cover','media'].includes(item.type)) {
        const child = document.createElement(`compact-${item.type}-row`);child.className='climate';body.append(child);
        customElements.whenDefined(`compact-${item.type}-row`).then(()=>this._render());
        this._refs.push({item,child,configured:false});continue;
      }
      if (item.type === 'comparison') {
        const table=this._make('table'),thead=this._make('thead'),head=this._make('tr');table.setAttribute('role','table');thead.setAttribute('role','rowgroup');head.setAttribute('role','row');thead.append(head);table.append(thead);
        for (const label of ['항목','이번 달 누적','지난달 전체','차이']) { const th=this._make('th',null,label);th.scope='col';th.setAttribute('role','columnheader');head.append(th); }
        const tbody=this._make('tbody');tbody.setAttribute('role','rowgroup');table.append(tbody);
        for (const comparison of item.rows) {
          const row=this._make('tr');tbody.append(row);row.append(this._make('td',null,comparison.name));
          const now=this._make('button'),prev=this._make('button'),nowCell=this._make('td'),prevCell=this._make('td');nowCell.append(now);prevCell.append(prev);row.append(nowCell,prevCell);
          now.onclick=()=>this._more(this._hass?.states[comparison.entity]);prev.onclick=()=>this._more(this._hass?.states[comparison.previous]);
          const delta=this._make('span'),percent=this._make('small'),deltaCell=this._make('td');deltaCell.append(delta,percent);row.append(deltaCell);
          row.setAttribute('role','row');
          [...row.children].forEach((cell,index)=>{cell.setAttribute('role','cell');cell.dataset.label=['항목','이번 달 누적','지난달 전체','차이'][index];});
          this._refs.push({item:comparison,now,prev,delta,percent});
        }
        body.append(table);continue;
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
        if (!ref.configured && ref.child.setConfig) {ref.child.setConfig({entity:item.entity,name:item.name,...(item.show_volume!==undefined?{show_volume:item.show_volume}:{}),...(item.show_next!==undefined?{show_next:item.show_next}:{}),embedded:true});ref.configured=true;}
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
    const feedback=compactFeedback(this,'pending','변경 요청 중');
    this._busy.add(id);this._render();
    try {await this._hass.callService(domain,service,data,undefined,target);compactFeedback(this,'success','요청 전달됨',feedback);}
    catch(error) {compactFeedback(this,'error','요청 실패',feedback);this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:'변경 실패: '+(error?.message || error)},bubbles:true,composed:true}));}
    finally {this._busy.delete(id);this._render();}
  }
}
if (!customElements.get('compact-home-panel')) customElements.define('compact-home-panel',CompactHomePanel);
window.customCards=window.customCards || [];
if (!window.customCards.some(c=>c.type==='compact-home-panel')) window.customCards.push({type:'compact-home-panel',name:'Compact home panel',description:'작은 행으로 묶은 홈 제어·센서·사용량 비교'});

// Compact direct controls. Shared structure keeps standalone and embedded rows identical.
class CompactControlRow extends HTMLElement {
  constructor(domain) {
    super();
    this._domain = domain;
    this._busy = new Set();
    this._editing = new Set();
    this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;container-type:inline-size}
      ha-card{box-sizing:border-box;padding:6px 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:56px}
      button,input{font:inherit;color:var(--primary-text-color)}
      button{border:0;background:transparent;cursor:pointer;border-radius:8px;min-width:36px;min-height:36px;padding:6px;display:grid;place-items:center}
      button:hover{background:var(--secondary-background-color)}
      button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      button:disabled,input:disabled{opacity:.4;cursor:default}
      input[aria-busy=true]{opacity:.65;cursor:progress}
      button[aria-busy=true]{background:color-mix(in srgb,var(--primary-color) 14%,transparent)}
      .info{display:block;justify-items:normal;align-items:normal;flex:1 1 84px;min-width:0;text-align:left;padding:2px 0}
      .name,.state{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .name{font-size:14px}.state{font-size:12px;color:var(--secondary-text-color);margin-top:2px}
      .controls{display:flex;align-items:center;gap:2px;flex:none}
      .controls:empty{display:none}
      ha-icon{--mdc-icon-size:20px;width:20px;height:20px}
      button[aria-pressed=true]{color:var(--state-light-active-color,var(--primary-color));background:color-mix(in srgb,var(--primary-color) 12%,transparent)}
      .slider{display:flex;align-items:center;gap:8px;flex:1 1 138px;min-width:0}
      .slider[hidden],button[hidden]{display:none}
      input{accent-color:var(--primary-color);width:100%;min-width:40px;min-height:36px;margin:0;cursor:pointer}
      output{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;min-width:36px;text-align:right}
      .slider ha-icon{--mdc-icon-size:16px;width:16px;height:16px;color:var(--secondary-text-color)}
      .kelvin input{appearance:none;background:transparent}
      .kelvin input::-webkit-slider-runnable-track{height:6px;border-radius:6px;background:linear-gradient(90deg,#e5ba7b,#e9e7df,#afcfe5);border:1px solid var(--divider-color)}
      .kelvin input::-moz-range-track{height:4px;border-radius:6px;background:linear-gradient(90deg,#e5ba7b,#e9e7df,#afcfe5);border:1px solid var(--divider-color)}
      .kelvin input::-webkit-slider-thumb{appearance:none;width:16px;height:16px;margin-top:-6px;border:2px solid var(--card-background-color);border-radius:50%;background:var(--primary-color)}
      .kelvin input::-moz-range-thumb{width:12px;height:12px;border:2px solid var(--card-background-color);border-radius:50%;background:var(--primary-color)}
      .cover-control{width:36px;height:36px;padding:2px;grid-template-rows:16px 12px;row-gap:1px;align-content:center}.cover-control ha-icon{--mdc-icon-size:16px;width:16px;height:16px}.control-label{font-size:10px;line-height:12px;white-space:nowrap}
      @container(max-width:360px){ha-card{gap:4px 8px}.info{flex-basis:84px}}
      @media(pointer:coarse){button,input{min-height:44px}.controls button{min-width:44px}.cover-control{width:44px;height:44px}}
      .open.moving ha-icon{animation:compact-opening 1.4s ease-in-out infinite}.close.moving ha-icon{animation:compact-closing 1.4s ease-in-out infinite}@keyframes compact-opening{0%,100%{transform:translateY(1px)}50%{transform:translateY(-2px)}}@keyframes compact-closing{0%,100%{transform:translateY(-1px)}50%{transform:translateY(2px)}}@media(prefers-reduced-motion:reduce){.moving ha-icon{animation:none!important}}
      :host([embedded]) ha-card{border:0;box-shadow:none;background:transparent;padding:4px 0}
    </style><ha-card><button class="info"><span class="name"></span><span class="state"></span></button><div class="controls"></div></ha-card>`;
    compactInteractions(this);
    this._card = this.shadowRoot.querySelector('ha-card');
    this.shadowRoot.querySelector('.info').onclick = () => {
      if(this._config)this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:this._config.entity},bubbles:true,composed:true}));
    };
  }
  setConfig(config) {
    if(typeof config?.entity !== 'string' || !new RegExp(`^${this._domain}\\.[a-z0-9_]+$`).test(config.entity)) throw new Error(`${this._domain} 엔티티가 필요합니다.`);
    if(config.name !== undefined && typeof config.name !== 'string') throw new Error('name은 문자열이어야 합니다.');
    if(this._config?.entity !== config.entity)this._editing.clear();
    compactClearFeedback(this);
    this._config = {...config};
    this.toggleAttribute('embedded',Boolean(config.embedded));
    this._render();
  }
  set hass(hass) {this._hass=hass;this._render();}
  disconnectedCallback(){compactClearFeedback(this);this._editing.clear();for(const ref of [this._brightness,this._kelvin,this._position])if(ref){clearTimeout(ref.timer);ref.pending=undefined;}}
  getCardSize() {return 2;}
  getGridOptions() {return {columns:12,min_columns:6};}
  _button(key,label,icon,action) {
    const button=document.createElement('button');button.className=key;button.title=label;button.setAttribute('aria-label',label);
    const glyph=document.createElement('ha-icon');glyph.setAttribute('icon',icon);button.append(glyph);button.onclick=action;
    this.shadowRoot.querySelector('.controls').append(button);return button;
  }
  _slider(key,label,icon,min,max,step,commit) {
    const group=document.createElement('label');group.className=`slider ${key}`;
    const glyph=document.createElement('ha-icon');glyph.setAttribute('icon',icon);glyph.setAttribute('aria-hidden','true');
    const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.setAttribute('aria-label',label);
    const output=document.createElement('output');group.append(glyph,input,output);this._card.append(group);
    const format=value=>key==='kelvin'?`${value} K`:`${value}%`;
    input.oninput=()=>{if(input.disabled||ref.busy){this._editing.delete(key);this._render();return;}this._editing.add(key);compactText(output,format(input.value));input.setAttribute('aria-valuetext',format(input.value));};
    input.onchange=()=>{
      this._editing.delete(key);
      if(input.disabled||ref.busy){this._render();return;}
      const entity=this._config.entity,value=Number(input.value);
      if(!Number.isFinite(value))return;
      clearTimeout(ref.timer);ref.pending={entity,value};this._render();
      Promise.resolve(commit(value)).then(()=>{
        if(ref.pending?.entity!==entity)return;
        ref.timer=setTimeout(()=>{ref.pending=undefined;this._render();},3000);
      });
    };
    input.onblur=()=>{this._editing.delete(key);this._render();};
    input.onpointercancel=()=>{this._editing.delete(key);this._render();};
    input.onpointerdown=event=>{if(ref.busy)event.preventDefault();};
    input.addEventListener('keydown',event=>{
      if(ref.busy&&['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}
    });
    const ref={group,input,output,key,format};return ref;
  }
  _syncSlider(ref,value,visible,disabled,busy=false) {
    ref.group.hidden=!visible;
    // Native disabled blurs a focused range. Pending requests keep focus while
    // event guards block edits; truly unavailable controls remain disabled.
    ref.input.disabled=disabled||!visible;ref.busy=busy;
    compactAttr(ref.input,'aria-disabled',ref.input.disabled||busy);compactAttr(ref.input,'aria-busy',busy);
    if(!this._editing.has(ref.key)) {
      if(ref.pending?.entity===this._config.entity) {
        if(value===ref.pending.value){clearTimeout(ref.timer);ref.pending=undefined;}
        else value=ref.pending.value;
      }
      const valid=Number.isFinite(value);
      if(valid)compactProp(ref.input,'value',String(value));
      compactText(ref.output,valid?ref.format(value):'—');
      compactAttr(ref.input,'aria-valuetext',valid?ref.format(value):'확인 불가');
    }
  }
  _state() {return this._hass?.states[this._config?.entity];}
  _offline(state) {return !state || ['unknown','unavailable'].includes(state.state);}
  _renderInfo(state) {
    compactText(this.shadowRoot.querySelector('.name'),this._config.name || state?.attributes.friendly_name || this._config.entity);
    compactText(this.shadowRoot.querySelector('.state'),this._offline(state)?'확인 불가':(this._hass.formatEntityState?.(state) || state.state));
    this.shadowRoot.querySelector('.info').title=this.shadowRoot.querySelector('.name').textContent;
    compactAttr(this._card,'aria-busy',this._busy.has(this._config.entity));
  }
  async _call(service,data={},interrupt=false) {
    const entity=this._config?.entity;
    if(!entity || this._offline(this._state()) || (this._busy.has(entity)&&!interrupt))return;
    const token=interrupt?`${entity}:stop`:entity;
    if(this._busy.has(token))return;
    const feedback=compactFeedback(this,'pending','변경 요청 중');
    const hass=this._hass;this._busy.add(token);this._render();
    try {await hass.callService(this._domain,service,{entity_id:entity,...data});compactFeedback(this,'success','요청 전달됨',feedback);}
    catch(error) {
      compactFeedback(this,'error','요청 실패',feedback);
      for(const ref of [this._brightness,this._kelvin,this._position])if(ref?.pending?.entity===entity){clearTimeout(ref.timer);ref.pending=undefined;}
      this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:'변경 실패: '+(error?.message || error)},bubbles:true,composed:true}));
    }
    finally {this._busy.delete(token);this._render();}
  }
}
class CompactLightRow extends CompactControlRow {
  constructor() {
    super('light');
    this._toggle=this._button('toggle','조명 켜기/끄기','mdi:power',()=>this._call('toggle'));
    this._brightness=this._slider('brightness','밝기','mdi:brightness-6',0,100,1,value=>this._call(value===0?'turn_off':'turn_on',value===0?{}:{brightness_pct:value}));
    this._kelvin=this._slider('kelvin','색온도','mdi:thermometer',2000,6500,1,value=>this._call('turn_on',{color_temp_kelvin:value}));
    this._kelvin.group.title='색온도 · 왼쪽은 따뜻한 빛, 오른쪽은 차가운 빛';
    this._kelvin.input.onkeydown=event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
      const input=this._kelvin.input,step=event.shiftKey?50:100;
      const increments={ArrowRight:step,ArrowUp:step,ArrowLeft:-step,ArrowDown:-step,PageUp:500,PageDown:-500};
      if(!(event.key in increments)&&!['Home','End'].includes(event.key))return;
      event.preventDefault();
      if(input.disabled||this._kelvin.group.hidden)return;
      const min=Number(input.min),max=Number(input.max),value=Number(input.value);
      const target=event.key==='Home'?min:event.key==='End'?max:Math.max(min,Math.min(max,value+increments[event.key]));
      if(target===value)return;
      input.value=String(target);
      input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
      input.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
    };
  }
  static getStubConfig(hass) {return {entity:Object.keys(hass?.states || {}).find(id=>id.startsWith('light.')) || 'light.living_room'};}
  _render() {
    if(!this._config || !this._hass || !this._toggle)return;
    const state=this._state(),a=state?.attributes || {},offline=this._offline(state),busy=this._busy.has(this._config.entity);
    this._renderInfo(state);
    compactProp(this._toggle,'disabled',offline||busy);compactAttr(this._toggle,'aria-busy',busy);compactAttr(this._toggle,'aria-pressed',state?.state==='on');
    compactAttr(this._toggle,'aria-label',`${this._config.name||a.friendly_name||this._config.entity} ${state?.state==='on'?'끄기':'켜기'}`);
    const modes=Array.isArray(a.supported_color_modes)?a.supported_color_modes:[];
    const brightness=modes.some(mode=>['brightness','color_temp','hs','xy','rgb','rgbw','rgbww','white'].includes(mode));
    this._syncSlider(this._brightness,state?.state==='off'?0:(Number.isFinite(a.brightness)?Math.round(a.brightness/255*100):NaN),brightness,offline,busy);
    const validKelvin=Number.isFinite(a.min_color_temp_kelvin)&&Number.isFinite(a.max_color_temp_kelvin)&&a.min_color_temp_kelvin<a.max_color_temp_kelvin;
    const color=modes.includes('color_temp')&&validKelvin;
    if(color){this._kelvin.input.min=a.min_color_temp_kelvin;this._kelvin.input.max=a.max_color_temp_kelvin;}
    this._syncSlider(this._kelvin,a.color_temp_kelvin,color,offline,busy);
  }
}
class CompactCoverRow extends CompactControlRow {
  constructor() {
    super('cover');
    this._open=this._button('open','열기','mdi:chevron-up',()=>this._call('open_cover'));
    this._stop=this._button('stop','정지','mdi:stop',()=>this._call('stop_cover',{},true));
    this._close=this._button('close','닫기','mdi:chevron-down',()=>this._call('close_cover'));
    for(const [button,label] of [[this._open,'열기'],[this._stop,'정지'],[this._close,'닫기']]){
      button.classList.add('cover-control');const text=document.createElement('span');text.className='control-label';text.textContent=label;button.append(text);
    }
    this._position=this._slider('position','열림 위치','mdi:blinds-horizontal',0,100,1,value=>this._call('set_cover_position',{position:value}));
  }
  static getStubConfig(hass) {return {entity:Object.keys(hass?.states || {}).find(id=>id.startsWith('cover.')) || 'cover.living_room'};}
  _render() {
    if(!this._config || !this._hass || !this._position)return;
    const state=this._state(),a=state?.attributes || {},features=Number(a.supported_features)||0,offline=this._offline(state),busy=this._busy.has(this._config.entity);
    this._renderInfo(state);
    for(const [button,bit] of [[this._open,1],[this._stop,8],[this._close,2]]) {
      button.hidden=!(features&bit);
      button.disabled=offline || (button===this._stop?this._busy.has(`${this._config.entity}:stop`):busy);
      compactAttr(button,'aria-busy',button===this._stop?this._busy.has(`${this._config.entity}:stop`):busy);
    }
    this._open.classList.toggle('moving',!offline&&state.state==='opening');this._close.classList.toggle('moving',!offline&&state.state==='closing');
    this._syncSlider(this._position,a.current_position,Boolean(features&4),offline,busy);
  }
}
for(const [type,constructor,name,description] of [
  ['compact-light-row',CompactLightRow,'Compact light row','조명 전원·밝기·색온도를 바로 제어'],
  ['compact-cover-row',CompactCoverRow,'Compact cover row','커튼 열기·정지·닫기와 위치 제어']
]) {
  if(!customElements.get(type))customElements.define(type,constructor);
  if(!window.customCards.some(card=>card.type===type))window.customCards.push({type,name,description});
}

// Small quick-action and environment panels share presentation, not service state.
(() => {
  const styles = `
    :host{display:block;container-type:inline-size}
    ha-card{padding:8px;box-sizing:border-box}
    h2{font-size:14px;font-weight:500;margin:2px 4px 8px;color:var(--primary-text-color)}
    h2[hidden]{display:none}
    .grid{display:grid;grid-template-columns:repeat(var(--columns,auto-fit),minmax(min(112px,100%),1fr));gap:6px}
    button{display:flex;align-items:center;gap:8px;min-width:0;min-height:44px;padding:6px 8px;
      border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,10px);
      background:transparent;color:var(--primary-text-color);font:inherit;text-align:left;cursor:pointer;
      transition:background-color 120ms ease,transform 120ms ease}
    button:hover:not(:disabled){background:var(--secondary-background-color)}
    button:active:not(:disabled){transform:scale(.98)}
    button:focus-visible{outline:2px solid var(--primary-color);outline-offset:1px}
    button:disabled{cursor:default;opacity:.55}
    button[aria-busy=true]{cursor:progress}
    ha-icon{--mdc-icon-size:20px;flex:none;width:20px;height:20px;color:var(--primary-color)}
    .copy{flex:1;min-width:0}.label{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .detail{display:block;font-size:11px;color:var(--secondary-text-color);margin-top:2px}
    @media(prefers-reduced-motion:reduce){button{transition:none}button:active:not(:disabled){transform:none}}
  `;
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const validate = config => {
    if (!Array.isArray(config?.items) || !config.items.length) throw new Error('items에 하나 이상의 항목이 필요합니다.');
    if (config.name !== undefined && typeof config.name !== 'string') throw new Error('name은 문자열이어야 합니다.');
    if (config.columns !== undefined && config.columns !== 'auto' && ![1,2,3,4].includes(config.columns)) throw new Error('columns는 auto 또는 1~4입니다.');
    config.items.forEach((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.entity !== 'string') throw new Error(`items[${i}]: entity가 필요합니다.`);
      for (const key of ['name','icon']) if (item[key] !== undefined && typeof item[key] !== 'string') throw new Error(`items[${i}]: ${key}은 문자열이어야 합니다.`);
    });
  };
  class CompactSmallPanel extends HTMLElement {
    constructor() {
      super(); this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML = `<style>${styles}</style><ha-card><h2 hidden></h2><div class="grid"></div></ha-card>`;
      compactInteractions(this);
      this._refs = []; this._busy = new Set();
    }
    set hass(value) { this._hass = value; this._render(); }
    disconnectedCallback(){compactClearFeedback(this);}
    getCardSize() { return Math.max(1, Math.ceil((this._config?.items.length || 1) / (Number(this._config?.columns) || 3)) + (this._config?.name ? 1 : 0)); }
    getGridOptions() { return {columns:12}; }
    _configure(config) {
      // Own configuration so later caller mutations do not bypass validation.
      compactClearFeedback(this);
      this._config = JSON.parse(JSON.stringify(config));
      const heading = this.shadowRoot.querySelector('h2');
      compactText(heading, config.name || ''); heading.hidden = !config.name;
      const grid = this.shadowRoot.querySelector('.grid');
      grid.style.gridTemplateColumns = config.columns === undefined || config.columns === 'auto'
        ? 'repeat(auto-fit,minmax(min(112px,100%),1fr))' : `repeat(${config.columns},minmax(0,1fr))`;
      grid.replaceChildren(); this._refs = [];
      for (const item of this._config.items) {
        const button = make('button'), icon = make('ha-icon'), copy = make('span','copy'), label = make('span','label'), detail = make('span','detail');
        button.type = 'button'; copy.append(label,detail); button.append(icon,copy); grid.append(button);
        const ref = {item,button,icon,label,detail}; this._refs.push(ref); this._bind(ref);
      }
      this._render();
    }
    _name(ref,state) { return ref.item.name || state?.attributes.friendly_name || ref.item.entity; }
    _notify(message) { this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message},bubbles:true,composed:true})); }
  }
  class CompactScenePanel extends CompactSmallPanel {
    constructor(){super();this._itemFeedback=new Map();this._itemEpoch=0;}
    _clearItemFeedback(){for(const entry of this._itemFeedback.values())clearTimeout(entry.timer);this._itemFeedback.clear();this._itemEpoch++;}
    disconnectedCallback(){super.disconnectedCallback();this._clearItemFeedback();}
    _setItemFeedback(id,status,epoch){
      if(epoch!==this._itemEpoch)return;
      clearTimeout(this._itemFeedback.get(id)?.timer);
      const entry={status};entry.timer=setTimeout(()=>{if(this._itemFeedback.get(id)===entry){this._itemFeedback.delete(id);this._render();}},1800);
      this._itemFeedback.set(id,entry);
    }
    setConfig(config) {
      validate(config);
      config.items.forEach((item,i) => {
        if (!/^(scene|script)\.[a-z0-9_]+$/.test(item.entity)) throw new Error(`items[${i}]: scene 또는 script 엔티티가 필요합니다.`);
        if (item.confirmation !== undefined && typeof item.confirmation !== 'string') throw new Error(`items[${i}]: confirmation은 문자열이어야 합니다.`);
      });
      this._clearItemFeedback();this._configure(config);
    }
    static getStubConfig(hass) {
      return {items:[{entity:Object.keys(hass?.states || {}).find(id => /^(scene|script)\./.test(id)) || 'scene.relax',name:'휴식'}]};
    }
    _bind(ref) { ref.button.onclick = () => this._activate(ref); }
    _available(state) {
      // A scene that has never been activated legitimately has an unknown timestamp.
      return state && state.state !== 'unavailable' && (state.entity_id.startsWith('scene.') || state.state !== 'unknown');
    }
    _render() {
      if (!this._hass || !this._config) return;
      for (const ref of this._refs) {
        const state = this._hass.states[ref.item.entity], name = this._name(ref,state);
        const busy = this._busy.has(ref.item.entity), running = state?.entity_id.startsWith('script.') && state.state === 'on';
        const available = this._available(state);
        compactText(ref.label,name);
        const feedback=this._itemFeedback.get(ref.item.entity)?.status;
        compactText(ref.detail,busy ? '실행 요청 중…' : !available ? '확인 불가' : running ? '실행 중' : feedback==='success' ? '요청 전달됨' : feedback==='error' ? '요청 실패' : '실행');
        compactAttr(ref.button,'data-result',feedback||'');
        compactAttr(ref.icon,'icon',ref.item.icon || state?.attributes.icon || (ref.item.entity.startsWith('scene.') ? 'mdi:palette-outline' : 'mdi:play'));
        compactProp(ref.button,'disabled',!available || busy || running);
        compactAttr(ref.button,'aria-busy',busy);
        compactAttr(ref.button,'aria-label',`${name} · ${ref.detail.textContent}`);
        compactProp(ref.button,'title',`${name} · ${ref.detail.textContent}`);
      }
    }
    async _activate(ref) {
      const id = ref.item.entity, state = this._hass?.states[id];
      if (!this._available(state) || this._busy.has(id) || (id.startsWith('script.') && state.state === 'on')) return;
      if (ref.item.confirmation && !window.confirm(ref.item.confirmation)) return;
      this._feedbackEntity=id;
      const itemEpoch=this._itemEpoch;
      const feedback=compactFeedback(this,'pending','실행 요청 중');
      this._busy.add(id); this._render();
      try { await this._hass.callService(id.split('.')[0],'turn_on',{entity_id:id});this._setItemFeedback(id,'success',itemEpoch);compactFeedback(this,'success','요청 전달됨',feedback); }
      catch(error) { this._setItemFeedback(id,'error',itemEpoch);compactFeedback(this,'error','요청 실패',feedback);this._notify('실행 실패: ' + (error?.message || error)); }
      finally { this._busy.delete(id); this._render(); }
    }
  }
  class CompactEnvironmentPanel extends CompactSmallPanel {
    constructor() {
      super();
      const style = make('style');
      style.textContent = `.reading{display:inline-flex;align-items:baseline;gap:3px;font-size:18px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.3;white-space:nowrap;max-width:100%}.reading>span:first-child{white-space:nowrap}.reading.unit-first{flex-direction:row-reverse}.unit{font-size:11px;font-weight:400;color:var(--secondary-text-color)}.unit:empty{display:none}
        button{align-items:center}.label{font-size:12px;color:var(--secondary-text-color)}
        button[data-level=warning]{border-color:var(--warning-color,#ffa600)}button[data-level=critical]{border-color:var(--error-color,#db4437)}
        button[data-level=warning] ha-icon{color:var(--warning-color,#ffa600)}button[data-level=critical] ha-icon{color:var(--error-color,#db4437)}
        @container(max-width:360px){ha-icon{display:none}}`;
      this.shadowRoot.append(style);
      if(typeof ResizeObserver==='function')this._resize=new ResizeObserver(()=>this._layout());
    }
    connectedCallback(){this._resize?.observe(this);this._layout();}
    disconnectedCallback(){super.disconnectedCallback();this._resize?.disconnect();}
    _readingParts(state,formatted){
      const unit=state.attributes.unit_of_measurement||'';
      if(!unit)return {number:formatted,unit:'',prefix:false};
      if(formatted.endsWith(unit))return {number:formatted.slice(0,-unit.length).trimEnd(),unit,prefix:false};
      if(formatted.startsWith(unit))return {number:formatted.slice(unit.length).trimStart(),unit,prefix:true};
      // Preserve a formatter's unfamiliar representation rather than guessing at its digits.
      return {number:formatted,unit:'',prefix:false};
    }
    _layout(){
      if(!this._config||!(this._config.columns===undefined||this._config.columns==='auto'))return;
      const width=this.getBoundingClientRect().width;if(!width)return;
      const grid=this.shadowRoot.querySelector('.grid'),available=Math.max(1,width-18),iconSpace=width>360?28:0;
      const required=Math.max(90,...this._refs.map(ref=>ref.reading.scrollWidth+18+iconSpace));
      const columns=Math.max(1,Math.min(this._refs.length,Math.floor((available+6)/(required+6))));
      compactStyle(grid,'grid-template-columns',`repeat(${columns},minmax(0,1fr))`);
      // Let a final unpaired metric use its row instead of leaving an empty half-card.
      for(const [index,ref] of this._refs.entries())compactStyle(ref.button,'grid-column',columns===2&&this._refs.length%2===1&&index===this._refs.length-1?'1 / -1':'auto');
    }
    setConfig(config) {
      validate(config);
      config.items.forEach((item,i) => {
        if (!/^sensor\.[a-z0-9_]+$/.test(item.entity)) throw new Error(`items[${i}]: sensor 엔티티가 필요합니다.`);
        if (item.thresholds !== undefined && (!Array.isArray(item.thresholds) || item.thresholds.some(t => !t || !Number.isFinite(t.value) || !['above','below'].includes(t.direction) || !['warning','critical'].includes(t.level)))) throw new Error(`items[${i}]: thresholds에는 숫자 value, above/below direction, warning/critical level이 필요합니다.`);
      });
      this._configure(config);
      if(config.columns===undefined || config.columns==='auto')this.shadowRoot.querySelector('.grid').style.gridTemplateColumns='repeat(auto-fit,minmax(min(90px,100%),1fr))';
      this._layout();
    }
    static getStubConfig(hass) {
      const state = Object.values(hass?.states || {}).find(s => s.entity_id.startsWith('sensor.') && ['temperature','humidity','carbon_dioxide'].includes(s.attributes.device_class));
      return {items:[{entity:state?.entity_id || 'sensor.room_temperature',name:'온도'}]};
    }
    _bind(ref) {
      ref.reading = make('span','reading'); ref.number = make('span'); ref.unit = make('span','unit');
      ref.reading.append(ref.number,ref.unit); ref.label.after(ref.reading);
      ref.button.onclick = () => {
        if (this._hass?.states[ref.item.entity]) this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:ref.item.entity},bubbles:true,composed:true}));
      };
    }
    _render() {
      if (!this._hass || !this._config) return;
      const icons = {temperature:'mdi:thermometer',humidity:'mdi:water-percent',carbon_dioxide:'mdi:molecule-co2'};
      for (const ref of this._refs) {
        const state = this._hass.states[ref.item.entity], name = this._name(ref,state);
        const available = state && !['unknown','unavailable'].includes(state.state) && state.state.trim() !== '' && Number.isFinite(Number(state.state));
        const reading = available ? this._hass.formatEntityState?.(state) || `${state.state} ${state.attributes.unit_of_measurement || ''}`.trim() : '확인 불가';
        const levels = available ? (ref.item.thresholds || []).filter(t => t.direction === 'above' ? Number(state.state) >= t.value : Number(state.state) <= t.value).map(t => t.level) : [];
        const level = levels.includes('critical') ? 'critical' : levels.includes('warning') ? 'warning' : '';
        const status = level === 'critical' ? '위험' : level === 'warning' ? '주의' : '';
        compactText(ref.label,name);
        // Use HA's localized formatting when available; never append its unit twice.
        const parts=available?this._readingParts(state,reading):{number:'—',unit:'',prefix:false};
        compactText(ref.number,parts.number);compactText(ref.unit,parts.unit);ref.reading.classList.toggle('unit-first',parts.prefix);
        compactText(ref.detail,available ? status : '확인 불가'); ref.detail.hidden = available && !status;
        compactAttr(ref.icon,'icon',ref.item.icon || state?.attributes.icon || icons[state?.attributes.device_class] || 'mdi:gauge');
        compactAttr(ref.button,'data-level',level); compactProp(ref.button,'disabled',!state);
        compactAttr(ref.button,'aria-label',`${name} · ${reading}${status ? ' · ' + status : ''}`);
        compactProp(ref.button,'title',`${name} · ${reading}${status ? ' · ' + status : ''}`);
      }
      this._layout();
    }
  }
  for (const [type,Constructor,name,description] of [
    ['compact-scene-panel',CompactScenePanel,'Compact scene panel','장면과 스크립트를 한 번에 실행'],
    ['compact-environment-panel',CompactEnvironmentPanel,'Compact environment panel','온도·습도·공기질과 사용자 지정 임계값'],
  ]) {
    if (!customElements.get(type)) customElements.define(type,Constructor);
    if (!window.customCards.some(c => c.type === type)) window.customCards.push({type,name,description});
  }
})();

// Compact media playback: capability-aware controls, committed volume changes only.
class CompactMediaRow extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'}); this._busy=new Set(); this._requestContext=0; this._editingVolume=false;
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;container-type:inline-size}ha-card{padding:4px 10px;box-sizing:border-box;overflow:hidden}
      .main{display:flex;align-items:center;gap:4px;min-height:48px}.info{flex:1;min-width:0;text-align:left;padding-inline:4px}
      button{font:inherit;color:var(--primary-text-color);background:transparent;border:0;border-radius:8px;cursor:pointer;min-height:40px;min-width:40px;transition:background-color 150ms ease}
      button:hover:not(:disabled){background:var(--secondary-background-color)}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:-2px}
      button:disabled,input:disabled{opacity:.4;cursor:default}button[aria-busy=true]{cursor:progress;background:var(--secondary-background-color)}
      .name,.title,.state{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.name{font-size:12px;color:var(--secondary-text-color)}.title{font-size:14px;line-height:20px}.state{font-size:12px;color:var(--secondary-text-color)}
      ha-icon{display:block;width:20px;height:20px;--mdc-icon-size:20px;margin:auto}.play{color:var(--primary-color);position:relative}.play.playing:after{content:'';position:absolute;width:4px;height:4px;border-radius:50%;background:currentColor;bottom:4px;left:calc(50% - 2px)}
      .volume{display:flex;align-items:center;gap:4px;min-height:32px;padding-inline:4px}.volume .mute{flex:none;min-width:32px;width:32px;min-height:32px;padding:0}.volume .mute:disabled{opacity:1}.volume .mute[aria-pressed=true]{color:var(--primary-color)}.volume .mute:disabled:hover{background:transparent}.volume ha-icon{color:inherit;width:18px;--mdc-icon-size:18px}.volume input{flex:1;min-width:0;width:100%;height:28px;accent-color:var(--primary-color);cursor:pointer}.volume output{min-width:34px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:var(--secondary-text-color)}
      [hidden]{display:none!important}:host([embedded]) ha-card{border:0;box-shadow:none;background:transparent;padding-inline:0}
      @media(pointer:coarse){button{min-width:44px;min-height:44px}.volume{min-height:44px}.volume .mute{min-width:44px;min-height:44px}.volume input{height:40px}}
      @media(prefers-reduced-motion:reduce){button{transition:none}}
    </style><ha-card><div class="main"><button class="info"><span class="name"></span><span class="title"></span><span class="state"></span></button><button class="play"><ha-icon></ha-icon></button><button class="next" aria-label="다음 곡" title="다음 곡"><ha-icon icon="mdi:skip-next"></ha-icon></button></div><div class="volume"><button class="mute"><ha-icon icon="mdi:volume-medium"></ha-icon></button><input type="range" min="0" max="100" step="1" aria-label="음량"><output></output></div></ha-card>`;
    compactInteractions(this);
    this._q('.info').onclick=()=>{if(this._config)this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:this._config.entity},bubbles:true,composed:true}));};
    this._q('.play').onclick=()=>this._call(this._playAction());
    this._q('.next').onclick=()=>this._call('media_next_track');
    this._q('.mute').onclick=()=>{const muted=this._state()?.attributes.is_volume_muted;if(typeof muted==='boolean')this._call('volume_mute',{is_volume_muted:!muted});};
    const volume=this._q('input');
    volume.onpointerdown=()=>{this._editingVolume=true;this._volumeGestureChanged=false;this._volumeGestureStart=Number(volume.value);};
    volume.oninput=()=>{this._editingVolume=true;this._volumeGestureChanged=true;this._showVolume(volume.value);};
    volume.onchange=()=>{const value=Number(volume.value);this._editingVolume=false;this._volumeGestureChanged=false;this._commitVolume(value);};
    const release=()=>{if(!this._volumeGestureChanged||Number(volume.value)===this._volumeGestureStart){this._editingVolume=false;this._render();}};
    volume.onpointerup=release;volume.onlostpointercapture=release;
    volume.onpointercancel=()=>{this._editingVolume=false;this._render();};
    volume.onblur=()=>{this._editingVolume=false;this._render();};
  }
  _q(selector){return this.shadowRoot.querySelector(selector);}
  setConfig(config){
    if(typeof config?.entity!=='string'||!/^media_player\.[a-zA-Z0-9_]+$/.test(config.entity))throw new Error('media_player 엔티티가 필요합니다.');
    for(const key of ['show_volume','show_next','embedded'])if(config[key]!==undefined&&typeof config[key]!=='boolean')throw new Error(`${key}는 true 또는 false여야 합니다.`);
    if(config.name!==undefined&&typeof config.name!=='string')throw new Error('name은 문자열이어야 합니다.');
    if(this._config?.entity!==config.entity){this._requestContext++;this._editingVolume=false;this._pendingVolume=undefined;clearTimeout(this._volumeTimer);}
    compactClearFeedback(this);
    this._config={...config};this.toggleAttribute('embedded',Boolean(config.embedded));this._render();
  }
  set hass(value){this._hass=value;this._render();}
  static getStubConfig(hass){return {entity:Object.keys(hass?.states||{}).find(id=>id.startsWith('media_player.'))||'media_player.living_room'};}
  getCardSize(){return this._config?.show_volume===false?1:2;}
  getGridOptions(){return {columns:12,min_columns:6};}
  _state(){return this._hass?.states[this._config?.entity];}
  _supports(bit){return (Number(this._state()?.attributes.supported_features)&bit)!==0;}
  _channel(service){return ['volume_set','volume_mute'].includes(service)?'audio':'transport';}
  _isBusy(channel){return this._busy.has(`${this._config?.entity}:${channel}`);}
  _playAction(){const state=this._state()?.state;return state==='off'||state==='standby'?'turn_on':state==='playing'||state==='buffering'?'media_pause':'media_play';}
  _allowed(service){
    const state=this._state();if(!state||['unknown','unavailable'].includes(state.state))return false;
    const bit={turn_on:128,media_pause:1,media_play:16384,media_next_track:32,volume_set:4,volume_mute:8}[service];
    return Boolean(bit&&this._supports(bit)&&(service==='turn_on'||!['off','standby'].includes(state.state)));
  }
  _showVolume(value){compactText(this._q('output'),`${Math.round(Number(value))}%`);compactAttr(this._q('input'),'aria-valuetext',`${Math.round(Number(value))}%`);}
  _render(){
    if(!this._config||!this._hass)return;const state=this._state(),a=state?.attributes||{};
    const offline=!state||['unknown','unavailable'].includes(state.state),name=this._config.name||a.friendly_name||this._config.entity;
    compactText(this._q('.name'),name);compactText(this._q('.title'),offline?'확인 불가':a.media_title||name);
    this._q('.name').hidden=!a.media_title||offline;
    const labels={off:'꺼짐',on:'켜짐',idle:'대기',playing:'재생 중',paused:'일시정지',buffering:'버퍼링',standby:'대기'};
    compactText(this._q('.state'),offline?'연결을 확인하세요':[a.media_artist,this._hass.formatEntityState?.(state)||labels[state.state]||state.state,a.is_volume_muted===true?'음소거':'',this._isBusy('audio')||this._isBusy('transport')?'처리 중…':''].filter(Boolean).join(' · '));
    compactProp(this._q('.info'),'title',`${name} · ${a.media_title||''} · ${a.media_artist||''}`);
    this._q('.play').classList.toggle('playing',!offline&&state.state==='playing');
    const action=this._playAction(),play=this._q('.play'),label={turn_on:'전원 켜기',media_pause:'일시정지',media_play:'재생'}[action];
    const actionBit={turn_on:128,media_pause:1,media_play:16384}[action];
    play.hidden=!offline&&!this._supports(actionBit);compactAttr(play,'aria-label',`${name} ${label}`);compactProp(play,'title',label);
    compactAttr(play.querySelector('ha-icon'),'icon',{turn_on:'mdi:power',media_pause:'mdi:pause',media_play:'mdi:play'}[action]);
    const next=this._q('.next');next.hidden=this._config.show_next===false||!this._supports(32);
    for(const [button,service] of [[play,action],[next,'media_next_track']]){compactProp(button,'disabled',this._isBusy('transport')||!this._allowed(service));compactAttr(button,'aria-busy',this._isBusy('transport'));}
    const mute=this._q('.mute'),muted=a.is_volume_muted===true,muteLabel=muted?'음소거 해제':'음소거';
    compactAttr(mute.querySelector('ha-icon'),'icon',muted?'mdi:volume-off':'mdi:volume-medium');
    compactAttr(mute,'aria-label',`${name} ${muteLabel}`);compactProp(mute,'title',muteLabel);compactAttr(mute,'aria-pressed',muted);compactAttr(mute,'aria-busy',this._isBusy('audio'));
    compactProp(mute,'disabled',this._isBusy('audio')||!this._allowed('volume_mute')||typeof a.is_volume_muted!=='boolean');
    const slider=this._q('input'),level=a.volume_level,valid=typeof level==='number'&&Number.isFinite(level)&&level>=0&&level<=1;
    this._q('.volume').hidden=this._config.show_volume===false||!this._supports(4);
    compactProp(slider,'disabled',this._isBusy('audio')||!this._allowed('volume_set')||!valid);compactAttr(slider,'aria-label',`${name} 음량${muted?' (음소거 중)':''}`);
    if(this._pendingVolume!==undefined&&valid&&Math.round(level*100)===this._pendingVolume){this._pendingVolume=undefined;clearTimeout(this._volumeTimer);}
    if(!this._editingVolume){compactProp(slider,'value',String(this._pendingVolume??(valid?Math.round(level*100):0)));this._showVolume(slider.value);if(!valid)compactText(this._q('output'),'—');}
  }
  async _commitVolume(value){
    if(!Number.isFinite(value)||value<0||value>100||this._isBusy('audio')||!this._allowed('volume_set'))return;
    const context=this._requestContext,entity=this._config.entity;
    this._pendingVolume=value;clearTimeout(this._volumeTimer);
    this._volumeTimer=setTimeout(()=>{this._pendingVolume=undefined;this._render();},3000);
    if(!await this._call('volume_set',{volume_level:value/100})&&context===this._requestContext&&entity===this._config.entity){this._pendingVolume=undefined;clearTimeout(this._volumeTimer);this._render();}
  }
  async _call(service,data={}){
    const channel=this._channel(service),entity=this._config?.entity,context=this._requestContext;
    if(this._isBusy(channel)||!this._allowed(service))return false;
    const token=`${entity}:${channel}`,hass=this._hass;
    const feedback=compactFeedback(this,'pending','변경 요청 중');
    this._busy.add(token);this._render();
    try{await hass.callService('media_player',service,{entity_id:entity,...data});if(context===this._requestContext)compactFeedback(this,'success','요청 전달됨',feedback);return true;}
    catch(error){if(context===this._requestContext){compactFeedback(this,'error','요청 실패',feedback);this.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:'미디어 변경 실패: '+(error?.message||error)},bubbles:true,composed:true}));}return false;}
    finally{this._busy.delete(token);this._render();}
  }
  disconnectedCallback(){this._requestContext++;compactClearFeedback(this);clearTimeout(this._volumeTimer);this._pendingVolume=undefined;this._editingVolume=false;}
}
if(!customElements.get('compact-media-row'))customElements.define('compact-media-row',CompactMediaRow);
window.customCards=window.customCards||[];
if(!window.customCards.some(c=>c.type==='compact-media-row'))window.customCards.push({type:'compact-media-row',name:'Compact media row',description:'곡 정보와 재생·음량을 간결하게 제어'});

// Visual configuration: HA forms where available, native fields as a loading fallback.
// All edits copy configuration and emit the complete config; card services are never called.
(() => {
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const at=(root,path)=>path.reduce((value,key)=>value?.[key],root);
  const put=(root,path,value)=>{const parent=at(root,path.slice(0,-1));if(value===undefined)delete parent[path.at(-1)];else parent[path.at(-1)]=value;};
  const field=(name,label,selector,required=false)=>({name,label,selector,required});
  const text=(name,label,required=false)=>field(name,label,{text:{}},required);
  const entity=(name,label,domain,required=true)=>field(name,label,{entity:domain?{domain}:{}},required);
  const select=(name,label,options)=>field(name,label,{select:{mode:'dropdown',options:options.map(([value,label])=>({value,label}))}});
  const columns=max=>select('columns','열 수',[['auto','자동'],...Array.from({length:max},(_,i)=>[String(i+1),`${i+1}열`])]);
  const flatSchema=schema=>schema.flatMap(item=>item.schema&&(!item.name||item.flatten)?flatSchema(item.schema):[item]);
  const display=fields=>({type:'expandable',name:'',flatten:true,title:'표시 설정',schema:fields});
  const grid=fields=>({type:'grid',name:'',flatten:true,column_min_width:'90px',schema:fields});
  const labels={entity:'엔티티',lookup:'이름으로 센서 찾기',heading:'제목',note:'메모',climate:'냉난방',comparison:'사용량 비교',navigate:'페이지 이동',light:'조명',cover:'커튼',media:'미디어'};
  class CompactCardEditor extends HTMLElement {
    constructor(kind){
      super();this._kind=kind;this._forms=[];this._haDisplayOpen=new Set();this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML=`<style>
        :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}
        .root{display:grid;gap:12px}.list{display:grid;gap:8px}details{border:1px solid var(--divider-color,#ddd);border-radius:10px;padding:8px}summary{cursor:pointer;font-size:14px;font-weight:500;overflow-wrap:anywhere;min-height:32px;align-content:center}details>.content{display:grid;gap:10px;padding-top:8px}
        .toolbar,.add{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.toolbar{justify-content:flex-end}.toolbar button{min-width:36px}.add select{flex:1;min-width:130px}.heading{font-size:14px;font-weight:500;margin:0}.hint{font-size:12px;color:var(--secondary-text-color);margin:0;line-height:1.5}
        button,input,textarea,select{font:inherit;color:var(--primary-text-color);box-sizing:border-box}button{border:1px solid var(--divider-color,#ddd);background:var(--card-background-color,transparent);border-radius:7px;padding:6px 10px;cursor:pointer;min-height:36px}button:hover:not(:disabled){background:var(--secondary-background-color,#eee)}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--primary-color,#03a9f4);outline-offset:2px}
        .native{display:grid;gap:10px;min-width:0}.native-grid{grid-template-columns:repeat(auto-fit,minmax(min(90px,100%),1fr));align-items:start}.native label{min-width:0}.display{background:transparent}.display summary{font-size:13px;color:var(--secondary-text-color)}.native label{display:grid;gap:5px;font-size:13px}.native input,.native textarea,.native select,.add select{width:100%;border:1px solid var(--divider-color,#ddd);border-radius:6px;background:var(--card-background-color,transparent);min-height:40px;padding:7px}.native input[type=checkbox]{width:24px;height:24px;min-height:24px}.content>label,.subsection>label{display:grid;gap:5px;font-size:13px}.content>label>select,.subsection>label>input:not([type=checkbox]),.subsection>select{width:100%;border:1px solid var(--divider-color,#ddd);border-radius:6px;background:var(--card-background-color,transparent);min-height:40px;padding:7px}.subsection{display:grid;gap:8px;border-top:1px solid var(--divider-color,#ddd);padding-top:10px}
        @media(pointer:coarse){button{min-height:44px;min-width:44px}}
      </style><div class="root"></div>`;
    }
    setConfig(config){
      const next=clone(config||{});if(JSON.stringify(next)===JSON.stringify(this._config))return;
      this._config=next;this._render();
    }
    set hass(value){const initial=!this._hass;this._hass=value;for(const ref of this._forms)ref.form.hass=value;if(initial&&this._config&&!customElements.get('ha-form'))this._render();else this._refreshSummaries();}
    _make(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
    _button(label,action,disabled=false){const button=this._make('button',null,label);button.type='button';button.disabled=disabled;button.onclick=action;return button;}
    _commit(change,rebuild=false){
      const next=clone(this._config);change(next);if(JSON.stringify(next)===JSON.stringify(this._config))return;
      this._config=next;
      if(rebuild)this._render();else {
        for(const ref of this._forms)ref.form.data=ref.data();
        this._refreshSummaries();this._refreshActions();
      }
      this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:clone(next)},bubbles:true,composed:true}));
    }
    _title(item,path,fallback){
      if(path.at(-2)==='thresholds'&&item?.value!==undefined){
        const sensor=at(this._config,path.slice(0,-2));
        const unit=this._hass?.states[sensor?.entity]?.attributes.unit_of_measurement||'';
        return `${item.value}${unit} ${item.direction==='below'?'이하':'이상'} · ${{warning:'주의',critical:'위험'}[item.level]||item.level||''}`;
      }
      return item?.name||item?.entity||item?.find_name||fallback;
    }
    _refreshSummaries(){
      for(const row of this.shadowRoot.querySelectorAll('details[data-path]')){
        const path=JSON.parse(row.dataset.path),title=this._title(at(this._config,path),path,row.dataset.label);
        row.querySelector('summary').textContent=`${Number(path.at(-1))+1}. ${title}`;
        for(const button of row.querySelectorAll(':scope > .content > .toolbar > button'))button.setAttribute('aria-label',`${title} ${button.textContent}`);
      }
    }
    _remapPath(path){
      const move=this._moving;if(!move||!move.path.every((key,index)=>path[index]===key))return path;
      const index=move.path.length,result=[...path];
      if(result[index]===move.from)result[index]=move.to;else if(result[index]===move.to)result[index]=move.from;
      return result;
    }
    _move(path,index,offset){
      this._moving={path,from:index,to:index+offset};this._focusAfter={path:[...path,index+offset],action:offset<0?'up':'down'};
      this._commit(next=>{const items=at(next,path);[items[index],items[index+offset]]=[items[index+offset],items[index]];},true);
    }
    _restoreReorderFocus(){
      if(!this._focusAfter)return;
      const {path,action}=this._focusAfter;this._focusAfter=undefined;
      const row=[...this.shadowRoot.querySelectorAll('details[data-path]')].find(node=>node.dataset.path===JSON.stringify(path));
      const button=row?.querySelector(`:scope > .content > .toolbar > button[data-move=${action}]`);
      (button&&!button.disabled?button:row?.querySelector('summary'))?.focus();
    }
    _refreshActions(){
      for(const section of this.shadowRoot.querySelectorAll('[data-action-path]')){
        const path=JSON.parse(section.dataset.actionPath),item=at(this._config,path);
        const dedicated=['light','switch','select'].includes((item?.entity||'').split('.')[0]);
        if(section.dataset.dedicated===String(dedicated))continue;
        this._forms=this._forms.filter(ref=>!section.contains(ref.form));this._action(null,path,item,section);
      }
    }
    _update(path,values,schema){
      this._commit(next=>{
        const target=at(next,path);
        for(const item of flatSchema(schema)){
          if(!Object.prototype.hasOwnProperty.call(values,item.name))continue;
          let value=clone(values[item.name]);
          if(item.name==='columns'&&value!=='auto'&&value!==undefined&&value!==null&&value!=='')value=Number(value);
          if(value===undefined||value===null||value==='')delete target[item.name];else target[item.name]=value;
        }
      });
    }
    _form(parent,path,schema){
      const data=()=>{
        const source=at(this._config,path)||{},result={};
        for(const item of flatSchema(schema)){if(source[item.name]!==undefined)result[item.name]=item.name==='columns'?String(source[item.name]):clone(source[item.name]);else if(item.name==='columns')result[item.name]='auto';else if(['show_volume','show_next'].includes(item.name))result[item.name]=true;}
        return result;
      };
      if(!customElements.get('ha-form')){this._nativeForm(parent,path,schema,data);return;}
      schema=schema.map(item=>item.type==='expandable'?{...item,expanded:this._haDisplayOpen.has(JSON.stringify(path))}:item);
      const form=this._make('ha-form');form.dataset.path=JSON.stringify(path);form.hass=this._hass;form.schema=schema;
      form.addEventListener('expanded-changed',event=>{if(typeof event.detail?.expanded!=='boolean'||!event.composedPath().some(node=>node.localName==='ha-form-expandable'))return;this._haDisplayOpen[event.detail.expanded?'add':'delete'](JSON.stringify(path));for(const item of schema)if(item.type==='expandable')item.expanded=event.detail.expanded;});
      form.computeLabel=item=>item.label||item.name;form.data=data();
      form.addEventListener('value-changed',event=>{event.stopPropagation();if(event.target!==form||!event.detail?.value)return;this._update(path,event.detail.value,schema);});
      this._forms.push({form,data});parent.append(form);
    }
    _nativeForm(parent,path,schema,data){
      const form=this._make('div','native');form.dataset.path=JSON.stringify(path);parent.append(form);
      for(const item of schema){
        if(item.schema){
          if(item.type==='expandable'){
            const details=this._make('details','display');details.dataset.displayPath=JSON.stringify(path);details.open=this._openDisplay?.has(details.dataset.displayPath)||false;
            details.append(this._make('summary',null,item.title));const content=this._make('div','content');details.append(content);form.append(details);this._nativeForm(content,path,item.schema,data);
          }else {this._nativeForm(form,path,item.schema,data);form.lastElementChild.classList.add('native-grid');}
          continue;
        }
        const label=this._make('label',null,item.label),selector=item.selector,value=data()[item.name];let input;
        if(selector.select){input=this._make('select');if(!item.required){const empty=this._make('option',null,'기본값');empty.value='';input.append(empty);}for(const option of selector.select.options){const node=this._make('option',null,option.label);node.value=option.value;input.append(node);}input.value=value??'';}
        else {input=this._make(selector.text?.multiline?'textarea':'input');if(selector.text?.multiline){input.rows=4;input.value=value??'';}else {input.type=selector.boolean?'checkbox':selector.number?'number':'text';if(selector.boolean)input.checked=value??false;else if(selector.target)input.value=Array.isArray(value?.entity_id)?value.entity_id.join(', '):value?.entity_id||'';else input.value=value??'';if(selector.number)input.step='any';}}
        input.dataset.field=item.name;input.required=item.required;input.setAttribute('aria-label',item.label);
        if(selector.entity){const list=this._make('datalist');list.id=`entities-${this._kind}-${this.shadowRoot.querySelectorAll('datalist').length}`;const domains=selector.entity.domain;for(const id of Object.keys(this._hass?.states||{})){if(domains&&!(Array.isArray(domains)?domains:[domains]).includes(id.split('.')[0]))continue;const option=this._make('option');option.value=id;list.append(option);}input.setAttribute('list',list.id);form.append(list);}
        input.onchange=()=>{
          let next=selector.boolean?input.checked:selector.number?input.value===''?undefined:Number(input.value):input.value;
          if(selector.target){next={...clone(at(this._config,path)?.[item.name]||{})};const ids=input.value.split(',').map(v=>v.trim()).filter(Boolean);if(ids.length)next.entity_id=ids;else delete next.entity_id;}
          if(selector.number&&next!==undefined&&!Number.isFinite(next))return;
          this._update(path,{[item.name]:next},[item]);
        };
        if(input.type==='text'||input.localName==='textarea')input.oninput=input.onchange;
        label.append(input);form.append(label);
      }
    }
    _section(parent,title){const section=this._make('div','subsection');section.append(this._make('p','heading',title));parent.append(section);return section;}
    _first(domain,fallback){return Object.keys(this._hass?.states||{}).find(id=>(Array.isArray(domain)?domain:[domain]).includes(id.split('.')[0]))||fallback;}
    _defaultItem(type){
      if(this._kind==='compact-scene-panel')return {entity:this._first(['scene','script'],'scene.relax')};
      if(this._kind==='compact-environment-panel')return {entity:this._first('sensor','sensor.room_temperature')};
      if(type==='heading')return {type,name:'제목'};
      if(type==='note')return {type,name:'메모'};
      if(type==='navigate')return {type,name:'페이지 이동',navigation_path:'/lovelace/0'};
      if(type==='comparison')return {type,rows:[{name:'사용량',entity:this._first('sensor','sensor.current'),previous:this._first('sensor','sensor.previous')}]};
      if(type==='lookup')return {find_name:'센서 이름',domain:'sensor'};
      if(['climate','light','cover','media'].includes(type)){const domain=type==='media'?'media_player':type;return {type,entity:this._first(domain,`${domain}.living_room`)};}
      return {entity:this._first(['sensor','light','switch'],'sensor.example')};
    }
    _list(parent,path,label,renderItem,create,min=0){
      const wrapper=this._section(parent,label),list=this._make('div','list');wrapper.append(list);
      const entries=at(this._config,path)||[];
      entries.forEach((item,index)=>{
        const row=this._make('details');row.dataset.path=JSON.stringify([...path,index]);row.dataset.label=`${label} ${index+1}`;row.open=this._openDetails?.has(row.dataset.path)||(!this._openDetails?.size&&index===0);
        const title=this._title(item,[...path,index],`${label} ${index+1}`);
        row.append(this._make('summary',null,`${index+1}. ${title}`));
        const content=this._make('div','content'),toolbar=this._make('div','toolbar');
        for(const [text,offset] of [['위로',-1],['아래로',1]]){const button=this._button(text,()=>this._move(path,index,offset),index+offset<0||index+offset>=entries.length);button.dataset.move=offset<0?'up':'down';button.setAttribute('aria-label',`${title} ${text}`);toolbar.append(button);}
        const remove=this._button('삭제',()=>this._commit(next=>{at(next,path).splice(index,1);},true),entries.length<=min);remove.setAttribute('aria-label',`${title} 삭제`);toolbar.append(remove);content.append(toolbar);row.append(content);list.append(row);
        renderItem(content,[...path,index],item);
      });
      const add=this._make('div','add');let chooser;
      if(this._kind==='compact-home-panel'&&path.length===1){chooser=this._make('select');chooser.setAttribute('aria-label','추가할 항목 유형');for(const [value,label] of Object.entries(labels)){const option=this._make('option',null,label);option.value=value;chooser.append(option);}add.append(chooser);}
      const button=this._button(`${label} 추가`,()=>{this._openNext=JSON.stringify([...path,entries.length]);this._commit(next=>{if(!at(next,path))put(next,path,[]);at(next,path).push(create(chooser?.value));},true);});button.dataset.add=JSON.stringify(path);add.append(button);wrapper.append(add);
    }
    _itemType(item){return item.type||(item.find_name?'lookup':'entity');}
    _homeItem(parent,path,item){
      const type=this._itemType(item),label=this._make('label',null,'항목 유형'),input=this._make('select');input.setAttribute('aria-label','항목 유형');
      for(const [value,name] of Object.entries(labels)){const option=this._make('option',null,name);option.value=value;input.append(option);}input.value=type;
      input.onchange=()=>this._commit(next=>{
        const original=at(next,path),defaults=this._defaultItem(input.value),value={...original,...defaults};
        if(original.name!==undefined)value.name=original.name;
        if(input.value==='entity'||input.value==='lookup')delete value.type;
        if(input.value==='lookup')delete value.entity;else {delete value.find_name;if(original.find_name)delete value.domain;}
        put(next,path,value);
      },true);label.append(input);parent.append(label);
      if(type==='heading'){
        this._form(parent,path,[text('name','제목',true)]);
        this._list(parent,[...path,'badges'],'배지',(body,p)=>this._form(body,p,[entity('entity','센서'),display([text('name','표시 이름')])]),()=>({entity:this._first('sensor','sensor.example')}));return;
      }
      if(type==='note'){this._form(parent,path,[field('name','메모',{text:{multiline:true}},true)]);return;}
      if(type==='comparison'){
        this._list(parent,[...path,'rows'],'비교 항목',(body,p)=>this._form(body,p,[text('name','항목 이름'),entity('entity','이번 달 누적 센서','sensor'),entity('previous','지난달 전체 센서','sensor')]),()=>({name:'사용량',entity:this._first('sensor','sensor.current'),previous:this._first('sensor','sensor.previous')}),1);return;
      }
      if(type==='navigate'){this._form(parent,path,[text('name','표시 이름',true),text('navigation_path','로컬 이동 경로 (예: /energy)',true),field('icon','아이콘',{icon:{}})]);return;}
      if(type==='lookup'){this._form(parent,path,[text('find_name','센서의 정확한 이름',true),text('domain','도메인 (기본 sensor)'),display([text('name','표시 이름'),field('icon','아이콘',{icon:{}})])]);return;}
      const domain={climate:'climate',light:'light',cover:'cover',media:'media_player'}[type];
      const fields=[entity('entity','엔티티',domain),display([text('name','표시 이름'),...(type==='entity'?[field('icon','아이콘',{icon:{}})]:[])])];
      if(type==='media')fields.push(field('show_volume','음량 표시',{boolean:{}}),field('show_next','다음 곡 표시',{boolean:{}}));
      this._form(parent,path,fields);
      if(type==='entity')this._action(parent,path,item);
    }
    _action(parent,path,item,existing){
      const section=existing||this._section(parent,'실행 버튼');
      if(existing){section.replaceChildren();section.append(this._make('p','heading','실행 버튼'));}
      section.dataset.actionPath=JSON.stringify(path);
      const dedicated=['light','switch','select'].includes((item.entity||'').split('.')[0]);section.dataset.dedicated=String(dedicated);
      if(dedicated){section.append(this._make('p','hint','이 엔티티는 전용 제어를 사용합니다. 기존 YAML 실행 설정은 보존됩니다.'));return;}
      const label=this._make('label',null,' 실행 버튼 사용'),enabled=this._make('input');enabled.type='checkbox';enabled.checked=Boolean(item.tap_action);enabled.setAttribute('aria-label','실행 버튼 사용');label.prepend(enabled);section.append(label);
      enabled.onchange=()=>this._commit(next=>{const target=at(next,path);if(enabled.checked)target.tap_action={action:'perform-action',perform_action:({button:'button.press',input_button:'input_button.press'}[(target.entity||'').split('.')[0]]||'script.turn_on')};else delete target.tap_action;},true);
      if(!item.tap_action)return;
      section.append(this._make('p','hint','실행할 액션을 지정하세요. 대상을 생략하면 항목의 엔티티를 사용합니다.'));
      this._form(section,[...path,'tap_action'],[text('perform_action','실행할 액션 (예: button.press)',true),field('target','대상 (생략하면 항목의 엔티티)',{target:{}})]);
      this._confirmation(section,[...path,'tap_action'],'confirmation',item.tap_action.confirmation,true);
      this._dataFields(section,[...path,'tap_action','data']);
    }
    _confirmation(parent,path,key,value,object=false){
      const section=this._section(parent,'실행 전 확인'),label=this._make('label',null,' 확인 메시지 사용'),check=this._make('input');check.type='checkbox';check.checked=Boolean(value);check.setAttribute('aria-label','확인 메시지 사용');label.prepend(check);section.append(label);
      check.onchange=()=>this._commit(next=>{const target=at(next,path);if(check.checked)target[key]=object?{text:'실행할까요?'}:'실행할까요?';else delete target[key];},true);
      if(value)this._form(section,object?[...path,key]:path,[text(object?'text':key,'확인 메시지')]);
    }
    _dataFields(parent,path){
      const section=this._section(parent,'액션 데이터'),data=at(this._config,path)||{};
      for(const [key,value] of Object.entries(data)){
        const row=this._make('div','subsection');row.append(this._make('p','heading',key));section.append(row);
        if(value!==null&&typeof value==='object')row.append(this._make('p','hint','구조화된 데이터는 YAML에서 편집합니다. 기존 값은 보존됩니다.'));
        else {
          const label=this._make('label',null,`${key} 값`),input=this._make('input');input.setAttribute('aria-label',`${key} 값`);input.type=typeof value==='boolean'?'checkbox':typeof value==='number'?'number':'text';if(typeof value==='boolean')input.checked=value;else input.value=value??'';if(input.type==='number')input.step='any';
          input.onchange=()=>this._commit(next=>{let result=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;if(typeof result==='number'&&!Number.isFinite(result))return;at(next,path)[key]=result;});label.append(input);row.append(label);
        }
        const remove=this._button(`${key} 삭제`,()=>this._commit(next=>{delete at(next,path)[key];},true));row.append(remove);
      }
      const label=this._make('label',null,'새 데이터 키'),key=this._make('input');key.setAttribute('aria-label','새 데이터 키');label.append(key);section.append(label);
      const type=this._make('select');type.setAttribute('aria-label','새 데이터 유형');for(const [value,label] of [['text','문자열'],['number','숫자'],['boolean','참/거짓']]){const option=this._make('option',null,label);option.value=value;type.append(option);}section.append(type);
      const error=this._make('p','hint');error.setAttribute('role','status');section.append(error);
      section.append(this._button('데이터 추가',()=>{
        const name=key.value.trim();if(!name||['__proto__','prototype','constructor'].includes(name)||Object.prototype.hasOwnProperty.call(data,name)){error.textContent='중복되지 않는 데이터 키를 입력하세요.';return;}
        this._commit(next=>{if(!at(next,path))put(next,path,{});at(next,path)[name]=type.value==='number'?0:type.value==='boolean'?false:'';},true);
      }));
    }
    _render(){
      if(!this._config)return;
      this._openDetails=new Set([...this.shadowRoot.querySelectorAll('details[data-path][open]')].map(node=>JSON.stringify(this._remapPath(JSON.parse(node.dataset.path)))));
      this._openDisplay=new Set([...this.shadowRoot.querySelectorAll('details[data-display-path][open]')].map(node=>JSON.stringify(this._remapPath(JSON.parse(node.dataset.displayPath)))));
      this._haDisplayOpen=new Set([...this._haDisplayOpen].map(path=>JSON.stringify(this._remapPath(JSON.parse(path)))));
      this._moving=undefined;if(this._openNext){this._openDetails.add(this._openNext);this._openNext=undefined;}
      const root=this.shadowRoot.querySelector('.root');root.replaceChildren();this._forms=[];
      if(['compact-climate-row','compact-light-row','compact-cover-row','compact-media-row'].includes(this._kind)){
        const domain={'compact-climate-row':'climate','compact-light-row':'light','compact-cover-row':'cover','compact-media-row':'media_player'}[this._kind];
        const schema=[entity('entity','엔티티',domain),display([text('name','표시 이름')])];
        if(this._kind==='compact-media-row')schema.push(field('show_volume','음량 표시',{boolean:{}}),field('show_next','다음 곡 표시',{boolean:{}}));
        this._form(root,[],schema);return;
      }
      const home=this._kind==='compact-home-panel';
      this._form(root,[],home?[columns(2)]:[text('name','패널 이름'),columns(4)]);
      this._list(root,['items'],'항목',(body,path,item)=>{
        if(home){this._homeItem(body,path,item);return;}
        this._form(body,path,[entity('entity','엔티티',this._kind==='compact-scene-panel'?['scene','script']:'sensor'),display([text('name','표시 이름'),field('icon','아이콘',{icon:{}})])]);
        if(this._kind==='compact-scene-panel')this._confirmation(body,path,'confirmation',item.confirmation);
        else this._list(body,[...path,'thresholds'],'임계값',(section,p)=>this._form(section,p,[grid([field('value','기준값',{number:{mode:'box',step:'any'}},true),select('direction','비교 방향',[['above','이상'],['below','이하']]),select('level','강조 수준',[['warning','주의'],['critical','위험']])])]),()=>({value:0,direction:'above',level:'warning'}));
      },type=>this._defaultItem(type),home?0:1);
      this._restoreReorderFocus();
    }
  }
  for(const type of ['compact-climate-row','compact-home-panel','compact-light-row','compact-cover-row','compact-scene-panel','compact-environment-panel','compact-media-row']){
    const tag=`${type}-editor`;
    if(!customElements.get(tag))customElements.define(tag,class extends CompactCardEditor{constructor(){super(type);}});
    customElements.get(type).getConfigElement=async()=>{
      // HA loads ha-form lazily with native card editors. Ask its public helpers to
      // load the entities editor before creating ours; the native fallback also
      // keeps the editor useful in older or independently hosted HA frontends.
      if(!customElements.get('ha-form')&&window.loadCardHelpers){
        try{const helpers=await window.loadCardHelpers();const card=helpers.createCardElement({type:'entities',entities:[]});await card.constructor.getConfigElement?.();}catch{/* Native fallback remains available. */}
      }
      return document.createElement(tag);
    };
  }
})();

// Direct help from Home Assistant's card picker/editor to each illustrated guide.
for(const card of window.customCards) {
  if(['compact-climate-row','compact-home-panel','compact-light-row','compact-cover-row','compact-scene-panel','compact-environment-panel','compact-media-row'].includes(card.type)) {
    card.documentationURL=`https://github.com/eigger/hass-compact-cards/blob/main/docs/${card.type}.md`;
    card.preview=true;
  }
}
