import { notFound } from "next/navigation";
import Site from "@/components/site";
import { pages } from "@/lib/data";
import { loadPublicLeague } from "@/lib/public-data";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ tournament?: string }>;
}) {
  const { page } = await params;
  const entry = pages.find((p) => p.id === page && p.id !== "home");
  if (!entry) notFound();
  const query = await searchParams;
  return (
    <Site page={entry.id} snapshot={await loadPublicLeague(query.tournament)} />
  );
}
