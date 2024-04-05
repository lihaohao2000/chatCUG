module.exports = {
    apps: [
      {
        name: 'ChatCUG',
        exec_mode: 'cluster',
        instances: 'max',
        script: './server/index.mjs',
        env: {
            NODE_ENV: 'production',
            PORT: 80
        }
      }
    ]
  };
  