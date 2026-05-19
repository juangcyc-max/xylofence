import asyncio
import json
import platform
import socket
from datetime import datetime

import psutil

from app.utils.time import utc_now

# ── Port → (service_name, severity, risk_description) ────────────────────────
RISK_MAP: dict[int, tuple[str, str, str]] = {
    21:    ("FTP",           "high",     "Transferencia de archivos sin cifrado — credenciales expuestas"),
    22:    ("SSH",           "info",     "Acceso remoto seguro"),
    23:    ("Telnet",        "critical", "Protocolo sin cifrado — contraseñas en texto plano"),
    25:    ("SMTP",          "medium",   "Servidor de correo expuesto"),
    53:    ("DNS",           "info",     "Servidor DNS"),
    80:    ("HTTP",          "info",     "Servidor web sin cifrado"),
    110:   ("POP3",          "medium",   "Correo entrante sin cifrado"),
    111:   ("RPC",           "medium",   "RPC portmapper — potencial vector de ataque"),
    135:   ("MSRPC",         "medium",   "Microsoft RPC — vector de exploits"),
    137:   ("NetBIOS-NS",    "high",     "Resolución de nombres NetBIOS — fuga de info"),
    138:   ("NetBIOS-DGM",   "high",     "Datagramas NetBIOS — fuga de info"),
    139:   ("NetBIOS-SSN",   "high",     "Sesión NetBIOS — legacy inseguro"),
    143:   ("IMAP",          "medium",   "Correo IMAP sin cifrado"),
    443:   ("HTTPS",         "info",     "Servidor web seguro"),
    445:   ("SMB",           "high",     "Compartición de archivos Windows — vector de ransomware"),
    512:   ("rexec",         "critical", "Ejecución remota sin autenticación segura"),
    513:   ("rlogin",        "critical", "Login remoto inseguro"),
    514:   ("rsh",           "critical", "Shell remota sin cifrado"),
    515:   ("LPD",           "medium",   "Demonio de impresión expuesto"),
    587:   ("SMTP-TLS",      "info",     "SMTP con STARTTLS"),
    631:   ("IPP",           "medium",   "Impresora expuesta en red"),
    993:   ("IMAPS",         "info",     "IMAP seguro"),
    995:   ("POP3S",         "info",     "POP3 seguro"),
    1080:  ("SOCKS",         "medium",   "Proxy SOCKS — puede estar abierto"),
    1433:  ("MSSQL",         "high",     "SQL Server expuesto directamente en red"),
    1521:  ("Oracle DB",     "high",     "Base de datos Oracle expuesta"),
    1723:  ("PPTP",          "medium",   "VPN PPTP — protocolo débil"),
    2049:  ("NFS",           "high",     "Sistema de archivos en red — acceso sin autenticación posible"),
    2323:  ("Telnet-alt",    "critical", "Variante Telnet — credenciales en texto plano"),
    3306:  ("MySQL",         "high",     "Base de datos MySQL expuesta sin firewall"),
    3389:  ("RDP",           "high",     "Escritorio remoto Windows expuesto"),
    4444:  ("Metasploit",    "critical", "Puerto típico de backdoors y C2"),
    4445:  ("Backdoor-alt",  "critical", "Puerto común de shells inversas"),
    4848:  ("GlassFish",     "high",     "Consola admin Java EE expuesta"),
    5432:  ("PostgreSQL",    "high",     "Base de datos PostgreSQL expuesta"),
    5900:  ("VNC",           "high",     "Control remoto — puede carecer de contraseña"),
    5985:  ("WinRM-HTTP",    "high",     "Windows Remote Management sin TLS"),
    5986:  ("WinRM-HTTPS",   "medium",   "Windows Remote Management con TLS"),
    6379:  ("Redis",         "high",     "Redis sin autenticación por defecto"),
    7001:  ("WebLogic",      "high",     "Servidor WebLogic — historial de RCE críticos"),
    7002:  ("WebLogic-TLS",  "high",     "WebLogic con TLS — aún con historial de vulnerabilidades"),
    8000:  ("HTTP-alt",      "low",      "Servidor web en puerto alternativo"),
    8080:  ("HTTP-proxy",    "low",      "Proxy o servidor web alternativo"),
    8443:  ("HTTPS-alt",     "low",      "HTTPS en puerto alternativo"),
    8888:  ("HTTP-alt2",     "low",      "Servidor web en puerto alternativo"),
    9000:  ("PHP-FPM",       "high",     "PHP-FPM expuesto — ejecución de código remota"),
    9090:  ("WebSphere",     "medium",   "Consola admin potencialmente expuesta"),
    9200:  ("Elasticsearch", "high",     "Elasticsearch sin autenticación por defecto"),
    9300:  ("ES-cluster",    "high",     "Nodo cluster Elasticsearch expuesto"),
    11211: ("Memcached",     "high",     "Memcached sin autenticación — amplificación DDoS"),
    27017: ("MongoDB",       "high",     "MongoDB sin autenticación por defecto"),
    27018: ("MongoDB-shard", "high",     "MongoDB shard sin autenticación"),
    50000: ("SAP",           "high",     "SAP Message Server expuesto"),
}

