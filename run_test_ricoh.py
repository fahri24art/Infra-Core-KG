import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.1.66', username='root', password='nevergiveup', timeout=10)

sftp = client.open_sftp()
sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\test_ricoh_join.cjs", "/opt/power_asset/backend/test_ricoh_join.cjs")
sftp.close()

stdin, stdout, stderr = client.exec_command('cd /opt/power_asset/backend && NODE_ENV=production node test_ricoh_join.cjs')
print(stdout.read().decode('ascii', errors='ignore'))
err = stderr.read().decode('ascii', errors='ignore')
if err: print("Stderr:", err)
client.close()
