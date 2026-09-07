# Foz em Destaque

Portal de conteúdo e publicidade profissional para Foz do Iguaçu.

## Stack

- **Frontend:** Next.js 16 (App Router)
- **Backend/API:** Node.js (Next.js API Routes)
- **Banco de Dados:** Neon PostgreSQL
- **Hospedagem:** Vercel
- **Autenticação:** NextAuth v5

## Configuração

### 1. Variáveis de Ambiente

Crie `.env.local` baseado em `.env.example`:

```bash
cp .env.example .env.local
```

Configure:

- `DATABASE_URL` – URL de conexão do Neon PostgreSQL
- `AUTH_SECRET` – Gere com: `openssl rand -base64 32`

### 2. Banco de Dados

Crie o banco no [Neon](https://neon.tech), copie a connection string e adicione em `.env.local`:
```
DATABASE_URL="postgresql://..."
```

Execute as migrations:

```bash
npm run db:push
```

### 3. Usuário Administrador

Crie o primeiro admin:

```bash
ADMIN_EMAIL=admin@seuemail.com ADMIN_PASSWORD=SenhaSegura123 npx tsx scripts/seed-admin.ts
```

## Desenvolvimento

```bash
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

## Deploy (EasyPanel)

O projeto possui `Dockerfile` de produção e gera o servidor `standalone` do
Next.js. No EasyPanel, conecte este repositório, use a porta `3000`, configure
as variáveis de ambiente e valide `/api/health` antes de apontar o domínio.

O banco PostgreSQL e o serviço de mídia continuam externos ao contêiner da
aplicação. Não execute seed ou `db:push` durante um deploy comum.

## Estrutura do Painel Admin

- **Usuários** – CRUD, perfis (Administrador, Editor, Colaborador)
- **Posts** – Editor rico, SEO, categorias, status (rascunho/em análise/publicado)
- **Categorias** – Slug, descrição, ativo
- **Comentários** – Moderação (aprovar/rejeitar)
- **Banners** – Header, lateral 1/2, rodapé

## Análise SEO

No editor de posts, use o botão **Analisar SEO** para verificar:

- Meta title e description
- Palavra-chave foco e densidade
- Estrutura de headings (H1, H2, H3)
- Tamanho do conteúdo
- Legibilidade

## Temperatura (API Open-Meteo)

Configure opcionalmente para exibir temperatura em tempo real:

```
NEXT_PUBLIC_WEATHER_LAT=-25.5478
NEXT_PUBLIC_WEATHER_LON=-54.5882
```

## Uploads de Midia na VPS

O painel admin envia imagens, videos, banners e anexos para um servico privado na VPS. A aplicação web também pode rodar no EasyPanel, sem Vercel Blob.

Variaveis necessarias no serviço da aplicação:

```bash
MEDIA_UPLOAD_ENDPOINT="https://seu-dominio-de-upload/upload"
MEDIA_UPLOAD_TOKEN="um-token-longo-e-secreto"
MEDIA_PUBLIC_BASE_URL="https://fozemdestaque-media.bohu4g.easypanel.host"
```

Na VPS/EasyPanel, use o servico em `media-upload-server/`. Ele deve compartilhar o mesmo volume do nginx que publica os arquivos. O arquivo `media-upload-server/easypanel-compose.yml` mostra a estrutura recomendada para um stack com `nginx` + `uploader`.
