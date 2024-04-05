import { type KnowledgeBaseFile } from '@prisma/client';
import prisma from '@/server/utils/prisma';

const listKnowledgeBaseFiles = async (): Promise<KnowledgeBaseFile[] | null> => {
  try {
    return await prisma.knowledgeBaseFile.findMany({});
  } catch (error) {
    console.error("Error fetching knowledge base files: ", error);
    return null;
  }
}

export default defineEventHandler(async (event) => {
  const knowledgeBaseFiles = await listKnowledgeBaseFiles();
  return { knowledgeBaseFiles };
})
