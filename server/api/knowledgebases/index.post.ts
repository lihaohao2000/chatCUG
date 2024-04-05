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
import { useStorage } from '@vueuse/core';

const globalEmbed = useStorage(`embed`, null);

const ingestDocument = async (
  file: MultiPartData,
  collectionName: string,
  embedding: string,
  event: H3Event,
  id: number
) => {
  const docs = await loadDocuments(file)

  const textSplitter = new RecursiveCharacterTextSplitter({ separators: ['\r\n', '\n', ' ', '。', ''], chunkSize: 150, chunkOverlap: 30 });
  const splits = await textSplitter.splitDocuments(docs);
  for(const split of splits) {
    split.metadata = {id}
  }
  console.log("slipts are: ", splits)

  const embeddings = createEmbeddings(embedding, event);

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

  const defaultKnowledgeBaseName = "DEFAULT_KNOWLEDGEBASE"

  let _description = ''
  items?.forEach((item) => {
    const key = item.name || '';
    const decodeData = decoder.decode(item.data)
    if (key.startsWith("file_")) {
      uploadedFiles.push(item);
    }
    if (key === 'description') {
      _description = decodeData
    }
  });

  if (uploadedFiles.length === 0) {
    setResponseStatus(event, 400);
    return {
      status: "error",
      message: "Must upload at least one file"
    }
  }

  if (globalEmbed.value == null) {
    setResponseStatus(event, 400);
    return {
      status: "error",
      message: "Must choose one embedding model"
    }
  }

  if (!(await isOllamaModelExists(ollama, globalEmbed.value))) {
    setResponseStatus(event, 404);
    return {
      status: "error",
      message: "Embedding model does not exist in Ollama"
    }
  }

  // const exist = await prisma.knowledgeBase.count({ where: { name: _name } }) > 0;
  // if (exist) {
  //   setResponseStatus(event, 409);
  //   return {
  //     status: "error",
  //     message: "Knowledge Base's Name already exist"
  //   }
  // }
  let affected
  if (await prisma.knowledgeBase.count({}) == 0) {
    affected = await prisma.knowledgeBase.create({
        data: {
          name: defaultKnowledgeBaseName,
          description: "The default knowledgebase, all files will be added in this base.",
          embedding: globalEmbed.value,
          created: new Date()
        }
      });
      console.log(`Initialized knowledge base ${affected.name}, ID: ${affected.id}, Embedding model: ${globalEmbed.value}.`);
  } else {
    try {
      affected = await prisma.knowledgeBase.findUniqueOrThrow({
        where: {
          name: defaultKnowledgeBaseName
        }
      })
    } catch (error) {
      console.error("Error finding default knowledge base: ", error);
      return {
        status: "error",
        message: "Error finding default knowledge base"
      }
    }
  }

  for (const uploadedFile of uploadedFiles) {
    try {
      const createdKnowledgeBaseFile = await prisma.knowledgeBaseFile.create({
        data: {
          url: uploadedFile.filename!,
          description: _description,
          created: new Date(),
          knowledgeBaseId: affected.id
        }
      });
      console.log("KnowledgeBaseFile with ID: ", createdKnowledgeBaseFile.id);
      await ingestDocument(uploadedFile, `collection_${affected.id}`, affected.embedding!, event, createdKnowledgeBaseFile.id);
    } catch (error) {
      console.error("Error ingest documents: ", error);
      return {
        status: "error",
        message: "Error ingest documents"
      }
    }
  }

  return {
    status: "success"
  }
})
