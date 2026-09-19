"use server";

import prisma from "@/app/_lib/prisma";
import { requireAdmin } from "@/app/_lib/auth";
import { handleError } from "@/app/_lib/utils";
import {
  calculateSkipAmount,
  calculateTotalPages,
} from "@/app/_lib/utils/pagination";
import { buildUserSearchConditions } from "@/app/_lib/utils/query-builders";
import { serialize } from "@/app/_lib/utils/serialize";

export async function getAllUsers({ query, limit = 8, page = 1 }) {
  try {
    // Exported from a "use server" module, so this is a public POST endpoint.
    // It returns the whole user directory and must check the caller itself.
    await requireAdmin();

    const skipAmount = calculateSkipAmount(page, limit);
    const whereConditions = buildUserSearchConditions(query);

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        orderBy: { firstName: "asc" },
        take: limit,
        skip: skipAmount,
      }),
      prisma.user.count({
        where: whereConditions,
      }),
    ]);

    return {
      data: serialize(users),
      totalPages: calculateTotalPages(totalUsers, limit),
    };
  } catch (error) {
    handleError(error);
    return {
      data: [],
      totalPages: 0,
    };
  }
}

export async function deleteUser(
  userId: string,
): Promise<{ success: boolean }> {
  try {
    await requireAdmin();
    const deletedUser = await prisma.user.delete({
      where: { id: userId },
    });
    if (deletedUser) {
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    return handleError(error);
  }
}
