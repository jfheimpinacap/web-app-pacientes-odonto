# start.py - Monorepo robusto (Django + Vite) con comandos
import os
import sys
import subprocess
from pathlib import Path
import shutil
import webbrowser
import tempfile
import json
import platform
import urllib.request
import time
import argparse

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

CANDIDATE_VENVS = [
    BACKEND / ".venv",
    ROOT / ".venv",
    BACKEND / "venv",
    ROOT / "venv",
]

NODE_VERSION = os.environ.get("APP_NODE_VERSION", "20.12.2")  # LTS recomendada
BACKEND_PORT = os.environ.get("APP_BACKEND_PORT", "8000")
FRONTEND_PORT = os.environ.get("APP_FRONTEND_PORT", "5173")

# ------------- utilidades -------------
def which_venv():
    for v in CANDIDATE_VENVS:
        py = v / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        if py.exists():
            return v
    return None

def has_command(cmd):
    if os.name == "nt" and cmd == "npm":
        return shutil.which("npm") is not None or shutil.which("npm.cmd") is not None
    if os.name == "nt" and cmd == "node":
        return shutil.which("node") is not None or shutil.which("node.exe") is not None
    return shutil.which(cmd) is not None

def run(cmd, cwd=None, env=None, check=True, capture=False, shell=False):
    return subprocess.run(
        cmd, cwd=cwd, env=env, check=check, shell=shell,
        stdout=(subprocess.PIPE if capture else None),
        stderr=(subprocess.PIPE if capture else None),
        text=True
    )

def ensure_backend_venv_and_deps():
    if not BACKEND.exists():
        raise FileNotFoundError(f"No se encontró {BACKEND}. ¿Está el repo en formato monorepo con /backend y /frontend?")

    venv_dir = which_venv()
    if not venv_dir:
        venv_dir = BACKEND / ".venv"
        print(f"🔧 Creando entorno virtual en: {venv_dir}")
        run([sys.executable, "-m", "venv", str(venv_dir)])

    py = venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    pip = [str(py), "-m", "pip"]

    print("🔧 Actualizando pip...")
    run(pip + ["install", "-U", "pip", "wheel"])

    req = BACKEND / "requirements.txt"
    if req.exists():
        print("📦 Instalando dependencias (backend/requirements.txt)...")
        run(pip + ["install", "-r", str(req)])
    else:
        # Fallback si no existe requirements.txt
        base_pkgs = [
            "Django>=5.1,<6",
            "djangorestframework>=3.15",
            "django-cors-headers>=4.4",
            "django-filter>=24.2",
            "openpyxl>=3.1",
        ]
        print("📦 Instalando dependencias mínimas (no hay requirements.txt)...")
        run(pip + ["install"] + base_pkgs)

    return py

def run_manage(py_exe, *args, check=True):
    manage = BACKEND / "manage.py"
    if not manage.exists():
        raise FileNotFoundError(f"No se encontró {manage}")
    cmd = [str(py_exe), str(manage), *args]
    return run(cmd, cwd=str(BACKEND), check=check)

def open_new_console_windows(title, command, cwd=None):
    if os.name != "nt":
        return subprocess.Popen(command, cwd=cwd)
    if isinstance(command, (list, tuple)):
        cmdline = " ".join(f'"{c}"' if (" " in c or "\\" in c or "/" in c) else c for c in command)
    else:
        cmdline = command
    ps_cmd = [
        "powershell", "-NoProfile", "-Command",
        "Start-Process",
        "-FilePath", "cmd.exe",
        "-ArgumentList", f"'/K', 'cd /d \"{cwd}\" && {cmdline}'",
        "-WorkingDirectory", f"\"{cwd}\"",
        "-WindowStyle", "Normal",
        "-Verb", "Open",
        "-Wait:$false"
    ]
    try:
        subprocess.Popen(ps_cmd)
    except Exception as e:
        print(f"⚠️  No se pudo abrir ventana '{title}': {e}")

