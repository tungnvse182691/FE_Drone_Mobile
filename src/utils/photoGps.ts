export interface PhotoGps { latitude: number; longitude: number; accuracyMeters: number | null }

/** Reads only original TIFF GPS tags in JPEG APP1 / PNG eXIf. Never uses device GPS.
 * Bounded offsets/counts: corrupt or stripped metadata is simply unavailable.
 * EXIF time without timezone is deliberately not turned into a capture timestamp. */
export function readPhotoGps(bytes: Uint8Array): PhotoGps | null {
  const tiff = (start: number, end: number): PhotoGps | null => {
    try {
      const v = new DataView(bytes.buffer, bytes.byteOffset + start, end - start);
      const le = v.getUint16(0) === 0x4949;
      if (!le && v.getUint16(0) !== 0x4d4d) return null;
      const u16 = (p: number) => v.getUint16(p, le), u32 = (p: number) => v.getUint32(p, le);
      if (u16(2) !== 42) return null;
      const entries = (offset: number) => {
        if (offset < 8 || offset + 2 > v.byteLength) throw Error('offset');
        const count = u16(offset);
        if (count > 256 || offset + 2 + count * 12 + 4 > v.byteLength) throw Error('entries');
        return Array.from({ length: count }, (_, i) => offset + 2 + i * 12);
      };
      const pointer = entries(u32(4)).find(p => u16(p) === 0x8825 && u16(p + 2) === 4 && u32(p + 4) === 1);
      if (pointer === undefined) return null;
      const gps = entries(u32(pointer + 8));
      const ref = (tag: number) => {
        const p = gps.find(p => u16(p) === tag && u16(p + 2) === 2 && u32(p + 4) === 2);
        return p === undefined || v.getUint8(p + 9) !== 0 ? '' : String.fromCharCode(v.getUint8(p + 8));
      };
      const dms = (tag: number, limit: number) => {
        const p = gps.find(p => u16(p) === tag && u16(p + 2) === 5 && u32(p + 4) === 3);
        if (p === undefined) return null;
        const offset = u32(p + 8);
        if (offset < 8 || offset + 24 > v.byteLength) return null;
        const values = [0, 8, 16].map(i => u32(offset + i) / u32(offset + i + 4));
        if (values.some(n => !Number.isFinite(n)) || values[1] >= 60 || values[2] >= 60) return null;
        const value = values[0] + values[1] / 60 + values[2] / 3600;
        return value <= limit ? value : null;
      };
      const a = ref(1), b = ref(3), latitude = dms(2, 90), longitude = dms(4, 180);
      if (!['N', 'S'].includes(a) || !['E', 'W'].includes(b) || latitude === null || longitude === null || (latitude === 0 && longitude === 0)) return null;
      return { latitude: latitude * (a === 'S' ? -1 : 1), longitude: longitude * (b === 'W' ? -1 : 1), accuracyMeters: null };
    } catch { return null; }
  };
  if (bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 4 <= bytes.length) {
      if (bytes[p++] !== 255) return null;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) return null;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = bytes[p] * 256 + bytes[p + 1];
      if (size < 2 || p + size > bytes.length) return null;
      if (marker === 0xe1 && size >= 8 && [69,120,105,102,0,0].every((n, i) => bytes[p + 2 + i] === n)) {
        const gps = tiff(p + 8, p + size); if (gps) return gps;
      }
      p += size;
    }
  } else if ([137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let p = 8;
    while (p + 12 <= bytes.length) {
      const size = v.getUint32(p);
      if (p + 12 + size > bytes.length) return null;
      if ([101,88,73,102].every((n, i) => bytes[p + 4 + i] === n)) return tiff(p + 8, p + 8 + size);
      p += 12 + size;
    }
  }
  return null;
}
