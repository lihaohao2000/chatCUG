module.exports = {
    apps: [
      {
        name: 'ChatCUG',
        exec_mode: 'cluster',
        instances: 'max',
        script: './.output/server/index.mjs',
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
            DISABLE_VERCEL_ANALYTICS: false,
            DATABASE_URL: 'file:/root/proj/chatCUG/ChatCUG.sqlite',
            CHROMADB_URL: 'http://localhost:8000',

            LANGCHAIN_TRACING_V2: false,
            LANGCHAIN_PROJECT: 'chat-ollama',

            DEFAULT_MODEL: 'qwen:latest',
            DEFAULT_EMBED: 'yxl/m3e:latest'
        }
      }
    ]
  };
  