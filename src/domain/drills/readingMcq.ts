import type { KanjiEntry } from '../content/types';

export const READING_MCQ_CHOICE_COUNT = 4;
export const READING_MCQ_DISTRACTOR_COUNT = READING_MCQ_CHOICE_COUNT - 1;
const CONFUSABILITY_STAGE_OFFSET = 10;
const GLYPH_RENDER_SIZE = 64;
const GLYPH_SAMPLE_SIZE = 16;
const GLYPH_BOUNDS_PADDING = 2;
const GLYPH_DARKNESS_THRESHOLD = 0.08;
const COMPATIBILITY_VARIANT_REPRESENTATIVE_BY_KANJI: Readonly<Record<string, string>> = {
  歷: '歴',
};
const glyphSignatureCache = new Map<string, readonly number[] | null>();
let glyphSignatureResolverOverride: ((kanji: string) => readonly number[] | null) | null = null;

interface GlyphCanvasLike {
  width: number;
  height: number;
}

interface GlyphRenderingContextLike {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  getImageData(x: number, y: number, width: number, height: number): ImageData;
  fillStyle: string | CanvasGradient | CanvasPattern;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  font: string;
}

interface EntryLookup {
  readonly byKanji: ReadonlyMap<string, KanjiEntry>;
}

interface EffectiveReadingProfile {
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
  readonly normalizedReadings: readonly string[];
  readonly equivalenceCluster: string;
}

interface EffectiveMeaningProfile {
  readonly normalizedMeanings: readonly string[];
}

interface CandidateRank {
  readonly stage: number;
  readonly primaryScore: number;
  readonly secondaryScore: number;
  readonly tertiaryScore: number;
}

export function buildReadingMcqChoiceMap(
  selectedEntries: readonly KanjiEntry[],
  choicePoolEntries: readonly KanjiEntry[],
  random: () => number = Math.random,
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    selectedEntries.map((entry) => [
      entry.kanji,
      buildReadingMcqChoices(entry, choicePoolEntries, random),
    ]),
  );
}

export function buildReadingMcqChoices(
  targetEntry: KanjiEntry,
  choicePoolEntries: readonly KanjiEntry[],
  random: () => number = Math.random,
): readonly string[] {
  const distractors = selectReadingMcqDistractors(
    targetEntry,
    choicePoolEntries,
    READING_MCQ_DISTRACTOR_COUNT,
    random,
  );

  return shuffleValues(
    [targetEntry.kanji, ...distractors.map((entry) => entry.kanji)],
    random,
  );
}

export function selectReadingMcqDistractors(
  targetEntry: KanjiEntry,
  choicePoolEntries: readonly KanjiEntry[],
  count: number,
  random: () => number = Math.random,
): readonly KanjiEntry[] {
  const lookup = buildEntryLookup([targetEntry, ...choicePoolEntries]);
  const targetReadingProfile = getEffectiveReadingProfile(targetEntry, lookup);
  const targetMeaningProfile = getEffectiveMeaningProfile(targetEntry, lookup);

  return [...choicePoolEntries]
    .filter((candidate) => candidate.kanji !== targetEntry.kanji)
    .map((candidate) => ({
      candidate,
      rank: getCandidateRank(
        targetEntry,
        candidate,
        lookup,
        targetReadingProfile,
        targetMeaningProfile,
      ),
      tieBreaker: random(),
    }))
    .filter(
      (candidate): candidate is {
        readonly candidate: KanjiEntry;
        readonly rank: CandidateRank;
        readonly tieBreaker: number;
      } => candidate.rank !== null,
    )
    .sort(
      (left, right) =>
        compareCandidateRanks(left.rank, right.rank) ||
        left.candidate.canonicalIndex - right.candidate.canonicalIndex ||
        left.tieBreaker - right.tieBreaker,
    )
    .slice(0, count)
    .map(({ candidate }) => candidate);
}

