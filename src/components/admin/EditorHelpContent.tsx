export function EditorHelpContent() {
  return (
    <div className="space-y-6 text-sm text-slate-700">
      <section>
        <h3 className="font-semibold text-slate-900 mb-2">Conteúdo principal</h3>
        <ul className="space-y-3">
          <li>
            <strong>Título</strong> — O título principal da notícia. Aparece no topo do post e em listagens. É o H1 da página.
          </li>
          <li>
            <strong>Slug (URL)</strong> — Parte amigável da URL do post. Ex: <code className="bg-slate-100 px-1 rounded">titulo-da-noticia</code>. Use letras minúsculas, hífens e sem acentos. Se vazio, é gerado automaticamente a partir do título.
          </li>
          <li>
            <strong>Resumo</strong> — Breve descrição do post. Usado em cards, listas e meta description (se não houver uma específica).
          </li>
          <li>
            <strong>Conteúdo</strong> — O texto completo da matéria. Use a barra de ferramentas para negrito, itálico, títulos (H2, H3, H4), listas, links e tabelas. Ao inserir links, você pode definir <em>follow</em> (padrão), <em>nofollow</em> ou <em>sponsored</em>.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-slate-900 mb-2">Publicação</h3>
        <ul className="space-y-3">
          <li>
            <strong>Status</strong> — <em>Rascunho</em> (não visível), <em>Em análise</em> (em revisão) ou <em>Publicado</em> (visível no site).
          </li>
          <li>
            <strong>Agendar publicação</strong> — Define data e hora para o post ser publicado automaticamente. Deixe vazio para publicar imediatamente.
          </li>
          <li>
            <strong>Destaque</strong> — Marque para exibir o post em destaques na home ou seções especiais.
          </li>
          <li>
            <strong>Categoria</strong> — Agrupa o post em uma categoria (Ex: Notícias, Esportes). Usado na navegação.
          </li>
          <li>
            <strong>Tags</strong> — Palavras-chave separadas por vírgula para filtrar e organizar conteúdos. Ex: <code className="bg-slate-100 px-1 rounded">futebol, copa, foz</code>.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-slate-900 mb-2">Imagem de destaque</h3>
        <ul className="space-y-3">
          <li>
            <strong>Imagem de destaque (URL)</strong> — Cole a URL completa da imagem (ex: <code className="bg-slate-100 px-1 rounded">https://...jpg</code>). A imagem aparece em cards e no topo do post.
          </li>
          <li>
            <strong>Alt Text</strong> — Descrição da imagem para acessibilidade e SEO. Obrigatório quando há imagem. Descreva o que a imagem mostra de forma objetiva.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-slate-900 mb-2">SEO</h3>
        <ul className="space-y-3">
          <li>
            <strong>Analisar SEO</strong> — Analisa título, meta description, palavra-chave e estrutura de headings. Use para verificar se o post está otimizado para buscadores.
          </li>
          <li>
            <strong>Meta Title</strong> — Título que aparece nos resultados do Google. Ideal: 50–60 caracteres. Se vazio, usa o título do post.
          </li>
          <li>
            <strong>Meta Description</strong> — Resumo que aparece abaixo do título no Google. Ideal: 120–160 caracteres. Incentiva cliques.
          </li>
          <li>
            <strong>Palavra-chave foco</strong> — Palavra ou frase principal que o post deve ranquear. Use para análise de densidade (H1, 1º parágrafo, URL).
          </li>
          <li>
            <strong>Canonical URL</strong> — URL canônica quando o conteúdo existe em mais de um endereço. Evita problemas de conteúdo duplicado. Deixe vazio se não for o caso.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-slate-900 mb-2">FAQ (JSON-LD)</h3>
        <p className="mb-2">
          FAQ em JSON-LD é um formato de dados estruturados que o Google usa para exibir <strong>Featured Snippets</strong> (trechos destacados) com perguntas e respostas diretamente nos resultados de busca.
        </p>
        <p className="mb-2">
          Adicione perguntas frequentes relacionadas ao tema do post. O Google pode exibir essas perguntas expandíveis na sua página de resultados, aumentando a visibilidade e o CTR.
        </p>
        <ul className="space-y-1 text-slate-600">
          <li>• Use perguntas reais que o público faz</li>
          <li>• Respostas claras e objetivas</li>
          <li>• Conteúdo que complemente o post</li>
        </ul>
      </section>
    </div>
  );
}
