#!/usr/bin/env bash
# Install as root: /usr/local/bin/deploy-pricefly (root:root, 0755).
# Never execute a mutable repository script through sudo.
set -Eeuo pipefail
umask 027
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
APP=/srv/apps/pricefly
RELEASES=/srv/apps/pricefly-releases
CURRENT=/srv/apps/pricefly-current
[[ $EUID -eq 0 ]] || { echo 'Execute via sudo.' >&2; exit 1; }
[[ $# -le 1 ]] || exit 2
requested=${1:-}
[[ -z "$requested" || "$requested" =~ ^[0-9a-f]{40}$ ]] || exit 2
exec 9>/var/lock/pricefly-deploy.lock
flock -n 9 || { echo 'Outro deploy Pricefly esta em andamento.' >&2; exit 1; }
[[ -f "$APP/.env.production" && -L "$CURRENT" ]] || { echo 'Configuracao inicial ausente.' >&2; exit 1; }
previous=$(readlink -f "$CURRENT")
as_deploy() { runuser -u deploy -- "$@"; }
as_deploy git -C "$APP" fetch --no-tags origin main
head=$(as_deploy git -C "$APP" rev-parse origin/main)
sha=${requested:-$head}
as_deploy git -C "$APP" merge-base --is-ancestor "$sha" "$head" || { echo 'Commit fora da main.' >&2; exit 1; }
[[ $(df -Pk /srv/apps | awk 'NR==2 {print $4}') -gt 2500000 ]] || { echo 'Libere pelo menos 2.5 GB para o build.' >&2; exit 1; }
install -d -o root -g deploy -m 750 "$RELEASES"
release=$(mktemp -d "$RELEASES/$(date -u +%Y%m%dT%H%M%S)-${sha:0:12}-XXXXXX")
chown deploy:deploy "$release"
as_deploy bash -o pipefail -c 'git -C "$1" archive "$2" | tar -x -C "$3"' -- "$APP" "$sha" "$release"
# A commit cannot supply a higher-priority environment file.
if find "$release" -maxdepth 1 -name '.env*' ! -name '.env.example' -print -quit | grep -q .; then
  echo 'Commit contem arquivo de ambiente; deploy recusado.' >&2; exit 1
fi
ln -s "$APP/.env.production" "$release/.env.production"
printf '%s\n' "$sha" > "$release/.deploy-sha"
as_deploy bash -c 'cd "$1" && npm ci --include=dev --no-audit --no-fund && npm test && npm run lint && NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 npm run build' -- "$release"
switch_to() {
  ln -s "$1" "$CURRENT.next"
  mv -Tf "$CURRENT.next" "$CURRENT"
}
rollback() {
  trap - ERR INT TERM
  echo 'Falha na ativacao. Restaurando versao anterior.' >&2
  switch_to "$previous"
  systemctl restart pricefly.service
  exit 1
}
trap rollback ERR INT TERM
switch_to "$release"
systemctl restart pricefly.service
ready=0
for attempt in $(seq 1 30); do
  if systemctl is-active --quiet pricefly.service &&
     curl --fail --silent --max-time 5 http://127.0.0.1:3010/ -o /dev/null &&
     curl --fail --silent --max-time 5 'http://127.0.0.1:3010/api/products?limit=1' -o /dev/null; then
    ready=1; break
  fi
  sleep 2
done
[[ $ready == 1 ]]
curl --fail --silent --show-error --max-time 15 --resolve pricefly.shop:443:127.0.0.1 https://pricefly.shop/ -o /dev/null
trap - ERR INT TERM
printf 'Deploy concluido: %s\nRelease: %s\nAnterior: %s\n' "$sha" "$release" "$previous"
# Retain releases for explicit rollback; no database migrations or admin resets here.
