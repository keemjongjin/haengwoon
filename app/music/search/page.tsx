import { buildMusicSearchIndex } from "@/lib/musicSearchIndex";
import { MusicSearch } from "@/components/music/MusicSearch";

export const metadata = { title: "Search — Music — Haengwoon" };
export const dynamic = "force-dynamic";

export default async function MusicSearchPage() {
  const index = await buildMusicSearchIndex();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Search</h1>
      <MusicSearch index={index} />
    </div>
  );
}
