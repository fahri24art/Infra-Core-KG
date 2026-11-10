const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const updateEcosystemCmd = `
cat << 'EOF' > /opt/power_asset/ecosystem.config.cjs
module.exports = {
  apps : [
    {
      name: "power-asset",
      script: "./backend/index.js",
      cwd: "/opt/power_asset",
      env: {
        NODE_ENV: "production",
        WA_IPC_MODE: "api",
        DISABLE_WA_BOT: "true"
      }
    },
    {
      name: "power_asset_bot_1",
      script: "./backend/whatsapp_bot.js",
      cwd: "/opt/power_asset",
      env: {
        PORT: 5002,
        WA_AUTH_DIR: "./backend/whatsapp_auth_1",
        DISABLE_WA_BOT: "false"
      }
    },
    {
      name: "power_asset_bot_2",
      script: "./backend/whatsapp_bot.js",
      cwd: "/opt/power_asset",
      env: {
        PORT: 5003,
        WA_AUTH_DIR: "./backend/whatsapp_auth_2",
        DISABLE_WA_BOT: "false"
      }
    },
    {
      name: "power_asset_bot_3",
      script: "./backend/whatsapp_bot.js",
      cwd: "/opt/power_asset",
      env: {
        PORT: 5004,
        WA_AUTH_DIR: "./backend/whatsapp_auth_3",
        DISABLE_WA_BOT: "false"
      }
    },
    {
      name: "power_asset_hrga",
      script: "./backend/wa_bot_hrga.js",
      cwd: "/opt/power_asset",
      env: {
        PORT: 5005,
        WA_AUTH_DIR: "./backend/whatsapp_auth_hrga",
        DISABLE_WA_BOT: "false"
      }
    }
  ]
}
EOF
pm2 stop all
pm2 delete power_asset_bot || true
pm2 delete power_asset_bot_1 || true
pm2 delete power_asset_bot_2 || true
pm2 delete power_asset_bot_3 || true
pm2 delete power_asset_hrga || true
pm2 start /opt/power_asset/ecosystem.config.cjs
pm2 save
`;

    conn.exec(updateEcosystemCmd, (err, stream) => {
        let stdout = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('close', () => {
            console.log(stdout);
            console.log('Ecosystem updated and bots started.');
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
