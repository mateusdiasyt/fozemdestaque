/**
 * Script para criar categorias e posts de exemplo.
 * Execute: npx tsx scripts/seed-posts.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const CATEGORIES = [
  { name: "Reflexão", slug: "reflexao", description: "Reflexões e pensamentos" },
  { name: "Datas", slug: "datas", description: "Datas importantes e comemorativas" },
  { name: "Aniversários", slug: "aniversarios", description: "Aniversariantes do dia" },
  { name: "Society", slug: "society", description: "Vida social e eventos" },
  { name: "Ti-ti-ti", slug: "ti-ti-ti", description: "Fofocas e bastidores" },
  { name: "Top Profissional", slug: "top-profissional", description: "Destaques profissionais" },
  { name: "Agenda", slug: "agenda", description: "Eventos e programação" },
  { name: "Merchandising", slug: "merchandising", description: "Promoções e ofertas" },
  { name: "Foz em Destaque", slug: "foz-em-destaque", description: "Destaques da região" },
  { name: "High Society Club", slug: "high-society-club", description: "Elite e alta sociedade" },
];

const SAMPLE_POSTS: Record<string, { title: string; excerpt: string; content: string; image: string }> = {
  reflexao: {
    title: "A importância de valorizar os pequenos momentos",
    excerpt: "Em um mundo cada vez mais acelerado, pausar para apreciar o presente pode transformar nossa visão da vida.",
    content: "<p>Em um mundo cada vez mais acelerado, onde as demandas do dia a dia nos consomem, pausar para apreciar os pequenos momentos pode transformar completamente nossa visão da vida.</p><p>A cidade de Foz do Iguaçu, com suas cataratas majestosas e sua diversidade cultural, nos lembra diariamente que a beleza está nos detalhes. Cada gota de água, cada raio de sol refletido nas quedas, cada sorriso trocado nas ruas — tudo isso compõe o mosaico da nossa existência.</p><h2>O presente é o que importa</h2><p>Muitas vezes estamos tão focados no futuro que esquecemos de viver o hoje. Esta reflexão é um convite para respirar, olhar ao redor e agradecer pelo que temos.</p>",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
  },
  datas: {
    title: "5 de Fevereiro: Datas importantes para Foz do Iguaçu",
    excerpt: "Conheça os eventos e comemorações que marcam esta data na história da cidade.",
    content: "<p>O dia 5 de fevereiro carrega significados especiais para nossa região. Ao longo dos anos, diversas conquistas e eventos importantes foram registrados nesta data.</p><h2>Marco histórico</h2><p>Foz do Iguaçu, conhecida mundialmente pelas Cataratas, tem uma história rica que merece ser celebrada. Neste dia, relembramos as conquistas que tornaram nossa cidade um dos principais destinos turísticos do Brasil.</p><p>Que possamos honrar nossa história e construir um futuro ainda mais promissor para as próximas gerações.</p>",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
  },
  aniversarios: {
    title: "Parabéns aos aniversariantes de fevereiro!",
    excerpt: "Celebramos mais um mês de vida com nossos conterrâneos que fazem aniversário em fevereiro.",
    content: "<p>Fevereiro chegou e com ele as comemorações de mais um ciclo de vida para tantos moradores da nossa querida Foz do Iguaçu!</p><h2>Uma cidade que celebra junto</h2><p>Nossa comunidade tem o hábito de celebrar as conquistas e as datas especiais de cada um. Os aniversários são momentos de reunir a família e os amigos, trocar afetos e renovar os votos de alegria.</p><p>A todos os aniversariantes do mês: desejamos saúde, felicidade e muitas realizações! Que este novo ano de vida seja repleto de momentos especiais.</p>",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
  },
  society: {
    title: "Galeria: O grande baile de gala da temporada",
    excerpt: "As melhores fotos do evento que reuniu a elite social da região na noite de sábado.",
    content: "<p>O grande baile de gala da temporada reuniu centenas de convidados no sábado passado. O evento, realizado em um dos mais tradicionais espaços da cidade, marcou o início da agenda social de 2026.</p><h2>Noite de glamour</h2><p>Vestidos de grife, ternos impecáveis e muita animação caracterizaram a festa. Os convidados aproveitaram a ocasião para networking e celebração.</p><p>O buffet foi elogiado por todos, e a orquestra animou a noite até o amanhecer. Confira nas fotos os melhores momentos!</p>",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
  },
  "ti-ti-ti": {
    title: "Quem foi visto onde: os bastidores da última festa",
    excerpt: "Descubra quem estava presente e quais foram os momentos mais comentados da semana.",
    content: "<p>A semana foi movimentada na cena social de Foz! Nossa equipe flagrou várias personalidades em eventos e restaurantes da cidade.</p><h2>Fofocas da alta sociedade</h2><p>Rumores de novos empreendimentos, parcerias de negócios e até namoros surgidos em jantares elegantes circularam entre os grupos. Como sempre, mantemos o respeito e o bom humor ao trazer essas informações.</p><p>Fique de olho na próxima edição para mais novidades do mundo da alta sociedade!</p>",
    image: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
  },
  "top-profissional": {
    title: "Executivo local é destaque em premiação nacional",
    excerpt: "Profissional de Foz do Iguaçu recebe reconhecimento por excelência em gestão empresarial.",
    content: "<p>Um dos principais nomes do empresariado local foi reconhecido na última edição do Prêmio Excelência em Gestão, realizado em São Paulo.</p><h2>Trajetória de sucesso</h2><p>Com mais de 20 anos de atuação na região da tríplice fronteira, o executivo construiu uma carreira sólida baseada em inovação e responsabilidade social. O prêmio consolida o trabalho realizado e inspira novos talentos.</p><p>Parabéns ao profissional que coloca Foz do Iguaçu no mapa do empreendedorismo de sucesso!</p>",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800",
  },
  agenda: {
    title: "O que fazer em Foz: eventos desta semana",
    excerpt: "Confira a programação de shows, festivais e atividades que agitam a cidade.",
    content: "<p>Fevereiro promete muitas atrações para moradores e turistas em Foz do Iguaçu. Preparamos uma agenda com os principais eventos da semana.</p><h2>Shows e cultura</h2><p>O Teatro Municipal recebe uma turnê nacional. Há também festivais gastronômicos, exposições de arte e feiras de artesanato espalhadas pela cidade.</p><h2>Para a família</h2><p>Parques e atrações naturais têm programação especial. Não deixe de conferir os horários de funcionamento atualizados.</p>",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
  },
  merchandising: {
    title: "Ofertas imperdíveis: liquidação de verão nas principais lojas",
    excerpt: "As melhores promoções desta semana para você aproveitar em Foz do Iguaçu.",
    content: "<p>A liquidação de verão chegou com tudo! As principais lojas e shopping centers da cidade estão com descontos especiais até o fim do mês.</p><h2>Moda e eletrônicos</h2><p>Roupas, calçados e eletrônicos com até 50% de desconto. Vale a pena conferir as vitrines e garantir os melhores preços.</p><p>Lembre-se: as ofertas são por tempo limitado. Aproveite enquanto ainda há estoque!</p>",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
  },
  "foz-em-destaque": {
    title: "Cataratas registram recorde de visitantes em janeiro",
    excerpt: "O parque nacional recebeu mais de 200 mil turistas no primeiro mês do ano.",
    content: "<p>O Parque Nacional do Iguaçu fechou janeiro com números históricos. Mais de 200 mil visitantes passaram pelo local para conhecer uma das sete maravilhas naturais do mundo.</p><h2>Crescimento sustentável</h2><p>O aumento no fluxo de turistas reflete a retomada do setor e a confiança dos visitantes. A infraestrutura do parque está preparada para receber todos com segurança e conforto.</p><p>Foz do Iguaçu consolida sua posição como destino turístico de excelência!</p>",
    image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800",
  },
  "high-society-club": {
    title: "Exclusivo: inauguração do novo clube privado",
    excerpt: "O espaço mais aguardado da temporada abre as portas para sócios selecionados.",
    content: "<p>O novo clube privado da cidade foi inaugurado em cerimônia exclusiva na última sexta-feira. O espaço, que levou dois anos para ser concluído, oferece infraestrutura de primeiro mundo.</p><h2>Luxo e sofisticação</h2><p>Piscina olímpica, spa, restaurante gourmet e salas de eventos compõem o complexo. A adesão é restrita e a lista de espera já está aberta.</p><p>Um marco para a alta sociedade da região da tríplice fronteira.</p>",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
  },
};

async function seed() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Buscar ou criar admin para authorId
  const [admin] = await db.select().from(schema.users).where(eq(schema.users.role, "administrador")).limit(1);
  const authorId = admin?.id ?? null;

  let categoriesCreated = 0;
  let postsCreated = 0;

  for (const cat of CATEGORIES) {
    const [existing] = await db.select().from(schema.categories).where(eq(schema.categories.slug, cat.slug)).limit(1);
    let categoryId: string;

    if (existing) {
      categoryId = existing.id;
    } else {
      categoryId = randomUUID();
      await db.insert(schema.categories).values({
        id: categoryId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        active: true,
      });
      categoriesCreated++;
    }

    const sample = SAMPLE_POSTS[cat.slug];
    if (!sample) continue;

    const postSlug = `exemplo-${cat.slug}`;
    const [existingPost] = await db.select().from(schema.posts).where(eq(schema.posts.slug, postSlug)).limit(1);
    if (existingPost) continue;

    await db.insert(schema.posts).values({
      id: randomUUID(),
      title: sample.title,
      slug: postSlug,
      excerpt: sample.excerpt,
      content: sample.content,
      featuredImage: sample.image,
      categoryId,
      authorId,
      status: "publicado",
      featured: cat.slug === "foz-em-destaque",
      metaTitle: sample.title.substring(0, 60),
      metaDescription: sample.excerpt.substring(0, 160),
      focusKeyword: cat.name,
      publishedAt: new Date(),
    });
    postsCreated++;
  }

  console.log(`Concluído! ${categoriesCreated} categorias criadas, ${postsCreated} posts de exemplo criados.`);
}

seed().catch(console.error);
