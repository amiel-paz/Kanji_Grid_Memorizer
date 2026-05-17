import type { KanjiEntry } from '../content/types';
import { formatKanjiCode, getKanjiCodeCells } from '../encoding/palette';
import { formatReadingsWithRomaji } from '../readings/romaji';

const DEFAULT_ANKI_TAGS = ['kanji-grid', 'kanji-grid-memorizer'] as const;

export function buildAnkiTextExport(entries: readonly KanjiEntry[]): string {
  const lines = [
    '#separator:tab',
    '#html:true',
    `#tags:${DEFAULT_ANKI_TAGS.join(' ')}`,
    '#columns:Front\tBack',
    ...entries.map((entry) =>
      [
        escapeAnkiTextField(buildAnkiFrontField(entry)),
        escapeAnkiTextField(buildAnkiBackField(entry)),
      ].join('\t'),
    ),
  ];

  return `${lines.join('\n')}\n`;
}

export function getAnkiExportFileName(scope: string, exportedAt = new Date()): string {
  const safeScope = scope
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const dateKey = exportedAt.toISOString().slice(0, 10);

  return `kanji-grid-${safeScope || 'cards'}-${dateKey}.txt`;
}

function buildAnkiFrontField(entry: KanjiEntry): string {
  const cells = getKanjiCodeCells(entry.code);
  const quadrants = cells
    .map(
      (cell) =>
        `<div style='position:absolute;${getQuadrantPositionStyle(cell.position)}width:50%;height:50%;background:${cell.color};'></div>`,
    )
    .join('');

  return [
    `<div style='display:inline-flex;flex-direction:column;align-items:center;gap:12px;color:#111827;'>`,
    `<div style='position:relative;width:240px;height:240px;overflow:hidden;border:1px solid #d1d5db;border-radius:24px;background:#ffffff;'>`,
    quadrants,
    `<div style='position:absolute;left:50%;top:50%;display:flex;width:150px;height:150px;transform:translate(-50%,-50%);align-items:center;justify-content:center;border-radius:20px;background:#ffffff;font-family:Hiragino Mincho ProN,Yu Mincho,Noto Serif CJK JP,serif;font-size:96px;font-weight:600;line-height:1;'>${escapeHtml(entry.kanji)}</div>`,
    '</div>',
    `<div style='font-family:Inter,Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;'>Code ${escapeHtml(formatKanjiCode(entry.code))}</div>`,
    '</div>',
  ].join('');
}

function buildAnkiBackField(entry: KanjiEntry): string {
  const meanings = entry.meanings.map(escapeHtml).join(', ');
  const kunReadings = escapeHtml(formatReadingsWithRomaji(entry.kunyomi, ', '));
  const onReadings = escapeHtml(formatReadingsWithRomaji(entry.onyomi, ', '));

  return [
    `<div style='display:grid;gap:16px;font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827;'>`,
    `<div style='font-family:Hiragino Mincho ProN,Yu Mincho,Noto Serif CJK JP,serif;font-size:64px;font-weight:600;line-height:1;'>${escapeHtml(entry.kanji)}</div>`,
    `<div><strong>Meanings</strong><br>${meanings}</div>`,
    `<div><strong>Kun readings</strong><br>${kunReadings}</div>`,
    `<div><strong>On readings</strong><br>${onReadings}</div>`,
    `<div style='font-size:12px;color:#6b7280;'>${escapeHtml(entry.sourceSet)} source - code ${escapeHtml(formatKanjiCode(entry.code))}</div>`,
    '</div>',
  ].join('');
}

function getQuadrantPositionStyle(position: string): string {
  switch (position) {
    case 'top-left':
      return 'left:0;top:0;';
    case 'top-right':
      return 'right:0;top:0;';
    case 'bottom-left':
      return 'left:0;bottom:0;';
    case 'bottom-right':
    default:
      return 'right:0;bottom:0;';
  }
}

function escapeAnkiTextField(field: string): string {
  const normalizedField = field.replace(/\r?\n/g, '<br>').replace(/\t/g, ' ');

  if (!normalizedField.includes('"')) {
    return normalizedField;
  }

  return `"${normalizedField.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
