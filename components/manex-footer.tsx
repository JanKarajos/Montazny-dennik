export function ManexFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-3 text-center text-xs text-gray-600 print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4">
        <span>MANEX s.r.o., Rastislavova 102, 040 01 Košice, Slovenská republika</span>
        <span>info@manex.sk</span>
        <span>www.manex.sk</span>
        <span>{`© ${new Date().getFullYear()} MANEX s.r.o.`}</span>
      </div>
    </footer>
  );
}
