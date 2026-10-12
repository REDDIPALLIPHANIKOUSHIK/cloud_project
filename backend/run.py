import os
from backend.app import create_app
from backend.app.config import config

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", config.PORT))
    print(f"Starting Healthcare Platform API Backend on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=config.DEBUG)
