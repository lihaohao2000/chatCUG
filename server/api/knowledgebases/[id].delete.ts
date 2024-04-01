import { ChromaClient, ChromaClientParams } from 'chromadb'
import { type KnowledgeBase } from "@prisma/client";
import prisma from "@/server/utils/prisma";

const deleteKnowledgeBase = async (
  id?: string
): Promise<KnowledgeBase | null> => {
  try {
    let deletedKnowledgeBase = null;
    if (id) {
      // Delete knowledge base from database
      deletedKnowledgeBase = await prisma.knowledgeBase.delete({
        where: {
          id: parseInt(id),
        },
      });

      // Delete vectore storage
      const collectionName = `collection_${id}`;

      console.log("Deleting Chroma collection: ", collectionName);
      const dbConfig: ChromaClientParams = {
        path: process.env.CHROMADB_URL
      };
      const chromaClient = new ChromaClient(dbConfig);
      await chromaClient.deleteCollection({ name: collectionName });
    }

    return deletedKnowledgeBase;
  } catch (error) {
    console.error(`Error deleting knowledge base with id ${id}:`, error);
    return null;
  }
};

export default defineEventHandler(async (event) => {
  const id = event?.context?.params?.id;
  const deletedKnowledgeBase = await deleteKnowledgeBase(id);
  return { deletedKnowledgeBase };
});
