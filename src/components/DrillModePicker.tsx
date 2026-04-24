import type { DrillConfig } from '../domain/drills/types';

interface DrillModePickerProps {
  drills: DrillConfig[];
  selectedId: string;
  onSelect(id: string): void;
}

export function DrillModePicker({ drills, selectedId, onSelect }: DrillModePickerProps) {
  const helpTextId = 'drill-mode-help';

  return (
    <fieldset className="surface-panel drill-picker">
      <legend className="section-title">Drill mode</legend>
      <p className="fine-print" id={helpTextId}>
        Each mode changes how much support stays on screen. The current session deck stays the
        same.
      </p>
      <div
        aria-describedby={helpTextId}
        aria-label="Drill mode"
        className="drill-picker-options"
        role="radiogroup"
      >
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
      return 'Keep the cue, meanings, and readings visible for the whole pass.';
    case 'faded-recall':
      return 'Reveal the answer after you try to recall it, then let session state fade the cue.';
    case 'blind-recall':
      return 'Keep the color cue hidden and rely on recall from the kanji alone.';
    case 'reading-mcq':
      return 'See the readings, then choose the matching kanji from four locally confusable options.';
    default:
      return 'Study shell mode.';
  }
}
