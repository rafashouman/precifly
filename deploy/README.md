# Deploy da Pricefly

## Producao atual e atualizacoes automaticas

O site esta instalado em `https://pricefly.shop`, NGINX com Let's Encrypt,
MongoDB local e `pricefly.service` executando como `deploy` na porta `127.0.0.1:3010`.
O checkout de origem fica em `/srv/apps/pricefly`; o ambiente permanece em
`/srv/apps/pricefly/.env.production` (root:deploy, 640).

O workflow `.github/workflows/deploy.yml` valida testes, lint e TypeScript em
cada push para `main`. Depois conecta por SSH como `deploy` e executa somente
`sudo -n /usr/local/bin/deploy-pricefly COMMIT_SHA`.

No GitHub, em Settings > Secrets and variables > Actions, configure:

| Secret | Valor |
| --- | --- |
| `VPS_HOST` | `187.41.103.39` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Chave privada de deploy ja autorizada para o usuario deploy |
| `VPS_KNOWN_HOSTS` | Chave publica SSH do servidor com hostname 187.41.103.39, conferida no VPS |

Os valores dos secrets ja cadastrados nao podem ser exibidos pelo GitHub.
Neste computador, a chave `C:\Users\shoum\.ssh\feedsync_github_actions` corresponde
a uma chave ja autorizada no VPS. Para copiar a chave privada no PowerShell,
sem imprimi-la no terminal:

```powershell
Get-Content "$env:USERPROFILE\.ssh\feedsync_github_actions" -Raw | Set-Clipboard
```

Cole o conteudo completo, incluindo BEGIN/END OPENSSH PRIVATE KEY, no secret
`VPS_SSH_KEY` deste repositorio. Nao use o arquivo `.pub` e nao envie a chave por chat.
Para copiar apenas a entrada ED25519 do servidor ja conferida no known_hosts local:

```powershell
$entry = @(ssh-keygen -F 187.41.103.39 -f "$env:USERPROFILE\.ssh\known_hosts") |
  Where-Object { $_ -match '^\S+\s+ssh-ed25519\s+' }
if (@($entry).Count -ne 1) { throw 'Entrada ED25519 ausente ou ambigua; confira a chave no VPS.' }
$entry | Set-Clipboard
```

Cole o resultado em `VPS_KNOWN_HOSTS`. Essa chave publica identifica o servidor;
a chave privada anterior identifica o usuario de deploy. Sao valores diferentes.

Nenhuma variavel MongoDB, senha SMTP ou credencial de administrador vai para o GitHub.

O script `deploy-pricefly.sh` deve ser instalado como root:root, 755 em
`/usr/local/bin/deploy-pricefly`. Nao execute a copia mutavel do checkout via sudo.
O sudoers permite ao usuario `deploy` apenas esse executavel para esta aplicacao.
O drop-in `/etc/systemd/system/pricefly.service.d/release.conf` usa o conteudo
de `pricefly-release.conf`. O link `/srv/apps/pricefly-current` aponta inicialmente
para `/srv/apps/pricefly` e depois para a release ativa.

Cada build usa uma pasta nova em `/srv/apps/pricefly-releases`, sem alterar o
site em execucao. A ativacao troca o link e reinicia o servico. Se o servico,
a home, a API de produtos ou o HTTPS falharem, a release anterior e restaurada.
O banco, os produtos e os administradores nao sao recriados a cada deploy.
As releases ficam disponiveis para rollback; acompanhe o disco e remova manualmente
apenas releases antigas que nao sejam a atual nem a anterior.

Para publicar as alteracoes locais, revise os arquivos e execute na pasta do projeto:

```powershell
git add CAMINHOS_DOS_ARQUIVOS_ALTERADOS
git commit -m "Descreva a alteracao"
git push origin main
```

Acompanhe em https://github.com/rafashouman/precifly/actions.
Tambem e possivel executar manualmente em Actions > Deploy Pricefly > Run workflow.
No VPS, consulte `journalctl -u pricefly -n 80 --no-pager` e
`readlink -f /srv/apps/pricefly-current`. Mudancas futuras no script privilegiado
exigem revisao e reinstalacao manual da copia em `/usr/local/bin`.

## Instalacao inicial alternativa

