import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import postgres from "postgres";
import { normalizeDatabaseUrl } from "../src/lib/db/url";
import { generateId } from "../src/lib/utils";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@fozemdestaque.com.br";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

const BASE_CATEGORIES = [
  { name: "Aniversários", slug: "aniversariantes", description: "Aniversariantes do dia." },
  { name: "Reflexão do Dia", slug: "reflexao-do-dia", description: "Reflexões e pensamentos." },
  { name: "Datas", slug: "datas", description: "Datas importantes e efemérides." },
  { name: "Agenda", slug: "agenda", description: "Eventos, estreias e programação." },
  { name: "Bela da Sociedade", slug: "bela-da-sociedade", description: "Destaques da sociedade." },
  { name: "Beleza & Saúde", slug: "beleza-saude", description: "Bem-estar, estética e saúde." },
  { name: "Click Society", slug: "click-society", description: "Eventos, bastidores e vida social." },
  { name: "Coluna Social", slug: "coluna-social", description: "Notas sociais e editoriais." },
  { name: "Equipe", slug: "equipe", description: "Equipe editorial e colaboradores." },
  { name: "Foz em Destaque TV", slug: "foz-em-destaque-tv", description: "Conteúdos em vídeo do portal." },
  { name: "Programa Foz em Destaque TV", slug: "programa-foz-em-destaque-tv", description: "Programação em vídeo do portal." },
  { name: "Inaugura", slug: "inaugura", description: "Inaugurações e lançamentos." },
  { name: "Mailing", slug: "mailing", description: "Comunicados e mailing editorial." },
  { name: "Merchandising", slug: "merchandising", description: "Publicidade e presença comercial." },
  { name: "Par Perfeito", slug: "par-perfeito", description: "Relacionamentos e perfis." },
  { name: "Ti-ti-ti", slug: "ti-ti-ti", description: "Bastidores e assunto quente." },
  { name: "Top Mirim", slug: "top-mirim", description: "Talentos infantis em destaque." },
  { name: "Top Profissional", slug: "top-profissional", description: "Destaques profissionais." },
  { name: "Society", slug: "society", description: "Categoria legada para conteúdos sociais." },
  { name: "Aniversários (Legado)", slug: "aniversarios", description: "Categoria legada de aniversários." },
  { name: "Reflexão", slug: "reflexao", description: "Categoria legada de reflexão." },
  { name: "Datas Comemorativas", slug: "datas-comemorativas", description: "Categoria legada de datas." },
  { name: "Beleza & Saúde (Legado)", slug: "beleza-amp-saude", description: "Categoria legada de beleza e saúde." },
] as const;

const DEFAULT_MAILBOXES = [
  {
    label: "Admin",
    email: "admin@fozemdestaque.com",
    description: "Caixa principal do portal e mensagens internas.",
    order: 0,
    isDefault: true,
  },
  {
    label: "Comercial",
    email: "comercial@fozemdestaque.com",
    description: "Atendimento de publicidade, marcas e negociações.",
    order: 1,
    isDefault: false,
  },
  {
    label: "Contato",
    email: "contato@fozemdestaque.com",
    description: "Contato geral do portal.",
    order: 2,
    isDefault: false,
  },
  {
    label: "Marco",
    email: "marco@fozemdestaque.com",
    description: "Caixa dedicada ao contato pessoal do Marco.",
    order: 3,
    isDefault: false,
  },
  {
    label: "Oportunidade",
    email: "oportunidade@fozemdestaque.com",
    description: "Propostas, convites e novas oportunidades.",
    order: 4,
    isDefault: false,
  },
  {
    label: "Pauta",
    email: "pauta@fozemdestaque.com",
    description: "Sugestões de pauta e relacionamento editorial.",
    order: 5,
    isDefault: false,
  },
] as const;

