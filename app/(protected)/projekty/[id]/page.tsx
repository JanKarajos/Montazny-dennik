import { DiaryDetailPage } from "@/components/diary-detail-page";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  return <DiaryDetailPage id={id} type="ASSEMBLY" />;
}
