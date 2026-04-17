import type { KanjiCode } from './encoding/palette';

export type SourceSet = 'mock-joyo' | 'joyo' | 'jinmeiyo';

export interface AssignmentVersion {
  id: string;
  sourceSets: SourceSet[];
  description: string;
}

export interface KanjiEntry {
  kanji: string;
  canonicalIndex: number;
  sourceSet: SourceSet;
  assignmentVersionId: string;
  code: KanjiCode;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  tags: string[];
  metadata?: {
    grade?: number;
    jlptLevel?: string;
    notes?: string;
  };
}

export interface UserProgress {
  kanji: string;
  seenCount: number;
  correctCount: number;
  lastSeenAt?: string;
  confidence: 'new' | 'learning' | 'familiar';
}

export type DrillMode =
  | 'learn'
  | 'recognize-from-grid'
  | 'match-grid-to-kanji'
  | 'faded-recall'
  | 'blind-recall';

export interface DrillConfig {
  id: string;
  label: string;
  mode: DrillMode;
  deckSize: number;
  cuePolicy: 'full' | 'session-dim' | 'hidden';
}

export interface SessionItemState {
  kanji: string;
  attempts: number;
  correct: number;
  cueOpacity: number;
}

export interface SessionState {
  id: string;
  drillConfigId: string;
  selectedKanji: string[];
  activeKanji: string;
  itemStateByKanji: Record<string, SessionItemState>;
}
