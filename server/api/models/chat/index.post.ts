import { Readable } from 'stream';
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { setEventStreamResponse, FetchWithAuth } from '@/server/utils';
import { BaseRetriever } from "@langchain/core/retrievers";
import prisma from "@/server/utils/prisma";
import { createChatModel, createEmbeddings } from '@/server/utils/models';
import { createRetriever } from '@/server/retriever';

const SYSTEM_TEMPLATE = `Answer the user's questions based on the below context.
Your answer should be in the format of Markdown.

If the context doesn't contain any relevant information to the question, don't make something up and just say "I don't know":

<context>
{context}
</context>
`;

const SYSTEM_TEMPLATE_CN = "你是非常专业的个人助手，请基于以下内容回答我的问题。你的回答需要按照Markdown格式。如果以下内容不包含任何与我的问题相关的内容，请忽略以下内容：<context>{context}</context>"

export default defineEventHandler(async (event) => {
  const { knowledgebaseId, model, messages, stream } = await readBody(event);

  if (knowledgebaseId) {
    console.log("Chat with knowledge base with id: ", knowledgebaseId);
    const knowledgebase = await prisma.knowledgeBase.findUnique({
      where: {
        id: knowledgebaseId,
      },
    });
    console.log(`Knowledge base ${knowledgebase?.name} with embedding "${knowledgebase?.embedding}"`);
    if (!knowledgebase) {
      setResponseStatus(event, 404, `Knowledge base with id ${knowledgebaseId} not found`);
      return;
    }

    const embeddings = createEmbeddings(knowledgebase.embedding, event);
    // const vectorStore = createChromaVectorStore(embeddings, `collection_${knowledgebase.id}`);
    const retriever: BaseRetriever = await createRetriever(embeddings, `collection_${knowledgebase.id}`);

    const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_TEMPLATE],
      new MessagesPlaceholder("messages"),
    ]);

    const chat = createChatModel(model, event);

    const query = messages[messages.length - 1].content
    console.log("User query: ", query);

    const relevant_docs = await retriever.getRelevantDocuments(query);
    console.log("Relevant documents: ", relevant_docs);

    const documentChain = await createStuffDocumentsChain({
      llm: chat,
      prompt: questionAnsweringPrompt,
    });

    const parseRetrieverInput = (params) => {
      return params.messages[params.messages.length - 1].content;
    };

    const retrievalChain = RunnablePassthrough.assign({
      context: RunnableSequence.from([parseRetrieverInput, retriever]),
    }).assign({
      answer: documentChain,
    });

    if (!stream) {
      const response = await retrievalChain.invoke({
        messages: [new HumanMessage(query)],
      });
      return {
        message: {
          role: 'assistant',
          content: response?.answer
        }
      };
    }

    setEventStreamResponse(event);
    const response = await retrievalChain.stream({
      messages: [new HumanMessage(query)],
    });

    console.log(response);
    const readableStream = Readable.from((async function* () {
      for await (const chunk of response) {
        if (chunk?.answer !== undefined) {
          const message = {
            message: {
              role: 'assistant',
              content: chunk?.answer
            }
          };
          console.log(message);
          yield `${JSON.stringify(message)}\n\n`;
        }
      }
    })());
    return sendStream(event, readableStream);
  } else {
    const llm = createChatModel(model, event);
    const response = await llm?.stream(messages.map((message) => {
      return [message.role, message.content];
    }));

    const readableStream = Readable.from((async function* () {
      for await (const chunk of response) {
        const message = {
          message: {
            role: 'assistant',
            content: chunk?.content
          }
        };
        yield `${JSON.stringify(message)}\n\n`;
      }
    })());

    return sendStream(event, readableStream);
  }
})
