import { Instagram, Facebook, Twitter } from "lucide-react";

const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/fozemdestaque", icon: Instagram, label: "Instagram" },
  { href: "https://www.facebook.com/fozemdestaque", icon: Facebook, label: "Facebook" },
  { href: "https://www.twitter.com/fozemdestaque", icon: Twitter, label: "Twitter" },
] as const;

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
                <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
