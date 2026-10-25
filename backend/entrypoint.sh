#!/bin/sh
set -eu

echo "[entrypoint] applying database migrations"
python manage.py migrate --noinput

echo "[entrypoint] collecting static files"
python manage.py collectstatic --noinput

echo "[entrypoint] starting gunicorn"
exec gunicorn config.wsgi:application --config /app/gunicorn.conf.py
