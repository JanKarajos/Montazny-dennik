type ManexLogoProps = {
  compact?: boolean;
};

export function ManexLogo({ compact = false }: ManexLogoProps) {
  const compactIconHeight = 40;
  const compactIconWidth = 72;

  if (compact) {
    return (
      <div className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-gray-200 sm:gap-2.5 sm:px-2.5 sm:py-1.5">
        <img
          src="/logo-manex.png"
          alt="Logo MANEX"
          width={compactIconWidth}
          height={compactIconHeight}
          className="h-9 w-auto object-contain sm:h-[50px]"
          loading="eager"
        />
        <span className="whitespace-nowrap text-base font-bold leading-none tracking-wide text-slate-900 sm:text-lg">Montážny denník</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center justify-center overflow-hidden rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-gray-200">
        <img
          src="/logo-manex.png"
          alt="Logo MANEX"
          width={110}
          height={55}
          className="h-auto w-auto max-w-[140px] object-contain sm:max-w-none"
          loading="eager"
        />
      </div>
      <div className="leading-tight">
        <p className="text-base font-bold text-slate-900">MANEX - Montážny denník</p>
        <p className="text-base text-gray-600 sm:text-xl">Firemný systém montážnych denníkov</p>
      </div>
    </div>
  );
}
