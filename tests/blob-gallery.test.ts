import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createBlobStore } from '../server/blob-gallery.ts';
import { handleGallery, type StoredEntry } from '../server/gallery.ts';

function fakeBlob() {
  const objects = new Map<string, { body: string | Buffer; uploadedAt: Date }>();
  const reads: string[] = []; let failMetadata = false;
  const sdk = {
    async list({ prefix, cursor }: { prefix: string; cursor?: string }) {
      // Deliberately return two storage pages, with no chronological ordering.
      const blobs = [...objects].filter(([name]) => name.startsWith(prefix)).map(([pathname, object]) => ({ pathname, uploadedAt: object.uploadedAt }));
      const start = Number(cursor || 0), page = blobs.slice(start, start + 17);
      return { blobs: page, hasMore: blobs.length > start + 17, cursor: String(start + 17) };
    },
    async get(name: string) {
      reads.push(name); const object = objects.get(name);
      if (!object) return null;
      return { statusCode: 200, stream: new Response(object.body as BodyInit).body };
    },
    async put(name: string, body: string | Buffer, options: { allowOverwrite: boolean }) {
      if (name.endsWith('.json') && failMetadata) { failMetadata = false; throw new Error('Metadata service unavailable'); }
      if (objects.has(name) && !options.allowOverwrite) throw new Error('Already exists');
      objects.set(name, { body, uploadedAt: new Date() });
      return { url: `https://example.public.blob.vercel-storage.com/${name}` };
    },
  };
  return { store: createBlobStore(sdk as unknown as Pick<typeof import('@vercel/blob'), 'get' | 'list' | 'put'>), objects, reads, failNextMetadata: () => { failMetadata = true; } };
}
const png = await readFile(new URL('../public/gallery/ocean.png', import.meta.url));
function post(id: string) {
  const form = new FormData(); form.set('id', id); form.set('image', new Blob([png], { type: 'image/png' }), 'painting.png');
  return new Request('https://scrape.example/api/gallery/', { method: 'POST', body: form, headers: { Origin: 'https://scrape.example' } });
}
test('Blob publication retries a failed metadata write without losing its image or duplicating the entry', async () => {
  const fake = fakeBlob(), id = randomUUID(); fake.failNextMetadata();
  assert.equal((await handleGallery(post(id), fake.store)).status, 503);
  assert.equal(fake.objects.size, 1); assert.equal(fake.reads.length, 0, 'never fetch an absent public URL that could cache a 404');
  const retry = await handleGallery(post(id), fake.store); assert.equal(retry.status, 201);
  const result = await retry.json(); assert.equal(result.local, false); assert.match(result.entry.image, /^https:\/\//);
  assert.equal(fake.objects.size, 2); assert.equal((await handleGallery(post(id), fake.store)).status, 200); assert.equal(fake.objects.size, 2);
});
test('concurrent Blob retries preserve one immutable entry', async () => {
  const fake = fakeBlob(), id = randomUUID();
  const results = await Promise.all([handleGallery(post(id), fake.store), handleGallery(post(id), fake.store)]);
  assert.ok(results.every(response => response.ok)); assert.equal(fake.objects.size, 2);
});
test('Blob gallery sorts across storage pages, reads only 24 records, and continues without duplicates', async () => {
  const fake = fakeBlob(); const ids = [];
  for (let i = 0; i < 31; i++) {
    const id = randomUUID(); ids.push(id);
    const entry: StoredEntry = { id, title: `${i}`, artist: '', digest: 'test', image: `https://example/${id}.png`, createdAt: new Date(2026, 0, i + 1).toISOString() };
    fake.objects.set(`scrape-gallery/entries/${id}.json`, { body: JSON.stringify(entry), uploadedAt: new Date(entry.createdAt) });
  }
  const first = await fake.store.page(null); assert.equal(first.entries.length, 24); assert.equal(first.entries[0].id, ids[30]); assert.equal(fake.reads.length, 24);
  const second = await fake.store.page(first.cursor); assert.equal(second.entries.length, 7); assert.equal(second.cursor, null);
  assert.equal(new Set([...first.entries, ...second.entries].map(entry => entry.id)).size, 31);
});
