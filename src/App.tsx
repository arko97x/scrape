import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import mixbox from 'mixbox';
import { ArrowDownRight, ArrowUpRight, Download, Plus, Redo2, RotateCw, Undo2, X } from 'lucide-react';
import { PaintEngine, PaintHistory, type Colour, type Point } from './engine';
import { PaintRenderer } from './renderer';
import { SqueezeStroke } from './input';
import { loadPainting, savePainting } from './storage';
import { Squeegee, Tube } from './tools';
import { bladePaint, type BladePaintBand } from './blade-paint';

const W = 480, H = 600;
const colours = [
  { name: 'Butter', hex: '#e5b84e' }, { name: 'Tomato', hex: '#c55c43' },
  { name: 'Rose', hex: '#d99092' }, { name: 'Lake', hex: '#649295' },
  { name: 'Moss', hex: '#7a8963' }, { name: 'Ink', hex: '#344c5a' },
];
const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255] as Colour;
const pigmentBlend = (a: Colour, b: Colour, t: number): Colour => mixbox.lerp(a.map(v => v * 255), b.map(v => v * 255), t).map(v => v / 255) as Colour;
type Gesture = { pointerId: number; squeeze?: SqueezeStroke };
type Runtime = { engine: PaintEngine; history: PaintHistory; renderer: PaintRenderer };

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = useRef<'paint' | 'scrape'>('paint');
  const colour = useRef(colours[0].hex);
  const saveSequence = useRef(0);
  const [tool, setTool] = useState<'paint' | 'scrape'>('paint');
  const [paint, setPaint] = useState(colours[0].hex);
  const [bladeWidth, setBladeWidth] = useState(100);
  const [angle, setAngle] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [saving, setSaving] = useState('Your paper is ready');
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [contact, setContact] = useState(false);
  const [carriedPaint, setCarriedPaint] = useState<BladePaintBand[]>([]);
  const loaded = carriedPaint.length > 0;
  const [exporting, setExporting] = useState(false);
  const [hasPaint, setHasPaint] = useState(false);
  const [credits, setCredits] = useState(false);

  const refresh = () => {
    const current = runtime.current; if (!current) return;
    setHistoryState({ undo: current.history.canUndo, redo: current.history.canRedo });
    setCarriedPaint(bladePaint(current.engine)); setHasPaint(current.engine.surfaceMass() > .1);
    setBladeWidth(current.engine.bladeWidth); setAngle(current.engine.angle);
  };

  const persist = () => {
    clearTimeout(saveTimer.current); setSaving('Saving your painting…');
    const sequence = ++saveSequence.current;
    saveTimer.current = setTimeout(() => {
      const current = runtime.current; if (!current) return;
      savePainting(W, H, current.engine.snapshot()).then(() => {
        if (saveSequence.current === sequence) setSaving('Saved on this device');
      }).catch(() => { setStorageWarning(true); setSaving('Export to keep this painting'); });
    }, 450);
  };

  useEffect(() => {
    if (!canvas.current) return;
    let stopped = false, frame = 0;
    const engine = new PaintEngine(W, H, pigmentBlend);
    let renderer: PaintRenderer;
    try { renderer = new PaintRenderer(canvas.current, engine); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The studio could not start.'); return; }
    const history = new PaintHistory(engine); runtime.current = { engine, renderer, history };
    const resize = () => {
      const rect = canvas.current!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.current!.width = Math.max(1, Math.round(rect.width * ratio)); canvas.current!.height = Math.max(1, Math.round(rect.height * ratio));
      renderer.render(true);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas.current); resize();
    const tick = (now: number) => {
      gesture.current?.squeeze?.advance(now); renderer.render();
      if (!stopped) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    loadPainting(W, H).then(state => {
      if (stopped) return;
      if (state) { engine.restore(state); setSaving('Your painting, right where you left it'); }
      setReady(true); refresh();
    }).catch(() => { if (!stopped) { setStorageWarning(true); setReady(true); } });
    const interrupt = () => {
      if (gesture.current) { gesture.current.squeeze?.advance(performance.now()); engine.endScrape(); gesture.current = null; setContact(false); refresh(); persist(); }
    };
    const onVisibility = () => { if (document.hidden) interrupt(); };
    window.addEventListener('blur', interrupt); document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true; cancelAnimationFrame(frame); observer.disconnect(); clearTimeout(saveTimer.current);
      window.removeEventListener('blur', interrupt); document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose(); runtime.current = null; gesture.current = null;
    };
  }, []);

  const selectPaint = (hex: string) => { if (gesture.current) return; selected.current = 'paint'; colour.current = hex; setTool('paint'); setPaint(hex); };
  const selectScraper = () => { if (gesture.current) return; selected.current = 'scrape'; setTool('scrape'); };
  const changeBlade = (width: number, rotation: number) => {
    const current = runtime.current; if (!current || gesture.current) return;
    current.history.checkpoint(); current.engine.setBlade(width, rotation); refresh(); persist();
  };
  const historyAction = (action: 'undo' | 'redo') => {
    const current = runtime.current; if (!current || gesture.current) return;
    current.history[action](); refresh(); persist();
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches('input, textarea, select') || gesture.current || !ready) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); historyAction(event.shiftKey ? 'redo' : 'undo'); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); historyAction('redo'); }
      else if (event.key.toLowerCase() === 's') selectScraper();
      else if (event.key.toLowerCase() === 'p') selectPaint(colour.current);
      else if (event.key === 'Escape') { setCursor(null); canvas.current?.blur(); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [ready]);

  const pointFrom = (clientX: number, clientY: number): Point => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width * W, y: (clientY - rect.top) / rect.height * H };
  };
  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = runtime.current;
    if (!current || !ready || gesture.current || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event.clientX, event.clientY);
    current.history.checkpoint(); setContact(true); setCursor(point);
    if (selected.current === 'paint') {
      const squeeze = new SqueezeStroke(current.engine, point, rgb(colour.current), performance.now());
      squeeze.flow = event.pointerType === 'pen' && event.pressure > 0 ? .5 + event.pressure * 1.5 : 1;
      gesture.current = { pointerId: event.pointerId, squeeze };
    } else { current.engine.beginScrape(point); gesture.current = { pointerId: event.pointerId }; }
    refresh();
  };
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = runtime.current; if (!current) return;
    const point = pointFrom(event.clientX, event.clientY);
    if (event.pointerType !== 'touch' || gesture.current) setCursor(point);
    const active = gesture.current; if (!active || active.pointerId !== event.pointerId) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event.nativeEvent]) {
      const at = pointFrom(sample.clientX, sample.clientY);
      if (active.squeeze) active.squeeze.move(at); else current.engine.scrape(at);
    }
    if (!active.squeeze) setCarriedPaint(bladePaint(current.engine));
    if (active.squeeze && event.pointerType === 'pen' && event.pressure > 0) active.squeeze.flow = .5 + event.pressure * 1.5;
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current, current = runtime.current;
    if (!active || !current || active.pointerId !== event.pointerId) return;
    if (event.type === 'pointerup') {
      const point = pointFrom(event.clientX, event.clientY);
      if (active.squeeze) { active.squeeze.move(point); active.squeeze.advance(performance.now()); } else current.engine.scrape(point);
    }
    current.engine.endScrape(); gesture.current = null; setContact(false);
    if (event.pointerType === 'touch') setCursor(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    refresh(); persist();
  };
  const exportPainting = async () => {
    if (!runtime.current || gesture.current) return;
    setExporting(true);
    try {
      runtime.current.renderer.render();
      const blob = await runtime.current.renderer.exportPNG();
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `scrape-${new Date().toISOString().slice(0, 10)}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  return <main className="studio">
    <header className="header">
      <a className="wordmark" href="#" aria-label="Scrape studio" onClick={event => event.preventDefault()}>scrape<span className="brand-dot">.</span></a>
      <span className="header-caption">a little paint playground</span>
      <div className="header-actions">
        <div className="history-buttons">
          <button className="icon-button" aria-label="Undo" title="Undo (⌘/Ctrl Z)" disabled={!historyState.undo || contact || !ready} onClick={() => historyAction('undo')}><Undo2 className="ui-icon" aria-hidden="true"/></button>
          <button className="icon-button" aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)" disabled={!historyState.redo || contact || !ready} onClick={() => historyAction('redo')}><Redo2 className="ui-icon" aria-hidden="true"/></button>
        </div>
        <button className="new-sheet" disabled={!hasPaint || contact || !ready} onClick={() => { const current = runtime.current; if (current) { current.history.checkpoint(); current.engine.clear(); refresh(); persist(); } }}><Plus className="ui-icon" aria-hidden="true"/><span>New sheet</span></button>
        <button className="export-button" disabled={!ready || exporting || contact} onClick={exportPainting}><Download className="ui-icon" aria-hidden="true"/>{exporting ? 'Exporting…' : 'Keep this one'}</button>
      </div>
    </header>

    <section className="workspace" aria-label="Painting desk">
      <aside className="paint-tray" aria-label="Paint colours">
        <div className="tray-heading"><span className="eyebrow">01 / COLOUR</span><h1>A handful<br/>of possibility.</h1></div>
        <div className="tubes">
          {colours.map((item, index) => <button key={item.hex} className={`tube-button ${tool === 'paint' && paint === item.hex ? 'selected' : ''}`} style={{ '--tube-angle': `${[-8, 5, -4, 7, -6, 4][index]}deg` } as React.CSSProperties} aria-label={`Use ${item.name} paint`} aria-pressed={tool === 'paint' && paint === item.hex} disabled={!ready || contact} onClick={() => selectPaint(item.hex)}>
            <Tube colour={item.hex} label={item.name.toUpperCase()}/><span className="tube-name">{item.name}</span>
          </button>)}
        </div>
        <label className="custom-colour"><span className="custom-swatch" style={{ background: paint }}/><span>Mix your own</span><input type="color" aria-label="Mix a custom paint colour" value={paint} disabled={!ready || contact} onChange={event => selectPaint(event.target.value)}/><ArrowUpRight className="ui-icon" aria-hidden="true"/></label>
        <p className="hand-note">pick a colour,<br/>see where it takes you <span><ArrowUpRight className="ui-icon" aria-hidden="true"/></span></p>
      </aside>

      <div className="paper-area">
        <div className={`paper-host ${ready ? 'ready' : ''}`}>
          <div className="paper-surface"><canvas ref={canvas} className="painting" aria-label="Painting paper. Select a colour, hold to squeeze a blob, or drag to draw a bead. Select the squeegee and drag to scrape." tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onPointerLeave={() => { if (!gesture.current) setCursor(null); }}/></div>
          <div className="border-tape tape-top" aria-hidden="true"/><div className="border-tape tape-bottom" aria-hidden="true"/><div className="border-tape tape-left" aria-hidden="true"/><div className="border-tape tape-right" aria-hidden="true"/>
          {!hasPaint && !contact && ready && <div className="paper-invitation" aria-hidden="true"><span>nothing precious.</span><span>just play.</span><ArrowDownRight className="ui-icon" aria-hidden="true"/></div>}
          {cursor && ready && <div className={`tool-cursor ${tool} ${contact ? 'touching' : 'lifted'}`} style={{ left: `${cursor.x / W * 100}%`, top: `${cursor.y / H * 100}%`, width: tool === 'scrape' ? `${bladeWidth / W * 100}%` : undefined, '--blade-angle': `${angle}deg` } as React.CSSProperties} aria-hidden="true">{tool === 'scrape' ? <Squeegee paint={carriedPaint}/> : <Tube colour={paint} small/>}</div>}
          {!ready && !error && <div className="loading-paper">Getting your paper ready…</div>}
        </div>
        <div className="paper-caption"><span>01 — THE GOOD PAPER</span><span>portrait · 960 × 1200 export</span></div>
      </div>

      <aside className="tool-tray" aria-label="Scraping tools">
        <span className="eyebrow">02 / THE PULL</span>
        <button className={`squeegee-button ${tool === 'scrape' ? 'selected' : ''}`} aria-label="Pick up squeegee" aria-pressed={tool === 'scrape'} disabled={!ready || contact} onClick={selectScraper}><Squeegee paint={carriedPaint}/><span>The squeegee</span><small>pick it up & pull</small></button>
        <div className="blade-controls">
          <label htmlFor="blade-width">Blade width <span>{Math.round(bladeWidth / W * 100)}%</span></label>
          <input id="blade-width" type="range" min="50" max="180" step="10" value={bladeWidth} disabled={!ready || contact} onChange={event => changeBlade(Number(event.target.value), angle)}/>
          <button className="rotate-button" disabled={!ready || contact} onClick={() => changeBlade(bladeWidth, angle === 0 ? 90 : 0)}><RotateCw className="ui-icon" aria-hidden="true"/>Turn the blade <span>{angle}°</span></button>
        </div>
        <button className="rag-button" aria-label="Wipe paint off the squeegee" disabled={!ready || !loaded || contact} onClick={() => { const current = runtime.current; if (current) { current.history.checkpoint(); current.engine.cleanBlade(); refresh(); persist(); } }}><span className={`rag ${loaded ? 'stained' : ''}`} aria-hidden="true"/><span>Wipe it clean</span></button>
        <div className="desk-note"><span className="note-pin"/><p>the best bit?<br/>you can't get<br/>this wrong.</p></div>
      </aside>
    </section>

    <footer className="footer">
      <div className="gesture-hint"><span className="status-dot"/><span>{tool === 'paint' ? 'Hold to squeeze. Drag to make a bead.' : 'Drag across the blade to pull paint. Lift to stop.'}</span><kbd>{tool === 'paint' ? 'P' : 'S'}</kbd></div>
      <div className="save-status" role="status">{storageWarning ? 'Export to keep this painting' : saving}</div>
      <button className="about-button" onClick={() => setCredits(!credits)}>made for making <ArrowUpRight className="ui-icon" aria-hidden="true"/></button>
    </footer>
    {credits && <div className="credits" role="dialog" aria-label="About Scrape"><button aria-label="Close about" onClick={() => setCredits(false)}><X className="ui-icon" aria-hidden="true"/></button><p><em>Scrape.</em> A small studio for happy accidents.</p><p>Pigment mixing by <a href="https://scrtwpns.com/mixbox" target="_blank" rel="noreferrer">Mixbox</a>, © Secret Weapons, under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">CC BY-NC 4.0</a>. This prototype is non-commercial.</p></div>}
    {error && <div className="error-message" role="alert">{error}</div>}
  </main>;
}
