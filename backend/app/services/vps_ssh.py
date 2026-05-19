import base64 as _b64
import subprocess

SSH_KEY = "/home/forge/.ssh/xylofence_vps"


def ssh_exec(ip: str, command: str, timeout: int = 30) -> str:
    result = subprocess.run(
        [
            "ssh", "-i", SSH_KEY,
            "-o", "StrictHostKeyChecking=no",
            "-o", "ConnectTimeout=10",
            "-o", "BatchMode=yes",
            f"root@{ip}",
            command,
        ],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(f"SSH error on {ip}: {result.stderr.strip()}")
    return result.stdout


def ssh_write_file(ip: str, path: str, content: str) -> None:
    encoded = _b64.b64encode(content.encode()).decode()
    ssh_exec(ip, f"echo '{encoded}' | base64 -d > {path}")
