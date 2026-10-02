import assert from 'node:assert/strict';
import test from 'node:test';
import { getLatestReview } from '../src/utils/review-history.ts';

test('selects the first review from reverse-chronological history', () => {
  const latest = { id: 2, rating: 4, content: '新版评价' };
  assert.equal(getLatestReview([latest, { id: 1, rating: 2, content: '旧评价' }]), latest);
});

test('returns no review when history is empty', () => {
  assert.equal(getLatestReview([]), null);
});
