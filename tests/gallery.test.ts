import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { handleGallery, type GalleryStore, type StoredEntry, pageEntries } from '../server/gallery.ts';
import { localStore } from '../server/local-gallery.ts';
import api from '../api/gallery.ts';
import { MAX_GALLERY_BYTES } from '../src/gallery-types.ts';

const png = await readFile(new URL('../public/gallery/ocean.png', import.meta.url));
const url = 'http://localhost:5173/api/gallery/';
function post({ id = randomUUID() as string, title = '', artist = '', image = png, type = 'image/png', origin = 'http://localhost:5173' } = {}) {
  const form = new FormData(); form.set('id', id); form.set('title', title); form.set('artist', artist); form.set('image', new Blob([image], { type }), 'painting.png');
  return new Request(url, { method: 'POST', body: form, headers: { Origin: origin } });
}
async function withStore(run: (store: GalleryStore, root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'scrape-gallery-test-'));
  try { await run(localStore(root), root); } finally { await rm(root, { recursive: true, force: true }); }
}
test('a real PNG and optional credits persist across store instances', async () => withStore(async (store, root) => {
  const id = randomUUID();
  const response = await handleGallery(post({ id, title: '  My\n painting  ', artist: 'Arko 🎨' }), store);
  assert.equal(response.status, 201);
  const result = await response.json(); assert.equal(result.local, true); assert.equal(result.entry.title, 'My painting'); assert.equal(result.entry.artist, 'Arko 🎨'); assert.equal(result.entry.digest, undefined);
  const page = await (await handleGallery(new Request(url), localStore(root))).json();
  assert.equal(page.entries[0].id, id);
  const image = await readFile(path.join(root, result.entry.image.split('/').at(-1))); assert.deepEqual(image, png);
}));
test('empty title and artist are accepted without manufacturing personal details', async () => withStore(async store => {
  const response = await handleGallery(post(), store); const { entry } = await response.json();
  assert.equal(response.status, 201); assert.equal(entry.title, ''); assert.equal(entry.artist, '');
}));
test('retries, including concurrent retries, create one gallery entry', async () => withStore(async (store, root) => {
  const id = randomUUID();
  const responses = await Promise.all([handleGallery(post({ id }), store), handleGallery(post({ id }), store)]);
  assert.ok(responses.every(response => response.ok));
  const retry = await handleGallery(post({ id }), store); assert.equal(retry.status, 200);
  assert.equal((await readdir(root)).filter(name => name.endsWith('.json')).length, 1);
  const conflict = await handleGallery(post({ id, title: 'Different painting' }), store); assert.equal(conflict.status, 409);
}));
test('invalid PNG, wrong export dimensions and a non-PNG MIME type are rejected', async () => withStore(async store => {
  assert.equal((await handleGallery(post({ image: Buffer.from('not a PNG') }), store)).status, 400);
  assert.equal((await handleGallery(post({ type: 'image/svg+xml' }), store)).status, 400);
  const wrong = Buffer.from(png); wrong.writeUInt32BE(100, 16);
  assert.equal((await handleGallery(post({ image: wrong }), store)).status, 400);
  assert.equal((await store.page(null)).entries.length, 0);
}));
test('oversized images, including streamed bodies without content-length, are rejected', async () => withStore(async store => {
  const formRequest = post({ image: Buffer.alloc(MAX_GALLERY_BYTES + 20_000) });
  const bytes = new Uint8Array(await formRequest.arrayBuffer());
  const request = new Request(url, { method: 'POST', headers: formRequest.headers, body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }), duplex: 'half' } as RequestInit);
  const response = await handleGallery(request, store);
  assert.equal(response.status, 413); assert.equal((await store.page(null)).entries.length, 0);
}));
test('invalid IDs, excessively long credits and cross-site browser submissions are rejected', async () => withStore(async store => {
  assert.equal((await handleGallery(post({ id: '../../escape' }), store)).status, 400);
  assert.equal((await handleGallery(post({ title: 'x'.repeat(81) }), store)).status, 400);
  assert.equal((await handleGallery(post({ artist: 'x'.repeat(61) }), store)).status, 400);
  assert.equal((await handleGallery(post({ origin: 'https://other.example' }), store)).status, 403);
  assert.equal((await store.page(null)).entries.length, 0);
}));
test('gallery pagination is stable when a new painting arrives between pages', () => {
  const entries = Array.from({ length: 30 }, (_, i): StoredEntry => ({ id: randomUUID(), title: '', artist: '', digest: '', image: '', createdAt: new Date(2026, 1, i + 1).toISOString() }));
  const first = pageEntries([...entries], null); assert.equal(first.entries.length, 24); assert.ok(first.cursor);
  const newEntry = { ...entries[0], id: randomUUID(), createdAt: '2027-01-01T00:00:00.000Z' };
  const second = pageEntries([...entries, newEntry], first.cursor); assert.equal(second.entries.length, 6); assert.equal(second.cursor, null);
  assert.equal(new Set([...first.entries, ...second.entries].map(entry => entry.id)).size, 30);
});
test('storage failure never returns success and retry can complete', async () => withStore(async store => {
  const broken = { ...store, save: async () => { throw new Error('Storage offline'); } };
  const id = randomUUID(); const failed = await handleGallery(post({ id }), broken);
  assert.equal(failed.status, 503); assert.equal((await store.page(null)).entries.length, 0);
  assert.equal((await handleGallery(post({ id }), store)).status, 201);
}));
test('unsupported methods, malformed forms and expired cursors fail clearly', async () => withStore(async store => {
  const method = await handleGallery(new Request(url, { method: 'DELETE' }), store); assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), 'GET, POST');
  assert.equal((await handleGallery(new Request(url, { method: 'POST', body: 'bad form' }), store)).status, 400);
  assert.equal((await handleGallery(new Request(`${url}?cursor=${randomUUID()}`), store)).status, 400);
}));
test('the production API reports missing storage instead of pretending to publish', async () => {
  const keys = ['BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID', 'VERCEL_OIDC_TOKEN'] as const;
  const saved = keys.map(key => process.env[key]);
  try {
    keys.forEach(key => delete process.env[key]);
    const response = await api.fetch(post()); assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not set up/);
  } finally { keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
});
