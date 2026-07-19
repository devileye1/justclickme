const path = require('path');

module.exports = {
  apps: [
    {
      name: 'justclickme-api',
      cwd: path.resolve(__dirname, '../..'),
      script: 'pnpm',
      args: '--filter @justclickme/api exec ts-node src/index.ts',
      env: {
        NODE_ENV: 'production',
      },
      log_file: '/root/.pm2/logs/justclickme-api.log',
      out_file: '/root/.pm2/logs/justclickme-api-out.log',
      error_file: '/root/.pm2/logs/justclickme-api-error.log',
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      max_memory_restart: '500M',
    },
    {
      name: 'justclickme-indexer',
      cwd: path.resolve(__dirname, '../..'),
      script: 'pnpm',
      args: '--filter @justclickme/api exec ts-node src/jobs/indexer.ts',
      env: {
        NODE_ENV: 'production',
      },
      log_file: '/root/.pm2/logs/justclickme-indexer.log',
      out_file: '/root/.pm2/logs/justclickme-indexer-out.log',
      error_file: '/root/.pm2/logs/justclickme-indexer-error.log',
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      max_memory_restart: '500M',
    },
  ],
};
