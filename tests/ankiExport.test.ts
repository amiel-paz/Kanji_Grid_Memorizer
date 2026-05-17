import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { buildAnkiTextExport, getAnkiExportFileName } from '../src/domain/anki/ankiExport';

describe('Anki text export', () => {
  it('builds an HTML-enabled tab-delimited export with cue-card fronts and reading backs', () => {
    const [entry] = mockKanji;

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const exportText = buildAnkiTextExport([entry]);
    const lines = exportText.trimEnd().split('\n');

    expect(lines.slice(0, 4)).toEqual([
      '#separator:tab',
      '#html:true',
      '#tags:kanji-grid kanji-grid-memorizer',
      '#columns:Front\tBack',
    ]);
    expect(lines[4]?.split('\t')).toHaveLength(2);
    expect(exportText).toContain('position:relative;width:240px;height:240px');
    expect(exportText).toContain(entry.kanji);
    expect(exportText).toContain('<strong>Kun readings</strong><br>ひ (hi), か (ka)');
    expect(exportText).toContain('<strong>On readings</strong><br>ニチ (nichi), ジツ (jitsu)');
    expect(exportText).toContain('<strong>Meanings</strong><br>sun, day');
  });

  it('creates stable dated text filenames for Anki imports', () => {
    expect(getAnkiExportFileName('Study Batch', new Date('2026-05-16T12:00:00.000Z'))).toBe(
      'kanji-grid-study-batch-2026-05-16.txt',
    );
  });
});
