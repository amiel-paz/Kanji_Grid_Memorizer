import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudyPage } from '../src/pages/StudyPage';

describe('StudyPage', () => {
  it('shows the faded recall shell with cue guidance and session context', () => {
    render(<StudyPage />);

    expect(screen.getByRole('heading', { name: 'First usable study shell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall' })).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recall with a fading cue' })).toBeInTheDocument();
    expect(screen.getAllByText('Cue visible at 100%')).toHaveLength(2);
  });

  it('reveals readings before review grading actions', () => {
    render(<StudyPage />);

    expect(screen.getByRole('button', { name: 'Reveal readings and meanings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByText('ニチ, ジツ')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('ニチ, ジツ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
    expect(screen.getByText(/Choose Good if you recalled it cleanly/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });

  it('switches to learn mode with persistent readings and next-item navigation', () => {
    render(<StudyPage />);

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Study the full card' })).toBeInTheDocument();
    expect(screen.getByText('ニチ, ジツ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next kanji' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal readings and meanings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));

    expect(screen.getByText('月 is ready to study')).toBeInTheDocument();
    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });

  it('keeps blind recall cue-hidden before and after grading', () => {
    render(<StudyPage />);

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    expect(screen.getByRole('heading', { name: 'Recall without cue support' })).toBeInTheDocument();
    expect(screen.getAllByText('Kanji only until reveal')).toHaveLength(2);
    expect(screen.getByText('0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('ニチ, ジツ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Again' }));

    expect(screen.getByText('月 is ready to study')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getAllByText('Kanji only until reveal')).toHaveLength(2);
  });
});
