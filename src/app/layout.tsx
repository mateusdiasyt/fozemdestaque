import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Sora } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Foz em Destaque",
  description: "Portal de conteúdo e eventos de Foz do Iguaçu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <Script id="google-translate-init" strategy="beforeInteractive">
          {`
            function googleTranslateElementInit() {
              if (typeof google !== 'undefined' && google.translate) {
                new google.translate.TranslateElement({
                  pageLanguage: 'pt',
                  includedLanguages: 'en,es,pt',
                  layout: google.translate.TranslateElement.InlineLayout.SIMPLE
                }, 'google_translate_element');
              }
            }
          `}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${manrope.variable} ${sora.variable} antialiased`}
      >
        <div id="google_translate_element" className="invisible absolute w-0 h-0 overflow-hidden" aria-hidden />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
