import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createRetrieverTool } from "langchain/tools/retriever";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
dotenv.config();

const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-pro",
    maxOutputTokens: 2048,
    temperature: 0.7,
    verbose: true,
});

const createRetriever = async () => {
    const loader = new CheerioWebBaseLoader(
        process.env.LINK_DOC
    );
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 200,
        chunkOverlap: 20,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    const embeddings = new GoogleGenerativeAIEmbeddings();

    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings
    );

    const retriever = vectorStore.asRetriever({
        k: 2,
    });

    return retriever;
}

export const createAgent = async (tools) => {
    const prompt = ChatPromptTemplate.fromMessages([
        ("system", "You are a helpful assistant."),
        new MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = await createOpenAIFunctionsAgent({
        llm: model,
        prompt,
        tools,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools,
    });

    return agentExecutor;
};

const retriever = await createRetriever();
const searchTool = new TavilySearchResults();
const retrieverTool = createRetrieverTool(retriever, {
    name: "real_estate_retriever",
    description: "Use this tool when looking up the real estate data provided"
});
const tools = [searchTool, retrieverTool];

const agent = await createAgent(tools);

const chatHistory = [];

export const askQuestion = async (input) => {
    if(input === "!delete"){
        chatHistory.splice(0, chatHistory.length);
        return "Chat history has been deleted";
    }
    const response = await agent.invoke({
        input: input,
        chat_history: chatHistory,
    });

    chatHistory.push(new HumanMessage(input));
    chatHistory.push(new AIMessage(response.output));

    return response.output;
}