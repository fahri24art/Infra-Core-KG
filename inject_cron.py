import paramiko
import re

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

stdin, stdout, stderr = client.exec_command('cat /opt/power_asset/backend/index.js')
content = stdout.read().decode('utf-8')

cron_code = """
    // --- MONTHLY RICOH QUOTA RESET CRON ---
    try {
        const cron = require('node-cron');
        const { getDb } = require('./db');
        const rDb = getDb('TCF-SG');
        
        cron.schedule('1 0 1 * *', async () => {
            console.log('[CRON] Starting Monthly Ricoh Quota Reset...');
            try {
                // Get previous month string, e.g., '2026-07'
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                const prevMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
                
                const users = await rDb('ricoh_device_quotas').select('*');
                let resetCount = 0;
                
                for (const u of users) {
                    if (u.current_usage_bw > 0 || u.current_usage_color > 0) {
                        // Insert to monthly usage
                        await rDb('ricoh_monthly_usage').insert({
                            computer_name: u.computer_name,
                            user_code: u.user_code,
                            department_id: u.department_id,
                            month: prevMonth,
                            bw_usage: u.current_usage_bw,
                            color_usage: u.current_usage_color
                        });
                    }
                    // Reset
                    await rDb('ricoh_device_quotas').where('id', u.id).update({
                        current_usage_bw: 0,
                        current_usage_color: 0,
                        last_reset: rDb.fn.now()
                    });
                    resetCount++;
                }
                console.log(`[CRON] Monthly Quota Reset Completed! Processed ${resetCount} users. Saved to ${prevMonth}.`);
            } catch (err) {
                console.error('[CRON] Error during Monthly Quota Reset:', err.message);
            }
        });
        console.log('[CRON] Monthly Ricoh Quota Reset scheduled for 1st of every month at 00:01.');
    } catch (e) {
        console.error('[CRON] Failed to init monthly ricoh quota cron:', e.message);
    }
"""

if "MONTHLY RICOH QUOTA RESET CRON" not in content:
    new_content = content.replace('scheduleDailyReport();', 'scheduleDailyReport();\n' + cron_code)
    
    with open('temp_index.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    # Upload
    sftp = client.open_sftp()
    sftp.put('temp_index.js', '/opt/power_asset/backend/index.js')
    sftp.close()
    print("Injected Cron logic into index.js")
else:
    print("Cron logic already in index.js")

client.close()
