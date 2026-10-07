import { PrismaClient } from "@prisma/client";

function createPrisma() {
  return new PrismaClient({
    omit: {
      user: {
        passwordHash: true,
      },
    },
  });
}

type AppPrisma = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as { prisma?: AppPrisma };

export const prisma: AppPrisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
