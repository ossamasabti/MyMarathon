# PyInstaller spec for MyMarathon.exe (one file, no console). Built by build.ps1.
import os
import sys

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

ROOT = ".."
# collect_submodules imports the backend packages and Django needs settings to import models.
sys.path.insert(0, os.path.abspath(f"{ROOT}/backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("SECRET_KEY", "build-only")
BACKEND_APPS = ["config", "core", "accounts", "goals"]

# Loaded by name at runtime (password hasher, WSGI server, middleware), invisible to the import analysis.
hiddenimports = [
    "waitress",
    "whitenoise.middleware",
    "argon2",
    "argon2._password_hasher",
    "argon2.low_level",
    "_argon2_cffi_bindings",
]
for package in BACKEND_APPS + ["django", "rest_framework", "rest_framework_simplejwt", "corsheaders", "django_filters"]:
    hiddenimports += collect_submodules(package, filter=lambda name: ".tests" not in name)

datas = [(f"{ROOT}/app/dist-desktop", "frontend")]
# Templates, locales (French messages) and admin static files of the libraries.
for package in ["django", "rest_framework", "rest_framework_simplejwt", "django_filters", "webview"]:
    datas += collect_data_files(package)

a = Analysis(
    ["launcher.py"],
    pathex=[f"{ROOT}/backend"],
    hiddenimports=hiddenimports,
    datas=datas,
    excludes=["psycopg", "psycopg_binary", "pytest", "tkinter"],
    # A simplejwt migration resolves its own __file__: keep real .py sources next to the archive.
    module_collection_mode={"rest_framework_simplejwt": "pyz+py"},
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
