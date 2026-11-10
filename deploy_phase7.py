import os
import paramiko
import tarfile

def deploy():
    # 1. Compress frontend dist
    print("Compressing dist folder...")
    dist_dir = r"F:\TCF Project Infra\APP_Power_Asset\dist"
    tar_path = r"F:\TCF Project Infra\APP_Power_Asset\dist.tar.gz"
    
    if os.path.exists(tar_path):
        os.remove(tar_path)
        
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(dist_dir, arcname="dist")
        
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting to SSH...")
    client.connect('192.168.1.66', username='root', password='Nevergiveup572*', timeout=10)
    
    sftp = client.open_sftp()
    remote_tar = "/tmp/dist.tar.gz"
    
    # Upload frontend
    print("Uploading frontend dist...")
    sftp.put(tar_path, remote_tar)
    
    # Upload backend files
    print("Uploading backend files...")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\index.js", "/opt/power_asset/backend/index.js")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\global_configurator.js", "/opt/power_asset/backend/routes/global_configurator.js")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\uptime_kuma.js", "/opt/power_asset/backend/routes/uptime_kuma.js")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\hr.js", "/opt/power_asset/backend/routes/hr.js")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\inventory.js", "/opt/power_asset/backend/routes/inventory.js")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\datacenter.js", "/opt/power_asset/backend/routes/datacenter.js")
    sftp.put(r"F:\TCF Project Infra\APP_Power_Asset\backend\routes\settings.js", "/opt/power_asset/backend/routes/settings.js")
    
    sftp.close()
    
    print("Extracting frontend on server...")
    commands = [
        "rm -rf /opt/power_asset/dist",
        "tar -xzf /tmp/dist.tar.gz -C /opt/power_asset/",
        "rm /tmp/dist.tar.gz",
        "pm2 restart power-asset"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        err = stderr.read().decode('utf-8')
        if err:
            print("STDERR:", err)
        try:
            print(stdout.read().decode('utf-8', errors='replace'))
        except Exception as e:
            pass
            
    client.close()
    print("Deployment Phase 7 complete!")

if __name__ == '__main__':
    deploy()