# ------------- Node / NPM helpers -------------
def refresh_windows_nvm_env():
    if os.name != "nt":
        return
    nvm_home = os.environ.get("NVM_HOME") or r"C:\Program Files\nvm"
    nvm_link = os.environ.get("NVM_SYMLINK") or r"C:\Program Files\nodejs"
    node_dir = Path(nvm_home) / f"v{NODE_VERSION}"
    candidates = [str(nvm_home), str(nvm_link), str(node_dir)]
    current_path = os.environ.get("PATH", "")
    parts = current_path.split(os.pathsep)
    changed = False
    for p in candidates:
        if p and p not in parts and Path(p).exists():
            parts.insert(0, p)
            changed = True
    if changed:
        os.environ["PATH"] = os.pathsep.join(parts)

def node_version():
    try:
        for cand in ("node", "node.exe"):
            path = shutil.which(cand)
            if path:
                p = run([path, "-v"], capture=True, check=False)
                if p.returncode == 0:
                    return (p.stdout or "").strip()
    except Exception:
        return None
    return None

def npm_version():
    try:
        cands = ["npm", "npm.cmd"] if os.name == "nt" else ["npm"]
        for cand in cands:
            path = shutil.which(cand)
            if path:
                p = run([path, "-v"], capture=True, check=False)
                if p.returncode == 0:
                    return (p.stdout or "").strip()
    except Exception:
        return None
    return None

