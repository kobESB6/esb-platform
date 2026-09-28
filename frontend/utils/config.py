# One place for the backend address.
# On the Mac, nothing is set, so it uses localhost.
# On the live host, set ESB_API_URL in the host's settings.
import os

API_BASE = os.getenv("ESB_API_URL", "http://localhost:3000").rstrip("/")