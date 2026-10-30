const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { Window } = require('happy-dom');

const source = readFileSync('compact-cards.js', 'utf8');
function setup() {
  const window = new Window({ url: 'http://homeassistant.local/' });
  window.eval(source);
  const calls = [];
  const hass = {
    states: {}, config: { unit_system: { temperature: '°C' } },
    callService: async (...args) => { calls.push(args); },
  };
  const card = (type, config) => {
    const element = window.document.createElement(type);
    element.setConfig(config);
    element.hass = hass;
    return element;
  };
  return { window, hass, calls, card };
}
const state = (entity_id, value, attributes = {}) => ({ entity_id, state: value, attributes });

test('navigation records the originating view for Home Assistant subview back navigation', async () => {
  for (const [origin, destination] of [
    ['/lovelace/manage', '/lovelace/proxmox'],
    ['/lovelace/manage', '/lovelace/environment'],
    ['/lovelace/rooms?example=1#section', '/lovelace/environment'],
  ]) {
    for (const trigger of ['label', 'control']) {
      const { window, card } = setup();
      window.history.replaceState({ root: true }, '', origin);
      const originPath = window.location.pathname;
      const element = card('compact-home-panel', { items: [
        { type: 'navigate', name: 'Details', navigation_path: destination },
      ] });
      const changes = [];
      window.addEventListener('location-changed', event => {
        changes.push({ path: window.location.pathname, from: window.history.state?.from, replace: event.detail?.replace });
      });

      element._refs[0][trigger].click();

      assert.equal(window.location.pathname, destination);
      assert.equal(window.history.state.from, originPath);
      assert.equal(window.history.state.root, undefined);
      assert.deepEqual(changes, [{ path: destination, from: originPath, replace: false }]);
      // Home Assistant uses the `from` marker to choose history.back() over its dashboard fallback.
      const popped = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
      window.history.back();
      await popped;
      assert.equal(window.location.pathname + window.location.search + window.location.hash, origin);
      assert.equal(window.history.state.root, true);
      await window.happyDOM.close();
    }
  }
});

test('home entity icons delegate device classes and live state to Home Assistant', () => {
  const { hass, card } = setup();
  hass.states['binary_sensor.fridge'] = state('binary_sensor.fridge', 'off', { device_class: 'door' });
  hass.states['sensor.energy'] = state('sensor.energy', '12', { device_class: 'energy' });
  const element = card('compact-home-panel', { items: [
    { entity: 'binary_sensor.fridge' }, { entity: 'sensor.energy' },
    { entity: 'binary_sensor.fridge', icon: 'mdi:fridge-outline' },
    { entity: 'sensor.missing' }, { type: 'navigate', name: 'Energy', navigation_path: '/energy' },
  ] });
  const [contact, energy, custom, missing, navigation] = element._refs;
  for (const ref of [contact, energy, custom, missing]) {
    assert.equal(ref.icon.localName, 'ha-state-icon');
    assert.equal(ref.icon.hass, hass);
    assert.equal(ref.icon.stateObj, hass.states[ref.item.entity]);
  }
  assert.equal(contact.icon.icon, undefined);
  assert.equal(energy.icon.icon, undefined);
  assert.equal(custom.icon.icon, 'mdi:fridge-outline');
  assert.equal(missing.icon.icon, 'mdi:help-circle-outline');
  assert.equal(navigation.icon.getAttribute('icon'), 'mdi:chevron-right');
  const icon = contact.icon;
  hass.states['binary_sensor.fridge'] = state('binary_sensor.fridge', 'on', { device_class: 'door', icon: 'mdi:door-open' });
  hass.states['sensor.missing'] = state('sensor.missing', '40', { device_class: 'humidity' });
  element.hass = { ...hass };
  assert.equal(contact.icon, icon);
  assert.equal(icon.stateObj, hass.states['binary_sensor.fridge']);
  assert.equal(icon.hass, element._hass);
  assert.equal(icon.icon, undefined);
  assert.equal(missing.icon.icon, undefined);
  assert.equal(missing.icon.stateObj, hass.states['sensor.missing']);
});

