import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

export const MAIN_NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Nossa História", href: "/nossa-historia", icon: BookOpen },
  { label: "Produtos", href: "/produtos-servicos", icon: Package },
  { label: "Divulgue", href: "/divulgue-seu-aniversario", icon: Cake },
  { label: "Contatos", href: "/contatos", icon: Phone },
];

export const MENU_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
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
