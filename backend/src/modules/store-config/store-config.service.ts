import { prisma }
  from "../../config/prisma.js";

export async function getStoreConfig() {

  return prisma.storeConfig.findFirst();
}

export async function updateStoreConfig(
  data: any
) {

  return prisma.storeConfig.update({
    where: {
      id: 1,
    },

    data,
  });
}