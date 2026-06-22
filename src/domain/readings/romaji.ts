const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

const READING_MARKS_TO_IGNORE = new Set(['.', '-', '‐', '‑', '‒', '–', '—', '－', '〜', '～', ' ']);

const KANA_ROMAJI: Readonly<Record<string, string>> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  ゐ: 'wi',
  ゑ: 'we',
  を: 'o',
  ん: 'n',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ゔ: 'vu',
  ぁ: 'a',
  ぃ: 'i',
  ぅ: 'u',
  ぇ: 'e',
  ぉ: 'o',
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
  ゎ: 'wa',
};

const DIGRAPH_ROMAJI: Readonly<Record<string, string>> = {
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  ぢゃ: 'ja',
  ぢゅ: 'ju',
  ぢょ: 'jo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  てぃ: 'ti',
  でぃ: 'di',
  とぅ: 'tu',
  どぅ: 'du',
  ふぁ: 'fa',
  ふぃ: 'fi',
  ふぇ: 'fe',
  ふぉ: 'fo',
  うぃ: 'wi',
  うぇ: 'we',
  うぉ: 'wo',
  ゔぁ: 'va',
  ゔぃ: 'vi',
  ゔぇ: 've',
  ゔぉ: 'vo',
};

export function romanizeKanjiReading(reading: string): string {
  const kana = Array.from(reading.trim())
    .map(toHiragana)
    .filter((character) => !READING_MARKS_TO_IGNORE.has(character));
  let romaji = '';
  let previousVowel = '';
  let shouldDoubleNextConsonant = false;

  for (let index = 0; index < kana.length; index += 1) {
    const character = kana[index];

    if (character === undefined) {
      continue;
    }

    if (character === 'っ') {
      shouldDoubleNextConsonant = true;
      continue;
    }

    if (character === 'ー') {
      if (previousVowel) {
        romaji += previousVowel;
      }
      continue;
    }

    const nextCharacter = kana[index + 1];
    const digraph = nextCharacter === undefined ? undefined : DIGRAPH_ROMAJI[`${character}${nextCharacter}`];
    const nextRomaji = digraph ?? KANA_ROMAJI[character] ?? character;

    if (digraph !== undefined) {
      index += 1;
    }

    const doubledRomaji = shouldDoubleNextConsonant ? doubleInitialConsonant(nextRomaji) : nextRomaji;

    if (romaji.endsWith('n') && /^[aiueoy]/.test(doubledRomaji)) {
      romaji += "'";
    }

    romaji += doubledRomaji;
    previousVowel = getLastVowel(doubledRomaji);
    shouldDoubleNextConsonant = false;
  }

  return romaji;
}

export function formatReadingWithRomaji(reading: string): string {
  const trimmedReading = reading.trim();
  const romaji = romanizeKanjiReading(trimmedReading);

  return romaji ? `${trimmedReading} (${romaji})` : trimmedReading;
}

export function formatReadingsWithRomaji(
  readings: readonly string[],
  separator = '、',
): string {
  return readings.length === 0
    ? 'None listed'
    : readings.map((reading) => formatReadingWithRomaji(reading)).join(separator);
}

function toHiragana(character: string): string {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return character;
  }

  if (codePoint >= KATAKANA_START && codePoint <= KATAKANA_END) {
    return String.fromCodePoint(codePoint - KATAKANA_TO_HIRAGANA_OFFSET);
  }

  return character;
}

function doubleInitialConsonant(romaji: string): string {
  if (romaji.startsWith('ch')) {
    return `t${romaji}`;
  }

  if (/^[bcdfghjklmpqrstvwxyz]/.test(romaji)) {
    return `${romaji[0]}${romaji}`;
  }

  return romaji;
}

function getLastVowel(romaji: string): string {
  const match = romaji.match(/[aiueo](?!.*[aiueo])/);

  return match?.[0] ?? '';
}
