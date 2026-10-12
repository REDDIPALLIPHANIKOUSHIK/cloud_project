import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app import create_app
from backend.app.config import config

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", config.PORT))
    print(f"Starting Healthcare Platform API Backend on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=config.DEBUG)