test('HACS points to a self-contained bundle registering all cards', () => {
  const manifest = JSON.parse(readFileSync('hacs.json', 'utf8'));
  assert.equal(manifest.filename, 'compact-cards.js');
  assert.equal(manifest.content_in_root, false);
  const { window, hass } = setup();
  assert.equal(window.customCards.length, 9);
  for (const { type } of window.customCards) {
    const Constructor = window.customElements.get(type);
    const element = window.document.createElement(type);
    element.setConfig(Constructor.getStubConfig(hass));
    element.hass = hass;
  }
});

test('climate adjusts temperature using device step and clamps at the limit', async () => {
  const { hass, calls, card } = setup();
  hass.states['climate.room'] = state('climate.room', 'heat', {
    temperature: 29.5, min_temp: 16, max_temp: 30, target_temp_step: 1,
    supported_features: 1, hvac_modes: ['off', 'heat'],
  });
  const element = card('compact-climate-row', { entity: 'climate.room' });
  await element._step(1);
  assert.deepEqual(calls[0].slice(0, 2), ['climate', 'set_temperature']);
  assert.equal(calls[0][2].temperature, 30);
  hass.states['climate.room'] = state('climate.room', 'unavailable');
  element.hass = hass;
  assert.equal(element.shadowRoot.querySelector('.plus').disabled, true);
  await element._step(1);
  assert.equal(calls.length, 1);
});

test('missing light remains disabled and recovers when the entity becomes available', async () => {
  const { hass, calls, card } = setup();
  const element = card('compact-home-panel', { items: [{ entity: 'light.room' }] });
  const toggle = element.shadowRoot.querySelector('.switch');
  assert.equal(toggle.disabled, true);
  assert.equal(toggle.getAttribute('aria-checked'), 'false');
  hass.states['light.room'] = state('light.room', 'on');
  element.hass = hass;
  assert.equal(toggle.disabled, false);
  assert.equal(toggle.getAttribute('aria-checked'), 'true');
  toggle.click();
  await Promise.resolve();
  assert.equal(calls[0][1], 'toggle');
});

test('configuration reports invalid nested items before rendering', () => {
  const { card } = setup();
  for (const item of [null, { type: 'comparison' }, { type: 'climate', entity: 'light.room' },
    { type: 'heading', name: 'Room', badges: [null] },
    { type: 'navigate', name: 'Open', navigation_path: '//example.com' },
    { type: 'navigate', name: 'Open', navigation_path: '/\\example.com' },
    { entity: 'button.test', tap_action: { action: 'perform-action', perform_action: 'invalid' } }]) {
    assert.throws(() => card('compact-home-panel', { items: [item] }), /items\[0\]/);
  }
});

test('commands preserve Home Assistant target separately from service data', async () => {
  const { hass, calls, card } = setup();
  hass.states['button.test'] = state('button.test', 'unknown');
  const config = { items: [{ entity: 'button.test', tap_action: {
    action: 'perform-action', perform_action: 'button.press',
    target: { device_id: 'device-123' }, data: {},
  } }] };
  const element = card('compact-home-panel', config);
  // An unavailable entity cannot dispatch a command.
  await element._command(element._refs[0]);
  assert.equal(calls.length, 0);
  hass.states['button.test'] = state('button.test', '2026-10-30T00:00:00Z');
  element.hass = hass;
  await element._command(element._refs[0]);
  assert.equal(calls[0][4].device_id, 'device-123');
  assert.equal(calls[0][2].device_id, undefined);
});

test('failed services notify the user and release the busy state', async () => {
  const { hass, card } = setup();
  hass.states['switch.room'] = state('switch.room', 'off');
  hass.callService = async () => { throw new Error('Service unavailable'); };
  const element = card('compact-home-panel', { items: [{ entity: 'switch.room' }] });
  let message;
  element.addEventListener('hass-notification', event => { message = event.detail.message; });
  await element._call(element._refs[0], 'homeassistant', 'toggle', { entity_id: 'switch.room' });
  assert.match(message, /Service unavailable/);
  assert.equal(element._busy.size, 0);
});

