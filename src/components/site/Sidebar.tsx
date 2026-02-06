import Link from "next/link";
import { MENU_ITEMS } from "@/lib/menu-items";

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
