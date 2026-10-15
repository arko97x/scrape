import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { galleryResponse, type GalleryEntry, type GalleryPage } from './gallery-types';
import './gallery-ui.css';

// Visitors' paintings, hung ahead of the studio's in the same grid. Nothing
// shows while they load or if they can't be fetched: the studio's stay up.
function CommunityGallery() {
  const [entries, setEntries] = useState<GalleryEntry[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const inFlight = useRef(false), last = useRef<HTMLAnchorElement>(null);
  async function load(more = false) {
    if (inFlight.current) return; inFlight.current = true;
    try {
      const page = await galleryResponse<GalleryPage>(await fetch(`/api/gallery/${more && cursor ? `?cursor=${cursor}` : ''}`, { signal: AbortSignal.timeout(20_000) }));
      setEntries(previous => more ? [...previous, ...page.entries.filter(entry => !previous.some(item => item.id === entry.id))] : page.entries);
      setCursor(page.cursor);
    } catch { /* The studio's paintings are still there. */ }
    finally { inFlight.current = false; }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const id = location.hash.slice(1); if (!id.startsWith('painting-')) return;
    document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [entries]);
  // More are fetched as the last one comes into view.
  useEffect(() => {
    const sheet = last.current; if (!sheet || !cursor) return;
    const watch = new IntersectionObserver(([seen]) => { if (seen.isIntersecting) void load(true); }, { rootMargin: '600px' });
    watch.observe(sheet); return () => watch.disconnect();
  }, [entries, cursor]);
  return <>{entries.map((entry, index) => <a className="g-sheet community-sheet" id={`painting-${entry.id}`} key={entry.id} ref={index === entries.length - 1 ? last : undefined} href={entry.image}>
    <span className="g-paper"><img src={entry.image} alt={entry.artist ? `Painting by ${entry.artist}` : 'Painting by a visitor'} width="960" height="1200" loading="lazy"/></span><span className="community-tape" aria-hidden="true"/>
  </a>)}</>;
}
const mount = document.getElementById('community-gallery'); if (mount) createRoot(mount).render(<CommunityGallery/>);
