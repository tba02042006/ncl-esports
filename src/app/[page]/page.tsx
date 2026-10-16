import { notFound } from "next/navigation";
import Site from "@/components/site";
import { pages } from "@/lib/data";
export function generateStaticParams() {
  return pages.filter((p) => p.id !== "home").map((p) => ({ page: p.id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const entry = pages.find((p) => p.id === page && p.id !== "home");
  if (!entry) notFound();
  return <Site page={entry.id} />;
}
