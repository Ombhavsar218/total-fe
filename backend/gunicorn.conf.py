"""Gunicorn configuration for the TotalStock API container."""
import os

# Render (and most PaaS providers) inject PORT at runtime. Docker Compose and
# local containers fall back to the API's default port.
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "gthread")
workers = int(os.getenv("GUNICORN_WORKERS", "3"))
threads = int(os.getenv("GUNICORN_THREADS", "2"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 100

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")

# Caddy (Docker Compose) or Render's edge proxy terminates TLS in front of
# Gunicorn. The backend port is never published directly on the host.
forwarded_allow_ips = "*"
