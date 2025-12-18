import base64
import os
import platform
import shutil
import subprocess
import tempfile
from typing import Optional, List

try:  # Optional dependency on Windows
    import win32api  # type: ignore
    import win32print  # type: ignore
except Exception:  # pragma: no cover
    win32api = None
    win32print = None


class PrintError(Exception):
    pass


def ensure_bytes_from_payload(data: dict) -> bytes:
    if "pdfBase64" in data and data["pdfBase64"]:
        try:
            return base64.b64decode(data["pdfBase64"], validate=True)
        except Exception as e:
            raise PrintError(f"Invalid pdfBase64: {e}")
    if "pdfUrl" in data and data["pdfUrl"]:
        import requests
        url = data["pdfUrl"]
        headers = data.get("headers") or {}
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            return resp.content
        except Exception as e:
            raise PrintError(f"Download pdfUrl failed: {e}")
    raise PrintError("Missing pdfBase64 or pdfUrl")


def print_pdf_bytes(pdf: bytes, printer: Optional[str] = None, sumatra_path: Optional[str] = None) -> None:
    if not pdf or pdf[:4] != b"%PDF":
        idx = pdf.find(b"%PDF") if pdf else -1
        if idx > -1:
            pdf = pdf[idx:]
        else:
            raise PrintError("Not a PDF stream")

    with tempfile.NamedTemporaryFile(prefix="weigh-agent-", suffix=".pdf", delete=False) as f:
        path = f.name
        f.write(pdf)
    try:
        system = platform.system().lower()
        if system == "windows":
            # Prefer SumatraPDF CLI if provided for robust headless printing
            if sumatra_path and os.path.isfile(sumatra_path):
                _print_pdf_sumatra(sumatra_path, path, printer)
            else:
                _print_pdf_windows(path)
        else:
            _print_pdf_posix(path, printer)
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass


def _print_pdf_sumatra(sumatra_path: str, path: str, printer: Optional[str]) -> None:
    exe = sumatra_path
    if not os.path.isfile(exe):
        raise PrintError("SumatraPDF not found at configured path")
    # Sumatra CLI flags: -print-to "PrinterName" -silent file.pdf
    cmd = [exe]
    if printer:
        cmd += ["-print-to", printer]
    cmd += ["-silent", path]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        raise PrintError(f"Sumatra print failed: {e.stderr.decode('utf-8', errors='ignore')}")


def _print_pdf_windows(path: str) -> None:
    # Prefer ShellExecute 'print' verb
    if win32api is not None:
        try:
            win32api.ShellExecute(0, "print", path, None, ".", 0)
            return
        except Exception:
            pass
    # Fallback to os.startfile
    try:
        os.startfile(path, "print")  # type: ignore[attr-defined]
        return
    except Exception:
        pass
    raise PrintError("Windows printing failed: install a PDF reader or configure sumatraPath in agent config.")


def _print_pdf_posix(path: str, printer: Optional[str]) -> None:
    cmd = None
    # Prefer lp if available
    if shutil.which("lp"):
        cmd = ["lp"]
        if printer:
            cmd += ["-d", printer]
        cmd += [path]
    elif shutil.which("lpr"):
        cmd = ["lpr"]
        if printer:
            cmd += ["-P", printer]
        cmd += [path]
    else:
        raise PrintError("Neither lp nor lpr found. Install CUPS (lp/lpr).")
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        raise PrintError(f"Print command failed: {e.stderr.decode('utf-8', errors='ignore')}")


def list_printers() -> List[str]:
    system = platform.system().lower()
    printers: List[str] = []
    try:
        if system == "windows" and win32print is not None:
            flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            for p in win32print.EnumPrinters(flags):
                name = p[2]
                if isinstance(name, bytes):
                    name = name.decode("utf-8", errors="ignore")
                printers.append(str(name))
        else:
            if shutil.which("lpstat"):
                out = subprocess.run(["lpstat", "-a"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
                text = out.stdout.decode("utf-8", errors="ignore")
                for line in text.splitlines():
                    parts = line.split()
                    if parts:
                        printers.append(parts[0])
            elif shutil.which("lpinfo"):
                out = subprocess.run(["lpinfo", "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
                text = out.stdout.decode("utf-8", errors="ignore")
                for line in text.splitlines():
                    pass
    except Exception:
        pass
    uniq: List[str] = []
    for n in printers:
        if n and n not in uniq:
            uniq.append(n)
    return uniq


def get_default_printer() -> Optional[str]:
    system = platform.system().lower()
    try:
        if system == "windows" and win32print is not None:
            return win32print.GetDefaultPrinter()
        else:
            if shutil.which("lpstat"):
                out = subprocess.run(["lpstat", "-d"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
                text = out.stdout.decode("utf-8", errors="ignore")
                if ":" in text:
                    return text.split(":", 1)[1].strip()
    except Exception:
        pass
    return None
