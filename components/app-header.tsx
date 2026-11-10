"use client";

import { ClipboardList, Menu, ShieldCheck, UserRound, Users, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { ManexLogo } from "@/components/manex-logo";

type Props = {
  userName: string;
  canManageUsers: boolean;
  canManagePersons: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof ClipboardList;
  isActive: (pathname: string) => boolean;
};

export function AppHeader({ userName, canManageUsers, canManagePersons }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  // Po prechode na inú stránku sa mobilné menu zatvorí.
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  const items: NavItem[] = [
    {
      href: "/",
      label: "Montážny denník",
      icon: ClipboardList,
      isActive: (path) => path === "/" || path.startsWith("/projekty"),
    },
    { href: "/servis", label: "Servisný denník", icon: Wrench, isActive: (path) => path.startsWith("/servis") },
    ...(canManagePersons
      ? [{ href: "/osoby", label: "Osoby", icon: Users, isActive: (path: string) => path.startsWith("/osoby") }]
      : []),
    { href: "/moj-profil", label: "Môj profil", icon: UserRound, isActive: (path) => path.startsWith("/moj-profil") },
    ...(canManageUsers
      ? [
          {
            href: "/sprava-pouzivatelov",
            label: "Správa používateľov",
            icon: ShieldCheck,
            isActive: (path: string) => path.startsWith("/sprava-pouzivatelov"),
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900 text-white print:hidden">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4 lg:py-3">
        <ManexLogo compact />

        <nav className="hidden flex-wrap items-center gap-2 text-sm lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 font-semibold transition hover:border-red-500 hover:bg-slate-800 ${
                item.isActive(pathname) ? "border-red-500 bg-slate-800 text-white" : "border-slate-700 text-gray-100"
              }`}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="text-right">
            <p className="text-xs text-gray-300">Prihlásený používateľ</p>
            <p className="text-sm font-semibold text-white">{userName}</p>
          </div>
          <LogoutButton />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-gray-100 hover:bg-slate-800 lg:hidden"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
          Menu
        </button>
      </div>

      {menuOpen ? (
        <div id="mobile-menu" className="border-t border-slate-700 px-3 pb-3 pt-2 lg:hidden">
          <nav className="grid gap-1 text-sm">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-3 font-semibold ${
                  item.isActive(pathname) ? "bg-slate-800 text-white ring-1 ring-red-500" : "text-gray-100 hover:bg-slate-800"
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-700 pt-3">
            <div>
              <p className="text-xs text-gray-300">Prihlásený používateľ</p>
              <p className="text-sm font-semibold text-white">{userName}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      ) : null}
    </header>
  );
}
