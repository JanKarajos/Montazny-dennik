type ManexLogoProps = {
  compact?: boolean;
};

export function ManexLogo({ compact = false }: ManexLogoProps) {
  const compactIconHeight = 40;
  const compactIconWidth = 72;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-gray-200">
        <img
          src="/logo-manex.png"
          alt="MANEX logo"
          width={compactIconWidth}
          height={compactIconHeight}
          className="h-[50px] w-auto object-contain"
          loading="eager"
        />
        <span className="whitespace-nowrap text-lg font-bold leading-none tracking-wide text-slate-900">Montážny denník</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center overflow-hidden rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-gray-200">
        <img
          src="/logo-manex.png"
          alt="MANEX logo"
          width={110}
          height={55}
          className="h-auto w-auto object-contain"
          loading="eager"
        />
      </div>
      <div className="leading-tight">
        <p className="text-base font-bold text-slate-900">MANEX - Montážny denník</p>
        <p className="text-xl text-gray-600">Firemný systém montážnych protokolov</p>
      </div>
    </div>
  );
}
