import { DashboardClient } from "@/components/dashboard-client";
import { DIARY_CONFIG, DiaryTypeCode } from "@/lib/diary-types";
import { hasPermission, requirePermission } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function DiaryListPage({ type }: { type: DiaryTypeCode }) {
  const user = await requirePermission("VIEW_PROJECTS");
  const config = DIARY_CONFIG[type];

  const projects = await prisma.project.findMany({
    where: { type },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">{config.diaryName}</p>
        <h1 className="text-2xl font-bold text-slate-900">{config.listTitle}</h1>
        <p className="text-sm text-gray-600">{config.listDescription}</p>
      </div>

      <DashboardClient
        diaryType={type}
        canCreateProject={hasPermission(user, "CREATE_PROJECTS")}
        canDeleteProject={hasPermission(user, "DELETE_PROJECT")}
        projects={projects.map((project) => ({
          id: project.id,
          projectNumber: project.projectNumber,
          name: project.name,
          createdAt: project.createdAt.toISOString(),
          isCompleted: project.completedAt !== null,
        }))}
      />
    </section>
  );
}
