module.exports = {
  apps: [
    {
      name: 'justclickme-api',
      script: 'pnpm',
      args: '--filter @justclickme/api start',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'justclickme-indexer',
      script: 'pnpm',
      args: '--filter @justclickme/api indexer',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