export function getReadingConfusabilityScore(
  targetEntry: KanjiEntry,
  candidateEntry: KanjiEntry,
  choicePoolEntries: readonly KanjiEntry[] = [targetEntry, candidateEntry],
): number {
  const lookup = buildEntryLookup([targetEntry, candidateEntry, ...choicePoolEntries]);
  const rank = getCandidateRank(
    targetEntry,
    candidateEntry,
    lookup,
    getEffectiveReadingProfile(targetEntry, lookup),
    getEffectiveMeaningProfile(targetEntry, lookup),
  );

  if (rank === null) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    rank.stage * CONFUSABILITY_STAGE_OFFSET +
    rank.primaryScore +
    rank.secondaryScore / 100 +
    rank.tertiaryScore / 10000
  );
}

export function getReadingMcqPromptReadings(
  entry: KanjiEntry,
  choicePoolEntries: readonly KanjiEntry[],
): Pick<EffectiveReadingProfile, 'onyomi' | 'kunyomi'> {
  const lookup = buildEntryLookup([entry, ...choicePoolEntries]);
  const profile = getEffectiveReadingProfile(entry, lookup);

  return {
    onyomi: profile.onyomi,
    kunyomi: profile.kunyomi,
  };
}

export function setGlyphSignatureResolverForTesting(
  resolver: ((kanji: string) => readonly number[] | null) | null,
): void {
  glyphSignatureResolverOverride = resolver;
  glyphSignatureCache.clear();
}

function getCandidateRank(
  targetEntry: KanjiEntry,
  candidateEntry: KanjiEntry,
  lookup: EntryLookup,
  targetReadingProfile: EffectiveReadingProfile,
  targetMeaningProfile: EffectiveMeaningProfile,
): CandidateRank | null {
  const candidateReadingProfile = getEffectiveReadingProfile(candidateEntry, lookup);

  if (
    targetReadingProfile.equivalenceCluster === candidateReadingProfile.equivalenceCluster &&
    targetEntry.kanji !== candidateEntry.kanji
  ) {
    return null;
  }

  const candidateMeaningProfile = getEffectiveMeaningProfile(candidateEntry, lookup);
  const metadataDistance = getMetadataDistance(targetEntry, candidateEntry);
  const visualDistance = getVisualDistance(targetEntry.kanji, candidateEntry.kanji);
  const readingDistance = getReadingDistanceOrNull(
    targetReadingProfile.normalizedReadings,
    candidateReadingProfile.normalizedReadings,
  );
  const meaningDistance = getMeaningDistance(
    targetMeaningProfile.normalizedMeanings,
    candidateMeaningProfile.normalizedMeanings,
  );

  if (visualDistance !== null) {
    return {
      stage: 0,
      primaryScore: visualDistance,
      secondaryScore: readingDistance ?? 1 + meaningDistance,
      tertiaryScore: meaningDistance,
    };
  }

  if (
    targetReadingProfile.normalizedReadings.length > 0 &&
    candidateReadingProfile.normalizedReadings.length > 0
  ) {
    return {
      stage: 1,
      primaryScore: readingDistance ?? 1,
      secondaryScore: meaningDistance,
      tertiaryScore: metadataDistance,
    };
  }

  if (
    targetMeaningProfile.normalizedMeanings.length > 0 &&
    candidateMeaningProfile.normalizedMeanings.length > 0
  ) {
    return {
      stage: 2,
      primaryScore: meaningDistance,
      secondaryScore: metadataDistance,
      tertiaryScore: 0,
    };
  }

  return {
    stage: 3,
    primaryScore: metadataDistance,
    secondaryScore: getCanonicalIndexDistance(targetEntry, candidateEntry),
    tertiaryScore: 0,
  };
}

function compareCandidateRanks(left: CandidateRank | null, right: CandidateRank | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return (
    left.stage - right.stage ||
    left.primaryScore - right.primaryScore ||
    left.secondaryScore - right.secondaryScore ||
    left.tertiaryScore - right.tertiaryScore
  );
}

