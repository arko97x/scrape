import type { PaintSnapshot } from './engine';
type SavedPainting = { version: 1; width: number; height: number; state: PaintSnapshot };
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('scrape-studio', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('paintings');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export async function loadPainting(width: number, height: number) {
  const db = await open();
  try {
    return await new Promise<PaintSnapshot | null>((resolve, reject) => {
      const request = db.transaction('paintings').objectStore('paintings').get('current');
      request.onsuccess = () => {
        const saved = request.result as SavedPainting | undefined;
        resolve(saved?.version === 1 && saved.width === width && saved.height === height ? saved.state : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function savePainting(width: number, height: number, state: PaintSnapshot) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('paintings', 'readwrite');
      transaction.objectStore('paintings').put({ version: 1, width, height, state } satisfies SavedPainting, 'current');
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
