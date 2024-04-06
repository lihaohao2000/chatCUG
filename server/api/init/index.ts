import prisma from "@/server/utils/prisma";
import { useStorage } from "@vueuse/core";

export default defineEventHandler(async (event) => {
  const globalModel = useStorage(`model`, process.env.DEFAULT_MODEL);
  const globalEmbed = useStorage(`embed`, process.env.DEFAULT_EMBED);
  const defaultKnowledgeBaseName = "DEFAULT_KNOWLEDGEBASE"
  if (await prisma.knowledgeBase.count({}) == 0) {
    const affected = await prisma.knowledgeBase.create({
        data: {
          name: defaultKnowledgeBaseName,
          description: "The default knowledgebase, all files will be added in this base.",
          embedding: globalEmbed.value,
          created: new Date()
        }
      });
      console.log(`Initialized knowledge base ${affected.name}, ID: ${affected.id}, Embedding model: ${globalEmbed.value}.`);
  }
});
