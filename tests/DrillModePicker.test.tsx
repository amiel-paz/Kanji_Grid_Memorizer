import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrillModePicker } from '../src/components/DrillModePicker';
import { STARTER_DRILLS } from '../src/domain/drills/configs';

describe('DrillModePicker', () => {
  it('renders each starter drill with its current explanatory copy', () => {
    render(<DrillModePicker drills={STARTER_DRILLS} selectedId="faded-recall" onSelect={() => {}} />);

    expect(screen.getByText('Each mode changes how much support stays on screen. The current session deck stays the same.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Faded recall/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Blind recall/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Learn/i })).not.toBeChecked();
    expect(
      screen.getByText(
        'Reveal the answer after you try to recall it, then let session state fade the cue.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keep the color cue hidden and rely on recall from the kanji alone.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keep the cue, meanings, and readings visible for the whole pass.'),
    ).toBeInTheDocument();
  });

  it('calls onSelect with the chosen drill id', () => {
    const onSelect = vi.fn();

    render(<DrillModePicker drills={STARTER_DRILLS} selectedId="faded-recall" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    expect(onSelect).toHaveBeenCalledWith('blind-recall');
  });
});
