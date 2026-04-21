import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrillModePicker } from '../src/components/DrillModePicker';
import { STARTER_DRILLS } from '../src/domain/drills/configs';

describe('DrillModePicker', () => {
  it('renders each starter drill with its current explanatory copy', () => {
    render(<DrillModePicker drills={STARTER_DRILLS} selectedId="faded-recall" onSelect={() => {}} />);

    expect(screen.getByRole('radio', { name: /Faded recall/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Blind recall/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Learn/i })).not.toBeChecked();
    expect(screen.getByText('Session state controls cue opacity after each review.')).toBeInTheDocument();
    expect(screen.getByText('Hide the color cue and rely on recall only.')).toBeInTheDocument();
    expect(screen.getByText('Full cue, readings, and meanings stay visible.')).toBeInTheDocument();
  });

  it('calls onSelect with the chosen drill id', () => {
    const onSelect = vi.fn();

    render(<DrillModePicker drills={STARTER_DRILLS} selectedId="faded-recall" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    expect(onSelect).toHaveBeenCalledWith('blind-recall');
  });
});
