import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Embeddings } from "@langchain/core/embeddings";

export const createRetriever = async (embeddings: Embeddings, collectionName: string) => {
  const dbConfig = {
    collectionName: collectionName,
    url: process.env.CHROMADB_URL
  };
  const chromaClient = new Chroma(embeddings, dbConfig);
  await chromaClient.ensureCollection();
  // await chromaClient.addDocuments(splits);

  console.log("Initializing vector store retriever");
  return chromaClient.asRetriever(8);
}
