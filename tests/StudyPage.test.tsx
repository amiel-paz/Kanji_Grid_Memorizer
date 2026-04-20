import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudyPage } from '../src/pages/StudyPage';

describe('StudyPage', () => {
  it('reveals readings before review grading actions', () => {
    render(<StudyPage />);

    expect(screen.getByRole('button', { name: 'Reveal readings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByText('ニチ, ジツ')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings' }));

    expect(screen.getByText('ニチ, ジツ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings' }));

    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });
});
