import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content", "projects");

export type ProjectMeta = {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  heroImage?: string;
  tags: string[];
};

export type Project = ProjectMeta & { content: string };

function read(slug: string) {
  return matter(fs.readFileSync(path.join(DIR, `${slug}.mdx`), "utf-8"));
}

function toMeta(slug: string): ProjectMeta {
  const { data } = read(slug);
  return {
    slug,
    title: data.title,
    description: data.description,
    pubDate: String(data.pubDate),
    heroImage: data.heroImage,
    tags: data.tags ?? [],
  };
}

export function getAllProjectSlugs(): string[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getAllProjects(): ProjectMeta[] {
  return getAllProjectSlugs()
    .map(toMeta)
    .sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));
}

export function getProject(slug: string): Project {
  const { content } = read(slug);
  return { ...toMeta(slug), content };
}
