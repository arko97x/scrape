import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { Modal } from './Modal';
import { ARTIST_LIMIT, galleryResponse, gallerySubmissionID, MAX_GALLERY_BYTES, type GalleryEntry } from './gallery-types';
import { signPainting } from './signature';
import './modal.css';
import './gallery-ui.css';

export function PublishPainting({ capture, onClose }: { capture: () => Promise<Blob>; onClose: () => void }) {
  const [preview, setPreview] = useState('');
  const [artist, setArtist] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ entry: GalleryEntry; local: boolean } | null>(null);
  const [id] = useState(gallerySubmissionID); const sending = useRef(false);
  const local = import.meta.env.DEV;
  const successLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (result) successLink.current?.focus(); }, [result]);
  const [painting, setPainting] = useState<Blob | null>(null);
  useEffect(() => {
    let alive = true;
    capture().then(blob => {
      if (!alive) return;
      if (blob.size > MAX_GALLERY_BYTES) throw new Error('This painting exceeds the 4 MB gallery limit. You can still download the full PNG.');
      setPainting(blob);
    }).catch(failure => { if (alive) setError(failure instanceof Error ? failure.message : 'The preview could not be made. Close and try again.'); });
    return () => { alive = false; };
  }, []);
  // The preview shows the signature as it is typed.
  useEffect(() => {
    if (!painting) return;
    let alive = true;
    const show = (blob: Blob) => { if (alive) setPreview(URL.createObjectURL(blob)); };
    const timer = setTimeout(() => signPainting(painting, artist).then(show, () => show(painting)), preview ? 250 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [painting, artist]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function publish(event: FormEvent) {
    event.preventDefault(); if (!painting || sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      const signed = await signPainting(painting, artist);
      if (signed.size > MAX_GALLERY_BYTES) throw new Error('This painting exceeds the 4 MB gallery limit. You can still download the full PNG.');
      const form = new FormData(); form.set('id', id); form.set('artist', artist); form.set('image', signed, 'painting.png');
      setResult(await galleryResponse(await fetch('/api/gallery/', { method: 'POST', body: form, signal: AbortSignal.timeout(45_000) })));
    } catch (failure) { setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : 'Publishing took too long. Please try again; your painting is safe.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return <Modal label={result ? 'Painting published' : 'Add painting to gallery'} className="publish-dialog" title={<h2>{result ? (result.local ? 'Added to your local gallery.' : 'You’re in the gallery.') : 'Let others see it.'}</h2>} dismissible={!busy} onClose={onClose}>
    <div className="publish-layout">
      <div className="publish-preview" aria-busy={!preview && !error}>
        {preview ? <img src={preview} alt="Preview of your painting" width="960" height="1200"/> : <span>{error ? 'Preview unavailable' : 'Preparing your painting…'}</span>}
      </div>
      <div className="publish-side">
        {result ? <div className="publish-details publish-success" role="status">
          <p>Your painting is still here in the studio, too.</p>
          <p>{result.local ? 'Local preview: this addition is stored on this development server.' : 'Your painting is now public. Anyone visiting the gallery can see it.'}</p>
        </div> : <form id="publish-form" className="publish-details" onSubmit={publish} aria-busy={busy}>
          <label htmlFor="painting-artist">Artist name <span>optional</span></label>
          <input id="painting-artist" data-autofocus value={artist} maxLength={ARTIST_LIMIT} placeholder="Anonymous" autoComplete="off" disabled={busy} onChange={event => setArtist(event.target.value)} aria-describedby="artist-hint"/>
          <small id="artist-hint">Signed in the corner. A name, a nickname, or nothing at all.</small>
          <p className="publish-notice">{local ? 'Local preview: additions stay on this development server.' : 'This publishes immediately. Your painting and any name you add will be visible to everyone.'}</p>
          {error && <p className="gallery-error" role="alert">{error}</p>}
        </form>}
        <div className="modal-actions publish-actions">{result ? <>
          <button className="modal-secondary" onClick={onClose}>Back to painting</button>
          <a ref={successLink} className="modal-primary" href={`/gallery/#painting-${result.entry.id}`}>View in gallery <ArrowUpRight size={17}/></a>
        </> : <>
          <button type="button" className="modal-secondary" disabled={busy} onClick={onClose}>{error ? 'Back to painting' : 'Keep it private'}</button>
          <button className="modal-primary" type="submit" form="publish-form" disabled={!painting || busy}>{busy ? <><LoaderCircle className="gallery-spin" size={17}/> Publishing…</> : 'Publish painting'}</button>
        </>}</div>
      </div>
    </div>
  </Modal>;
}
