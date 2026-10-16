import Site from "@/components/site";
import { loadPublicLeague } from "@/lib/public-data";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>;
}) {
  const query = await searchParams;
  return (
    <Site page="home" snapshot={await loadPublicLeague(query.tournament)} />
  );
}
