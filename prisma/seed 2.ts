import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const corePermissions = [
  { code: "VIEW_PROJECTS", description: "Zobrazenie zákaziek" },
  { code: "CREATE_PROJECTS", description: "Vytváranie nových zákaziek" },
  { code: "EDIT_PROJECT", description: "Úprava čísla a názvu zákazky" },
  { code: "ADD_LOGS", description: "Pridávanie záznamov prác" },
  { code: "MANAGE_USERS", description: "Správa používateľov a rolí" },
] as const;

function dateAt(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

async function ensurePermission(code: string, description: string) {
  return prisma.permission.upsert({
    where: { code },
    update: { description },
    create: { code, description },
  });
}

async function ensureRole(name: string, permissionIds: string[]) {
  const role = await prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
    select: { id: true },
  });

  await prisma.role.update({
    where: { id: role.id },
    data: {
      permissions: {
        set: permissionIds.map((id) => ({ id })),
      },
    },
  });

  return role;
}

async function main() {
  const permissions = await Promise.all(
    corePermissions.map((permission) => ensurePermission(permission.code, permission.description)),
  );

  const permissionsByCode = Object.fromEntries(permissions.map((permission) => [permission.code, permission]));

  const veduciMontazeRole = await ensureRole(
    "Vedúci montáže",
    permissions.map((permission) => permission.id),
  );

  const technikRole = await ensureRole("Technik", [
    permissionsByCode.VIEW_PROJECTS.id,
    permissionsByCode.ADD_LOGS.id,
  ]);

  const adminPassword = await bcrypt.hash("admin123", 10);
  const monterPassword = await bcrypt.hash("monter123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@firma.sk" },
    update: {
      name: "Peter Admin",
      password: adminPassword,
      roleId: veduciMontazeRole.id,
      permissions: {
        set: permissions.map((permission) => ({ id: permission.id })),
      },
    },
    create: {
      name: "Peter Admin",
      email: "admin@firma.sk",
      password: adminPassword,
      roleId: veduciMontazeRole.id,
      permissions: {
        connect: permissions.map((permission) => ({ id: permission.id })),
      },
    },
  });

  const monter = await prisma.user.upsert({
    where: { email: "monter@firma.sk" },
    update: {
      name: "Jozef Monter",
      password: monterPassword,
      roleId: technikRole.id,
      permissions: {
        set: [{ id: permissionsByCode.VIEW_PROJECTS.id }, { id: permissionsByCode.ADD_LOGS.id }],
      },
    },
    create: {
      name: "Jozef Monter",
      email: "monter@firma.sk",
      password: monterPassword,
      roleId: technikRole.id,
      permissions: {
        connect: [{ id: permissionsByCode.VIEW_PROJECTS.id }, { id: permissionsByCode.ADD_LOGS.id }],
      },
    },
  });

  const sampleProjects = [
    { projectNumber: "334", name: "Montáž linky A" },
    { projectNumber: "335", name: "Modernizácia rozvádzača B" },
    { projectNumber: "336", name: "Servis robotickej bunky C" },
  ];

  for (const project of sampleProjects) {
    await prisma.project.upsert({
      where: { projectNumber: project.projectNumber },
      update: { name: project.name },
      create: project,
    });
  }

  const project334 = await prisma.project.findUnique({ where: { projectNumber: "334" }, select: { id: true } });

  if (project334) {
    const existingLogs = await prisma.workLog.count({ where: { projectId: project334.id } });

    if (existingLogs === 0) {
      const logs = [
        {
          projectId: project334.id,
          userId: admin.id,
          date: "2026-06-15",
          from: "07:00",
          to: "11:30",
          description: "Príprava kabeláže a osadenie svoriek v hlavnom rozvádzači.",
        },
        {
          projectId: project334.id,
          userId: monter.id,
          date: "2026-06-16",
          from: "08:00",
          to: "15:00",
          description: "Zapojenie istiacej vetvy a funkčné testy I/O modulov.",
        },
      ];

      for (const log of logs) {
        const startTime = dateAt(log.date, log.from);
        const endTime = dateAt(log.date, log.to);

        await prisma.workLog.create({
          data: {
            projectId: log.projectId,
            userId: log.userId,
            description: log.description,
            date: dateAt(log.date, "00:00"),
            startTime,
            endTime,
            durationInMinutes: Math.round((endTime.getTime() - startTime.getTime()) / 60000),
          },
        });
      }
    }
  }

  console.log("Seed dokončený.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
