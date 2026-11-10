import paramiko

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

stdin, stdout, stderr = client.exec_command('grep -A 2 -B 2 "5514" "/opt/power_asset/backend/services/downloads/RICOH MP C3004ex_usercounter_20170412.csv"')
print("Grep 5514:", stdout.read().decode('utf-8', errors='ignore'))

stdin, stdout, stderr = client.exec_command('grep -A 2 -B 2 "5881" "/opt/power_asset/backend/services/downloads/RICOH MP C3004ex_usercounter_20170412.csv"')
print("Grep 5881:", stdout.read().decode('utf-8', errors='ignore'))

client.close()
