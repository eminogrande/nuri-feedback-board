module.exports = {
  apps: [
    {
      name: 'nuri-feedback-board',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3456,
      },
      env_file: '.env.production',
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      err_file: './logs/err.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
