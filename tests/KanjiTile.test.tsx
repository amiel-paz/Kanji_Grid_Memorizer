import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KanjiTile } from '../src/components/KanjiTile';
import { validateTileOpacity } from '../src/components/kanjiTileValidation';

describe('KanjiTile', () => {
  it('renders a 2x2 color code with an accessible label', () => {
    render(<KanjiTile code={[0, 1, 2, 3]} opacity={0.5} label="test grid" />);

    expect(screen.getByRole('img', { name: 'test grid' })).toHaveStyle({ opacity: '0.5' });
  });

  it('rejects invalid opacity values', () => {
    expect(() => validateTileOpacity(1.2)).toThrow('Tile opacity must be a number between 0 and 1.');
  });
});
