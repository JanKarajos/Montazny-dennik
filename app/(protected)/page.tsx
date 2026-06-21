import { DashboardClient } from "@/components/dashboard-client";
import { hasPermission } from "@/lib/guards";
import { requirePermission } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requirePermission("VIEW_PROJECTS");

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      createdAt: true,
    },
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zákazky</h1>
        <p className="text-sm text-gray-600">
          Prehľad aktívnych zákaziek. Vyberte projekt pre detail denníka prác.
        </p>
      </div>

      <DashboardClient
        canCreateProject={hasPermission(user, "CREATE_PROJECTS")}
        canDeleteProject={hasPermission(user, "DELETE_PROJECT")}
        projects={projects.map((project) => ({
          ...project,
          createdAt: project.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}
