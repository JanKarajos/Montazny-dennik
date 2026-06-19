-- AlterTable
ALTER TABLE "public"."Permission" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Project" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Role" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."WorkLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."_RolePermissions" ADD CONSTRAINT "_RolePermissions_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_RolePermissions_AB_unique";

-- AlterTable
ALTER TABLE "public"."_UserPermissions" ADD CONSTRAINT "_UserPermissions_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_UserPermissions_AB_unique";
