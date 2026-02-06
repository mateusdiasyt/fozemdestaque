import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nossa História",
  description:
    "Conheça a história da Foz em Destaque, fundada em 1982 por Das Graças e Ary de Campos.",
};

export default function NossaHistoriaPage() {
  return (
    <div className="space-y-12">
      <header>
        <Link
          href="/"
          className="text-sm text-[#ff751f] hover:text-[#e56a1a] font-medium mb-2 inline-block"
        >
          ← Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="h-1 w-12 bg-[#ff751f] rounded" />
          <h1 className="font-headline text-2xl md:text-4xl font-bold text-[#000000]">
            Nossa História
          </h1>
        </div>
      </header>

      <section className="prose prose-slate max-w-none">
        <p className="text-[#4e5b60] text-lg leading-relaxed">
          A Foz em Destaque foi fundada em 1982 pela fotógrafa Das Graças e seu marido Ary de
          Campos, redator de sua coluna social que mais tarde veio a ostentar este nome.
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-6 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Fundadores
        </h2>
        <div className="flex justify-center">
          <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-[#e8ebed] shadow-lg">
            <Image
              src="/images/nossa-historia/fundadores-das-gracas-ary.png"
              alt="Das Graças e Ary de Campos, fundadores da Foz em Destaque"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 448px"
              priority
            />
          </div>
        </div>
        <p className="text-center text-[#859eac] text-sm mt-3">
          Das Graças e Ary de Campos — Fundadores
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-4 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Colunas Sociais
        </h2>
        <p className="text-[#4e5b60] mb-4">
          Ao longo de seus trabalhos, Das Graças e Ary escreveram para os seguintes veículos de
          comunicação — cerca de 3.500 edições:
        </p>
        <ul className="space-y-1 text-[#4e5b60]">
          <li>• 1982 – HOJE REGIONAL – CASCAVEL</li>
          <li>• 1987 – PRIMEIRA HORA – FOZ DO IGUAÇU</li>
          <li>• 1990 – VOZ DA FRONTEIRA</li>
          <li>• 1991 – A GAZETA DO IGUAÇU</li>
          <li>• 1994 – GAZETA DO PARANÁ</li>
          <li>• 1998 – PRIMEIRA LINHA</li>
          <li>• 2005 – JORNAL DO IGUAÇU</li>
          <li>• Revista TOUR IN FOZ, subsidiária da TOUR IN RIO</li>
          <li>• Revista CHARME</li>
          <li>• Revista &quot;Cidade de São Paulo&quot;</li>
        </ul>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-headline font-bold text-[#ff751f] mb-4">DAS GRAÇAS</h3>
          <ul className="space-y-1 text-[#4e5b60] text-sm">
            <li>• Troféu Bola de Ouro (1990)</li>
            <li>• Medalha e diploma de Amiga da Marinha (1992)</li>
            <li>• Moção de Aplauso – Câmara Municipal de Foz do Iguaçu (1992)</li>
            <li>• Prêmio Distinção Brasil &quot;Gente do Ano&quot; – Centro Cultural de Pesquisas e Estudos Sociais (1995)</li>
            <li>• &quot;Colunista Social do Ano&quot; – Empresa Podium, de Cascavel/PR (1996)</li>
            <li>• Diploma &quot;Amigo do Clube&quot; – Foz do Iguaçu Country Clube (1997)</li>
            <li>• Troféu &quot;The Best&quot; – Colunista do Ano (1998)</li>
            <li>• Diploma de &quot;Grande Amigo da APACOS&quot; – Associação Paulista de Colunistas Sociais (1999)</li>
            <li>• Diploma de &quot;Honra ao Mérito&quot; – 12.º Congresso Brasileiro de Colunistas Sociais – FEBRACOS (2002)</li>
            <li>• Troféu &quot;Mulher Destaque&quot; – BPW – Associação Mulheres de Negócio de Foz (2006)</li>
            <li>• Troféu &quot;Top de Jornalismo Social&quot; – Confraria de Eventos Elaine Caús (2008)</li>
          </ul>
        </div>
        <div>
          <h3 className="font-headline font-bold text-[#ff751f] mb-4">ARY DE CAMPOS</h3>
          <ul className="space-y-1 text-[#4e5b60] text-sm">
            <li>• Cumprimentos pela Chefia da Arrecadação e Informações Econômicas Fiscais da Agência da Receita Federal de Angra dos Reis – RJ (1976)</li>
            <li>• Elogio a excelente performance e colaboração – Joseph Affonso Monteiro de Barros Menusier (1982)</li>
            <li>• Ofício cumprimentando pela excelente colaboração nas eleições – Dr. Luiz Sérgio Neiva (1992)</li>
            <li>• Eleito membro da ADESG – Associação dos Diplomados da Escola Superior de Guerra (1988)</li>
            <li>• Medalha de Ouro, Diploma de Honra ao Mérito – 56 Anos de Trabalhos no Serviço Público (1998)</li>
            <li>• Inauguração Espaço Cultural &quot;Ary de Campos&quot; – Faculdade UDC – União Dinâmica de Faculdades Cataratas (2004)</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-6 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Hoje
        </h2>
        <p className="text-[#4e5b60] mb-6">
          A empresa é tocada por uma equipe focada em dar continuidade ao trabalho iniciado pelos
          fundadores, liderados pelo filho do casal Marco Antonio Freire e pela sobrinha Ana Tereza
          Carvalho.
        </p>
        <div className="flex justify-center">
          <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-[#e8ebed] shadow-lg">
            <Image
              src="/images/nossa-historia/marco-ana.png"
              alt="Marco Antonio Freire e Ana Tereza Carvalho"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 448px"
            />
          </div>
        </div>
        <p className="text-center text-[#859eac] text-sm mt-3">
          Marco Antonio Freire e Ana Tereza Carvalho
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-4 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Canais de Comunicação
        </h2>
        <ul className="space-y-2 text-[#4e5b60]">
          <li>
            <strong>Portal Foz em Destaque:</strong>{" "}
            <a
              href="https://www.fozemdestaque.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              www.fozemdestaque.com
            </a>
          </li>
          <li>
            <strong>Foz TV:</strong>{" "}
            <a
              href="https://www.fozemdestaque.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              www.fozemdestaque.com
            </a>
          </li>
          <li>
            <strong>Redes Sociais:</strong>{" "}
            <a
              href="https://www.instagram.com/fozemdestaque"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              Instagram
            </a>
            {" · "}
            <a
              href="https://www.facebook.com/fozemdestaque"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              Facebook
            </a>
            {" · "}
            <a
              href="https://www.twitter.com/fozemdestaque"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              Twitter
            </a>
          </li>
          <li>
            <strong>Grupo Facebook:</strong>{" "}
            <a
              href="https://www.facebook.com/groups/fozemdestaque/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              Grupo Foz em Destaque
            </a>
          </li>
          <li>
            <strong>Certames de Beleza:</strong>{" "}
            <a
              href="https://www.certamesdebeleza.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:underline"
            >
              www.certamesdebeleza.com
            </a>
          </li>
        </ul>
      </section>

      <section className="bg-[#f5f6f7] rounded-xl p-6 border border-[#e8ebed]">
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-4 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Atividades
        </h2>
        <p className="text-[#4e5b60] mb-2">
          Além do colunismo social e marketing, realizamos eventos de beleza através da subsidiária
          Certames de Beleza. Também damos continuidade ao trabalho de fotografia e filmagem de
          eventos, garantindo farto conteúdo para nosso trabalho de Colunismo Social.
        </p>
      </section>
    </div>
  );
}
