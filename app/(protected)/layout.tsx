import Link from "next/link";
import { ClipboardList, ShieldCheck, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ManexFooter } from "@/components/manex-footer";
import { ManexLogo } from "@/components/manex-logo";
import { hasPermission, requireUser } from "@/lib/guards";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const canManageUsers = hasPermission(user, "MANAGE_USERS");

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900 text-white print:hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <ManexLogo compact />

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 font-semibold text-gray-100 transition hover:border-red-500 hover:bg-slate-800"
            >
              <ClipboardList size={15} />
              Zákazky
            </Link>

            <Link
              href="/moj-profil"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 font-semibold text-gray-100 transition hover:border-red-500 hover:bg-slate-800"
            >
              <UserRound size={15} />
              Môj profil
            </Link>

            {canManageUsers ? (
              <Link
                href="/sprava-pouzivatelov"
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 font-semibold text-gray-100 transition hover:border-red-500 hover:bg-slate-800"
              >
                <ShieldCheck size={15} />
                Správa používateľov
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-300">Prihlásený používateľ</p>
              <p className="text-sm font-semibold text-white">{user.name}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-4">
        <main className="min-h-[calc(100vh-11rem)] rounded-2xl border border-gray-200 bg-white px-4 py-6 shadow-sm md:px-6">{children}</main>
      </div>

      <ManexFooter />
    </div>
  );
}