As instrucoes abaixo e `setup-initial.sh` sao para um servidor novo, usando uma
conta dedicada `pricefly`. Nao execute novamente no VPS atual, que usa `deploy`.

Destino: `pricefly.shop`, repositório `https://github.com/rafashouman/precifly.git`, branch `main`, checkout `/srv/apps/pricefly`, usuário de serviço `pricefly`, MongoDB local `priceflydb`.

Estes arquivos estão preparados; **ainda não foram executados no VPS**. Antes de executar, confira a estrutura real do servidor, o DNS IPv4/IPv6, os serviços existentes e o espaço disponível. O script recusa substituir uma unidade ou um bloco NGINX existente da Pricefly. Não altera sites de outros domínios.

## Preparar o servidor

Os pré-requisitos são Node.js 20.19+ em `/usr/bin/node`, npm, Git, MongoDB em execução, NGINX, Python 3 e Certbot com o plugin NGINX. Use os pacotes oficiais do Ubuntu para componentes ausentes, sem reinstalar os serviços existentes.

Com acesso autorizado ao GitHub, clone o repositório em uma pasta temporária vazia, ou disponibilize a pasta `deploy` no servidor. Não coloque tokens na URL do repositório. Depois execute como root:

```bash
sudo bash deploy/setup-initial.sh
```

Se o repositório for privado, use um acesso de leitura já autorizado no servidor. `REPOSITORY` pode indicar a URL SSH apropriada. A primeira cópia é feita pela conta que executa o script; atualizações de um checkout existente usam o usuário `pricefly`, que também precisa ter acesso de leitura autorizado. O script não cadastra chaves nem cria permissões no GitHub.

Na primeira execução, se não existir `.env.production`, ele cria o modelo no checkout e para para preenchimento. Copie a configuração real do aplicativo, sem expor valores no terminal, e defina:

```dotenv
MONGODB_URI="mongodb://127.0.0.1:27017/priceflydb"
APP_ORIGIN="https://pricefly.shop"
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="seu-email"
SMTP_PASSWORD="senha-da-caixa"
SMTP_FROM="Pricefly <seu-email>"
```

Execute novamente o mesmo script. Ele seleciona uma porta livre entre 3010 e 3099, instala dependências, importa os produtos sem duplicar, faz o build, cria `pricefly.service` e configura o proxy HTTP. O Next.js escuta somente em `127.0.0.1`; a porta do MongoDB não é exposta. NGINX recebe host e protocolo originais, necessários para o login e os formulários.

O script é destinado à instalação inicial. Após existir o serviço, novos deploys precisam de um procedimento de atualização que preserve o build em execução. Não execute `git reset --hard`, apague pastas nem substitua configurações existentes para contornar uma recusa do script.

## SSL

Confirme que o A de `pricefly.shop` aponta para o IPv4 do VPS. Se houver AAAA, ele também precisa apontar para esse VPS e aceitar HTTP/HTTPS. Confira CAA se a emissão falhar. O domínio `www` só deve entrar no certificado depois de confirmar que também resolve corretamente.

```bash
sudo certbot --nginx --redirect -d pricefly.shop
```

O Certbot usa a conta existente ou apresenta o cadastro e os termos ao operador. Não há aceitação automática de novos termos neste script. Depois confirme a renovação agendada (`certbot.timer` ou a unidade correspondente da instalação) e faça um teste:

```bash
sudo certbot renew --dry-run
curl -I http://pricefly.shop
curl -I https://pricefly.shop
curl --fail https://pricefly.shop/api/products?limit=1
sudo systemctl status pricefly --no-pager
```

O resultado esperado é HTTP redirecionando para HTTPS, home e API respondendo, certificado válido e `pricefly.service` ativo com reinício em falhas.

## Administração e logs

As contas locais do computador não são copiadas pelo Git. Se o banco do servidor não possuir administrador, crie um no terminal com `NODE_ENV=production npm run admin:create` executado como `pricefly`, ou forneça as credenciais iniciais por ambiente de forma privada. O comando imprime o local do arquivo de credenciais, não a senha. Se já houver administrador, preserve-o.

```bash
sudo journalctl -u pricefly -n 80 --no-pager
sudo systemctl restart pricefly
sudo systemctl is-active pricefly nginx mongod
sudo tail -n 50 /var/log/nginx/pricefly.error.log
```
