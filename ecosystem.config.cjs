module.exports = {
    apps: [
      {
        name: 'ChatCUG',
        exec_mode: 'cluster',
        instances: 'max',
        script: './server/index.mjs',
        env: {
            NODE_ENV: 'production',
            PORT: 80,
            DISABLE_VERCEL_ANALYTICS: false,
            DATABASE_URL: 'file: ../../ChatCUG.sqlite',
            CHROMADB_URL: 'http://localhost:8000',
            LANGCHAIN_TRACING_V2: false,
            LANGCHAIN_PROJECT: 'chat-ollama'
        }
      }
    ]
  };
  