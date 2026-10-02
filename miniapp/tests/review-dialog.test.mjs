import assert from 'node:assert/strict';
import test from 'node:test';
import { canSubmitReview, shouldCloseReviewDialog } from '../miniprogram/utils/review-dialog.ts';

test('keeps review dialog open for a tap inside the dialog', () => {
  assert.equal(shouldCloseReviewDialog('review-content', 'review-mask'), false);
});

test('closes review dialog for a tap on its mask', () => {
  assert.equal(shouldCloseReviewDialog('review-mask', 'review-mask'), true);
});

test('blocks a second review submission while the first is pending', () => {
  assert.equal(canSubmitReview(false, 5), true);
  assert.equal(canSubmitReview(true, 5), false);
});

test('requires a rating when no review history exists', () => {
  assert.equal(canSubmitReview(false, 0), false);
  assert.equal(canSubmitReview(false, 1), true);
});
