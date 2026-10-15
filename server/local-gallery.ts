import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { Readable } from 'node:stream';
import { handleGallery, pageEntries, type GalleryStore, type StoredEntry } from './gallery.ts';

export function localStore(root: string): GalleryStore {
  return {
    local: true,
    async find(id) {
      try { return JSON.parse(await readFile(path.join(root, `${id}.json`), 'utf8')) as StoredEntry; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    },
    async save(entry, bytes) {
      await mkdir(root, { recursive: true });
      const filename = `${entry.id}-${entry.digest}.png`;
      const saved = { ...entry, image: `/api/gallery/image/${filename}` };
      await writeFile(path.join(root, filename), bytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
      await writeFile(path.join(root, `${entry.id}.json`), JSON.stringify(saved), { flag: 'wx' }).catch(async error => { if (error.code !== 'EEXIST') throw error; });
      return (await this.find(entry.id))!;
    },
    async page(cursor) {
      await mkdir(root, { recursive: true });
      const files = (await readdir(root)).filter(file => /^[a-f0-9-]{36}\.json$/.test(file));
      return pageEntries(await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(root, file), 'utf8')) as StoredEntry)), cursor);
    },
  };
}
export function localGallery(): Plugin {
  return { name: 'scrape-local-gallery', configureServer(server) {
    const root = path.join(server.config.root, 'gallery.local'), store = localStore(root);
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || '').split('?')[0];
      if (!pathname.startsWith('/api/gallery')) return next();
      try {
        const image = /^\/api\/gallery\/image\/([a-f0-9-]{36}-[a-f0-9]{64})\.png$/.exec(pathname);
        if (image && req.method === 'GET') {
          try { const bytes = await readFile(path.join(root, `${image[1]}.png`)); res.setHeader('Content-Type', 'image/png'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(bytes); }
          catch { res.statusCode = 404; res.end(); } return;
        }
        if (pathname !== '/api/gallery' && pathname !== '/api/gallery/') { res.statusCode = 404; res.end(); return; }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, ...(req.method === 'POST' ? { body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } : {}) } as RequestInit);
        const response = await handleGallery(request, store);
        res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value)); res.end(Buffer.from(await response.arrayBuffer()));
      } catch { res.statusCode = 500; res.end(JSON.stringify({ error: 'The local gallery is unavailable.' })); }
    });
  } };
}
