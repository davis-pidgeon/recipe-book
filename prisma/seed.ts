import { PrismaClient } from "@prisma/client";
import { DEFAULT_TAGS } from "../lib/recipes/tags";

const prisma = new PrismaClient();

async function main() {
  for (const { group, names } of DEFAULT_TAGS) {
    for (const name of names) {
      await prisma.tag.upsert({
        where: { group_name: { group, name } },
        update: {},
        create: { group, name },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
