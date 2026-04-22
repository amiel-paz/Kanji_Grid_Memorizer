import { describe, expect, it } from 'vitest';
import {
  mockJoyoFixtureAssignmentVersion,
  mockJoyoFixtureSourceVersion,
  mockKanji,
} from '../src/data/mockKanji';
import { assertValidKanjiFixture, validateKanjiFixture } from '../src/data/validateKanjiFixture';
import { SOURCE_SET_IDS } from '../src/domain/content/types';

describe('kanji fixture validation', () => {
  it('accepts the current local mock fixture', () => {
    expect(validateKanjiFixture(mockKanji)).toEqual([]);
  });

  it('reports malformed code digits', () => {
    const entry = makeEntry({ code: [0, 1, 2, 8] });

    expect(validateKanjiFixture([entry])).toContainEqual({
      path: '[0].code',
      message: 'Code must contain exactly four base-8 digits.',
    });
  });

  it('reports missing and empty required fields', () => {
    const entry = makeEntry({
      kanji: '',
      meanings: [],
      onyomi: [''],
      canonicalIndex: undefined,
    });

    expect(validateKanjiFixture([entry])).toEqual(
      expect.arrayContaining([
        { path: '[0].kanji', message: 'Required text field must be non-empty.' },
        { path: '[0].meanings', message: 'Required list field must be non-empty.' },
        { path: '[0].onyomi[0]', message: 'List values must be non-empty text.' },
        { path: '[0].canonicalIndex', message: 'Required numeric field must be an integer.' },
      ]),
    );
  });

  it('reports wrong source-set ownership for local fixture data', () => {
    const entry = makeEntry({ sourceSet: SOURCE_SET_IDS.JOYO });

    expect(validateKanjiFixture([entry])).toEqual(
      expect.arrayContaining([
        {
          path: '[0].sourceSet',
          message: 'Source set must be owned by development-fixture.',
        },
        {
          path: '[0].sourceSet',
          message: `Source set is not included in assignment version ${mockJoyoFixtureAssignmentVersion.id}.`,
        },
      ]),
    );
  });

  it('reports wrong source-set version ids for local fixture data', () => {
    const entry = makeEntry({ sourceSetVersionId: 'mock-joyo-fixture-v0' });

    expect(validateKanjiFixture([entry])).toContainEqual({
      path: '[0].sourceSetVersionId',
      message: `Source set version id must be ${mockJoyoFixtureSourceVersion.versionId}.`,
    });
  });

  it('reports wrong assignment version ids', () => {
    const entry = makeEntry({ assignmentVersionId: 'future-v1' });

    expect(validateKanjiFixture([entry])).toContainEqual({
      path: '[0].assignmentVersionId',
      message: `Assignment version id must be ${mockJoyoFixtureAssignmentVersion.id}.`,
    });
  });

  it('reports stable-assignment code mismatches without recalculating fixture data', () => {
    const entry = makeEntry({ code: [0, 0, 0, 0] });

    expect(validateKanjiFixture([entry])).toContainEqual({
      path: '[0].code',
      message: `Code must match stable assignment for canonicalIndex ${entry.canonicalIndex}.`,
    });
  });

  it('can assert fixture validity with a compact failure summary', () => {
    const entry = makeEntry({ assignmentVersionId: 'future-v1' });

    expect(() => assertValidKanjiFixture([entry])).toThrow(
      'Kanji fixture validation failed:\n[0].assignmentVersionId: Assignment version id must be mock-joyo-fixture-assignment-v1.',
    );
  });
});

function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const entry = mockKanji[0];

  if (!entry) {
    throw new Error('Expected mock fixture to contain at least one entry.');
  }

  return {
    ...entry,
    code: [...entry.code],
    meanings: [...entry.meanings],
    onyomi: [...entry.onyomi],
    kunyomi: [...entry.kunyomi],
    tags: [...entry.tags],
    ...overrides,
  };
}
