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
        </div>
      </div>
    </div>
  );
}