TOP_PORTS = sorted(RISK_MAP.keys()) + [
    # Puertos adicionales sin riesgo especial pero frecuentes
    8008, 8009, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089,
    8181, 8282, 8383, 8484, 8585, 8686, 8787, 8888, 9001, 9002, 9003,
    9100, 9200, 9300, 9400, 9500, 10000, 10080, 10443, 49152, 49153,
]
TOP_PORTS = sorted(set(TOP_PORTS))


async def _probe_port(host: str, port: int, timeout: float) -> tuple[int, bool, str]:
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=timeout
        )
        banner = ""
        try:
            writer.write(b"HEAD / HTTP/1.0\r\n\r\n")
            await writer.drain()
            data = await asyncio.wait_for(reader.read(512), timeout=1.0)
            banner = data.decode("utf-8", errors="ignore").split("\n")[0].strip()[:120]
        except Exception:
            pass
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        return port, True, banner
    except Exception:
        return port, False, ""


async def scan_host(target: str, timeout: float = 0.5) -> dict:
    try:
        resolved = socket.gethostbyname(target)
    except socket.gaierror:
        raise ValueError(f"No se puede resolver el host: {target}")

    tasks = [_probe_port(resolved, p, timeout) for p in TOP_PORTS]
    results = await asyncio.gather(*tasks)

    open_ports = []
    for port, is_open, banner in results:
        if not is_open:
            continue
        service, severity, risk_desc = RISK_MAP.get(port, ("unknown", "info", ""))
        open_ports.append({
            "port": port,
            "protocol": "tcp",
            "service": service,
            "banner": banner or None,
            "severity": severity,
            "risk_description": risk_desc or None,
        })

    open_ports.sort(key=lambda x: (
        {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}.get(x["severity"], 5),
        x["port"],
    ))

    severities = [p["severity"] for p in open_ports]
    if "critical" in severities:
        risk_score = "critical"
    elif "high" in severities:
        risk_score = "high"
    elif "medium" in severities:
        risk_score = "medium"
    elif "low" in severities:
        risk_score = "low"
    elif open_ports:
        risk_score = "info"
    else:
        risk_score = "none"

    return {
        "resolved_ip": resolved,
        "total_ports_scanned": len(TOP_PORTS),
        "open_ports": open_ports,
        "risk_score": risk_score,
    }


def get_system_info() -> dict:
    interfaces = {}
    for name, addrs in psutil.net_if_addrs().items():
        interfaces[name] = [
            {
                "address": addr.address,
                "netmask": addr.netmask,
                "family": addr.family.name if hasattr(addr.family, "name") else str(addr.family),
            }
            for addr in addrs
            if addr.address
        ]

    try:
        cpu_freq = psutil.cpu_freq()
        cpu_freq_mhz = round(cpu_freq.current) if cpu_freq else None
    except Exception:
        cpu_freq_mhz = None

    mem = psutil.virtual_memory()

    processes = []
    try:
        for proc in psutil.process_iter(["pid", "name", "status", "username"]):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass

    return {
        "hostname": socket.gethostname(),
        "os": platform.system(),
        "os_version": platform.version()[:120],
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "cpu_freq_mhz": cpu_freq_mhz,
        "cpu_percent": psutil.cpu_percent(interval=0.2),
        "memory_total_gb": round(mem.total / (1024 ** 3), 2),
        "memory_used_gb": round(mem.used / (1024 ** 3), 2),
        "memory_percent": mem.percent,
        "interfaces": interfaces,
        "process_count": len(processes),
        "processes": processes[:50],
        "collected_at": utc_now().isoformat(),
    }
