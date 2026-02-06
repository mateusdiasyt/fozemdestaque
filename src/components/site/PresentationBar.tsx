import { Instagram, Facebook, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_LINKS: { href: string; icon: LucideIcon | typeof XIcon; label: string }[] = [
  { href: "https://www.instagram.com/fozemdestaque/", icon: Instagram, label: "Instagram" },
  { href: "https://www.facebook.com/FozEmDestaque/", icon: Facebook, label: "Facebook" },
  { href: "https://www.youtube.com/c/FozemDestaque", icon: Youtube, label: "YouTube" },
  { href: "https://x.com/fozemdestaque", icon: XIcon, label: "X" },
];

export function PresentationBar() {
  return (
    <div className="bg-[#fafbfc] border-b border-[#e8ebed] py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <span className="inline-block h-1 w-12 bg-[#ff751f] rounded-full mb-4" />
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#1a1a1a] tracking-tight leading-tight">
            Região Trinacional
          </h2>
          <p className="mt-2 text-[#4e5b60] text-sm md:text-base font-medium">
            🇦🇷 Argentina · 🇧🇷 Brasil · 🇵🇾 Paraguai
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#4e5b60] hover:text-[#ff751f] transition-colors rounded-lg hover:bg-[#e8ebed]/50"
                aria-label={label}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" {...(Icon !== XIcon && { strokeWidth: 1.5 })} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
