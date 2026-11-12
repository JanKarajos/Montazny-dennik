import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/project-detail-client";
import { DiaryTypeCode } from "@/lib/diary-types";
import { hasPermission, requirePermission } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function DiaryDetailPage({ id, type }: { id: string; type: DiaryTypeCode }) {
  const user = await requirePermission("VIEW_PROJECTS");

  const project = await prisma.project.findFirst({
    where: { id, type },
    include: {
      completedBy: { select: { name: true } },
      persons: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      issues: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          resolution: true,
          status: true,
          createdById: true,
          createdAt: true,
          resolvedAt: true,
          createdBy: { select: { name: true } },
          resolvedBy: { select: { name: true } },
          photos: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, uploadedById: true } },
        },
      },
      signedProtocol: {
        select: {
          fileName: true,
          size: true,
          uploadedAt: true,
          uploadedBy: { select: { name: true } },
        },
      },
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

  const personList = await prisma.person.findMany({ orderBy: { name: "asc" }, select: { name: true } });

  return (
    <section className="space-y-4">
      <ProjectDetailClient
        diaryType={type}
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
        isLocked={project.completedAt !== null}
        canCompleteProject={hasPermission(user, "EDIT_PROJECT")}
        canManagePersons={hasPermission(user, "MANAGE_PERSONS")}
        persons={project.persons}
        issues={project.issues.map((issue) => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          resolution: issue.resolution,
          status: issue.status,
          createdById: issue.createdById,
          createdByName: issue.createdBy?.name ?? null,
          createdAt: issue.createdAt.toISOString(),
          resolvedByName: issue.resolvedBy?.name ?? null,
          resolvedAt: issue.resolvedAt?.toISOString() ?? null,
          photos: issue.photos,
        }))}
        personListNames={personList.map((person) => person.name)}
        completedAt={project.completedAt?.toISOString() ?? null}
        completionMethod={project.completionMethod}
        completedByName={project.completedBy?.name ?? null}
        signedProtocol={
          project.signedProtocol
            ? {
                fileName: project.signedProtocol.fileName,
                size: project.signedProtocol.size,
                uploadedAt: project.signedProtocol.uploadedAt.toISOString(),
                uploadedByName: project.signedProtocol.uploadedBy?.name ?? null,
              }
            : null
        }
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
