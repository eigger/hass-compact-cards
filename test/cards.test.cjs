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

test('HACS points to a self-contained bundle registering both cards', () => {
  const manifest = JSON.parse(readFileSync('hacs.json', 'utf8'));
  assert.equal(manifest.filename, 'compact-cards.js');
  assert.equal(manifest.content_in_root, true);
  const { window, hass } = setup();
  assert.equal(window.customCards.length, 2);
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
  assert.equal(element._refs[0].delta.textContent, '+5 kWh');
  assert.equal(element._refs[0].percent.textContent, '+50.0%');
  assert.equal(element._refs[1].child._hass, hass);
  hass.states['sensor.previous'].attributes.unit_of_measurement = 'W';
  element.hass = hass;
  assert.equal(element._refs[0].percent.textContent, '단위 불일치');
});
