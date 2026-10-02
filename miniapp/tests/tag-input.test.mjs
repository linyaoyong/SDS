import assert from 'node:assert/strict';
import test from 'node:test';
import { appendTag, removeTagAt } from '../miniprogram/utils/tags.ts';
test('adds a trimmed pending input as one tag', () => assert.deepEqual(appendTag(['教材'], ' 考研 '), { tags: ['教材', '考研'], added: true }));
test('does not split comma-containing input', () => assert.deepEqual(appendTag([], '便携,耐用'), { tags: ['便携,耐用'], added: true }));
test('rejects blank, duplicate, and eleventh tags', () => {
  assert.deepEqual(appendTag(['教材'], ' '), { tags: ['教材'], added: false });
  assert.deepEqual(appendTag(['教材'], '教材'), { tags: ['教材'], added: false, error: 'duplicate' });
  const tags = Array.from({ length: 10 }, (_, i) => `标签${i + 1}`);
  assert.deepEqual(appendTag(tags, '额外标签'), { tags, added: false, error: 'max' });
});
test('removes a selected tag', () => assert.deepEqual(removeTagAt(['教材', '考研'], 0), ['考研']));
test('finalizes a pending input for either product request', () => assert.deepEqual(appendTag(['计算机'], '二手').tags, ['计算机', '二手']));
