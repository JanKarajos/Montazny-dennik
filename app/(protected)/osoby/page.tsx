import { PersonsClient } from "@/components/persons-client";
import { requirePermission } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export default async function PersonsPage() {
  await requirePermission("MANAGE_PERSONS");

  const persons = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zoznam osôb</h1>
        <p className="text-sm text-gray-600">
          Osoby, ktoré sa dajú vybrať pri zákazke v montážnom aj servisnom denníku. Odstránenie osoby zo zoznamu
          nezmení zákazky, pri ktorých už je uvedená.
        </p>
      </div>

      <PersonsClient persons={persons} />
    </section>
  );
}
