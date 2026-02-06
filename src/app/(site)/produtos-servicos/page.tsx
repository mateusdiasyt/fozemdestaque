import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produtos e Serviços",
  description:
    "Marketing, filmagem de eventos, cobertura fotográfica e eventos de beleza. Seja destaque na coluna social.",
};

export default function ProdutosServicosPage() {
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
            Produtos e Serviços
          </h1>
        </div>
      </header>

      <section>
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-4 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Marketing e Propaganda
        </h2>
        <p className="text-[#4e5b60] text-lg">
          Seja destaque em nossa coluna social e ganhe relevância no Google.
        </p>
        <p className="text-[#4e5b60] mt-2">
          Participe e apareça em nossos eventos:
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filmagem de eventos */}
        <div className="bg-white rounded-xl border border-[#e8ebed] p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-headline text-lg font-bold text-[#ff751f] mb-4">
            Filmagem de eventos
          </h3>
          <p className="text-[#4e5b60] text-sm mb-4">Inclui:</p>
          <ul className="space-y-2 text-[#4e5b60] text-sm">
            <li>• Câmera Man profissional</li>
            <li>• Repórter</li>
            <li>• Equipamentos profissionais</li>
            <li>• Edição do vídeo</li>
            <li>• Divulgação na Foz TV</li>
            <li>• Divulgação em nossas mídias: Portal, fanpage e Instagram @fozemdestaque</li>
          </ul>
        </div>

        {/* Eventos de beleza */}
        <div className="bg-white rounded-xl border border-[#e8ebed] p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-center mb-4">
            <div className="relative h-24 w-48">
              <Image
                src="/images/produtos-servicos/certames-de-beleza.png"
                alt="Certames de Beleza"
                fill
                className="object-contain"
                sizes="192px"
              />
            </div>
          </div>
          <h3 className="font-headline text-lg font-bold text-[#ff751f] mb-4">
            Eventos de beleza
          </h3>
          <p className="text-[#4e5b60] text-sm mb-4">
            Patrocine e participe de nossos eventos de beleza:
          </p>
          <ul className="space-y-1 text-[#4e5b60] text-sm font-medium">
            <li>• MISS FOZ DO IGUAÇU</li>
            <li>• RAINHA DO TURISMO</li>
            <li>• MISS PARANÁ GLOBO</li>
          </ul>
          <Link
            href="https://www.certamesdebeleza.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm text-[#ff751f] hover:underline font-medium"
          >
            Saiba mais em certamesdebeleza.com →
          </Link>
        </div>

        {/* Cobertura fotográfica */}
        <div className="bg-white rounded-xl border border-[#e8ebed] p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-headline text-lg font-bold text-[#ff751f] mb-4">
            Cobertura fotográfica
          </h3>
          <p className="text-[#4e5b60] text-sm mb-4">Inclui:</p>
          <ul className="space-y-2 text-[#4e5b60] text-sm">
            <li>• Fotógrafo profissional</li>
            <li>• Equipamentos profissionais</li>
            <li>• Fotos com tratamento digital</li>
            <li>• Divulgação em nossas mídias: Portal, fanpage e Instagram @fozemdestaque</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
