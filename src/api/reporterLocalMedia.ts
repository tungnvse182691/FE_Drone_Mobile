import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { MAX_PHOTO_BYTES, sha256HexOfBytes } from './uploads';

export type ReporterPhotoSource = { uri: string; fileName: string; mediaType?: string | null; capturedAt: string };
export type PreservedReporterPhoto = ReporterPhotoSource & {
  mediaType: 'image/jpeg' | 'image/png'; sizeBytes: number; checksumSha256: string;
};
const failure = (code: string) => ({ code, stage: 'local_admission' });

/** New selections only. Never migrates/rebinds historical drafts, upload IDs or commands.
 * The caller must bind isCurrent to its initiating actor/environment/session/render. */
export async function preserveReporterPhoto(source: ReporterPhotoSource, isCurrent: () => boolean): Promise<PreservedReporterPhoto> {
  const guard = () => { if (!isCurrent()) throw failure('photo_context_changed'); };
  let phase = 'read';
  try {
    guard();
    const file = new File(source.uri);
    if (!file.exists) throw failure('photo_source_missing');
    const size = file.size;
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_PHOTO_BYTES) throw failure('photo_size_invalid');
    const bytes = await file.bytes(); guard();
    if (bytes.length !== size) throw failure('photo_copy_mismatch');
    const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
    const mediaType = jpeg ? 'image/jpeg' : png ? 'image/png' : null;
    const extension = /\.(jpe?g|png)$/i.exec(source.fileName)?.[1].toLowerCase();
    const declared = source.mediaType?.trim().toLowerCase();
    if (!mediaType || !extension || (extension === 'png') !== png || (declared && declared !== mediaType))
      throw failure('photo_type_invalid');
    const checksumSha256 = await sha256HexOfBytes(bytes); guard();
    phase = 'write';
    const directory = new Directory(Paths.document, 'reporter-photos-v1');
    directory.create({ intermediates: true, idempotent: true }); guard();
    const key = randomUUID();
    const partial = new File(directory, key + '.partial');
    const final = new File(directory, key + (jpeg ? '.jpg' : '.png'));
    partial.write(bytes); guard();
    phase = 'read';
    const copied = await partial.bytes(); guard();
    const copyHash = await sha256HexOfBytes(copied); guard();
    if (copied.length !== size || copyHash !== checksumSha256) throw failure('photo_copy_mismatch');
    phase = 'move';
    partial.move(final); guard();
    phase = 'read';
    if (!final.exists || final.size !== size) throw failure('photo_copy_mismatch');
    const finalBytes = await final.bytes(); guard();
    const finalHash = await sha256HexOfBytes(finalBytes); guard();
    if (finalBytes.length !== size || finalHash !== checksumSha256) throw failure('photo_copy_mismatch');
    // No input path/name is used in the destination. Leftover partials are retained
    // on failure; no cleanup may infer that an old file is unreferenced.
    return { uri: final.uri, fileName: key + (jpeg ? '.jpg' : '.png'), mediaType,
      capturedAt: source.capturedAt, sizeBytes: size, checksumSha256 };
  } catch (error) {
    guard();
    const code = (error as { code?: string })?.code;
    if (code?.startsWith('photo_')) throw error;
    throw failure(`photo_${phase}_failed`);
  }
}

export function reporterPhotoFailureMessage(error: unknown): string | null {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'photo_size_invalid': return 'Ảnh phải có dữ liệu và không vượt quá 20 MiB. Nháp và ảnh cũ vẫn được giữ.';
    case 'photo_type_invalid': return 'Chỉ nhận ảnh JPEG hoặc PNG có nội dung và định dạng tệp khớp nhau. Nháp và ảnh cũ vẫn được giữ.';
    case 'photo_source_missing': return 'Ảnh vừa chọn không còn truy cập được. Nháp và ảnh cũ vẫn được giữ.';
    case 'photo_read_failed': return 'Không đọc được ảnh trên thiết bị. Nháp và ảnh cũ vẫn được giữ; vui lòng kiểm tra quyền truy cập.';
    case 'photo_write_failed': case 'photo_move_failed': case 'photo_copy_mismatch':
      return 'Chưa lưu được bản ảnh bền vững trên thiết bị. Nháp và ảnh cũ vẫn được giữ; vui lòng thử chọn hoặc chụp lại.';
    case 'photo_context_changed': return 'Phiên đã thay đổi. Ảnh vừa chọn chưa được thêm vào nháp.';
    default: return null;
  }
}
