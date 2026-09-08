# Foz em Destaque

Portal de conteúdo e publicidade profissional para Foz do Iguaçu.

## Stack

- **Frontend:** Next.js 16 (App Router)
- **Backend/API:** Node.js (Next.js API Routes)
- **Banco de Dados:** Neon PostgreSQL
- **Hospedagem:** VPS / EasyPanel (`fozemdestaque/site`)
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

## Domínio, Meta e Analytics

- A zona DNS autoritativa está no Squarespace (não mais na Vercel). Raiz e
  `www` apontam para a VPS, com HTTPS e redirecionamento permanente para `www`.
- A verificação Meta usa o TXT da raiz e a meta tag gerada pelo layout raiz:
  `facebook-domain-verification=diyx3lh76qaahyzpmoc6p3tb7msi28`.
  A confirmação em Business Manager é uma etapa separada; isso não garante
  aprovação no registro de Página de Notícias.
- GA4: `G-NQ03Z7NBKT`, substituível por `NEXT_PUBLIC_GA_ID` no **build**.
  Não é uma chave secreta. Não instalar uma segunda tag no painel ou no HTML.
- O carregamento do GA depende de consentimento explícito para estatísticas,
  salvo no navegador. O visitante pode recusar ou alterar a escolha no botão
  `Cookies de estatística`. A recusa desativa a medição e remove cookies GA.
- Medir somente domínios oficiais e páginas públicas permitidas pelo helper
  `src/lib/analytics.ts`; nunca localhost, previews, API ou painel administrativo.
  URLs com parâmetros livres (busca, e-mail etc.) ou hash não são medidas;
  somente parâmetros de campanha/clique validados são permitidos. Contexto
  inicial omite query/hash, referrer e título dinâmico de busca.
  Após uma URL excluída, a primeira navegação seguinte também é omitida para
  impedir que o histórico automático envie a URL anterior como referrer.
- Navegações Next.js usam a medição otimizada do GA4 (alterações do histórico).
  Manter essa opção habilitada no fluxo Web do GA4. Não somar eventos manuais
  `page_view` à medição automática. Testar acesso inicial e navegação interna.
- Verificação local: `npx tsx --test tests/analytics.test.ts`, lint e build.

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
