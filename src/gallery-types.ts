export const MAX_GALLERY_BYTES = 4_000_000;
export const TITLE_LIMIT = 80;
export const ARTIST_LIMIT = 60;
export type GalleryEntry = { id: string; title: string; artist: string; image: string; createdAt: string };
export type GalleryPage = { entries: GalleryEntry[]; cursor: string | null; local: boolean };

// randomUUID requires HTTPS; getRandomValues also works on a tablet's local
// http://<computer-ip> development URL.
export function gallerySubmissionID(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function galleryResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) throw new Error(result?.error || 'The gallery is unavailable. Please try again.');
  return result as T;
}
