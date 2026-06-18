/**
 * Coco Music — Extracted pure functions for testing.
 * These mirror the logic in index.html exactly.
 */

// ─── FORMAT TIME ───────────────────────────────────────────
function fmt(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  const t = Math.floor(s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── HTML ESCAPE ───────────────────────────────────────────
function esc(s) {
  return s
    ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    : '';
}

// ─── CLEAN FILE NAME ──────────────────────────────────────
function cleanName(name) {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── SHUFFLE ──────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── PARSE LRC ────────────────────────────────────────────
function parseLRC(text) {
  const lines = text.split('\n').filter(Boolean);
  const result = [];
  const regex = /\[(\d+):(\d+[\.:]\d+)\](.*)/;
  for (const line of lines) {
    const m = line.match(regex);
    if (m) {
      const min = parseInt(m[1]);
      const secStr = m[2].replace(':', '.');
      const sec = parseFloat(secStr);
      const time = min * 60 + sec;
      const txt = m[3].trim();
      if (txt) result.push({ time, text: txt });
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

// ─── BUILD QUEUE ──────────────────────────────────────────
function buildQueue(library, isShuffle, currentTrackId) {
  let q = library.map(t => t.id);
  if (isShuffle) {
    q = shuffle(q);
    if (currentTrackId) {
      const ci = q.indexOf(currentTrackId);
      if (ci > 0) { [q[0], q[ci]] = [q[ci], q[0]]; }
    }
  }
  return q;
}

// ─── EQ PRESETS ───────────────────────────────────────────
const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_LBLS = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
const EQ_PRESETS = {
  'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [8, 7, 5, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 7, 8],
  'Vocal': [-2, -2, 0, 4, 6, 4, 2, 0, -1, -2],
  'Pop': [-1, 2, 4, 3, 0, -1, 0, 2, 3, 3],
  'Rock': [4, 3, 1, 0, -1, 0, 2, 4, 5, 5],
  'Jazz': [3, 2, 0, 2, 0, 0, -1, 0, 2, 3],
  'Electronic': [6, 5, 2, 0, -2, 0, 2, 4, 5, 6],
  'Classical': [4, 3, 2, 2, 0, 0, -2, 0, 3, 4],
  'Hip-Hop': [6, 5, 3, 2, 0, -1, 0, 2, 3, 4]
};

// ─── RADIO STATIONS ───────────────────────────────────────
const RADIO = [
  { name: 'NRJ', sub: 'France · Top 40', url: 'https://stream.nrj.fr/nrj-hd.mp3' },
  { name: 'Fun Radio', sub: 'France · Dance', url: 'https://streaming.radio.funradio.fr/fun-1-44-128' },
  { name: 'Virgin Radio', sub: 'France · Pop Rock', url: 'https://stream.virginradio.fr/virgin-1-44-128' },
  { name: 'Skyrock', sub: 'France · Rap/Hip-Hop', url: 'https://streaming.skyrock.com/3.mp3' },
  { name: 'Lofi Girl', sub: '24/7 · Chill/Lofi', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
  { name: 'Jazz Radio', sub: 'France · Jazz', url: 'https://jazzradio.ice.infomaniak.ch/jazzradio-high.mp3' },
  { name: 'France Inter', sub: 'France · Généraliste', url: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3' },
  { name: 'FIP', sub: 'France · Musicale', url: 'https://icecast.radiofrance.fr/fip-midfi.mp3' }
];

// ─── PARSE ID3 ────────────────────────────────────────────
function parseID3(buf) {
  const res = { title: null, artist: null, album: null, artBlob: null };
  const bytes = new Uint8Array(buf);
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return res;
  const ver = bytes[3];
  let pos = 10;
  const totalSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
  const end = Math.min(10 + totalSize, bytes.length);
  const dec = new TextDecoder('utf-8', { fatal: false });

  function readFrameSize(p) {
    if (ver >= 4) return ((bytes[p] & 0x7f) << 21) | ((bytes[p + 1] & 0x7f) << 14) | ((bytes[p + 2] & 0x7f) << 7) | (bytes[p + 3] & 0x7f);
    return (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
  }

  while (pos + 10 < end) {
    const frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    if (frameId === '\0\0\0\0') break;
    const frameSize = readFrameSize(pos + 4);
    if (frameSize <= 0 || pos + 10 + frameSize > end) break;
    const data = bytes.slice(pos + 10, pos + 10 + frameSize);

    if (['TIT2', 'TPE1', 'TALB'].includes(frameId)) {
      const enc = data[0];
      let text = '';
      if (enc === 0) {
        text = dec.decode(data.slice(1));
      } else if (enc === 1 || enc === 2) {
        let start = 1;
        if (data[1] === 0xFF && data[2] === 0xFE) start = 3;
        else if (data[1] === 0xFE && data[2] === 0xFF) start = 3;
        const u16 = [];
        for (let i = start; i + 1 < data.length; i += 2) {
          const code = (enc === 2 || (data[1] === 0xFE && data[2] === 0xFF))
            ? (data[i] << 8) | data[i + 1]
            : data[i] | (data[i + 1] << 8);
          if (code === 0) break;
          u16.push(code);
        }
        text = String.fromCharCode(...u16);
      } else if (enc === 3) {
        text = dec.decode(data.slice(1));
      }
      text = text.replace(/\0/g, '').trim();
      if (frameId === 'TIT2') res.title = text;
      if (frameId === 'TPE1') res.artist = text;
      if (frameId === 'TALB') res.album = text;
    }

    if (frameId === 'APIC') {
      const enc = data[0];
      let i = 1;
      let mime = '';
      while (i < data.length && data[i] !== 0) mime += String.fromCharCode(data[i++]);
      i++;
      i++;
      while (i < data.length && data[i] !== 0) i++;
      i++;
      if (i < data.length) {
        const imgData = data.slice(i);
        const mimeType = mime || 'image/jpeg';
        res.artBlob = new Blob([imgData], { type: mimeType });
      }
    }

    pos += 10 + frameSize;
  }
  return res;
}

// ─── PARSE MP4 ────────────────────────────────────────────
function parseMP4(bytesInput) {
  const res = { title: null, artist: null, album: null, artBlob: null };
  const bytes = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput);
  const len = bytes.length;
  const dec = new TextDecoder('utf-8', { fatal: false });
  function r32(o) { return (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]; }
  function tag(o) { return String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]); }
  function walk(start, end) {
    let p = start;
    while (p + 8 <= end) {
      let sz = r32(p);
      const t = tag(p + 4);
      if (sz < 8) { if (sz === 1 && p + 16 <= end) { p += 16; continue; } break; }
      if (p + sz > end) sz = end - p;
      const containers = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'meta', 'ilst'];
      if (containers.includes(t)) {
        let inner = p + 8;
        if (t === 'meta') inner += 4;
        walk(inner, p + sz);
      }
      if (t === '©nam' || t === '©ART' || t === '©alb' || t === 'covr') {
        let dp = p + 8;
        while (dp + 16 < p + sz) {
          const dsz = r32(dp);
          const dt = tag(dp + 4);
          if (dt === 'data' && dsz > 16) {
            const typeFlag = r32(dp + 8);
            const payload = bytes.slice(dp + 16, dp + dsz);
            if (t === 'covr') {
              const mime = (typeFlag === 14) ? 'image/png' : 'image/jpeg';
              res.artBlob = new Blob([payload], { type: mime });
            } else {
              const txt = dec.decode(payload).trim();
              if (t === '©nam') res.title = txt;
              if (t === '©ART') res.artist = txt;
              if (t === '©alb') res.album = txt;
            }
          }
          dp += dsz;
          if (dsz < 8) break;
        }
      }
      p += sz;
    }
  }
  walk(0, len);
  return res;
}

module.exports = {
  fmt,
  esc,
  cleanName,
  shuffle,
  parseLRC,
  buildQueue,
  EQ_FREQS,
  EQ_LBLS,
  EQ_PRESETS,
  RADIO,
  parseID3,
  parseMP4
};
