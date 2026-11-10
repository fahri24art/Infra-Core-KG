import paramiko
import os

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"
local_file = "F:\\TCF Project Infra\\APP_Power_Asset\\backend\\services\\ricoh_scraper.js"
remote_file = "/opt/power_asset/backend/services/ricoh_scraper.js"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

sftp = client.open_sftp()
print("Uploading ricoh_scraper.js...")
sftp.put(local_file, remote_file)
sftp.close()

stdin, stdout, stderr = client.exec_command("pm2 restart power-asset")
print(stdout.read().decode(errors='ignore'))
err = stderr.read().decode()
if err: print("Err:", err)

client.close()
print("Done")
