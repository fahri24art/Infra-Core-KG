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
        thisMonth: { bw: Number(active?.bw) || 0, color: Number(active?.color) || 0 },
        lastMonth: { bw: Number(lastM?.bw) || 0, color: Number(lastM?.color) || 0 },
        thisYear: { bw: (Number(thisY?.bw) || 0) + (Number(active?.bw) || 0), color: (Number(thisY?.color) || 0) + (Number(active?.color) || 0) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly-logs', async (req, res) => {
  try {
    const currentMonthStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    
    const currentRows = await db('ricoh_device_quotas')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .select(
        'ricoh_device_quotas.computer_name', 
        'ricoh_device_quotas.user_code', 
        'ricoh_departments.name as department_name', 
        'ricoh_device_quotas.current_usage_bw as bw_usage', 
        'ricoh_device_quotas.current_usage_color as color_usage'
      )
      .whereRaw('current_usage_bw > 0 OR current_usage_color > 0');
      
    const formattedCurrentRows = currentRows.map(r => ({
       ...r,
       id: 'curr_' + r.computer_name,
       month: currentMonthStr + ' (Current)'
    }));
    
    const historicalRows = await db('ricoh_monthly_usage')
      .leftJoin('ricoh_departments', 'ricoh_monthly_usage.department_id', 'ricoh_departments.id')
      .select('ricoh_monthly_usage.*', 'ricoh_departments.name as department_name')
      .orderBy('ricoh_monthly_usage.month', 'desc')
      .orderBy('ricoh_monthly_usage.bw_usage', 'desc');
      
    res.json([...formattedCurrentRows, ...historicalRows]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
"""

# We need to replace the OLD api_code with the NEW api_code
# Since we injected it before `module.exports = router;`, we can split the file.
parts = content.split("router.get('/monthly-stats', async (req, res) => {")
if len(parts) > 1:
    # Keep the part before monthly-stats
    new_content = parts[0] + api_code + '\nmodule.exports = router;'
    
    with open('temp_ricoh2.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    sftp = client.open_sftp()
    sftp.put('temp_ricoh2.js', '/opt/power_asset/backend/routes/ricoh.js')
    sftp.close()
    print("Re-injected fixed monthly APIs into ricoh.js")
    
    client.exec_command('pm2 restart power-asset')
else:
    print("Could not find monthly-stats in ricoh.js")

client.close()
