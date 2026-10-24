export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export type AvatarCheck =
  | { ok: true; ext: 'jpg' | 'png' | 'webp'; contentType: 'image/jpeg' | 'image/png' | 'image/webp' }
  | { ok: false; error: string };

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

/**
 * Decide the file type from its content (magic bytes), never from the client-supplied
 * name or MIME type. SVG and everything else is rejected.
 */
export function checkAvatar(bytes: Uint8Array, declaredType?: string): AvatarCheck {
  if (bytes.byteLength === 0) return { ok: false, error: 'Choose an image file.' };
  if (bytes.byteLength > AVATAR_MAX_BYTES) return { ok: false, error: 'Image must be 2 MB or smaller.' };
  let detected: { ext: 'jpg' | 'png' | 'webp'; contentType: 'image/jpeg' | 'image/png' | 'image/webp' } | null = null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) detected = { ext: 'jpg', contentType: 'image/jpeg' };
  else if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) detected = { ext: 'png', contentType: 'image/png' };
  else if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    detected = { ext: 'webp', contentType: 'image/webp' };
  if (!detected) return { ok: false, error: 'Use a JPEG, PNG or WebP image.' };
  if (declaredType && declaredType !== detected.contentType) return { ok: false, error: 'The file type does not match its content.' };
  return { ok: true, ...detected };
}
