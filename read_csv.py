import paramiko

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

stdin, stdout, stderr = client.exec_command('cat "/opt/power_asset/backend/services/downloads/RICOH MP C3004ex_usercounter_20170412.csv" | head -n 20')
print(stdout.read().decode('utf-8', errors='ignore'))

client.close()