test('comparison shows unit mismatches and embedded climate receives hass', () => {
  const { hass, card } = setup();
  hass.states['sensor.now'] = state('sensor.now', '15', { unit_of_measurement: 'kWh' });
  hass.states['sensor.previous'] = state('sensor.previous', '10', { unit_of_measurement: 'kWh' });
  const element = card('compact-home-panel', { items: [
    { type: 'comparison', rows: [{ entity: 'sensor.now', previous: 'sensor.previous', name: '전기' }] },
    { type: 'climate', entity: 'climate.room' },
  ] });
  assert.deepEqual([...element.shadowRoot.querySelectorAll('th')].map(node=>node.textContent), ['항목','이번 달 누적','지난달 전체','차이']);
  assert.equal(element.shadowRoot.querySelector('tbody tr td:nth-child(2)').dataset.label, '이번 달 누적');
  assert.equal(element.shadowRoot.querySelector('.note'), null);
  assert.equal(element._refs[0].delta.textContent, '+5 kWh');
  assert.equal(element._refs[0].percent.textContent, '+50.0%');
  assert.equal(element._refs[1].child._hass, hass);
  hass.states['sensor.previous'].attributes.unit_of_measurement = 'W';
  element.hass = hass;
  assert.equal(element._refs[0].percent.textContent, '단위 불일치');
});


test('panel validates column overrides and gives heading badges readable names', () => {
  const { hass, card } = setup();
  hass.states['sensor.temperature'] = state('sensor.temperature', '23', { friendly_name: 'Room temperature', unit_of_measurement: '°C' });
  const element = card('compact-home-panel', { columns: 1, items: [
    { type: 'heading', name: 'Room', badges: [{ entity: 'sensor.temperature', name: 'Temperature' }, { entity: 'sensor.missing' }] },
  ] });
  assert.equal(element.getAttribute('columns'), '1');
  const badges = element.shadowRoot.querySelectorAll('.badge');
  assert.equal(badges[0].textContent, 'Temperature23 °C');
  assert.equal(badges[0].getAttribute('aria-label'), 'Temperature: 23 °C');
  assert.equal(badges[1].disabled, true);
  for (const columns of ['2', 0, 3, null]) assert.throws(() => card('compact-home-panel', { columns, items: [] }), /columns/);
  element.setConfig({ items: [] });
  assert.equal(element.getAttribute('columns'), 'auto');
});

test('climate controls disable during pending commands and recover after rejection', async () => {
  const { hass, card } = setup();
  hass.states['climate.room'] = state('climate.room', 'heat', {
    temperature: 22, supported_features: 1, hvac_modes: ['off', 'heat', 'cool', 'dry'],
  });
  let reject;
  hass.callService = () => new Promise((resolve, failure) => { reject = failure; });
  const element = card('compact-climate-row', { entity: 'climate.room' });
  const request = element._step(1);
  assert.equal(element.shadowRoot.querySelector('ha-card').classList.contains('many-modes'), true);
  for (const button of element.shadowRoot.querySelectorAll('.modes button,.temperature button')) {
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute('aria-busy'), 'true');
  }
  reject(new Error('Disconnected'));
  await request;
  for (const button of element.shadowRoot.querySelectorAll('.modes button,.temperature button')) {
    assert.equal(button.disabled, false);
    assert.equal(button.getAttribute('aria-busy'), 'false');
  }
});

test('panel disables toggles and selects only while their own service is pending', async () => {
  const { hass, card } = setup();
  hass.states['switch.room'] = state('switch.room', 'off');
  hass.states['select.mode'] = state('select.mode', 'Home', { options: ['Home', 'Away'] });
  const pending = [];
  hass.callService = () => new Promise(resolve => pending.push(resolve));
  const element = card('compact-home-panel', { items: [{ entity: 'switch.room' }, { entity: 'select.mode' }] });
  const [toggle, select] = element._refs;
  const first = element._call(toggle, 'homeassistant', 'toggle', {});
  assert.equal(toggle.control.disabled, true);
  assert.equal(select.select.disabled, false);
  const second = element._call(select, 'select', 'select_option', { option: 'Away' });
  assert.equal(select.select.disabled, true);
  pending[0](); await first;
  assert.equal(toggle.control.disabled, false);
  assert.equal(select.select.disabled, true);
  pending[1](); await second;
  assert.equal(select.select.disabled, false);
});
