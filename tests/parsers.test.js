/**
 * Coco Music — Unit tests for parsers (LRC, ID3, MP4)
 */

const { parseLRC, parseID3, parseMP4 } = require('../src/utils');

// ─── parseLRC() — lyrics file parsing ─────────────────────

describe('parseLRC()', () => {
  test('parses standard LRC format', () => {
    const lrc = `[00:12.34]First line
[00:15.56]Second line
[00:20.00]Third line`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ time: 12.34, text: 'First line' });
    expect(result[1]).toEqual({ time: 15.56, text: 'Second line' });
    expect(result[2]).toEqual({ time: 20, text: 'Third line' });
  });

  test('parses LRC with colon separator in seconds', () => {
    const lrc = `[01:30:50]Line one`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBeCloseTo(90.5, 1);
    expect(result[0].text).toBe('Line one');
  });

  test('sorts lines by time', () => {
    const lrc = `[01:00.00]Later line
[00:30.00]Earlier line
[00:45.00]Middle line`;
    const result = parseLRC(lrc);
    expect(result[0].text).toBe('Earlier line');
    expect(result[1].text).toBe('Middle line');
    expect(result[2].text).toBe('Later line');
  });

  test('skips empty text lines', () => {
    const lrc = `[00:10.00]Has text
[00:20.00]
[00:30.00]Also has text`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Has text');
    expect(result[1].text).toBe('Also has text');
  });

  test('ignores metadata tags', () => {
    const lrc = `[ti:Song Title]
[ar:Artist Name]
[al:Album Name]
[00:05.00]First lyric`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('First lyric');
  });

  test('handles empty input', () => {
    expect(parseLRC('')).toEqual([]);
  });

  test('handles minutes over 59', () => {
    const lrc = `[120:00.00]Long song line`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(7200);
  });

  test('trims whitespace from text', () => {
    const lrc = `[00:10.00]  spaces around  `;
    const result = parseLRC(lrc);
    expect(result[0].text).toBe('spaces around');
  });

  test('handles multiple timestamps per line pattern', () => {
    const lrc = `[00:10.00]Line A
[00:10.00]Line B duplicate time`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(2);
  });
});

// ─── parseID3() — MP3 tag parsing ─────────────────────────

describe('parseID3()', () => {
  function makeID3Tag(frames) {
    const frameBuffers = [];
    for (const { id, text } of frames) {
      const textBytes = new TextEncoder().encode(text);
      const frameSize = 1 + textBytes.length; // 1 byte encoding + text
      const header = new Uint8Array(10);
      // Frame ID
      header[0] = id.charCodeAt(0);
      header[1] = id.charCodeAt(1);
      header[2] = id.charCodeAt(2);
      header[3] = id.charCodeAt(3);
      // Frame size (4 bytes big-endian)
      header[4] = (frameSize >> 24) & 0xFF;
      header[5] = (frameSize >> 16) & 0xFF;
      header[6] = (frameSize >> 8) & 0xFF;
      header[7] = frameSize & 0xFF;
      // Flags (2 bytes, all zero)
      header[8] = 0;
      header[9] = 0;
      // Data: encoding byte (0 = ISO-8859-1) + text
      const data = new Uint8Array(1 + textBytes.length);
      data[0] = 3; // UTF-8 encoding
      data.set(textBytes, 1);
      frameBuffers.push(header, data);
    }

    // Calculate total frames size
    let totalFrameSize = 0;
    for (const buf of frameBuffers) totalFrameSize += buf.length;

    // ID3 header (10 bytes)
    const id3Header = new Uint8Array(10);
    id3Header[0] = 0x49; // I
    id3Header[1] = 0x44; // D
    id3Header[2] = 0x33; // 3
    id3Header[3] = 3;    // Version 2.3
    id3Header[4] = 0;    // Revision
    id3Header[5] = 0;    // Flags
    // Size (syncsafe integer)
    id3Header[6] = (totalFrameSize >> 21) & 0x7F;
    id3Header[7] = (totalFrameSize >> 14) & 0x7F;
    id3Header[8] = (totalFrameSize >> 7) & 0x7F;
    id3Header[9] = totalFrameSize & 0x7F;

    // Combine
    const result = new Uint8Array(10 + totalFrameSize);
    result.set(id3Header, 0);
    let offset = 10;
    for (const buf of frameBuffers) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result.buffer;
  }

  test('parses title, artist, album from ID3v2.3', () => {
    const buf = makeID3Tag([
      { id: 'TIT2', text: 'Test Song' },
      { id: 'TPE1', text: 'Test Artist' },
      { id: 'TALB', text: 'Test Album' }
    ]);
    const result = parseID3(buf);
    expect(result.title).toBe('Test Song');
    expect(result.artist).toBe('Test Artist');
    expect(result.album).toBe('Test Album');
  });

  test('returns null fields for non-ID3 data', () => {
    const buf = new ArrayBuffer(100);
    const result = parseID3(buf);
    expect(result.title).toBeNull();
    expect(result.artist).toBeNull();
    expect(result.album).toBeNull();
    expect(result.artBlob).toBeNull();
  });

  test('handles partial tags (title only)', () => {
    const buf = makeID3Tag([
      { id: 'TIT2', text: 'Only Title' }
    ]);
    const result = parseID3(buf);
    expect(result.title).toBe('Only Title');
    expect(result.artist).toBeNull();
    expect(result.album).toBeNull();
  });

  test('handles unicode text', () => {
    const buf = makeID3Tag([
      { id: 'TIT2', text: 'Égaliseur' },
      { id: 'TPE1', text: 'Artiste Français' }
    ]);
    const result = parseID3(buf);
    expect(result.title).toBe('Égaliseur');
    expect(result.artist).toBe('Artiste Français');
  });

  test('handles empty tag data', () => {
    const buf = makeID3Tag([]);
    const result = parseID3(buf);
    expect(result.title).toBeNull();
    expect(result.artist).toBeNull();
  });

  test('handles very small buffer', () => {
    const buf = new ArrayBuffer(5);
    const result = parseID3(buf);
    expect(result.title).toBeNull();
  });
});

