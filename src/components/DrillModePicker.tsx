import type { DrillConfig } from '../domain/drills/types';

interface DrillModePickerProps {
  drills: DrillConfig[];
  selectedId: string;
  onSelect(id: string): void;
}

export function DrillModePicker({ drills, selectedId, onSelect }: DrillModePickerProps) {
  return (
    <fieldset className="surface-panel drill-picker">
      <legend className="section-title">Choose a drill</legend>
      <p className="fine-print">
        Switch the study surface without changing deck ownership, persistence, or progress rules.
      </p>
      <div className="drill-picker-options" role="radiogroup" aria-label="Drill mode">
        {drills.map((drill) => (
          <label
            key={drill.id}
            className={`drill-option ${drill.id === selectedId ? 'drill-option-selected' : ''}`}
          >
            <input
              checked={drill.id === selectedId}
              className="sr-only"
              name="drill-mode"
              type="radio"
              value={drill.id}
              onChange={() => onSelect(drill.id)}
            />
            <span className="drill-option-label">{drill.label}</span>
            <span className="drill-option-copy">{descriptionForMode(drill.mode)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function descriptionForMode(mode: DrillConfig['mode']): string {
  switch (mode) {
    case 'learn':
      return 'Full cue, readings, and meanings stay visible.';
    case 'faded-recall':
      return 'Session state controls cue opacity after each review.';
    case 'blind-recall':
      return 'Hide the color cue and rely on recall only.';
    default:
      return 'Study shell mode.';
  }
}
