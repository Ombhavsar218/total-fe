#!/bin/sh
set -eu

mkdir -p /backups
retention="${BACKUP_RETENTION_DAYS:-14}"
interval="${BACKUP_INTERVAL_SECONDS:-86400}"

echo "[backup] starting (retention=${retention}d, interval=${interval}s)"
echo "[backup] database=${PGDATABASE} host=${PGHOST}"

while true; do
  timestamp="$(date -u +%Y%m%d-%H%M%S)"
  target="/backups/totalstock-${timestamp}.dump"

  echo "[backup] dumping ${PGDATABASE} to ${target}"
  if pg_dump --format=custom --no-owner --no-privileges --file="${target}"; then
    chmod 600 "${target}"
    echo "[backup] completed ${target}"
  else
    echo "[backup] failed; removing partial file" >&2
    rm -f "${target}"
  fi

  find /backups -type f -name 'totalstock-*.dump' -mtime +"${retention}" -delete
  sleep "${interval}"
done
