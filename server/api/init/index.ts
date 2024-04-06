import prisma from "@/server/utils/prisma";

export default defineEventHandler(async (event) => {
  const defaultKnowledgeBaseName = "DEFAULT_KNOWLEDGEBASE"
  if (await prisma.knowledgeBase.count({}) == 0) {
    const affected = await prisma.knowledgeBase.create({
        data: {
          name: defaultKnowledgeBaseName,
          description: "The default knowledgebase, all files will be added in this base.",
          embedding: process.env.DEFAULT_EMBED,
          created: new Date()
        }
      });
      console.log(`Initialized knowledge base ${affected.name}, ID: ${affected.id}, Embedding model: ${process.env.DEFAULT_EMBED}.`);
  }
});