function getEffectiveReadingProfile(entry: KanjiEntry, lookup: EntryLookup): EffectiveReadingProfile {
  const directNormalizedReadings = normalizeReadings([...entry.onyomi, ...entry.kunyomi]);

  if (directNormalizedReadings.length > 0) {
    return {
      onyomi: entry.onyomi,
      kunyomi: entry.kunyomi,
      normalizedReadings: directNormalizedReadings,
      equivalenceCluster: resolveRepresentativeKanji(entry.kanji, lookup),
    };
  }

  const representativeEntry = getRepresentativeEntry(entry, lookup);

  if (!representativeEntry) {
    return {
      onyomi: entry.onyomi,
      kunyomi: entry.kunyomi,
      normalizedReadings: [],
      equivalenceCluster: resolveRepresentativeKanji(entry.kanji, lookup),
    };
  }

  return {
    onyomi: representativeEntry.onyomi,
    kunyomi: representativeEntry.kunyomi,
    normalizedReadings: normalizeReadings([...representativeEntry.onyomi, ...representativeEntry.kunyomi]),
    equivalenceCluster: representativeEntry.kanji,
  };
}

function getEffectiveMeaningProfile(entry: KanjiEntry, lookup: EntryLookup): EffectiveMeaningProfile {
  const directNormalizedMeanings = normalizeMeanings(entry.meanings);

  if (directNormalizedMeanings.length > 0) {
    return {
      normalizedMeanings: directNormalizedMeanings,
    };
  }

  return {
    normalizedMeanings: normalizeMeanings(getRepresentativeEntry(entry, lookup)?.meanings ?? []),
  };
}

function getRepresentativeEntry(entry: KanjiEntry, lookup: EntryLookup): KanjiEntry | null {
  const representativeKanji = resolveRepresentativeKanji(entry.kanji, lookup);

  if (representativeKanji === entry.kanji) {
    return null;
  }

  return lookup.byKanji.get(representativeKanji) ?? null;
}

function resolveRepresentativeKanji(kanji: string, lookup: EntryLookup): string {
  const manualRepresentative = COMPATIBILITY_VARIANT_REPRESENTATIVE_BY_KANJI[kanji];

  if (manualRepresentative && lookup.byKanji.has(manualRepresentative)) {
    return manualRepresentative;
  }

  const normalizedLiteral = kanji.normalize('NFKC');

  if (normalizedLiteral !== kanji && lookup.byKanji.has(normalizedLiteral)) {
    return normalizedLiteral;
  }

  return kanji;
}

function buildEntryLookup(entries: readonly KanjiEntry[]): EntryLookup {
  return {
    byKanji: new Map(entries.map((entry) => [entry.kanji, entry])),
  };
}

function normalizeReadings(readings: readonly string[]): readonly string[] {
  return Array.from(
    new Set(
      readings
        .map((reading) => normalizeReadingForComparison(reading))
        .filter((reading) => reading.length > 0),
    ),
  );
}

function normalizeReadingForComparison(reading: string): string {
  return Array.from(reading.normalize('NFKC').toLowerCase())
    .filter((character) => !isIgnoredReadingCharacter(character))
    .map(convertKatakanaToHiragana)
    .join('');
}

function isIgnoredReadingCharacter(character: string): boolean {
  return character === '.' || character === '・' || character === '、' || character === '-';
}

function convertKatakanaToHiragana(character: string): string {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return character;
  }

  if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
    return String.fromCodePoint(codePoint - 0x60);
  }

  return character;
}

function normalizeMeanings(meanings: readonly string[]): readonly string[] {
  return Array.from(
    new Set(
      meanings
        .map((meaning) => meaning.normalize('NFKC').toLowerCase().trim())
        .filter((meaning) => meaning.length > 0),
    ),
  );
}

function getReadingDistance(
  targetReadings: readonly string[],
  candidateReadings: readonly string[],
): number {
  return (
    targetReadings.reduce(
      (sum, targetReading) =>
        sum +
        Math.min(
          ...candidateReadings.map((candidateReading) =>
            normalizedLevenshteinDistance(targetReading, candidateReading),
          ),
        ),
      0,
    ) / targetReadings.length
  );
}

