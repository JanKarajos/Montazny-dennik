import { DiaryDetailPage } from "@/components/diary-detail-page";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  return <DiaryDetailPage id={id} type="SERVICE" />;
}
