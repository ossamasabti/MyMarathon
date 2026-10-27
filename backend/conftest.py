import os

# Tests must run without a local .env file.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key")
