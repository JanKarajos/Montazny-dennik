import { AppHeader } from "@/components/app-header";
import { ManexFooter } from "@/components/manex-footer";
import { hasPermission, requireUser } from "@/lib/guards";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        userName={user.name}
        canManageUsers={hasPermission(user, "MANAGE_USERS")}
        canManagePersons={hasPermission(user, "MANAGE_PERSONS")}
      />

      <div className="mx-auto w-full max-w-7xl px-2 py-2 sm:px-4 sm:py-4">
        <main className="min-h-[calc(100vh-11rem)] rounded-2xl border border-gray-200 bg-white px-3 py-4 shadow-sm sm:px-4 sm:py-6 md:px-6">
          {children}
        </main>
      </div>

      <ManexFooter />
    </div>
  );
}
