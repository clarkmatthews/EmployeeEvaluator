import type { LevelSource } from "@/lib/scoring";
import { levelsOf } from "@/lib/scoring";
import { inputClass } from "@/components/ui";

const defaults = [
  { level: 1, label: "Unsatisfactory", score: 5, min: -100 },
  { level: 2, label: "Needs improvement", score: 10, min: -15 },
  { level: 3, label: "Meets expectations", score: 15, min: 0 },
  { level: 4, label: "Exceeds expectations", score: 20, min: 10 },
  { level: 5, label: "Outstanding", score: 25, min: 25 },
];

export function LevelFields({ item }: { item?: LevelSource }) {
  const levels = item ? levelsOf(item) : defaults.map((level) => ({ ...level, included: true }));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_90px_110px] gap-2 text-xs text-slate-500">
        <span>Use</span><span>Label</span><span>Points</span><span>Minimum</span>
      </div>
      {levels.map((level) => (
        <div key={level.level} className="grid grid-cols-[auto_1fr_90px_110px] items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input name={`p${level.level}Incl`} type="checkbox" defaultChecked={level.included} />
            {level.level}
          </label>
          <input className={inputClass} name={`p${level.level}Label`} defaultValue={level.label} />
          <input className={inputClass} name={`p${level.level}Score`} type="number" defaultValue={level.score} />
          <input className={inputClass} name={`p${level.level}Min`} type="number" step="0.01" defaultValue={level.min ?? ""} />
        </div>
      ))}
    </div>
  );
}
