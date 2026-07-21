import { getSearchRecords } from "@/lib/search";
import { SearchBox } from "@/components/features/SearchBox";

export const metadata = { title: "Search — Haengwoon" };

export default function SearchPage() {
  const records = getSearchRecords();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Search</h1>
      <SearchBox records={records} />
    </div>
  );
}