function getReadingDistanceOrNull(
  targetReadings: readonly string[],
  candidateReadings: readonly string[],
): number | null {
  if (targetReadings.length === 0 || candidateReadings.length === 0) {
    return null;
  }

  return getReadingDistance(targetReadings, candidateReadings);
}

function getMeaningDistance(
  targetMeanings: readonly string[],
  candidateMeanings: readonly string[],
): number {
  if (targetMeanings.length === 0 || candidateMeanings.length === 0) {
    return 1;
  }

  let bestSimilarity = 0;

  for (const targetMeaning of targetMeanings) {
    const targetTokens = tokenizeMeaning(targetMeaning);

    for (const candidateMeaning of candidateMeanings) {
      bestSimilarity = Math.max(
        bestSimilarity,
        jaccardSimilarity(targetTokens, tokenizeMeaning(candidateMeaning)),
      );
    }
  }

  return 1 - bestSimilarity;
}

function tokenizeMeaning(meaning: string): readonly string[] {
  return meaning
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function jaccardSimilarity(left: readonly string[], right: readonly string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);

  if (union.size === 0) {
    return 0;
  }

  let intersectionCount = 0;

  for (const value of leftSet) {
    if (rightSet.has(value)) {
      intersectionCount += 1;
    }
  }

  return intersectionCount / union.size;
}

function getMetadataDistance(targetEntry: KanjiEntry, candidateEntry: KanjiEntry): number {
  const sourcePenalty = targetEntry.sourceSet === candidateEntry.sourceSet ? 0 : 0.1;
  const targetGrade = targetEntry.metadata?.grade;
  const candidateGrade = candidateEntry.metadata?.grade;

  if (targetGrade === undefined || candidateGrade === undefined) {
    return 0.5 + sourcePenalty;
  }

  return Math.min(1, Math.abs(targetGrade - candidateGrade) / 10) + sourcePenalty;
}

function getCanonicalIndexDistance(targetEntry: KanjiEntry, candidateEntry: KanjiEntry): number {
  return Math.abs(targetEntry.canonicalIndex - candidateEntry.canonicalIndex) / 10_000;
}

function getVisualDistance(leftKanji: string, rightKanji: string): number | null {
  const leftSignature = getGlyphSignature(leftKanji);
  const rightSignature = getGlyphSignature(rightKanji);

  if (!leftSignature || !rightSignature || leftSignature.length !== rightSignature.length) {
    return null;
  }

  let totalDifference = 0;

  for (let index = 0; index < leftSignature.length; index += 1) {
    totalDifference += Math.abs((leftSignature[index] ?? 0) - (rightSignature[index] ?? 0));
  }

  return totalDifference / leftSignature.length;
}

function getGlyphSignature(kanji: string): readonly number[] | null {
  if (glyphSignatureResolverOverride) {
    return glyphSignatureResolverOverride(kanji);
  }

  const cachedSignature = glyphSignatureCache.get(kanji);

  if (cachedSignature !== undefined) {
    return cachedSignature;
  }

  const nextSignature = createGlyphSignature(kanji);
  glyphSignatureCache.set(kanji, nextSignature);
  return nextSignature;
}

function createGlyphSignature(kanji: string): readonly number[] | null {
  const context = createGlyphRenderContext(GLYPH_RENDER_SIZE);

  if (!context) {
    return null;
  }

  const { canvas, renderingContext } = context;

  renderingContext.clearRect(0, 0, canvas.width, canvas.height);
  renderingContext.fillStyle = '#ffffff';
  renderingContext.fillRect(0, 0, canvas.width, canvas.height);
  renderingContext.fillStyle = '#000000';
  renderingContext.textAlign = 'center';
  renderingContext.textBaseline = 'middle';
  renderingContext.font =
    "52px 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'MS Mincho', serif";
  renderingContext.fillText(kanji, canvas.width / 2, canvas.height / 2 + 2);

  const imageData = renderingContext.getImageData(0, 0, canvas.width, canvas.height);
  return buildGlyphSignatureFromImageData(imageData);
}

