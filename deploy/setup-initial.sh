#!/usr/bin/env bash
# Initial deployment only. Run on the VPS as root after reviewing the preflight.
set -Eeuo pipefail
umask 027

APP=/srv/apps/pricefly
REPOSITORY=${REPOSITORY:-https://github.com/rafashouman/precifly.git}
BRANCH=${BRANCH:-main}
DOMAIN=pricefly.shop
SELF_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || fail 'Execute com sudo bash deploy/setup-initial.sh no VPS.'
for command in git nginx systemctl runuser curl ss getent install sed python3; do
    command -v "$command" >/dev/null || fail "Instale o pré-requisito ausente: $command"
done
[[ -x /usr/bin/node ]] || fail 'Node.js precisa estar instalado em /usr/bin/node (20.19+).'
/usr/bin/node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<20||(a===20&&b<19))process.exit(1)' || fail 'Atualize o Node.js para 20.19 ou superior.'
nginx -t
systemctl is-active --quiet mongod || fail 'Verifique o MongoDB local antes de continuar.'
! systemctl is-active --quiet pricefly.service || fail 'A Pricefly já está em execução. Este script é apenas para a instalação inicial.'
[[ ! -e /etc/systemd/system/pricefly.service ]] || fail 'Já existe uma unidade pricefly.service; revise-a antes de substituir.'
[[ ! -e /etc/nginx/sites-available/pricefly && ! -e /etc/nginx/sites-enabled/pricefly ]] || fail 'Já existe configuração NGINX da Pricefly; revise antes de substituir.'
if nginx -T 2>&1 | python3 -c 'import re,sys; s=sys.stdin.read(); sys.exit(0 if any("pricefly.shop" in names.split() for names in re.findall(r"server_name\s+([^;]+);",s)) else 1)'; then
    fail 'O NGINX já possui um bloco para pricefly.shop; nada foi sobrescrito.'
fi

printf '\nPré-verificação do servidor:\n'
df -h /srv
free -m
ss -ltn
printf '\nDNS IPv4 de %s:\n' "$DOMAIN"
getent ahostsv4 "$DOMAIN" || fail 'O domínio ainda não resolve neste servidor.'

# Existing users are reused only when the expected system account is present.
if getent passwd pricefly >/dev/null; then
    [[ $(getent passwd pricefly | cut -d: -f6) == "$APP" ]] || fail 'Usuário pricefly existente tem outro diretório home.'
else
    useradd --system --user-group --home-dir "$APP" --shell /usr/sbin/nologin pricefly
fi
install -d -o pricefly -g pricefly -m 750 "$APP"
if [[ -d "$APP/.git" ]]; then
    actual_repo=$(runuser -u pricefly -- git -C "$APP" remote get-url origin)
    [[ "$actual_repo" == "$REPOSITORY" ]] || fail 'A pasta existente pertence a outro repositório.'
    [[ -z $(runuser -u pricefly -- git -C "$APP" status --porcelain --untracked-files=no) ]] || fail 'Há alterações locais no checkout do servidor.'
    runuser -u pricefly -- git -C "$APP" pull --ff-only origin "$BRANCH"
elif [[ -z $(find "$APP" -mindepth 1 -maxdepth 1 -print -quit) ]]; then
    git clone --branch "$BRANCH" "$REPOSITORY" "$APP"
else
    fail 'A pasta de destino já tem arquivos e não é um checkout Git; nada foi excluído.'
fi
chown -R pricefly:pricefly "$APP"

if [[ ! -f "$APP/.env.production" ]]; then
    install -m 640 -o root -g pricefly "$APP/.env.example" "$APP/.env.production"
    printf '\nPreencha %s/.env.production, incluindo APP_ORIGIN=https://pricefly.shop e os dados SMTP. Depois execute novamente este script.\n' "$APP"
    exit 0
fi
chown root:pricefly "$APP/.env.production"
chmod 640 "$APP/.env.production"
[[ ! -f "$APP/.env.local" ]] || fail 'Remova ou renomeie manualmente .env.local no servidor: ele teria prioridade sobre .env.production.'

PORT=''
for candidate in $(seq 3010 3099); do
    if [[ -z $(ss -H -ltn "sport = :$candidate") ]]; then PORT=$candidate; break; fi
done
[[ -n "$PORT" ]] || fail 'Não há porta livre entre 3010 e 3099.'
printf '\nInstalação e build na porta local %s.\n' "$PORT"
runuser -u pricefly -- bash -c 'cd /srv/apps/pricefly && npm ci --include=dev --no-audit --no-fund'
runuser -u pricefly -- env NODE_ENV=production /usr/bin/node - "$APP" <<'NODE'
const root=process.argv[2];
require(root+'/node_modules/@next/env').loadEnvConfig(root);
const required=['MONGODB_URI','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM'];
const missing=required.filter(key=>!process.env[key]);
if(process.env.APP_ORIGIN!=='https://pricefly.shop') missing.push('APP_ORIGIN=https://pricefly.shop');
if(missing.length){console.error('Ajuste as variáveis de produção:',missing.join(', '));process.exit(1);}
NODE
runuser -u pricefly -- bash -c 'cd /srv/apps/pricefly && NODE_ENV=production npm run db:seed'
runuser -u pricefly -- bash -c 'cd /srv/apps/pricefly && NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 npm run build'

# Append the selected port to the unit, rather than modifying the secret env file.
unit=$(mktemp)
sed "/^EnvironmentFile=/a Environment=PORT=$PORT" "$SELF_DIR/pricefly.service" > "$unit"
install -m 644 "$unit" /etc/systemd/system/pricefly.service
rm -f -- "$unit"
systemctl daemon-reload
systemctl enable --now pricefly.service
ready=0
for attempt in $(seq 1 20); do
    if curl --silent --fail "http://127.0.0.1:$PORT/" -o /dev/null; then ready=1; break; fi
    sleep 1
done
[[ $ready == 1 ]] || fail 'O serviço não respondeu. Consulte journalctl -u pricefly -n 80 --no-pager.'
curl --silent --fail "http://127.0.0.1:$PORT/api/products?limit=1" -o /dev/null || fail 'A API de produtos não respondeu corretamente.'

sed "s/__PRICEFLY_PORT__/$PORT/g" "$SELF_DIR/nginx.conf.template" > /etc/nginx/sites-available/pricefly
ln -s /etc/nginx/sites-available/pricefly /etc/nginx/sites-enabled/pricefly
if ! nginx -t; then
    unlink /etc/nginx/sites-enabled/pricefly
    fail 'A configuração NGINX não passou na validação e não foi ativada.'
fi
install -d -m 755 /var/www/letsencrypt/.well-known/acme-challenge
systemctl reload nginx
printf '\nServiço e HTTP configurados. Próximas etapas no terminal:\n'
printf '1. Confira o DNS de pricefly.shop e os registros AAAA, se houver.\n'
printf '2. Execute: sudo certbot --nginx --redirect -d pricefly.shop\n'
printf '3. Execute: curl -I https://pricefly.shop && systemctl is-active pricefly\n'
printf '4. Crie o acesso inicial: cd /srv/apps/pricefly && sudo -u pricefly env NODE_ENV=production npm run admin:create\n'
printf 'Não redefina um administrador que já existir no banco.\n'
