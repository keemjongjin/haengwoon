import Link from "next/link";
import { getAllProjects } from "@/lib/projects";

export const metadata = { title: "Projects — Haengwoon" };

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <Link
            key={p.slug}
            href={`/projects/${p.slug}`}
            className="block rounded-xl border border-line bg-card p-5 transition-colors hover:border-acc"
          >
            <h2 className="font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm text-mut">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span key={t} className="text-xs text-acc">
                  #{t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
