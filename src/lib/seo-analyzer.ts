export interface SEOAnalysis {
  metaTitle: {
    value: string;
    length: number;
    status: "good" | "medium" | "bad";
    message: string;
    maxLength: number;
  };
  metaDescription: {
    value: string;
    length: number;
    status: "good" | "medium" | "bad";
    message: string;
    maxLength: number;
  };
  focusKeyword: {
    value: string;
    inTitle: boolean;
    inMeta: boolean;
    inContent: boolean;
    density: number;
    status: "good" | "medium" | "bad";
    message: string;
  };
  headings: {
    hasH1: boolean;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    structure: "good" | "medium" | "bad";
    message: string;
  };
  contentLength: {
    length: number;
    status: "good" | "medium" | "bad";
    message: string;
    minRecommended: number;
  };
  readability: {
    score: "good" | "medium" | "bad";
    message: string;
    avgWordLength: number;
    avgSentenceLength: number;
  };
  overall: "good" | "medium" | "bad";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractHeadings(html: string): { h1: string[]; h2: string[]; h3: string[] } {
  const h1 = [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi)].map((m) => m[1]);
  const h2 = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/gi)].map((m) => m[1]);
  const h3 = [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/gi)].map((m) => m[1]);
  return { h1, h2, h3 };
}

function countKeywordOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const kw = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return (normalized.match(regex) || []).length;
}

