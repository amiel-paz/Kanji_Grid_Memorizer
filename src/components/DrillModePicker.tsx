import type { DrillConfig } from '../domain/drills/types';

interface DrillModePickerProps {
  drills: DrillConfig[];
  selectedId: string;
  onSelect(id: string): void;
}

export function DrillModePicker({ drills, selectedId, onSelect }: DrillModePickerProps) {
  return (
    <label className="field-label">
      Drill mode
      <select
        className="field-control"
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
