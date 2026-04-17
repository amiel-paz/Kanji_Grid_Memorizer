import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import { createSession, getCueOpacity, recordAnswer } from '../src/domain/session/session';

describe('session cue opacity', () => {
  it('dims the cue after a correct answer without changing kanji data', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const nextSession = recordAnswer(session, entry.kanji, true);

    expect(getCueOpacity(session, entry.kanji)).toBe(1);
    expect(getCueOpacity(nextSession, entry.kanji)).toBe(0.75);
    expect(entry).not.toHaveProperty('opacity');
  });

  it('keeps blind recall cues hidden at session start', () => {
    const drill = getDrillById('blind-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);

    expect(getCueOpacity(session, entry.kanji)).toBe(0);
  });
});
