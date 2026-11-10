import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.1.66', username='root', password='nevergiveup', timeout=10)

sftp = client.open_sftp()
sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\ricoh.js", "/opt/power_asset/backend/routes/ricoh.js")
sftp.close()

stdin, stdout, stderr = client.exec_command('pm2 restart power-asset')
print(stdout.read().decode('ascii', errors='ignore'))
client.close()
print("Deployed ricoh.js successfully")
