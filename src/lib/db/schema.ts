import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "administrador",
  "editor",
  "colaborador",
]);

export const postStatusEnum = pgEnum("post_status", [
  "rascunho",
  "em_analise",
  "publicado",
]);

// Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("colaborador"),
  avatar: text("avatar"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Categories
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Posts
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  featuredImageAlt: text("featured_image_alt"),
  categoryId: text("category_id").references(() => categories.id),
  tags: text("tags"), // JSON array: ["tag1", "tag2"]
  scheduledAt: timestamp("scheduled_at"),
  canonicalUrl: text("canonical_url"),
  faqJson: text("faq_json"), // JSON-LD structured data
  authorId: text("author_id").references(() => users.id),
  status: postStatusEnum("status").notNull().default("rascunho"),
  featured: boolean("featured").notNull().default(false),
  // SEO
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 160 }),
  focusKeyword: varchar("focus_keyword", { length: 100 }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Comments
export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorEmail: varchar("author_email", { length: 255 }).notNull(),
  content: text("content").notNull(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Banners/Publicidade
export const banners = pgTable("banners", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  position: varchar("position", { length: 50 }).notNull(), // header, lateral_1, lateral_2, rodape
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Inscrições Aniversário / HighSocietyClub
export const estadoCivilEnum = pgEnum("estado_civil", ["casado", "solteiro", "divorciado", "viuvo"]);
export const birthdaySubmissions = pgTable("birthday_submissions", {
  id: text("id").primaryKey(),
  nomeCompleto: varchar("nome_completo", { length: 255 }).notNull(),
  cpfRucCuit: varchar("cpf_ruc_cuit", { length: 50 }).notNull(),
  documentoIdentidade: varchar("documento_identidade", { length: 255 }),
  dataNascimento: timestamp("data_nascimento").notNull(),
  cidadeNascimento: varchar("cidade_nascimento", { length: 255 }),
  cidadeReside: varchar("cidade_reside", { length: 255 }).notNull(),
  nomeSocial: varchar("nome_social", { length: 255 }).notNull(),
  foneContato: varchar("fone_contato", { length: 50 }),
  email: varchar("email", { length: 255 }).notNull(),
  profissao: varchar("profissao", { length: 255 }).notNull(),
  empresaAtual: varchar("empresa_atual", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }).notNull(),
  facebook: varchar("facebook", { length: 255 }).notNull(),
  instagramProfissional: varchar("instagram_profissional", { length: 255 }),
  estadoCivil: estadoCivilEnum("estado_civil").notNull(),
  nomeConjuge: varchar("nome_conjuge", { length: 255 }),
  dataCasamento: timestamp("data_casamento"),
  outrasInformacoes: text("outras_informacoes"),
  autorizaPublicacao: boolean("autoriza_publicacao").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Estatísticas do site
export const siteStats = pgTable("site_stats", {
  id: text("id").primaryKey(),
  totalVisits: integer("total_visits").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Blocos dinâmicos (Aniversários, Datas, Reflexão, etc.)
export const contentBlocks = pgTable("content_blocks", {
  id: text("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // aniversario, data, reflexao, destaque_dia, society, ti_ti_ti, merchandising, agenda, top_profissional
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }),
  excerpt: text("excerpt"),
  thumbnail: text("thumbnail"),
  link: text("link"),
  content: text("content"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
export type BirthdaySubmission = typeof birthdaySubmissions.$inferSelect;
export type NewBirthdaySubmission = typeof birthdaySubmissions.$inferInsert;
export type SiteStats = typeof siteStats.$inferSelect;
export type NewSiteStats = typeof siteStats.$inferInsert;
