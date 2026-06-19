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
        canEditProject={hasPermission(user, "EDIT_PROJECT")}
        canAddLogs={hasPermission(user, "ADD_LOGS")}
        logs={project.workLogs.map((log) => ({
          id: log.id,
          date: log.date.toISOString(),
          startTime: log.startTime.toISOString(),
          endTime: log.endTime.toISOString(),
          durationInMinutes: log.durationInMinutes,
          description: log.description,
          authorName: log.user.name,
        }))}
      />
    </section>
  );
}
