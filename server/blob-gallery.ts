import { get, list, put } from '@vercel/blob';
import { GalleryError, type GalleryStore, type StoredEntry } from './gallery.ts';

const prefix = 'scrape-gallery/entries/';
export function createBlobStore(sdk: Pick<typeof import('@vercel/blob'), 'get' | 'list' | 'put'> = { get, list, put }): GalleryStore {
  const readEntry = async (pathname: string): Promise<StoredEntry | null> => {
    const result = await sdk.get(pathname, { access: 'public' });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).json() as Promise<StoredEntry>;
  };
  return {
    local: false,
    async find(id) {
      const pathname = `${prefix}${id}.json`;
      // Do not request a not-yet-created public URL: its CDN 404 could be cached
      // and hide a just-published entry. Check the storage index first.
      const existing = await sdk.list({ prefix: pathname, limit: 1 });
      return existing.blobs.some(blob => blob.pathname === pathname) ? readEntry(pathname) : null;
    },
    async save(entry, bytes) {
      const image = await sdk.put(`scrape-gallery/paintings/${entry.id}-${entry.digest}.png`, Buffer.from(bytes), { access: 'public', addRandomSuffix: false, contentType: 'image/png', allowOverwrite: true });
      const saved = { ...entry, image: image.url };
      try {
        await sdk.put(`${prefix}${entry.id}.json`, JSON.stringify(saved), { access: 'public', addRandomSuffix: false, contentType: 'application/json', allowOverwrite: false, cacheControlMaxAge: 60 });
      } catch (error) { const existing = await this.find(entry.id); if (existing?.digest === entry.digest) return existing; throw error; }
      return saved;
    },
    async page(cursor) {
      // List descriptors, then fetch only the page's metadata. Blob's list order
      // is not a chronological contract; sort uploadedAt explicitly.
      const descriptors = []; let next: string | undefined;
      do { const result = await sdk.list({ prefix, limit: 1000, cursor: next }); descriptors.push(...result.blobs); next = result.hasMore ? result.cursor : undefined; } while (next);
      descriptors.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime() || b.pathname.localeCompare(a.pathname));
      const start = cursor ? descriptors.findIndex(item => item.pathname === `${prefix}${cursor}.json`) + 1 : 0;
      if (cursor && !start) throw new GalleryError('This gallery page has expired. Reload the gallery.');
      const page = descriptors.slice(start, start + 24);
      const entries = (await Promise.all(page.map(item => readEntry(item.pathname)))).filter((entry): entry is StoredEntry => !!entry);
      // Keep the descriptor order across page boundaries.
      return { entries, cursor: descriptors.length > start + 24 ? page.at(-1)!.pathname.slice(prefix.length, -5) : null };
    },
  };
}
export const blobStore = createBlobStore();
