import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contatos",
  description: "Entre em contato com a Foz em Destaque - comercial, editorial, serviços e recursos humanos.",
};

const CONTATOS = [
  { titulo: "Comercial", fone: "+55 45 3027-4890 / +55 45 99968-1122", tel: "5545999681122", whatsapp: "5545999681122", email: "comercial@fozemdestaque.com" },
  { titulo: "Editorial", fone: "+55 45 99818-9829", tel: "5545998189829", whatsapp: "5545998189829", email: "pauta@fozemdestaque.com" },
  { titulo: "Serviços", fone: "+55 45 98838-3009", tel: "5545988383009", whatsapp: "5545988383009", email: "atendimento@fozemdestaque.com" },
  { titulo: "Recursos Humanos", fone: "+55 45 99910-7454", tel: "5545999107454", whatsapp: "5545999107454", email: "oportunidade@fozemdestaque.com" },
];

export default function ContatosPage() {
  return (
    <div className="space-y-10">
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
            Contatos
          </h1>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CONTATOS.map((c) => (
          <div
            key={c.titulo}
            className="bg-white rounded-xl border border-[#e8ebed] p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="font-headline text-lg font-bold text-[#ff751f] mb-4">{c.titulo}</h2>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <a
                href={`tel:+${c.tel}`}
                className="flex items-center gap-2 text-[#4e5b60] hover:text-[#ff751f] transition-colors"
              >
                <Phone className="w-5 h-5 shrink-0" />
                <span>{c.fone}</span>
              </a>
              <a
                href={`https://wa.me/${c.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 hover:text-green-700"
                title="WhatsApp"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">WhatsApp</span>
              </a>
            </div>
            <a
              href={`mailto:${c.email}`}
              className="flex items-center gap-3 text-[#4e5b60] hover:text-[#ff751f] transition-colors"
            >
              <Mail className="w-5 h-5 shrink-0" />
              <span>{c.email}</span>
            </a>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-xl border border-[#e8ebed] p-6 shadow-sm">
        <h2 className="font-headline text-lg font-bold text-[#ff751f] mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Endereço para correspondência
        </h2>
        <p className="text-[#4e5b60]">
          Rua Socó, 221. Conjunto Itaipu A – Foz do Iguaçu/PR. CEP: 85.866-380
        </p>
      </section>
    </div>
  );
}
