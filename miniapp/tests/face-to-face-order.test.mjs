import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFaceToFaceOrderRequest,
  FACE_TO_FACE_RECEIVER_ADDRESS,
} from '../miniprogram/utils/face-to-face-order.ts';

const completeUser = {
  id: 7,
  name: ' 王同学 ',
  username: 'wang',
  phone: ' 13800000000 ',
};

test('builds a face-to-face order request with trimmed receiver details', () => {
  assert.deepEqual(buildFaceToFaceOrderRequest(12, 2, completeUser), {
    ok: true,
    data: {
      productId: 12,
      quantity: 2,
      receiverName: '王同学',
      receiverPhone: '13800000000',
      receiverAddress: FACE_TO_FACE_RECEIVER_ADDRESS,
    },
  });
});

test('falls back to the username when the real name is blank', () => {
  const result = buildFaceToFaceOrderRequest(12, 2, {
    ...completeUser,
    name: ' ',
  });

  assert.equal(result.data?.receiverName, 'wang');
});

test('rejects a receiver without a real name or username', () => {
  assert.deepEqual(buildFaceToFaceOrderRequest(12, 2, {
    ...completeUser,
    name: ' ',
    username: ' ',
  }), { ok: false, reason: 'name' });
});

test('rejects a receiver without a phone number', () => {
  assert.deepEqual(buildFaceToFaceOrderRequest(12, 2, {
    ...completeUser,
    phone: ' ',
  }), { ok: false, reason: 'phone' });
});
