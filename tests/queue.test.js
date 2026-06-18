/**
 * Coco Music — Unit tests for queue/playback logic and data integrity
 */

const {
  buildQueue,
  EQ_FREQS,
  EQ_LBLS,
  EQ_PRESETS,
  RADIO
} = require('../src/utils');

// ─── buildQueue() — queue construction ────────────────────

describe('buildQueue()', () => {
  const mockLibrary = [
    { id: 'tr_1', title: 'Song A' },
    { id: 'tr_2', title: 'Song B' },
    { id: 'tr_3', title: 'Song C' },
    { id: 'tr_4', title: 'Song D' },
    { id: 'tr_5', title: 'Song E' }
  ];

  test('returns all track IDs in order when shuffle is off', () => {
    const q = buildQueue(mockLibrary, false);
    expect(q).toEqual(['tr_1', 'tr_2', 'tr_3', 'tr_4', 'tr_5']);
  });

  test('returns all track IDs when shuffle is on', () => {
    const q = buildQueue(mockLibrary, true);
    expect(q).toHaveLength(5);
    expect(q.sort()).toEqual(['tr_1', 'tr_2', 'tr_3', 'tr_4', 'tr_5']);
  });

  test('places current track first when shuffled', () => {
    const q = buildQueue(mockLibrary, true, 'tr_3');
    expect(q[0]).toBe('tr_3');
    expect(q).toHaveLength(5);
  });

  test('handles empty library', () => {
    const q = buildQueue([], false);
    expect(q).toEqual([]);
  });

  test('handles single track', () => {
    const q = buildQueue([{ id: 'only' }], false);
    expect(q).toEqual(['only']);
  });

  test('handles single track with shuffle', () => {
    const q = buildQueue([{ id: 'only' }], true, 'only');
    expect(q).toEqual(['only']);
  });

  test('does not modify original library', () => {
    const lib = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const original = JSON.stringify(lib);
    buildQueue(lib, true);
    expect(JSON.stringify(lib)).toBe(original);
  });

  test('shuffled queue contains no duplicates', () => {
    const bigLib = Array.from({ length: 50 }, (_, i) => ({ id: `tr_${i}` }));
    const q = buildQueue(bigLib, true);
    const unique = new Set(q);
    expect(unique.size).toBe(50);
  });
});

// ─── EQ_PRESETS — data integrity ──────────────────────────

describe('EQ_PRESETS', () => {
  test('has 10 known presets', () => {
    const names = Object.keys(EQ_PRESETS);
    expect(names).toContain('Flat');
    expect(names).toContain('Bass Boost');
    expect(names).toContain('Treble Boost');
    expect(names).toContain('Vocal');
    expect(names).toContain('Pop');
    expect(names).toContain('Rock');
    expect(names).toContain('Jazz');
    expect(names).toContain('Electronic');
    expect(names).toContain('Classical');
    expect(names).toContain('Hip-Hop');
    expect(names).toHaveLength(10);
  });

  test('each preset has exactly 10 bands', () => {
    for (const [name, values] of Object.entries(EQ_PRESETS)) {
      expect(values).toHaveLength(10);
    }
  });

  test('Flat preset is all zeros', () => {
    expect(EQ_PRESETS['Flat']).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  test('all preset values are within -12 to +12 dB range', () => {
    for (const [name, values] of Object.entries(EQ_PRESETS)) {
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(-12);
        expect(v).toBeLessThanOrEqual(12);
      }
    }
  });

  test('Bass Boost has high values in low frequencies', () => {
    const bb = EQ_PRESETS['Bass Boost'];
    expect(bb[0]).toBeGreaterThan(0);
    expect(bb[1]).toBeGreaterThan(0);
    expect(bb[2]).toBeGreaterThan(0);
    // Higher frequencies should be 0
    expect(bb[7]).toBe(0);
    expect(bb[8]).toBe(0);
    expect(bb[9]).toBe(0);
  });

  test('Treble Boost has high values in high frequencies', () => {
    const tb = EQ_PRESETS['Treble Boost'];
    expect(tb[0]).toBe(0);
    expect(tb[1]).toBe(0);
    expect(tb[7]).toBeGreaterThan(0);
    expect(tb[8]).toBeGreaterThan(0);
    expect(tb[9]).toBeGreaterThan(0);
  });
});

// ─── EQ_FREQS / EQ_LBLS — frequency bands ────────────────

describe('EQ_FREQS and EQ_LBLS', () => {
  test('has 10 frequencies', () => {
    expect(EQ_FREQS).toHaveLength(10);
  });

  test('has 10 labels', () => {
    expect(EQ_LBLS).toHaveLength(10);
  });

  test('frequencies are in ascending order', () => {
    for (let i = 1; i < EQ_FREQS.length; i++) {
      expect(EQ_FREQS[i]).toBeGreaterThan(EQ_FREQS[i - 1]);
    }
  });

  test('frequencies cover standard EQ range (32Hz to 16kHz)', () => {
    expect(EQ_FREQS[0]).toBe(32);
    expect(EQ_FREQS[EQ_FREQS.length - 1]).toBe(16000);
  });

  test('labels match frequencies', () => {
    expect(EQ_LBLS[0]).toBe('32Hz');
    expect(EQ_LBLS[5]).toBe('1kHz');
    expect(EQ_LBLS[9]).toBe('16kHz');
  });
});

// ─── RADIO — stations data integrity ─────────────────────

describe('RADIO', () => {
  test('has 8 stations', () => {
    expect(RADIO).toHaveLength(8);
  });

  test('each station has name, sub, and url', () => {
    for (const station of RADIO) {
      expect(station).toHaveProperty('name');
      expect(station).toHaveProperty('sub');
      expect(station).toHaveProperty('url');
      expect(typeof station.name).toBe('string');
      expect(typeof station.sub).toBe('string');
      expect(typeof station.url).toBe('string');
    }
  });

  test('all URLs are valid HTTP(S)', () => {
    for (const station of RADIO) {
      expect(station.url).toMatch(/^https?:\/\//);
    }
  });

  test('no duplicate station names', () => {
    const names = RADIO.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('no duplicate URLs', () => {
    const urls = RADIO.map(s => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test('includes known French stations', () => {
    const names = RADIO.map(s => s.name);
    expect(names).toContain('NRJ');
    expect(names).toContain('Skyrock');
    expect(names).toContain('France Inter');
  });

  test('all stations have non-empty fields', () => {
    for (const station of RADIO) {
      expect(station.name.length).toBeGreaterThan(0);
      expect(station.sub.length).toBeGreaterThan(0);
      expect(station.url.length).toBeGreaterThan(0);
    }
  });
});
