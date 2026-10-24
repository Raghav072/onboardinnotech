import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidMessageCursor, isUuid, parseOutgoingMessage } from '../src/lib/messaging/validation.ts';

const CLIENT_ID = '20000000-0000-4000-8000-000000000001';

test('message request accepts a trimmed body with a UUID retry key', () => {
  assert.deepEqual(parseOutgoingMessage({ body: '  Hello there  ', clientId: CLIENT_ID }), {
    ok: true,
    value: { body: 'Hello there', clientId: CLIENT_ID },
  });
});

test('message request rejects blank content, oversized content, and malformed retry keys', () => {
  assert.equal(parseOutgoingMessage({ body: '   ', clientId: CLIENT_ID }).ok, false);
  assert.equal(parseOutgoingMessage({ body: 'x'.repeat(2001), clientId: CLIENT_ID }).ok, false);
  assert.equal(parseOutgoingMessage({ body: 'Hi', clientId: 'not-a-uuid' }).ok, false);
  assert.equal(parseOutgoingMessage(null).ok, false);
});

test('message validation normalizes CRLF and removes NUL characters', () => {
  const result = parseOutgoingMessage({ body: ' one\r\n\u0000two ', clientId: CLIENT_ID });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.body, 'one\ntwo');
});

test('UUID validator is anchored and does not accept arbitrary text', () => {
  assert.equal(isUuid(CLIENT_ID), true);
  assert.equal(isUuid(`${CLIENT_ID}x`), false);
  assert.equal(isUuid(null), false);
});


test('keyset cursor validates both fields and rejects filter-syntax injection', () => {
  assert.equal(isValidMessageCursor(null, null), true);
  assert.equal(isValidMessageCursor('2026-10-24T00:00:00.123456+00:00', '20000000-0000-4000-8000-000000000001'), true);
  assert.equal(isValidMessageCursor('not-a-date', '20000000-0000-4000-8000-000000000001'), false);
  assert.equal(isValidMessageCursor('2026-10-24T00:00:00Z,or(id.gt.0)', '20000000-0000-4000-8000-000000000001'), false);
  assert.equal(isValidMessageCursor('2026-10-24T00:00:00Z', null), false);
  assert.equal(isValidMessageCursor(null, '20000000-0000-4000-8000-000000000001'), false);
});
