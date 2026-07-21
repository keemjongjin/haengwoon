import { ScrambleText } from "@/components/resume/ScrambleText";

export const metadata = { title: "Resume — Haengwoon" };

export default function ResumePage() {
  return (
    <div>
      <h1 className="font-mono text-3xl font-bold tracking-tight">
        <ScrambleText text="jongjin — Frontend Developer" />
      </h1>
      <p className="mt-3 text-mut">
        이력서 페이지. (내용은 추후 채움 — 스크램블 디코딩 효과 데모)
      </p>

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-medium text-mut">Skills</h2>
        <p className="font-mono">
          <ScrambleText text="TypeScript · React · Next.js · Node" duration={1200} />
        </p>
      </section>
    </div>
  );
}
