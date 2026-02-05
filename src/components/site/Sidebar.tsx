import Link from "next/link";

const MENU_ITEMS = [
  { label: "Reflexão", href: "/categoria/reflexao" },
  { label: "Datas", href: "/categoria/datas" },
  { label: "Aniversários", href: "/categoria/aniversarios" },
  { label: "Society", href: "/categoria/society" },
  { label: "Ti-ti-ti", href: "/categoria/ti-ti-ti" },
  { label: "Top Profissional", href: "/categoria/top-profissional" },
  { label: "Agenda", href: "/categoria/agenda" },
  { label: "Merchandising", href: "/categoria/merchandising" },
  { label: "Foz em Destaque", href: "/categoria/foz-em-destaque" },
  { label: "High Society Club", href: "/categoria/high-society-club" },
];

export function Sidebar() {
  return (
    <nav className="space-y-1">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Menu</h3>
      {MENU_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block py-2 text-slate-700 hover:text-blue-600 hover:font-medium transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
