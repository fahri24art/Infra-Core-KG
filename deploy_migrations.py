import os
import paramiko
import tarfile

def deploy():
    print("Compressing migrations folder...")
    dist_dir = r"F:\TCF Project Infra\APP_Power_Asset\backend\migrations"
    tar_path = r"F:\TCF Project Infra\APP_Power_Asset\migrations.tar.gz"
    
    if os.path.exists(tar_path):
        os.remove(tar_path)
        
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(dist_dir, arcname="migrations")
        
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting to SSH...")
    client.connect('192.168.1.66', username='root', password='Nevergiveup572*', timeout=10)
    
    sftp = client.open_sftp()
    remote_tar = "/tmp/migrations.tar.gz"
    
    print("Uploading migrations...")
    sftp.put(tar_path, remote_tar)
    sftp.close()
    
    print("Extracting migrations and running knex...")
    commands = [
        "rm -rf /opt/power_asset/backend/migrations",
        "tar -xzf /tmp/migrations.tar.gz -C /opt/power_asset/backend/",
        "rm /tmp/migrations.tar.gz",
        "cd /opt/power_asset/backend && npx knex migrate:latest",
        "pm2 restart power-asset"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        print("OUT:", stdout.read().decode('utf-8', errors='replace'))
        print("ERR:", stderr.read().decode('utf-8', errors='replace'))
            
    client.close()
    print("Migrations complete!")

if __name__ == '__main__':
    deploy()
