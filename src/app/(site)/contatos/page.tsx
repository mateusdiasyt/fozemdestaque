import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contatos",
  description:
    "Entre em contato com a Foz em Destaque - comercial, editorial, serviços e recursos humanos.",
};

const CONTATOS = [
  {
    titulo: "Comercial",
    fone: "+55 45 3027-4890 / +55 45 99968-1122",
    tel: "5545999681122",
    whatsapp: "5545999681122",
    email: "comercial@fozemdestaque.com",
  },
  {
    titulo: "Editorial",
    fone: "+55 45 99818-9829",
    tel: "5545998189829",
    whatsapp: "5545998189829",
    email: "pauta@fozemdestaque.com",
  },
  {
    titulo: "Serviços",
    fone: "+55 45 98838-3009",
    tel: "5545988383009",
    whatsapp: "5545988383009",
    email: "atendimento@fozemdestaque.com",
  },
  {
    titulo: "Recursos Humanos",
    fone: "+55 45 99910-7454",
    tel: "5545999107454",
    whatsapp: "5545999107454",
    email: "oportunidade@fozemdestaque.com",
  },
];

export default function ContatosPage() {
  return (
    <article className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#ff751f] transition-colors mb-12"
      >
        ← Voltar ao início
      </Link>

      <header className="mb-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
          Contatos
        </h1>
        <p className="mt-6 text-slate-600 text-lg leading-relaxed">
          Entre em contato com a Foz em Destaque — comercial, editorial, serviços e recursos
          humanos.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        {CONTATOS.map((c) => (
          <div
            key={c.titulo}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-sm font-semibold text-[#ff751f] uppercase tracking-wider mb-4">
              {c.titulo}
            </h2>
            <div className="space-y-3">
              <a
                href={`tel:+${c.tel}`}
                className="flex items-center gap-3 text-slate-600 hover:text-[#ff751f] transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="text-sm">{c.fone}</span>
              </a>
              <a
                href={`https://wa.me/${c.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-600 hover:text-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="text-sm">WhatsApp</span>
              </a>
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-3 text-slate-600 hover:text-[#ff751f] transition-colors"
              >
                <Mail className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="text-sm break-all">{c.email}</span>
              </a>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-slate-50 border border-slate-100 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-400" />
          Endereço para correspondência
        </h2>
        <p className="text-slate-600">
          Rua Socó, 221. Conjunto Itaipu A – Foz do Iguaçu/PR. CEP: 85.866-380
        </p>
      </section>
    </article>
  );
}
