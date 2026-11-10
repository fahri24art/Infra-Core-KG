import paramiko
import sys

host = "192.168.1.66"
user = "root"
pwd = "nevergiveup"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

def run_query(query):
    print(f"--- Query: {query} ---")
    stdin, stdout, stderr = client.exec_command(f'PGPASSWORD=secure_net_pass psql -U netadmin -h 127.0.0.1 -d network_monitor_db -c "{query}"')
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if err:
        print("ERR:", err)
    print(out)

run_query("SELECT id, name FROM ricoh_departments;")
run_query("SELECT computer_name, user_code, department_id, current_usage_bw, current_usage_color FROM ricoh_device_quotas WHERE department_id = (SELECT id FROM ricoh_departments WHERE name = 'PPIC');")
run_query("SELECT * FROM ricoh_system_logs ORDER BY id DESC LIMIT 10;")
run_query("SELECT * FROM ricoh_print_jobs ORDER BY id DESC LIMIT 10;")

client.close()
