/** BE uses trimmed UTF-16 string length for both Reporter operations. */
export function reportDescriptionError(value: string): string | null {
  const length = value.trim().length;
  return length >= 1 && length <= 1000 ? null : 'Mô tả phải từ 1 đến 1.000 ký tự sau khi bỏ khoảng trắng đầu và cuối.';
}