export function analyzeSEO(
  title: string,
  content: string,
  metaTitle?: string | null,
  metaDescription?: string | null,
  focusKeyword?: string | null
): SEOAnalysis {
  const plainContent = stripHtml(content);
  const wordCount = plainContent.split(/\s+/).filter(Boolean).length;
  const metaTitleVal = metaTitle || title;
  const metaDescVal = metaDescription || "";
  const keywordVal = focusKeyword || "";

  // Meta Title
  const metaTitleLen = metaTitleVal.length;
  let metaTitleStatus: "good" | "medium" | "bad" = "good";
  let metaTitleMsg = "Tamanho ideal (30-60 caracteres)";
  if (metaTitleLen === 0) {
    metaTitleStatus = "bad";
    metaTitleMsg = "Meta title vazio";
  } else if (metaTitleLen < 30) {
    metaTitleStatus = "medium";
    metaTitleMsg = `Muito curto (${metaTitleLen}/60). Recomendado: 30-60 caracteres`;
  } else if (metaTitleLen > 60) {
    metaTitleStatus = metaTitleLen > 70 ? "bad" : "medium";
    metaTitleMsg = `Muito longo (${metaTitleLen}/60). Pode ser cortado no Google`;
  }

  // Meta Description
  const metaDescLen = metaDescVal.length;
  let metaDescStatus: "good" | "medium" | "bad" = "good";
  let metaDescMsg = "Tamanho ideal (120-160 caracteres)";
  if (metaDescLen === 0) {
    metaDescStatus = "bad";
    metaDescMsg = "Meta description vazia";
  } else if (metaDescLen < 120) {
    metaDescStatus = "medium";
    metaDescMsg = `Curto (${metaDescLen}/160). Recomendado: 120-160 caracteres`;
  } else if (metaDescLen > 160) {
    metaDescStatus = metaDescLen > 170 ? "bad" : "medium";
    metaDescMsg = `Muito longo (${metaDescLen}/160). Pode ser cortado no Google`;
  }

  // Focus Keyword
  const keywordInTitle = keywordVal ? metaTitleVal.toLowerCase().includes(keywordVal.toLowerCase()) : false;
  const keywordInMeta = keywordVal ? metaDescVal.toLowerCase().includes(keywordVal.toLowerCase()) : false;
  const keywordInContent = keywordVal ? countKeywordOccurrences(plainContent, keywordVal) > 0 : false;
  const keywordCount = keywordVal ? countKeywordOccurrences(plainContent, keywordVal) : 0;
  const density = wordCount > 0 && keywordVal ? (keywordCount / wordCount) * 100 : 0;
  
  let keywordStatus: "good" | "medium" | "bad" = "good";
  let keywordMsg = "Palavra-chave bem utilizada";
  if (!keywordVal) {
    keywordStatus = "medium";
    keywordMsg = "Nenhuma palavra-chave foco definida";
  } else if (!keywordInTitle || !keywordInMeta || !keywordInContent) {
    keywordStatus = "medium";
    const missing: string[] = [];
    if (!keywordInTitle) missing.push("título");
    if (!keywordInMeta) missing.push("meta description");
    if (!keywordInContent) missing.push("conteúdo");
    keywordMsg = `Palavra-chave ausente em: ${missing.join(", ")}`;
  } else if (density < 0.5) {
    keywordStatus = "medium";
    keywordMsg = `Densidade baixa (${density.toFixed(1)}%). Recomendado: 0.5-2.5%`;
  } else if (density > 2.5) {
    keywordStatus = "bad";
    keywordMsg = `Densidade alta (${density.toFixed(1)}%). Risco de keyword stuffing`;
  }

  // Headings
  const { h1, h2, h3 } = extractHeadings(content);
  const hasH1 = h1.length > 0;
  let headingStatus: "good" | "medium" | "bad" = "good";
  let headingMsg = "Estrutura de headings adequada";
  if (!hasH1) {
    headingStatus = "bad";
    headingMsg = "Nenhum H1 encontrado. Use um único H1 por página";
  } else if (h1.length > 1) {
    headingStatus = "medium";
    headingMsg = `Múltiplos H1 (${h1.length}). Recomendado: apenas um H1`;
  } else if (h2.length === 0 && plainContent.length > 500) {
    headingStatus = "medium";
    headingMsg = "Conteúdo longo sem H2. Use headings para organizar";
  }

  // Content length
  const minRecommended = 300;
  let contentStatus: "good" | "medium" | "bad" = "good";
  let contentMsg = `Conteúdo adequado (${wordCount} palavras)`;
  if (wordCount < minRecommended) {
    contentStatus = "bad";
    contentMsg = `Muito curto (${wordCount}/${minRecommended} palavras mínimas)`;
  } else if (wordCount < 600) {
    contentStatus = "medium";
    contentMsg = `Conteúdo ok (${wordCount} palavras). Para SEO ideal: 600+ palavras`;
  }

  // Readability
  const sentences = plainContent.split(/[.!?]+/).filter(Boolean);
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
  const words = plainContent.split(/\s+/).filter(Boolean);
  const avgWordLength = words.length > 0
    ? words.reduce((a, w) => a + w.length, 0) / words.length
    : 0;

  let readabilityStatus: "good" | "medium" | "bad" = "good";
  let readabilityMsg = "Texto legível";
  if (avgSentenceLength > 25) {
    readabilityStatus = "medium";
    readabilityMsg = `Frases longas (média ${avgSentenceLength.toFixed(0)} palavras). Considere dividir`;
  } else if (avgWordLength > 6 && wordCount > 200) {
    readabilityStatus = "medium";
    readabilityMsg = "Vocabulário complexo. Considere simplificar";
  }

  // Overall
  const statuses = [metaTitleStatus, metaDescStatus, keywordStatus, headingStatus, contentStatus, readabilityStatus];
  const badCount = statuses.filter((s) => s === "bad").length;
  const mediumCount = statuses.filter((s) => s === "medium").length;
  let overall: "good" | "medium" | "bad" = "good";
  if (badCount > 0) overall = "bad";
  else if (mediumCount >= 2) overall = "medium";

  return {
    metaTitle: { value: metaTitleVal, length: metaTitleLen, status: metaTitleStatus, message: metaTitleMsg, maxLength: 60 },
    metaDescription: { value: metaDescVal, length: metaDescLen, status: metaDescStatus, message: metaDescMsg, maxLength: 160 },
    focusKeyword: {
      value: keywordVal,
      inTitle: keywordInTitle,
      inMeta: keywordInMeta,
      inContent: keywordInContent,
      density: Math.round(density * 10) / 10,
      status: keywordStatus,
      message: keywordMsg,
    },
    headings: {
      hasH1,
      h1Count: h1.length,
      h2Count: h2.length,
      h3Count: h3.length,
      structure: headingStatus,
      message: headingMsg,
    },
    contentLength: {
      length: wordCount,
      status: contentStatus,
      message: contentMsg,
      minRecommended,
    },
    readability: {
      score: readabilityStatus,
      message: readabilityMsg,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    },
    overall,
  };
}
