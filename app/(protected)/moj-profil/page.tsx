import { MyProfileClient } from "@/components/my-profile-client";
import { requireUser } from "@/lib/guards";

export default async function MojProfilPage() {
  const user = await requireUser();

  return <MyProfileClient userName={user.name} userEmail={user.email} />;
}
