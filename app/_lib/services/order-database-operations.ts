import { Prisma } from "@prisma/client";
import prisma from "@/app/_lib/prisma";
import { CreateOrderParams } from "@/app/_lib/types";
import { handleError } from "@/app/_lib/utils";
import { serialize } from "@/app/_lib/utils/serialize";

/**
 * Writes the Order row for a confirmed Stripe payment.
 *
 * This lives outside `order.actions.ts` on purpose. Everything exported from a
 * "use server" module is a POST endpoint any client can call, and this function
 * creates a paid order from whatever it is handed. Its only legitimate caller is
 * the Stripe webhook, which verifies the signature first, so it must not be a
 * server action.
 */
export async function createOrder(order: CreateOrderParams) {
  const data: Prisma.OrderCreateInput = {
    buyer: { connect: { id: order.buyerId } },
    createdAt: order.createdAt,
    stripeId: order.stripeId,
    totalAmount: order.totalAmount,
    type: order.type,
    ...(order.eventId && { event: { connect: { id: order.eventId } } }),
  };

  try {
    const created = await prisma.order.create({ data });
    return serialize(created);
  } catch (error) {
    handleError(error);
    return null;
  }
}
