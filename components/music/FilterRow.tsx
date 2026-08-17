// Archive/Charts가 공유하는 필터 pill 한 줄(연도·장르 등). 각자 파일에 복사해두면 한쪽만
// pill 스타일이 바뀌었을 때 모양이 갈라지는 걸 반복해서 겪어서(PostExcerptItem과 같은 이유) 뺐다.
export function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="w-8 text-xs text-mut">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "rounded-full px-3 py-1 text-xs " +
            (value === o ? "bg-acc text-on-acc" : "border border-line text-mut hover:text-fg")
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}
