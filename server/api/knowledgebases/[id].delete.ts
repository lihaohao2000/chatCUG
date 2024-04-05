import { ChromaClient, ChromaClientParams } from 'chromadb'
import { type KnowledgeBaseFile } from "@prisma/client";
import prisma from "@/server/utils/prisma";

const deleteKnowledgeBaseFile = async (
  id?: string
): Promise<KnowledgeBaseFile | null> => {
  try {
    let deletedKnowledgeBaseFile = null;
    if (id) {
      // Delete knowledge base File from database
      deletedKnowledgeBaseFile = await prisma.knowledgeBaseFile.delete({
        where: {
          id: parseInt(id),
        },
      });

      // Delete File From Chroma
      const collectionName = `collection_${deletedKnowledgeBaseFile.knowledgeBaseId}`;

      console.log("Deleting File From Chroma collection: ", collectionName);
      const dbConfig: ChromaClientParams = {
        path: process.env.CHROMADB_URL
      };
      const chromaClient = new ChromaClient(dbConfig);
      const collection = await chromaClient.getCollection({ name: collectionName })

      await collection.delete({
        where: {
          "id": {
            "$eq": parseInt(id)
          }
        }
      })

      console.log("Deleted File: ",id , " From Chroma collection: ", collectionName);
    }
    return deletedKnowledgeBaseFile;
  } catch (error) {
    console.error(`Error deleting knowledge base file with id ${id}:`, error);
    return null;
  }
};

export default defineEventHandler(async (event) => {
  const id = event?.context?.params?.id;
  const deletedKnowledgeBaseFile = await deleteKnowledgeBaseFile(id);
  return { deletedKnowledgeBaseFile };
});
