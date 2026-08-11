module.exports = {
  apps: [
    {
      name: 'ajlb-sync-service',
      script: 'dist/server.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        SYNC_INTERVAL_SECONDS: 60
      }
    }
  ]
};
