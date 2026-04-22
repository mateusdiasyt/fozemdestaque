import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Cake,
  Calendar,
  CalendarDays,
  Lightbulb,
  Tag,
  Users,
  Zap,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

const PORTAL_MENU_ITEMS: NavItem[] = [
  { label: "Aniversários", href: "/categoria/aniversariantes", icon: Cake },
  { label: "Click Society", href: "/categoria/click-society", icon: Users },
  { label: "Reflexão", href: "/categoria/reflexao-do-dia", icon: Lightbulb },
  { label: "Datas", href: "/categoria/datas", icon: Calendar },
  { label: "Agenda", href: "/categoria/agenda", icon: CalendarDays },
  { label: "Ti-ti-ti", href: "/categoria/ti-ti-ti", icon: Zap },
  { label: "Merchandising", href: "/categoria/merchandising", icon: Tag },
  { label: "Empresa", href: "/nossa-historia", icon: BookOpen },
];

export const MAIN_NAV_ITEMS: NavItem[] = PORTAL_MENU_ITEMS;
export const MENU_ITEMS: NavItem[] = PORTAL_MENU_ITEMS;
export const HEADER_PRIMARY_CATEGORIES: NavItem[] = PORTAL_MENU_ITEMS;
