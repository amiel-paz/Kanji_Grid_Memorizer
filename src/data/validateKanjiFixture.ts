import {
  SOURCE_SET_DEFINITIONS,
  type AssignmentVersion,
  type SourceSet,
  type SourceSetOwnership,
} from '../domain/content/types';
import { base8IndexAssignment, currentAssignmentVersion } from '../domain/encoding/assignment';
import { assertKanjiCode, type KanjiCode } from '../domain/encoding/palette';

export interface KanjiFixtureValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface KanjiFixtureValidationOptions {
  readonly assignmentVersion?: AssignmentVersion;
  readonly expectedSourceSetOwnership?: SourceSetOwnership;
  readonly requirePlaceholderCodeAlignment?: boolean;
}

type EntryRecord = Record<string, unknown>;

const DEFAULT_OPTIONS = {
  assignmentVersion: currentAssignmentVersion,
  expectedSourceSetOwnership: 'development-fixture',
  requirePlaceholderCodeAlignment: true,
} as const satisfies Required<KanjiFixtureValidationOptions>;

export function validateKanjiFixture(
  entries: readonly unknown[],
  options: KanjiFixtureValidationOptions = {},
): readonly KanjiFixtureValidationIssue[] {
  const validationOptions = { ...DEFAULT_OPTIONS, ...options };
  const issues: KanjiFixtureValidationIssue[] = [];

  entries.forEach((entry, index) => {
    const path = `[${index}]`;

    if (!isEntryRecord(entry)) {
      issues.push({ path, message: 'Entry must be an object.' });
      return;
    }

    validateNonEmptyString(entry, 'kanji', path, issues);
    validateInteger(entry, 'canonicalIndex', path, issues);
    validateStringArray(entry, 'meanings', path, issues);
    validateStringArray(entry, 'onyomi', path, issues);
    validateStringArray(entry, 'kunyomi', path, issues);
    validateStringArray(entry, 'tags', path, issues);
    validateSourceSet(entry, path, validationOptions, issues);
    validateAssignmentVersionId(entry, path, validationOptions.assignmentVersion, issues);
    validateCode(entry, path, issues);
    validatePlaceholderCodeAlignment(entry, path, validationOptions, issues);
  });

  return issues;
}

export function assertValidKanjiFixture(
  entries: readonly unknown[],
  options?: KanjiFixtureValidationOptions,
): void {
  const issues = validateKanjiFixture(entries, options);

  if (issues.length > 0) {
    throw new Error(
      `Kanji fixture validation failed:\n${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('\n')}`,
    );
  }
}

function isEntryRecord(value: unknown): value is EntryRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(
  entry: EntryRecord,
  field: string,
  path: string,
  issues: KanjiFixtureValidationIssue[],
): void {
  if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
    issues.push({ path: `${path}.${field}`, message: 'Required text field must be non-empty.' });
  }
}

function validateInteger(
  entry: EntryRecord,
  field: string,
  path: string,
  issues: KanjiFixtureValidationIssue[],
): void {
  if (typeof entry[field] !== 'number' || !Number.isInteger(entry[field])) {
    issues.push({ path: `${path}.${field}`, message: 'Required numeric field must be an integer.' });
  }
}

function validateStringArray(
  entry: EntryRecord,
  field: string,
  path: string,
  issues: KanjiFixtureValidationIssue[],
): void {
  const value = entry[field];

  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path: `${path}.${field}`, message: 'Required list field must be non-empty.' });
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      issues.push({
        path: `${path}.${field}[${index}]`,
        message: 'List values must be non-empty text.',
      });
    }
  });
}

function validateSourceSet(
  entry: EntryRecord,
  path: string,
  options: Required<KanjiFixtureValidationOptions>,
  issues: KanjiFixtureValidationIssue[],
): void {
  const sourceSet = entry.sourceSet;

  if (typeof sourceSet !== 'string' || !(sourceSet in SOURCE_SET_DEFINITIONS)) {
    issues.push({ path: `${path}.sourceSet`, message: 'Source set must be a known source-set id.' });
    return;
  }

  const definition = SOURCE_SET_DEFINITIONS[sourceSet as SourceSet];

  if (definition.ownership !== options.expectedSourceSetOwnership) {
    issues.push({
      path: `${path}.sourceSet`,
      message: `Source set must be owned by ${options.expectedSourceSetOwnership}.`,
    });
  }

  if (!options.assignmentVersion.sourceSets.includes(sourceSet as SourceSet)) {
    issues.push({
      path: `${path}.sourceSet`,
      message: `Source set is not included in assignment version ${options.assignmentVersion.id}.`,
    });
  }
}

function validateAssignmentVersionId(
  entry: EntryRecord,
  path: string,
  assignmentVersion: AssignmentVersion,
  issues: KanjiFixtureValidationIssue[],
): void {
  if (entry.assignmentVersionId !== assignmentVersion.id) {
    issues.push({
      path: `${path}.assignmentVersionId`,
      message: `Assignment version id must be ${assignmentVersion.id}.`,
    });
  }
}

function validateCode(
  entry: EntryRecord,
  path: string,
  issues: KanjiFixtureValidationIssue[],
): void {
  const code = entry.code;

  if (!Array.isArray(code)) {
    issues.push({ path: `${path}.code`, message: 'Code must contain exactly four base-8 digits.' });
    return;
  }

  try {
    assertKanjiCode(code);
  } catch {
    issues.push({ path: `${path}.code`, message: 'Code must contain exactly four base-8 digits.' });
  }
}

function validatePlaceholderCodeAlignment(
  entry: EntryRecord,
  path: string,
  options: Required<KanjiFixtureValidationOptions>,
  issues: KanjiFixtureValidationIssue[],
): void {
  const canonicalIndex = entry.canonicalIndex;
  const code = entry.code;

  if (
    !options.requirePlaceholderCodeAlignment ||
    typeof canonicalIndex !== 'number' ||
    !Number.isInteger(canonicalIndex) ||
    !Array.isArray(code)
  ) {
    return;
  }

  try {
    assertKanjiCode(code);
  } catch {
    return;
  }

  const expectedCode = base8IndexAssignment.assignCode({
    canonicalIndex,
    assignmentVersion: options.assignmentVersion,
  });

  if (!sameCode(code, expectedCode)) {
    issues.push({
      path: `${path}.code`,
      message: `Code must match placeholder assignment for canonicalIndex ${canonicalIndex}.`,
    });
  }
}

function sameCode(left: KanjiCode, right: KanjiCode): boolean {
  return left.every((digit, index) => digit === right[index]);
}
