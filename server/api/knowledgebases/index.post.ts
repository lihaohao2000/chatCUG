import { Ollama } from 'ollama'
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { MultiPartData, type H3Event } from 'h3';
import prisma from '@/server/utils/prisma';
import { createEmbeddings, isOllamaModelExists } from '@/server/utils/models';
import { createRetriever } from '@/server/retriever';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const ingestDocument = async (
  file: MultiPartData,
  collectionName: string,
  embedding: string,
  event: H3Event
) => {
  const docs = await loadDocuments(file)

  const textSplitter = new RecursiveCharacterTextSplitter({ separators: ['\r\n', '\n', ' ', '。', ''], chunkSize: 150, chunkOverlap: 30 });
  const splits = await textSplitter.splitDocuments(docs);

  console.log("slipts are: ", splits)

  const embeddings = createEmbeddings(embedding, event);

  // await chromaClient.addDocuments(splits);
  const retriever = await createRetriever(embeddings, collectionName);

  await retriever.addDocuments(splits);

  console.log(`${splits.length} documents added to Chroma collection ${collectionName}.`);
}

async function loadDocuments(file: MultiPartData) {
  const Loaders = {
    pdf: PDFLoader,
    json: JSONLoader,
    docx: DocxLoader,
    doc: DocxLoader,
    txt: TextLoader,
    md: TextLoader,
  } as const;

  const ext = (file.filename?.match(/\.(\w+)$/)?.[1] || 'txt').toLowerCase() as keyof typeof Loaders;
  if (!Loaders[ext]) {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  const blob = new Blob([file.data], { type: file.type })
  return new Loaders[ext](blob).load();
}

export default defineEventHandler(async (event) => {
  const items = await readMultipartFormData(event);
  const { host, username, password } = event.context.ollama;

  const decoder = new TextDecoder("utf-8");
  const uploadedFiles: MultiPartData[] = [];
  const ollama: Ollama = new Ollama({ host, fetch: FetchWithAuth.bind({ username, password }) });

  let _name = ''
  let _description = ''
  let _embedding = ''
  items?.forEach((item) => {
    const key = item.name || '';
    const decodeData = decoder.decode(item.data)
    if (key.startsWith("file_")) {
      uploadedFiles.push(item);
    }
    if (key === 'name') {
      _name = decodeData
    }
    if (key === 'description') {
      _description = decodeData
    }
    if (key === 'embedding') {
      _embedding = decodeData
    }
  });

  if (uploadedFiles.length === 0) {
    setResponseStatus(event, 400);
    return {
      status: "error",
      message: "Must upload at least one file"
    }
  }

  if (!(await isOllamaModelExists(ollama, _embedding))) {
    setResponseStatus(event, 404);
    return {
      status: "error",
      message: "Embedding model does not exist in Ollama"
    }
  }

  const exist = await prisma.knowledgeBase.count({ where: { name: _name } }) > 0;
  if (exist) {
    setResponseStatus(event, 409);
    return {
      status: "error",
      message: "Knowledge Base's Name already exist"
    }
  }

  const affected = await prisma.knowledgeBase.create({
    data: {
      name: _name,
      description: _description,
      embedding: _embedding,
      created: new Date(),
    }
  });
  console.log(`Created knowledge base ${_name}: ${affected.id}`);

  try {
    for (const uploadedFile of uploadedFiles) {
      await ingestDocument(uploadedFile, `collection_${affected.id}`, affected.embedding!, event);

      const createdKnowledgeBaseFile = await prisma.knowledgeBaseFile.create({
        data: {
          url: uploadedFile.filename!,
          knowledgeBaseId: affected.id
        }
      });

      console.log("KnowledgeBaseFile with ID: ", createdKnowledgeBaseFile.id);
    }
  } catch (e) {
    await prisma.knowledgeBase.delete({
      where: {
        id: affected.id
      }
    });
    throw e;
  }

  return {
    status: "success"
  }
})
