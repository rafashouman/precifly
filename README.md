# Pricefly

Vitrine e consultoria em Next.js 16, com MongoDB local. Produtos, leads, administradores e sessões ficam no banco indicado por `MONGODB_URI`. Nenhum acesso ao banco é feito pelo navegador.

## Primeiro acesso local

Requer Node.js 20.19 ou superior e MongoDB em execução.

```powershell
npm install
```

Configure `.env.local` (já configurado no ambiente deste projeto):

```dotenv
MONGODB_URI="mongodb://127.0.0.1:27017/priceflydb"
```

Execute, na pasta do projeto:

```powershell
npm run db:seed
npm run admin:create
npm run dev
```

Abra `http://localhost:3000` e `http://localhost:3000/admin`.

O comando `admin:create` usa `admin@pricefly.local` por padrão e gera uma senha aleatória, salva em `.admin-credentials.local`. Esse arquivo é ignorado pelo Git e não é servido pelo site. A senha é armazenada no MongoDB com scrypt e um salt individual. Não há senha padrão no código e não há cadastro público de administradores.

Para definir as próprias credenciais, configure `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente antes de executar `npm run admin:create`. A senha deve ter pelo menos 12 caracteres. A redefinição exige `npm run admin:create -- --reset-password` e invalida as sessões daquele administrador.

## Cadastro inicial

`npm run db:seed` importa `data/products.js` e cria os índices. Pode ser executado novamente: insere apenas produtos ainda não importados e preserva edições e visibilidade de registros existentes. Não exclui produtos nem leads. Os links completos de afiliado, preços, imagens, avaliações, parcelamentos e selos são preservados. A categoria `...` do kit de banho pet é corrigida para `Pet Shop` na importação.

O arquivo inicial contém os produtos. Leads e usuários antigos do Firebase não fazem parte dele; uma eventual importação desses dados requer exportá-los separadamente. Senhas do Firebase não são reutilizadas.

## Painel

- Login e saída com sessão de 12 horas, cookie HttpOnly e Secure em produção.
- Cadastro, listagem paginada e edição de produtos e dados de parceiros.
- Ativar/ocultar ofertas e escolher os destaques da vitrine.
- Selos e avaliações opcionais, sem avaliações ou frete grátis inventados para novos produtos.
- Cadastro manual e listagem paginada de leads, além dos contatos recebidos pelo formulário público.
- Status: Novo, Em contato, Concluído e Arquivado.
- APIs administrativas verificam a sessão no servidor; a consulta pública expõe apenas os produtos ativos.

## Servidor Ubuntu

Configure as variáveis no serviço que executa o Next.js, mantendo o MongoDB acessível apenas localmente:

```dotenv
MONGODB_URI="mongodb://127.0.0.1:27017/priceflydb"
NODE_ENV="production"
APP_ORIGIN="https://seu-dominio.com.br"
```

O driver utiliza o nome do banco presente na URI. Se o MongoDB exigir autenticação, use a URI correspondente no ambiente do servidor.

No primeiro deploy, disponibilize a mesma URI para os comandos e execute:

```bash
npm ci
npm run db:seed
npm run admin:create
npm run build
npm start
```

Os comandos também leem `.env.local` quando esse arquivo existe. Em produção, use HTTPS para o login: os cookies de sessão são Secure. Defina APP_ORIGIN com o domínio público real e configure o proxy para encaminhar o host e protocolo originais; operações de escrita verificam a origem da solicitação.

O build atual carrega a fonte Geist do Google Fonts e precisa de acesso a esse serviço. Configure o processo com reinício automático e mantenha backups de `priceflydb` por `mongodump`; a restauração pode ser feita por `mongorestore` em um banco de teste antes de substituir dados reais.

## Validação

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Os testes validam campos, URLs, preços, listas permitidas, proteção de origem e paginação. Para conferir a persistência, importe os produtos, entre no painel, cadastre uma oferta, altere sua visibilidade, envie o formulário comercial e consulte o lead recebido. Reinicie o servidor e confira se os registros permanecem.
## Recuperação de senha e novos administradores

O login tem o link **Esqueci minha senha**. Após entrar, a aba **Acessos e senhas** permite convidar outros administradores por e-mail e trocar a própria senha usando a senha atual. Convites dão acesso administrativo completo; não há registro público.

Configure no `.env.local` local e no ambiente do servidor:

```dotenv
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="seu-email@seudominio.com.br"
SMTP_PASSWORD="senha-da-caixa-de-email"
SMTP_FROM="Pricefly <seu-email@seudominio.com.br>"
APP_ORIGIN="https://seu-dominio.com.br"
```

Use os dados reais da caixa de e-mail da Hostinger. A senha SMTP é a senha dessa caixa, não a senha do painel Pricefly. Em desenvolvimento local, `APP_ORIGIN` pode ser `http://localhost:3000`; sem essa variável, esse é o endereço usado nos links locais. Em produção, `APP_ORIGIN` é obrigatório e deve usar HTTPS. Reinicie o Next.js após alterar o ambiente.

A porta 587 usa STARTTLS obrigatório, com validação de certificado; a porta 465 também é aceita, usando TLS desde a conexão. Os links expiram em 30 minutos, funcionam uma vez e são invalidados quando outro link é emitido. O banco guarda somente o hash do token. A senha nova tem de 12 a 256 caracteres. Após defini-la, as sessões anteriores deixam de ser válidas. A mensagem pública de recuperação não revela se o e-mail está cadastrado.

### Aplicar credenciais editadas no arquivo local

Editar `.admin-credentials.local` não altera o MongoDB automaticamente. Para aplicar explicitamente o e-mail e a senha desse arquivo:

```powershell
npm run admin:sync
```

Formato aceito (substitua os valores):

```text
E-mail: admin@suaempresa.com.br
Senha: sua-senha-com-pelo-menos-12-caracteres
Acesso: /admin
```

O comando cria ou atualiza o administrador daquele e-mail, encerra as sessões antigas e remove o bloqueio temporário de tentativas de login desse e-mail. Outros administradores são mantidos. O arquivo não é lido pelo site em produção nem sincronizado automaticamente. Trocas de senha feitas por e-mail ou no painel atualizam o MongoDB e não reescrevem esse arquivo.

Execute `npm run db:seed` novamente para atualizar os índices se já havia inicializado o banco; o cadastro de produtos não é duplicado.
