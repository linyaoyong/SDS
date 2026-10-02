import type { ProductDTO, UserDTO } from '../types/api';

export async function enrichProductSellers(
  products: ProductDTO[],
  getUsers: (ids: number[]) => Promise<UserDTO[]>,
  getUserById: (id: number) => Promise<UserDTO>,
): Promise<void> {
  const sellerIds = [...new Set(products.map(product => product.sellerId).filter(Boolean))];
  if (sellerIds.length === 0) return;

  const usersById = new Map<number, UserDTO>();
  try {
    (await getUsers(sellerIds)).forEach(user => usersById.set(user.id, user));
  } catch (error) {
    console.warn('Batch seller lookup failed', error);
  }

  await Promise.all(sellerIds.filter(id => !usersById.has(id)).map(async id => {
    try {
      usersById.set(id, await getUserById(id));
    } catch (error) {
      console.warn('Seller lookup failed', { sellerId: id, error });
    }
  }));

  products.forEach(product => {
    const seller = usersById.get(product.sellerId);
    if (seller) {
      product.sellerName = seller.name || seller.username || '用户';
      product.sellerAvatar = seller.avatarUrl;
    }
  });
}