async function main() {
  const sql = postgres(normalizeDatabaseUrl(DATABASE_URL), {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  try {
    await createSchema(sql);
    await ensureAdmin(sql);
    await ensureCategories(sql);
    await ensureMailboxes(sql);
    await ensureSiteStats(sql);
    console.log("Bootstrap do banco concluído com sucesso.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function createSchema(sql: ReturnType<typeof postgres>) {
  await sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('administrador', 'editor', 'colaborador');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE post_status AS ENUM ('rascunho', 'em_analise', 'publicado');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE estado_civil AS ENUM ('casado', 'solteiro', 'divorciado', 'viuvo');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email varchar(255) NOT NULL UNIQUE,
      name varchar(255) NOT NULL,
      password varchar(255) NOT NULL,
      role user_role NOT NULL DEFAULT 'colaborador',
      avatar text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY,
      name varchar(255) NOT NULL,
      slug varchar(255) NOT NULL UNIQUE,
      description text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS posts (
      id text PRIMARY KEY,
      title varchar(500) NOT NULL,
      slug varchar(500) NOT NULL UNIQUE,
      excerpt text,
      content text NOT NULL,
      featured_image text,
      featured_image_alt text,
      featured_image_title text,
      category_id text REFERENCES categories(id),
      category_ids text,
      tags text,
      scheduled_at timestamp,
      canonical_url text,
      faq_json text,
      author_id text REFERENCES users(id),
      status post_status NOT NULL DEFAULT 'rascunho',
      featured boolean NOT NULL DEFAULT false,
      meta_title varchar(70),
      meta_description varchar(160),
      focus_keyword varchar(100),
      published_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS comments (
      id text PRIMARY KEY,
      post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_name varchar(255) NOT NULL,
      author_email varchar(255) NOT NULL,
      content text NOT NULL,
      approved boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS email_mailboxes (
      id text PRIMARY KEY,
      label varchar(120) NOT NULL,
      email varchar(255) NOT NULL UNIQUE,
      description text,
      "order" integer NOT NULL DEFAULT 0,
      active boolean NOT NULL DEFAULT true,
      is_default boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS email_messages (
      id text PRIMARY KEY,
      direction varchar(20) NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'received',
      mailbox_email varchar(255),
      from_name varchar(255),
      from_email varchar(255) NOT NULL,
      to_email text NOT NULL,
      cc text,
      bcc text,
      subject varchar(500) NOT NULL,
      text_content text,
      html_content text,
      provider varchar(50),
      provider_id text,
      error text,
      "read" boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS banners (
      id text PRIMARY KEY,
      title varchar(255),
      image_url text NOT NULL,
      link_url text,
      position varchar(50) NOT NULL,
      "order" integer NOT NULL DEFAULT 0,
      active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS birthday_submissions (
      id text PRIMARY KEY,
      nome_completo varchar(255) NOT NULL,
      cpf_ruc_cuit varchar(50) NOT NULL,
      documento_identidade varchar(255),
      data_nascimento timestamp NOT NULL,
      cidade_nascimento varchar(255),
      cidade_reside varchar(255) NOT NULL,
      nome_social varchar(255) NOT NULL,
      fone_contato varchar(50),
      email varchar(255) NOT NULL,
      profissao varchar(255) NOT NULL,
      empresa_atual varchar(255) NOT NULL,
      cargo varchar(255),
      instagram varchar(255) NOT NULL,
      facebook varchar(255) NOT NULL,
      instagram_profissional varchar(255),
      estado_civil estado_civil NOT NULL,
      nome_conjuge varchar(255),
      data_casamento timestamp,
      outras_informacoes text,
      autoriza_publicacao boolean NOT NULL DEFAULT true,
      ativo boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS site_stats (
      id text PRIMARY KEY,
      total_visits integer NOT NULL DEFAULT 0,
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS content_blocks (
      id text PRIMARY KEY,
      type varchar(50) NOT NULL,
      title varchar(500) NOT NULL,
      slug varchar(500),
      excerpt text,
      thumbnail text,
      link text,
      content text,
      "order" integer NOT NULL DEFAULT 0,
      active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
}

async function ensureAdmin(sql: ReturnType<typeof postgres>) {
  const existing = await sql`
    select id
    from users
    where role = 'administrador'
    limit 1
  `;

  if (existing.length > 0) {
    console.log("Administrador já existe.");
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await sql`
    insert into users (
      id, email, name, password, role, active, created_at, updated_at
    ) values (
      ${generateId()},
      ${DEFAULT_ADMIN_EMAIL},
      ${"Administrador"},
      ${hashedPassword},
      ${"administrador"},
      ${true},
      now(),
      now()
    )
  `;

  console.log(`Administrador criado: ${DEFAULT_ADMIN_EMAIL}`);
}

async function ensureCategories(sql: ReturnType<typeof postgres>) {
  for (const category of BASE_CATEGORIES) {
    await sql`
      insert into categories (
        id, name, slug, description, active, created_at, updated_at
      )
      values (
        ${generateId()},
        ${category.name},
        ${category.slug},
        ${category.description},
        ${true},
        now(),
        now()
      )
      on conflict (slug) do update
      set
        name = excluded.name,
        description = excluded.description,
        active = true,
        updated_at = now()
    `;
  }

  console.log(`Categorias base garantidas: ${BASE_CATEGORIES.length}`);
}

async function ensureMailboxes(sql: ReturnType<typeof postgres>) {
  for (const mailbox of DEFAULT_MAILBOXES) {
    await sql`
      insert into email_mailboxes (
        id, label, email, description, "order", active, is_default, created_at, updated_at
      )
      values (
        ${generateId()},
        ${mailbox.label},
        ${mailbox.email.toLowerCase()},
        ${mailbox.description},
        ${mailbox.order},
        ${true},
        ${mailbox.isDefault},
        now(),
        now()
      )
      on conflict (email) do update
      set
        label = excluded.label,
        description = excluded.description,
        "order" = excluded."order",
        active = true,
        is_default = excluded.is_default,
        updated_at = now()
    `;
  }

  console.log(`Caixas internas garantidas: ${DEFAULT_MAILBOXES.length}`);
}

async function ensureSiteStats(sql: ReturnType<typeof postgres>) {
  await sql`
    insert into site_stats (id, total_visits, updated_at)
    values ('main', 5095, now())
    on conflict (id) do nothing
  `;
  console.log("Contador inicial de visitas garantido.");
}

main().catch((error) => {
  console.error("Falha no bootstrap do banco:", error);
  process.exit(1);
});