def ensure_node_windows():
    if has_command("npm") and has_command("node"):
        return True

    if not has_command("nvm"):
        print("🧰 Instalando nvm-windows (requiere permisos de administrador)...")
        try:
            with urllib.request.urlopen("https://api.github.com/repos/coreybutler/nvm-windows/releases/latest", timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            asset = None
            for a in data.get("assets", []):
                if a.get("name", "").lower().endswith("nvm-setup.exe"):
                    asset = a["browser_download_url"]
                    break
            if not asset:
                raise RuntimeError("No se encontró nvm-setup.exe en la release.")
            fd, temp_path = tempfile.mkstemp(suffix="-nvm-setup.exe"); os.close(fd)
            urllib.request.urlretrieve(asset, temp_path)
            print("📥 Ejecutando instalador nvm-setup.exe (silencioso)...")
            run([temp_path, "/S"], check=False)
            time.sleep(3)
        except Exception as e:
            print(f"❌ No se pudo instalar nvm automáticamente: {e}")
            print("   Descarga manual: https://github.com/coreybutler/nvm-windows/releases/latest")
            return False

    try:
        run(["nvm", "install", NODE_VERSION], check=False)
        run(["nvm", "use", NODE_VERSION], check=False)
    except Exception as e:
        print(f"⚠️  No se pudo usar nvm para instalar/activar Node: {e}")

    refresh_windows_nvm_env()
    ok = has_command("node") and has_command("npm")
    if not ok:
        print("⚠️  Node/npm podrían requerir una nueva consola para refrescar PATH.")
    return ok

def ensure_node_unix():
    if has_command("npm") and has_command("node"):
        return True

    if not os.path.exists(str(Path.home() / ".nvm")) and not has_command("nvm"):
        print("🧰 Instalando nvm (macOS/Linux)...")
        try:
            run(["bash", "-lc", "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"], check=True)
        except Exception as e:
            print(f"❌ No se pudo instalar nvm automáticamente: {e}")
            return False

    try:
        run(["bash", "-lc", f"source ~/.nvm/nvm.sh && nvm install {NODE_VERSION} && nvm alias default {NODE_VERSION} && nvm use {NODE_VERSION}"], check=False)
    except Exception as e:
        print(f"⚠️  No se pudo instalar/usar Node con nvm: {e}")

    ok = has_command("node") and has_command("npm")
    if not ok:
        print("⚠️  Puede que necesites abrir una nueva terminal para que nvm actualice tu PATH.")
    return ok

def ensure_node_tooling():
    print("🔎 Verificando Node/npm...")
    if has_command("npm") and has_command("node"):
        print(f"✅ Node {node_version() or 'N/A'} / npm {npm_version() or 'N/A'}")
        return True

    system = platform.system().lower()
    ok = ensure_node_windows() if "windows" in system else ensure_node_unix()

    print(f"✅ Node {node_version() or 'N/A'} / npm {npm_version() or 'N/A'}")
    if not ok:
        print("❌ No fue posible preparar Node/npm automáticamente.")
    return ok

def npm_exec():
    return shutil.which("npm") or shutil.which("npm.cmd") or "npm"

def ensure_frontend_deps():
    if not (FRONTEND / "package.json").exists():
        print("ℹ️  No se encontró frontend/package.json. Se omitirá el frontend.")
        return False

    if not ensure_node_tooling():
        print("❌ npm no está disponible. Instala Node.js/NVM manualmente.")
        return False

    if not (FRONTEND / "node_modules").exists():
        print("📦 Instalando dependencias de frontend (npm install)...")
        try:
            run([npm_exec(), "install"], cwd=str(FRONTEND))
        except subprocess.CalledProcessError as e:
            print("❌ Falló 'npm install'.")
            print(e)
            return False
        except FileNotFoundError:
            print("❌ npm no se encontró en PATH. Abre una consola nueva y reintenta.")
            return False

    return True

# ------------- comandos -------------
def cmd_setup():
    os.chdir(ROOT)
    print("🚀 Setup proyecto (Pacientes)")

    py = ensure_backend_venv_and_deps()
    print("🧱 Django: makemigrations...")
    run_manage(py, "makemigrations", "--noinput", check=False)
    print("🧱 Django: migrate...")
    run_manage(py, "migrate", "--noinput")

    ok_fe = ensure_frontend_deps()
    print("\n✅ Setup completo.")
    print("   Backend deps: OK")
    print(f"   Frontend deps: {'OK' if ok_fe else 'NO (revisar mensajes)'}")

def cmd_backend():
    os.chdir(ROOT)
    py = ensure_backend_venv_and_deps()
    run_manage(py, "migrate", "--noinput")
    print(f"▶️  Iniciando Django en http://127.0.0.1:{BACKEND_PORT}")
    run_manage(py, "runserver", f"127.0.0.1:{BACKEND_PORT}")

def cmd_frontend():
    os.chdir(ROOT)
    ok = ensure_frontend_deps()
    if not ok:
        sys.exit(1)
    print(f"▶️  Iniciando Vite en http://localhost:{FRONTEND_PORT}")
    run([npm_exec(), "run", "dev", "--", "--port", str(FRONTEND_PORT)], cwd=str(FRONTEND))

def cmd_test():
    os.chdir(ROOT)
    py = ensure_backend_venv_and_deps()
    print("🧪 Ejecutando tests Django...")
    run_manage(py, "test")

def cmd_dev():
    os.chdir(ROOT)
    print("🚀 Levantando backend + frontend (2 ventanas)...")

    py = ensure_backend_venv_and_deps()
    run_manage(py, "makemigrations", "--noinput", check=False)
    run_manage(py, "migrate", "--noinput")

    ok_fe = ensure_frontend_deps()

    print("▶️  Iniciando Django en nueva ventana...")
    open_new_console_windows(
        "Django",
        [str(py), "manage.py", "runserver", f"127.0.0.1:{BACKEND_PORT}"],
        cwd=str(BACKEND)
    )

    if ok_fe:
        print("▶️  Iniciando Vite en nueva ventana...")
        open_new_console_windows(
            "Vite",
            [npm_exec(), "run", "dev", "--", "--port", str(FRONTEND_PORT)],
            cwd=str(FRONTEND)
        )

    open_url = os.environ.get("APP_OPEN_URL")
    if not open_url:
        open_url = f"http://localhost:{FRONTEND_PORT}/" if ok_fe else f"http://127.0.0.1:{BACKEND_PORT}/admin/"

    try:
        webbrowser.open(open_url, new=2)
    except Exception:
        pass

    print("\n✅ Todo lanzado.")
    print(f"   • Backend:  http://127.0.0.1:{BACKEND_PORT}")
    if ok_fe:
        print(f"   • Frontend: http://localhost:{FRONTEND_PORT}")
    else:
        print("   • Frontend: deps no instaladas (ver mensajes)")
    print(f"   • Página inicial: {open_url}")
    print("ℹ️ Cierra las consolas abiertas para detener servicios.\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", nargs="?", default="dev",
                        choices=["dev", "setup", "backend", "frontend", "test"],
                        help="Comando a ejecutar (default: dev)")
    args = parser.parse_args()

    if args.command == "setup":
        cmd_setup()
    elif args.command == "backend":
        cmd_backend()
    elif args.command == "frontend":
        cmd_frontend()
    elif args.command == "test":
        cmd_test()
    else:
        cmd_dev()

if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print("\n❌ Error ejecutando un comando:")
        print("   ", e)
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        print("\n⏹️  Interrumpido por el usuario.")