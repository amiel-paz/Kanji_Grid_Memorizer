import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KanjiCueCard } from '../src/components/KanjiCueCard';

describe('KanjiCueCard', () => {
  it('renders a kanji-centered cue card with an accessible label', () => {
    render(<KanjiCueCard kanji="木" code={[0, 1, 2, 3]} opacity={0.66} label="ki cue card" />);

    expect(screen.getByRole('img', { name: 'ki cue card' })).toHaveStyle({
      '--cue-opacity': '0.66',
    });
    expect(screen.getByText('木')).toBeInTheDocument();
    expect(screen.getByText('Code digits 0 1 2 3')).toBeInTheDocument();
  });

  it('rejects invalid cue opacity values', () => {
    expect(() => render(<KanjiCueCard kanji="木" code={[0, 1, 2, 3]} opacity={-0.1} />)).toThrow(
      'Tile opacity must be a number between 0 and 1.',
    );
  });
});
