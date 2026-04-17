import type { DrillConfig } from '../domain/types';

interface DrillModePickerProps {
  drills: DrillConfig[];
  selectedId: string;
  onSelect(id: string): void;
}

export function DrillModePicker({ drills, selectedId, onSelect }: DrillModePickerProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
      Drill mode
      <select
        className="max-w-sm rounded border border-gray-300 bg-white px-3 py-2"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {drills.map((drill) => (
          <option key={drill.id} value={drill.id}>
            {drill.label}
          </option>
        ))}
      </select>
    </label>
  );
}
