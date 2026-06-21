import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/project-detail-client";
import { hasPermission, requirePermission } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const user = await requirePermission("VIEW_PROJECTS");
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      workLogs: {
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <ProjectDetailClient
        projectId={project.id}
        projectName={project.name}
        projectNumber={project.projectNumber}
        currentUserId={user.id}
        canEditProject={hasPermission(user, "EDIT_PROJECT")}
        canDeleteProject={hasPermission(user, "DELETE_PROJECT")}
        canAddLogs={hasPermission(user, "ADD_LOGS")}
        canManageAllLogs={hasPermission(user, "MANAGE_ALL_LOGS")}
        canUnlockProject={hasPermission(user, "UNLOCK_PROJECT")}
        employeeSignature={project.employeeSignature}
        employeeSignedAt={project.employeeSignedAt?.toISOString() ?? null}
        customerSignature={project.customerSignature}
        customerSignedAt={project.customerSignedAt?.toISOString() ?? null}
        isLocked={Boolean(project.employeeSignedAt && project.customerSignedAt)}
        logs={project.workLogs.map((log) => ({
          id: log.id,
          authorId: log.userId,
          date: log.date.toISOString(),
          startTime: log.startTime.toISOString(),
          endTime: log.endTime.toISOString(),
          durationInMinutes: log.durationInMinutes,
          description: log.description,
          authorName: log.user?.name ?? "Bývalý zamestnanec",
        }))}
      />
    </section>
  );
}
