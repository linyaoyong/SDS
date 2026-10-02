import type { UserDTO } from '../types/api';

export interface CreateOrderData {
  productId: number;
  quantity: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
}

export const FACE_TO_FACE_RECEIVER_ADDRESS = '线下面交（请与卖家协商具体地点）';

export type FaceToFaceOrderRequestResult =
  | { ok: true; data: CreateOrderData }
  | { ok: false; reason: 'name' | 'phone' };

export function buildFaceToFaceOrderRequest(
  productId: number,
  quantity: number,
  user: Pick<UserDTO, 'name' | 'username' | 'phone'> | null,
): FaceToFaceOrderRequestResult {
  const receiverName = user?.name?.trim() || user?.username?.trim();
  if (!receiverName) return { ok: false, reason: 'name' };

  const receiverPhone = user?.phone?.trim();
  if (!receiverPhone) return { ok: false, reason: 'phone' };

  return {
    ok: true,
    data: {
      productId,
      quantity,
      receiverName,
      receiverPhone,
      receiverAddress: FACE_TO_FACE_RECEIVER_ADDRESS,
    },
  };
}
