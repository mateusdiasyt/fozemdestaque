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
  Tv,
  Sparkles,
  Heart,
  Mail,
  Baby,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Nossa História", href: "/nossa-historia", icon: BookOpen },
  { label: "Produtos", href: "/produtos-servicos", icon: Package },
  { label: "Divulgue", href: "/divulgue-seu-aniversario", icon: Cake },
  { label: "Contatos", href: "/contatos", icon: Phone },
];

export const MENU_ITEMS: NavItem[] = [
  { label: "Nossa História", href: "/nossa-historia", icon: BookOpen },
  { label: "Produtos e Serviços", href: "/produtos-servicos", icon: Package },
  { label: "Divulgue seu Aniversário", href: "/divulgue-seu-aniversario", icon: Cake },
  { label: "Contatos", href: "/contatos", icon: Phone },
  { label: "Reflexão", href: "/categoria/reflexao", icon: Lightbulb },
  { label: "Datas", href: "/categoria/datas", icon: Calendar },
  { label: "Aniversários", href: "/categoria/aniversariantes", icon: Cake },
  { label: "Society", href: "/categoria/society", icon: Users },
  { label: "Ti-ti-ti", href: "/categoria/ti-ti-ti", icon: Zap },
  { label: "Top Profissional", href: "/categoria/top-profissional", icon: Briefcase },
  { label: "Agenda", href: "/categoria/agenda", icon: CalendarDays },
  { label: "Merchandising", href: "/categoria/merchandising", icon: Tag },
  { label: "Foz em Destaque", href: "/categoria/foz-em-destaque", icon: Star },
  { label: "High Society Club", href: "/categoria/high-society-club", icon: Crown },
];

export const HEADER_PRIMARY_CATEGORIES: NavItem[] = [
  { label: "Aniversários", href: "/categoria/aniversariantes", icon: Cake },
  { label: "Agenda", href: "/categoria/agenda", icon: CalendarDays },
  { label: "Click Society", href: "/categoria/society", icon: Users },
  { label: "Merchandising", href: "/categoria/merchandising", icon: Tag },
  { label: "Ti-ti-ti", href: "/categoria/ti-ti-ti", icon: Zap },
];

export const HEADER_MORE_CATEGORIES: NavItem[] = [
  { label: "Programa Foz em Destaque TV", href: "/categoria/programa-foz-em-destaque-tv", icon: Tv },
  { label: "Bela da Sociedade", href: "/categoria/bela-da-sociedade", icon: Sparkles },
  { label: "Beleza amp Saude", href: "/categoria/beleza-amp-saude", icon: Heart },
  { label: "Coluna Social", href: "/categoria/coluna-social", icon: Users },
  { label: "Foz em Destaque TV", href: "/categoria/foz-em-destaque-tv", icon: Tv },
  { label: "Mailing", href: "/categoria/mailing", icon: Mail },
  { label: "Par Perfeito", href: "/categoria/par-perfeito", icon: Heart },
  { label: "Top Mirim", href: "/categoria/top-mirim", icon: Baby },
  { label: "Top Profissional", href: "/categoria/top-profissional", icon: Briefcase },
];
