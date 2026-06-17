/**
 * Coco Music — Unit tests for utility functions
 */

const { fmt, esc, cleanName, shuffle } = require('../src/utils');

// ─── fmt() — time formatting ──────────────────────────────

describe('fmt()', () => {
  test('returns 0:00 for falsy values', () => {
    expect(fmt(0)).toBe('0:00');
    expect(fmt(null)).toBe('0:00');
    expect(fmt(undefined)).toBe('0:00');
    expect(fmt('')).toBe('0:00');
    expect(fmt(false)).toBe('0:00');
  });

  test('returns 0:00 for NaN and Infinity', () => {
    expect(fmt(NaN)).toBe('0:00');
    expect(fmt(Infinity)).toBe('0:00');
    expect(fmt(-Infinity)).toBe('0:00');
  });

  test('formats seconds correctly', () => {
    expect(fmt(1)).toBe('0:01');
    expect(fmt(9)).toBe('0:09');
    expect(fmt(10)).toBe('0:10');
    expect(fmt(59)).toBe('0:59');
  });

  test('formats minutes correctly', () => {
    expect(fmt(60)).toBe('1:00');
    expect(fmt(61)).toBe('1:01');
    expect(fmt(125)).toBe('2:05');
    expect(fmt(599)).toBe('9:59');
    expect(fmt(600)).toBe('10:00');
    expect(fmt(3599)).toBe('59:59');
  });

  test('formats hours correctly', () => {
    expect(fmt(3600)).toBe('1:00:00');
    expect(fmt(3661)).toBe('1:01:01');
    expect(fmt(7200)).toBe('2:00:00');
    expect(fmt(7384)).toBe('2:03:04');
    expect(fmt(36000)).toBe('10:00:00');
  });

  test('floors fractional seconds', () => {
    expect(fmt(1.9)).toBe('0:01');
    expect(fmt(59.99)).toBe('0:59');
    expect(fmt(60.5)).toBe('1:00');
  });

  test('pads minutes and seconds with leading zeros', () => {
    expect(fmt(3601)).toBe('1:00:01');
    expect(fmt(3660)).toBe('1:01:00');
    expect(fmt(62)).toBe('1:02');
  });
});

// ─── esc() — HTML escaping ────────────────────────────────

describe('esc()', () => {
  test('returns empty string for falsy values', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc('')).toBe('');
    expect(esc(0)).toBe('');
    expect(esc(false)).toBe('');
  });

  test('escapes ampersands', () => {
    expect(esc('A & B')).toBe('A &amp; B');
    expect(esc('&&')).toBe('&amp;&amp;');
  });

  test('escapes less-than signs', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
    expect(esc('a < b')).toBe('a &lt; b');
  });

  test('escapes greater-than signs', () => {
    expect(esc('a > b')).toBe('a &gt; b');
  });

  test('escapes double quotes', () => {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  test('escapes all special characters together', () => {
    expect(esc('<div class="x">A & B</div>')).toBe(
      '&lt;div class=&quot;x&quot;&gt;A &amp; B&lt;/div&gt;'
    );
  });

  test('handles normal text without changes', () => {
    expect(esc('Hello World')).toBe('Hello World');
    expect(esc('Coco Music v3')).toBe('Coco Music v3');
  });

  test('converts numbers to string', () => {
    expect(esc(42)).toBe('42');
    expect(esc(3.14)).toBe('3.14');
  });

  test('handles unicode text', () => {
    expect(esc('Égaliseur')).toBe('Égaliseur');
    expect(esc('🎵 Musique')).toBe('🎵 Musique');
  });
});

// ─── cleanName() — file name cleaning ─────────────────────

describe('cleanName()', () => {
  test('removes file extension', () => {
    expect(cleanName('song.mp3')).toBe('song');
    expect(cleanName('track.flac')).toBe('track');
    expect(cleanName('audio.m4a')).toBe('audio');
  });

  test('replaces hyphens and underscores with spaces', () => {
    expect(cleanName('my-song.mp3')).toBe('my song');
    expect(cleanName('my_song.mp3')).toBe('my song');
    expect(cleanName('artist-title_remix.mp3')).toBe('artist title remix');
  });

  test('collapses multiple spaces', () => {
    expect(cleanName('my   song.mp3')).toBe('my song');
    expect(cleanName('a - b - c.mp3')).toBe('a b c');
  });

  test('trims whitespace', () => {
    expect(cleanName('  song  .mp3')).toBe('song');
  });

  test('handles names with multiple dots', () => {
    expect(cleanName('song.v2.mp3')).toBe('song.v2');
    expect(cleanName('track.01.flac')).toBe('track.01');
  });

  test('handles names without extension', () => {
    expect(cleanName('song')).toBe('song');
  });
});

// ─── shuffle() — array shuffling ─────────────────────────

describe('shuffle()', () => {
  test('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(5);
  });

  test('does not modify original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  test('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffle(arr);
    expect(result.sort((a, b) => a - b)).toEqual(arr);
  });

  test('handles empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  test('handles single element', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  test('handles two elements', () => {
    const arr = [1, 2];
    const result = shuffle(arr);
    expect(result).toHaveLength(2);
    expect(result.sort()).toEqual([1, 2]);
  });

  test('actually shuffles (statistical)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let sameCount = 0;
    const runs = 20;
    for (let i = 0; i < runs; i++) {
      const result = shuffle(arr);
      if (JSON.stringify(result) === JSON.stringify(arr)) sameCount++;
    }
    // It's statistically near-impossible for 20 shuffles of 10 elements
    // to all be identical to the original
    expect(sameCount).toBeLessThan(runs);
  });
});
