import assert from 'node:assert/strict';
import test from 'node:test';
import { enrichProductSellers } from '../miniprogram/utils/product-sellers.ts';

test('fills favorite products with their sellers usernames', async () => {
  const products = [{ id: 1, sellerId: 9, sellerName: '' }];

  await enrichProductSellers(products, async ids => {
    assert.deepEqual(ids, [9]);
    return [{ id: 9, username: 'seller-9', avatarUrl: '/avatar.png' }];
  });

  assert.deepEqual(products[0], {
    id: 1,
    sellerId: 9,
    sellerName: 'seller-9',
    sellerAvatar: '/avatar.png',
  });
});

test('falls back to individual seller lookup when the batch lookup fails', async () => {
  const products = [{ id: 1, sellerId: 9, sellerName: '' }];

  const warn = console.warn;
  console.warn = () => {};
  try {
    await enrichProductSellers(
      products,
      async () => { throw new Error('batch unavailable'); },
      async id => ({ id, username: 'seller-9', avatarUrl: '/avatar.png' }),
    );
  } finally {
    console.warn = warn;
  }

  assert.equal(products[0].sellerName, 'seller-9');
});