// ─── parseMP4() — M4A/MP4 tag parsing ────────────────────

describe('parseMP4()', () => {
  function makeMP4WithMeta(metadata) {
    const parts = [];

    for (const { tag, text } of metadata) {
      const textBytes = new TextEncoder().encode(text);
      // data atom: 16 header + text
      const dataSize = 16 + textBytes.length;
      const dataAtom = new Uint8Array(dataSize);
      // size
      dataAtom[0] = (dataSize >> 24) & 0xFF;
      dataAtom[1] = (dataSize >> 16) & 0xFF;
      dataAtom[2] = (dataSize >> 8) & 0xFF;
      dataAtom[3] = dataSize & 0xFF;
      // 'data'
      dataAtom[4] = 0x64; dataAtom[5] = 0x61; dataAtom[6] = 0x74; dataAtom[7] = 0x61;
      // type flag (1 = UTF-8 text)
      dataAtom[8] = 0; dataAtom[9] = 0; dataAtom[10] = 0; dataAtom[11] = 1;
      // locale (0)
      dataAtom[12] = 0; dataAtom[13] = 0; dataAtom[14] = 0; dataAtom[15] = 0;
      // text
      dataAtom.set(textBytes, 16);

      // tag atom: 8 header + data atom
      const tagSize = 8 + dataSize;
      const tagAtom = new Uint8Array(tagSize);
      tagAtom[0] = (tagSize >> 24) & 0xFF;
      tagAtom[1] = (tagSize >> 16) & 0xFF;
      tagAtom[2] = (tagSize >> 8) & 0xFF;
      tagAtom[3] = tagSize & 0xFF;
      // tag name (e.g. ©nam)
      tagAtom[4] = tag.charCodeAt(0);
      tagAtom[5] = tag.charCodeAt(1);
      tagAtom[6] = tag.charCodeAt(2);
      tagAtom[7] = tag.charCodeAt(3);
      tagAtom.set(dataAtom, 8);

      parts.push(tagAtom);
    }

    // Calculate ilst size
    let ilstContentSize = 0;
    for (const p of parts) ilstContentSize += p.length;
    const ilstSize = 8 + ilstContentSize;

    // meta atom (has 4-byte version/flags after header)
    const metaSize = 12 + ilstSize;

    // udta atom
    const udtaSize = 8 + metaSize;

    // moov atom
    const moovSize = 8 + udtaSize;

    const total = moovSize;
    const buf = new Uint8Array(total);
    let pos = 0;

    // moov
    buf[pos] = (moovSize >> 24) & 0xFF; buf[pos+1] = (moovSize >> 16) & 0xFF;
    buf[pos+2] = (moovSize >> 8) & 0xFF; buf[pos+3] = moovSize & 0xFF;
    buf[pos+4] = 0x6D; buf[pos+5] = 0x6F; buf[pos+6] = 0x6F; buf[pos+7] = 0x76; // moov
    pos += 8;

    // udta
    buf[pos] = (udtaSize >> 24) & 0xFF; buf[pos+1] = (udtaSize >> 16) & 0xFF;
    buf[pos+2] = (udtaSize >> 8) & 0xFF; buf[pos+3] = udtaSize & 0xFF;
    buf[pos+4] = 0x75; buf[pos+5] = 0x64; buf[pos+6] = 0x74; buf[pos+7] = 0x61; // udta
    pos += 8;

    // meta
    buf[pos] = (metaSize >> 24) & 0xFF; buf[pos+1] = (metaSize >> 16) & 0xFF;
    buf[pos+2] = (metaSize >> 8) & 0xFF; buf[pos+3] = metaSize & 0xFF;
    buf[pos+4] = 0x6D; buf[pos+5] = 0x65; buf[pos+6] = 0x74; buf[pos+7] = 0x61; // meta
    // 4 bytes version/flags
    buf[pos+8] = 0; buf[pos+9] = 0; buf[pos+10] = 0; buf[pos+11] = 0;
    pos += 12;

    // ilst
    buf[pos] = (ilstSize >> 24) & 0xFF; buf[pos+1] = (ilstSize >> 16) & 0xFF;
    buf[pos+2] = (ilstSize >> 8) & 0xFF; buf[pos+3] = ilstSize & 0xFF;
    buf[pos+4] = 0x69; buf[pos+5] = 0x6C; buf[pos+6] = 0x73; buf[pos+7] = 0x74; // ilst
    pos += 8;

    // tag atoms
    for (const p of parts) {
      buf.set(p, pos);
      pos += p.length;
    }

    return buf;
  }

  test('parses title from ©nam', () => {
    const buf = makeMP4WithMeta([{ tag: '\xA9nam', text: 'My Song' }]);
    const result = parseMP4(buf);
    expect(result.title).toBe('My Song');
  });

  test('parses artist from ©ART', () => {
    const buf = makeMP4WithMeta([{ tag: '\xA9ART', text: 'Cool Artist' }]);
    const result = parseMP4(buf);
    expect(result.artist).toBe('Cool Artist');
  });

  test('parses album from ©alb', () => {
    const buf = makeMP4WithMeta([{ tag: '\xA9alb', text: 'Great Album' }]);
    const result = parseMP4(buf);
    expect(result.album).toBe('Great Album');
  });

  test('parses all fields together', () => {
    const buf = makeMP4WithMeta([
      { tag: '\xA9nam', text: 'Song Title' },
      { tag: '\xA9ART', text: 'Artist Name' },
      { tag: '\xA9alb', text: 'Album Name' }
    ]);
    const result = parseMP4(buf);
    expect(result.title).toBe('Song Title');
    expect(result.artist).toBe('Artist Name');
    expect(result.album).toBe('Album Name');
  });

  test('returns null for empty buffer', () => {
    const result = parseMP4(new Uint8Array(0));
    expect(result.title).toBeNull();
    expect(result.artist).toBeNull();
    expect(result.album).toBeNull();
    expect(result.artBlob).toBeNull();
  });

  test('returns null for non-MP4 data', () => {
    const buf = new Uint8Array(100);
    buf.fill(0x41); // 'AAAA...'
    const result = parseMP4(buf);
    expect(result.title).toBeNull();
  });

  test('handles unicode metadata', () => {
    const buf = makeMP4WithMeta([
      { tag: '\xA9nam', text: 'Chanson Française' },
      { tag: '\xA9ART', text: 'Artiste Étranger' }
    ]);
    const result = parseMP4(buf);
    expect(result.title).toBe('Chanson Française');
    expect(result.artist).toBe('Artiste Étranger');
  });
});
