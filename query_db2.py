import paramiko

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

def run_query(query):
    print(f"--- Query: {query} ---")
    stdin, stdout, stderr = client.exec_command(f'PGPASSWORD=secure_net_pass psql -U netadmin -h 127.0.0.1 -d network_monitor_db -c "{query}"')
    print(stdout.read().decode('utf-8', errors='ignore'))
    
run_query("SELECT user_code, lifetime_bw, lifetime_color, current_usage_bw, current_usage_color FROM ricoh_device_quotas WHERE user_code = '9217';")

client.close()
