import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudyPage } from '../src/pages/StudyPage';

describe('StudyPage', () => {
  it('shows the active drill shell with session context', () => {
    render(<StudyPage />);

    expect(screen.getByRole('heading', { name: 'First usable study shell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall' })).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Try to recall the readings first' })).toBeInTheDocument();
  });

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

  it('switches to learn mode without adding review grading controls', () => {
    render(<StudyPage />);

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByText('ニチ, ジツ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal readings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });
});
