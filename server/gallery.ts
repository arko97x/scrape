import { createHash } from 'node:crypto';
import { MAX_GALLERY_BYTES, TITLE_LIMIT, ARTIST_LIMIT, type GalleryEntry } from '../src/gallery-types.ts';

export type StoredEntry = GalleryEntry & { digest: string };
export interface GalleryStore {
  local: boolean;
  find(id: string): Promise<StoredEntry | null>;
  save(entry: StoredEntry, image: Uint8Array): Promise<StoredEntry>;
  page(cursor: string | null): Promise<{ entries: StoredEntry[]; cursor: string | null }>;
}
export class GalleryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const publicEntry = ({ digest: _, ...entry }: StoredEntry): GalleryEntry => entry;
export function pageEntries(entries: StoredEntry[], cursor: string | null) {
  const ordered = entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const start = cursor ? ordered.findIndex(entry => entry.id === cursor) + 1 : 0;
  if (cursor && !start) throw new GalleryError('This gallery page has expired. Reload the gallery.');
  const page = ordered.slice(start, start + 24);
  return { entries: page, cursor: ordered.length > start + 24 ? page.at(-1)!.id : null };
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const clean = (value: FormDataEntryValue | null, limit: number, field: string) => {
  if (value !== null && typeof value !== 'string') throw new GalleryError(`Invalid ${field}.`);
  const text = (value || '').trim().replace(/\s+/gu, ' ');
  if (text.length > limit) throw new GalleryError(`${field} must be ${limit} characters or fewer.`);
  return text;
};
async function boundedForm(request: Request) {
  const limit = MAX_GALLERY_BYTES + 16_384;
  if (Number(request.headers.get('content-length')) > limit) throw new GalleryError('Painting is too large. The limit is 4 MB.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new GalleryError('No painting was received.');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new GalleryError('Painting is too large. The limit is 4 MB.', 413); }
    chunks.push(value);
  }
  try { return await new Response(new Blob(chunks as BlobPart[]), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData(); }
  catch { throw new GalleryError('The upload could not be read. Please try again.'); }
}
export async function handleGallery(request: Request, store: GalleryStore): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const cursor = url.searchParams.get('cursor');
      if (cursor && !/^[a-f0-9-]{36}$/.test(cursor)) throw new GalleryError('Invalid gallery page.');
      const page = await store.page(cursor);
      return json({ ...page, entries: page.entries.map(publicEntry), local: store.local });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
    const origin = request.headers.get('origin');
    if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new GalleryError('Please publish from the Scrape studio.', 403);
    const form = await boundedForm(request);
    const id = form.get('id');
    if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) throw new GalleryError('Invalid submission. Reopen the publishing form.');
    const title = clean(form.get('title'), TITLE_LIMIT, 'Title'), artist = clean(form.get('artist'), ARTIST_LIMIT, 'Artist name');
    const file = form.get('image');
    if (!(file instanceof Blob) || file.type !== 'image/png') throw new GalleryError('Please upload a PNG painting.');
    if (file.size > MAX_GALLERY_BYTES) throw new GalleryError('Painting is too large. The limit is 4 MB.', 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 45 || !signature.every((n, i) => bytes[i] === n) || new TextDecoder().decode(bytes.slice(12, 16)) !== 'IHDR') throw new GalleryError('This painting is not a valid PNG.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(8) !== 13 || view.getUint32(16) !== 960 || view.getUint32(20) !== 1200) throw new GalleryError('Publish a 960 × 1200 painting exported by Scrape.');
    const digest = createHash('sha256').update(bytes).update(JSON.stringify([title, artist])).digest('hex');
    const existing = await store.find(id);
    if (existing) {
      if (existing.digest !== digest) throw new GalleryError('This submission already contains a different painting. Reopen the form.', 409);
      return json({ entry: publicEntry(existing), local: store.local });
    }
    const entry = await store.save({ id, title, artist, digest, image: '', createdAt: new Date().toISOString() }, bytes);
    if (entry.digest !== digest) throw new GalleryError('This submission already contains a different painting. Reopen the form.', 409);
    return json({ entry: publicEntry(entry), local: store.local }, 201);
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error('Gallery request failed:', error instanceof Error ? error.name : 'Unknown error');
    return json({ error: 'The gallery could not save or load paintings. Please try again shortly.' }, 503);
  }
}
