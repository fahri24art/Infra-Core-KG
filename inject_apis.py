import paramiko

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

stdin, stdout, stderr = client.exec_command('cat /opt/power_asset/backend/routes/ricoh.js')
content = stdout.read().decode('utf-8')

api_code = """
router.get('/monthly-stats', async (req, res) => {
  try {
    const active = await db('ricoh_device_quotas').sum({ bw: 'current_usage_bw', color: 'current_usage_color' }).first();
    
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevMonthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const lastM = await db('ricoh_monthly_usage').where('month', prevMonthStr).sum({ bw: 'bw_usage', color: 'color_usage' }).first();
    
    const thisYearStr = new Date().getFullYear() + '-%';
    const thisY = await db('ricoh_monthly_usage').where('month', 'like', thisYearStr).sum({ bw: 'bw_usage', color: 'color_usage' }).first();
    
    res.json({
        thisMonth: { bw: active?.bw || 0, color: active?.color || 0 },
        lastMonth: { bw: lastM?.bw || 0, color: lastM?.color || 0 },
        thisYear: { bw: (Number(thisY?.bw) || 0) + (Number(active?.bw) || 0), color: (Number(thisY?.color) || 0) + (Number(active?.color) || 0) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly-logs', async (req, res) => {
  try {
    const rows = await db('ricoh_monthly_usage')
      .leftJoin('ricoh_departments', 'ricoh_monthly_usage.department_id', 'ricoh_departments.id')
      .select('ricoh_monthly_usage.*', 'ricoh_departments.name as department_name')
      .orderBy('ricoh_monthly_usage.month', 'desc')
      .orderBy('ricoh_monthly_usage.bw_usage', 'desc');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
"""

if "/monthly-stats" not in content:
    new_content = content.replace('module.exports = router;', api_code + '\nmodule.exports = router;')
    with open('temp_ricoh.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    sftp = client.open_sftp()
    sftp.put('temp_ricoh.js', '/opt/power_asset/backend/routes/ricoh.js')
    sftp.close()
    print("Injected monthly APIs into ricoh.js")
    
    # Restart the backend to apply changes
    client.exec_command('pm2 restart power-asset')
else:
    print("APIs already injected.")

client.close()
