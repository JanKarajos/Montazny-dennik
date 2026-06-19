import Link from "next/link";
import { Building2, ClipboardList, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { hasPermission, requireUser } from "@/lib/guards";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900 text-white print:hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-red-600 p-2">
              <Building2 size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">Montážny Denník</p>
              <p className="text-xs text-gray-300">{user.name}</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 font-medium text-gray-100 transition hover:bg-slate-800"
            >
              <ClipboardList size={15} />
              Zákazky
            </Link>

            {hasPermission(user, "MANAGE_USERS") ? (
              <Link
                href="/sprava-pouzivatelov"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 font-medium text-gray-100 transition hover:bg-slate-800"
              >
                <ShieldCheck size={15} />
                Správa používateľov
              </Link>
            ) : null}

            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
