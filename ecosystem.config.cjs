module.exports = {
  apps: [
    {
      name: 'whatsapp-crm-gateway',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '850M',
      node_args: '--max-old-space-size=850 --expose-gc',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://app.employeemanagementsystems.com',
        JWT_SECRET: 'omniflow_super_secret_jwt_key_production_2026'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
