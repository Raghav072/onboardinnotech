import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_TAB_HREFS, PRIMARY_NAV, isActivePath } from '../src/lib/nav.ts';

test('primary navigation matches the brief, in order', () => {
  assert.deepEqual(
    PRIMARY_NAV.map((n) => n.label),
    ['Home', 'Discover People', 'Alumni', 'Marketplace', 'Campus Info', 'Messages', 'My Profile'],
  );
});

test('every mobile tab is a real primary destination', () => {
  const hrefs = PRIMARY_NAV.map((n) => n.href);
  for (const h of MOBILE_TAB_HREFS) assert.ok(hrefs.includes(h), h);
});

test('active-path matching', () => {
  assert.equal(isActivePath('/', '/'), true);
  assert.equal(isActivePath('/marketplace', '/'), false);
  assert.equal(isActivePath('/marketplace/sample-kettle', '/marketplace'), true);
  assert.equal(isActivePath('/campus/events', '/campus'), true);
  assert.equal(isActivePath('/marketplacex', '/marketplace'), false);
});
