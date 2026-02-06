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
    <nav className="bg-white rounded-lg shadow-md border border-[#e8ebed] p-4 sticky top-4">
      <h3 className="text-xs font-bold text-[#ff751f] uppercase tracking-wider mb-4 pb-2 border-b-2 border-[#ff751f]">
        Seções
      </h3>
      <ul className="space-y-1">
        {MENU_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block py-2.5 px-3 text-[#4e5b60] hover:text-[#ff751f] hover:bg-[#fff8f3] rounded-md transition-colors font-medium"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