function createGlyphRenderContext(size: number): {
  readonly canvas: GlyphCanvasLike;
  readonly renderingContext: GlyphRenderingContextLike;
} | null {
  try {
    if (isJsdomEnvironment()) {
      return null;
    }

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(size, size);
      const renderingContext = canvas.getContext('2d', { willReadFrequently: true });

      if (renderingContext) {
        return { canvas, renderingContext };
      }
    }

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const renderingContext = canvas.getContext('2d', { willReadFrequently: true });

      if (renderingContext) {
        return { canvas, renderingContext };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isJsdomEnvironment(): boolean {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
}

function buildGlyphSignatureFromImageData(imageData: ImageData): readonly number[] | null {
  const bounds = findGlyphBounds(imageData);

  if (!bounds) {
    return null;
  }

  const { minX, maxX, minY, maxY } = bounds;
  const signature: number[] = [];
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  for (let sampleY = 0; sampleY < GLYPH_SAMPLE_SIZE; sampleY += 1) {
    for (let sampleX = 0; sampleX < GLYPH_SAMPLE_SIZE; sampleX += 1) {
      const startX = Math.floor(minX + (sampleX * width) / GLYPH_SAMPLE_SIZE);
      const endX = Math.floor(minX + ((sampleX + 1) * width) / GLYPH_SAMPLE_SIZE);
      const startY = Math.floor(minY + (sampleY * height) / GLYPH_SAMPLE_SIZE);
      const endY = Math.floor(minY + ((sampleY + 1) * height) / GLYPH_SAMPLE_SIZE);

      let darknessSum = 0;
      let pixelCount = 0;

      for (let y = startY; y < Math.max(startY + 1, endY); y += 1) {
        for (let x = startX; x < Math.max(startX + 1, endX); x += 1) {
          darknessSum += getPixelDarkness(imageData, x, y);
          pixelCount += 1;
        }
      }

      signature.push(pixelCount === 0 ? 0 : darknessSum / pixelCount);
    }
  }

  return signature;
}

function findGlyphBounds(imageData: ImageData):
  | {
      readonly minX: number;
      readonly maxX: number;
      readonly minY: number;
      readonly maxY: number;
    }
  | null {
  let minX = imageData.width;
  let maxX = -1;
  let minY = imageData.height;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      if (getPixelDarkness(imageData, x, y) < GLYPH_DARKNESS_THRESHOLD) {
        continue;
      }

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX: Math.max(0, minX - GLYPH_BOUNDS_PADDING),
    maxX: Math.min(imageData.width - 1, maxX + GLYPH_BOUNDS_PADDING),
    minY: Math.max(0, minY - GLYPH_BOUNDS_PADDING),
    maxY: Math.min(imageData.height - 1, maxY + GLYPH_BOUNDS_PADDING),
  };
}

function getPixelDarkness(imageData: ImageData, x: number, y: number): number {
  const index = (y * imageData.width + x) * 4;
  const red = imageData.data[index] ?? 255;
  const green = imageData.data[index + 1] ?? 255;
  const blue = imageData.data[index + 2] ?? 255;
  const alpha = (imageData.data[index + 3] ?? 255) / 255;
  const luminance = (red + green + blue) / (3 * 255);

  return (1 - luminance) * alpha;
}

function levenshteinDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  const previousRow = Array.from({ length: rightCharacters.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < rightCharacters.length; rightIndex += 1) {
      const currentValue = previousRow[rightIndex + 1] ?? 0;
      const substitutionCost = leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1;

      previousRow[rightIndex + 1] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        currentValue + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = currentValue;
    }
  }

  return previousRow[rightCharacters.length] ?? 0;
}

function normalizedLevenshteinDistance(left: string, right: string): number {
  const maxLength = Math.max(Array.from(left).length, Array.from(right).length, 1);

  return levenshteinDistance(left, right) / maxLength;
}

function shuffleValues<T>(values: readonly T[], random: () => number): readonly T[] {
  const nextValues = [...values];

  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = nextValues[index];
    nextValues[index] = nextValues[swapIndex] as T;
    nextValues[swapIndex] = currentValue as T;
  }

  return nextValues;
}
