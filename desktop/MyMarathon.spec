# PyInstaller spec for MyMarathon.exe (one file, no console). Built by build.ps1.
# The .exe is a native window on the online app: no backend inside.
from PyInstaller.utils.hooks import collect_data_files

ROOT = ".."

a = Analysis(
    ["launcher.py"],
    datas=collect_data_files("webview") + [(f"{ROOT}/app/assets/images/logo-small.png", ".")],
    excludes=["django", "rest_framework", "psycopg", "psycopg_binary", "pytest", "tkinter"],
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    name="MyMarathon",
    icon=f"{ROOT}/app/assets/images/icon.png",
    console=False,
    upx=False,
)
