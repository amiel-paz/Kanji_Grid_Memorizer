import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudyPage } from '../src/pages/StudyPage';

function createDeterministicRandom(values: readonly number[]) {
  let index = 0;

  return () => {
    const value = values[index % values.length];

    if (value === undefined) {
      throw new Error('Expected at least one deterministic random value.');
    }

    index += 1;
    return value;
  };
}

describe('StudyPage', () => {
  it('shows the faded recall shell with cue guidance and session context', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'First usable study shell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall' })).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getAllByText('Cue visible at 100%')).toHaveLength(2);
    expect(screen.getByText('力 is ready to study')).toBeInTheDocument();
  });

  it('reveals readings before review grading actions', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Reveal readings and meanings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByText('リョク, リキ')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
    expect(screen.getByText(/Choose Good if you recalled it cleanly/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });

  it('switches to learn mode with persistent readings and next-item navigation', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next kanji' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal readings and meanings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));

    expect(screen.getByText('月 is ready to study')).toBeInTheDocument();
    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });

  it('keeps blind recall cue-hidden before and after grading', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    expect(screen.getAllByText('Kanji only until reveal')).toHaveLength(2);
    expect(screen.getByText('0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Again' }));

    expect(screen.getByText('月 is ready to study')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getAllByText('Kanji only until reveal')).toHaveLength(2);
  });
});
