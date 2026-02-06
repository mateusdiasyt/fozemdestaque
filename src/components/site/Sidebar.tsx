import Link from "next/link";
import {
  Lightbulb,
  Calendar,
  Cake,
  Package,
  Phone,
  Users,
  Zap,
  Briefcase,
  CalendarDays,
  Tag,
  Star,
  Crown,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const MENU_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Nossa História", href: "/nossa-historia", icon: BookOpen },
  { label: "Produtos e Serviços", href: "/produtos-servicos", icon: Package },
  { label: "Divulgue seu Aniversário", href: "/divulgue-seu-aniversario", icon: Cake },
  { label: "Contatos", href: "/contatos", icon: Phone },
  { label: "Reflexão", href: "/categoria/reflexao", icon: Lightbulb },
  { label: "Datas", href: "/categoria/datas", icon: Calendar },
  { label: "Aniversários", href: "/categoria/aniversarios", icon: Cake },
  { label: "Society", href: "/categoria/society", icon: Users },
  { label: "Ti-ti-ti", href: "/categoria/ti-ti-ti", icon: Zap },
  { label: "Top Profissional", href: "/categoria/top-profissional", icon: Briefcase },
  { label: "Agenda", href: "/categoria/agenda", icon: CalendarDays },
  { label: "Merchandising", href: "/categoria/merchandising", icon: Tag },
  { label: "Foz em Destaque", href: "/categoria/foz-em-destaque", icon: Star },
  { label: "High Society Club", href: "/categoria/high-society-club", icon: Crown },
];

export function Sidebar() {
  return (
    <nav className="sticky top-4">
      <ul className="space-y-0.5">
        {MENU_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-[#4e5b60] hover:text-[#ff751f] hover:bg-[#f8f9fa] rounded-lg transition-colors text-sm"
            >
              <item.icon className="w-4 h-4 shrink-0 opacity-70" strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
