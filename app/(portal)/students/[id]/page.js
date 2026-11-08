import PortalScreen from "@/components/PortalScreen";

export default async function StudentPage({ params }) {
  const { id } = await params;
  return <PortalScreen studentId={id} />;
}
