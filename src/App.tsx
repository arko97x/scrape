import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDownRight, Download, Plus } from 'lucide-react';
import { PaintEngine, PaintHistory, type Point } from './engine';
import { PaintRenderer } from './renderer';
import { SqueezeStroke } from './input';
import { loadPainting, savePainting } from './storage';
import { Pen, Squeegee } from './tools';
import type { InkStroke } from './ink';
import { bladePaint, type BladePaintBand } from './blade-paint';
import { DispensingTube, type DispensingTubeHandle } from './DispensingTube';
import { DISPENSE_RELEASE_MS } from './dispense-motion';
import { squeegeeAnchor, squeegeeWidthScale, type BladeKind } from './squeegee-geometry';
import { penWidths, StudioDock, studioColours as colours, type StudioTool as Tool } from './StudioDock';
import { rgb, pigmentBlend } from './pigment';
import { PathSteer, twoFingerPose } from './scrape-grip';
import { Welcome } from './Welcome';
import { About } from './About';

const W = 480, H = 600;
const WELCOMED = 'scrape:welcomed';
const welcomed = () => { try { return localStorage.getItem(WELCOMED) === '1'; } catch { return false; } };
/** How the scraper is held. A touch waits briefly for a second finger before it
 *  starts pulling, so a two-finger grip doesn't smear first; `pending` buffers its
 *  path meanwhile. A mouse or stylus has no second finger, so its path steers. */
type Grip = {
  touch: boolean; fingers: Map<number, Point>; pending: Point[] | null; timer?: ReturnType<typeof setTimeout>;
  centre: Point; steer: PathSteer | null;
};
type Gesture = { pointerId: number; squeeze?: SqueezeStroke; pen?: InkStroke; grip?: Grip };
const SECOND_FINGER_MS = 150, SECOND_FINGER_SLOP = 6;
const coarsePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
type Runtime = { engine: PaintEngine; history: PaintHistory; renderer: PaintRenderer };

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const dispensingTube = useRef<DispensingTubeHandle>(null);
  const wetColours = useRef(new Set<string>());
  const releaseUntil = useRef(0);
  const hideAfterRelease = useRef(false);
  const hoverPoint = useRef<Point | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = useRef<Tool>('paint');
  const colour = useRef(colours[0].hex);
  const [tool, setTool] = useState<Tool>('paint');
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [keyboardMotion, setKeyboardMotion] = useState(false);
  const [penColour, setPenColour] = useState('#344c5a');
  const [penWidth, setPenWidth] = useState<number>(penWidths[0].width);
  const [paint, setPaint] = useState(colours[0].hex);
  const [bladeWidth, setBladeWidth] = useState(100);
  const [angle, setAngle] = useState(0);
  const [blade, setBlade] = useState<BladeKind>('flat');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [contact, setContact] = useState(false);
  const [carriedPaint, setCarriedPaint] = useState<BladePaintBand[]>([]);
  const [exporting, setExporting] = useState(false);
  const [hasPaint, setHasPaint] = useState(false);
  const [credits, setCredits] = useState(false);
  const [welcome, setWelcome] = useState(() => !welcomed());
  const [touchFirst] = useState(coarsePointer);

  const refresh = () => {
    const current = runtime.current; if (!current) return;
    setHistoryState({ undo: current.history.canUndo, redo: current.history.canRedo });
    setCarriedPaint(bladePaint(current.engine)); setHasPaint(current.engine.surfaceMass() > .1 || current.engine.ink.length > 0);
    setBladeWidth(current.engine.bladeWidth); setAngle(current.engine.angle); setBlade(current.engine.blade);
  };

  const persist = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const current = runtime.current; if (!current) return;
      savePainting(W, H, current.engine.snapshot()).catch(() => setStorageWarning(true));
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
      const squeeze = gesture.current?.squeeze;
      squeeze?.advance(now); renderer.render();
      dispensingTube.current?.advance(now, squeeze?.output);
      if (releaseUntil.current && now >= releaseUntil.current) {
        releaseUntil.current = 0;
        setCursor(hideAfterRelease.current ? null : hoverPoint.current);
      }
      if (!stopped) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    loadPainting(W, H).then(state => {
      if (stopped) return;
      if (state) engine.restore(state);
      setReady(true); refresh();
    }).catch(() => { if (!stopped) { setStorageWarning(true); setReady(true); } });
    const interrupt = () => {
      if (gesture.current) { gesture.current.squeeze?.finish(performance.now()); clearTimeout(gesture.current.grip?.timer); engine.endScrape(); if (gesture.current.grip) engine.turn(0); gesture.current = null; setContact(false); refresh(); persist(); }
      dispensingTube.current?.cancel(); releaseUntil.current = 0; setCursor(null);
    };
    const onVisibility = () => { if (document.hidden) interrupt(); };
    window.addEventListener('blur', interrupt); document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true; cancelAnimationFrame(frame); observer.disconnect(); clearTimeout(saveTimer.current);
      window.removeEventListener('blur', interrupt); document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose(); runtime.current = null; gesture.current = null;
    };
  }, []);

  const cancelRelease = () => {
    dispensingTube.current?.cancel(); releaseUntil.current = 0;
    if (hideAfterRelease.current) setCursor(null);
  };
  const selectPaint = (hex: string) => { if (gesture.current) return; cancelRelease(); selected.current = 'paint'; colour.current = hex; setTool('paint'); setPaint(hex); setSettingsOpen(true); };
  const selectScraper = () => { if (gesture.current) return; cancelRelease(); selected.current = 'scrape'; setTool('scrape'); setSettingsOpen(true); };
  const selectPen = () => { if (gesture.current) return; cancelRelease(); selected.current = 'pen'; setTool('pen'); setSettingsOpen(true); };
  const changeBlade = (width: number, rotation: number, kind: BladeKind = blade) => {
    const current = runtime.current; if (!current || gesture.current) return;
    current.history.checkpoint();
    // Turning keeps the card's paint; a new size or card starts it clean.
    const { engine } = current;
    if (width === engine.bladeWidth && kind === engine.blade) engine.turn(rotation);
    else engine.setBlade(width, rotation, kind);
    refresh(); persist();
  };
  const historyAction = (action: 'undo' | 'redo') => {
    const current = runtime.current; if (!current || gesture.current) return;
    cancelRelease();
    current.history[action](); refresh(); persist();
  };
  /** Turns the card in the air, keeping its paint. Not an undo step of its own. */
  const turnBlade = (by: number) => {
    const current = runtime.current; if (!current || gesture.current) return;
    current.engine.turn(current.engine.angle + by); setAngle(current.engine.angle); persist();
  };

  // One pointer holds the card's centre. A mouse or stylus steers it round
  // curves; Shift keeps its angle.
  const holdOne = (engine: PaintEngine, grip: Grip, at: Point, hold: boolean) => {
    grip.centre = at;
    engine.scrape(at, grip.steer?.follow(at, engine.angle, hold) ?? engine.angle);
  };
  // Two fingers hold the card's ends.
  const holdTwo = (engine: PaintEngine, grip: Grip) => {
    const [a, b] = [...grip.fingers.values()];
    const pose = twoFingerPose(a, b, engine.angle);
    engine.scrape(pose.centre, pose.angle); grip.centre = pose.centre;
  };
  // No second finger came, so the first one pulls on its own, from where it landed.
  const settleOneFinger = (engine: PaintEngine, grip: Grip) => {
    clearTimeout(grip.timer);
    const [first, ...rest] = grip.pending ?? []; grip.pending = null;
    if (!first) return;
    engine.beginScrape(first); grip.centre = first;
    for (const point of rest) holdOne(engine, grip, point, false);
  };
  const showGrip = (engine: PaintEngine, grip: Grip) => { setCursor(grip.centre); setAngle(engine.angle); setCarriedPaint(bladePaint(engine)); };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (gesture.current || !ready || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { setKeyboardMotion(true); setSettingsOpen(false); dispensingTube.current?.cancel(); releaseUntil.current = 0; setCursor(null); canvas.current?.blur(); return; }
      if ((event.target as HTMLElement).matches('input, textarea, select')) return;
      setKeyboardMotion(true);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); historyAction(event.shiftKey ? 'redo' : 'undo'); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); historyAction('redo'); }
      else if (event.metaKey || event.ctrlKey || event.altKey) return;
      else if (event.key.toLowerCase() === 's') selectScraper();
      else if (event.key.toLowerCase() === 'p') selectPaint(colour.current);
      else if (event.key.toLowerCase() === 'n') selectPen();
      else if ((event.key === '[' || event.key === ']') && selected.current === 'scrape') turnBlade(event.key === '[' ? -15 : 15);
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [ready]);

  // Scrolling over the paper turns the card: in the air, or live mid-pull.
  useEffect(() => {
    const paper = canvas.current; if (!paper || !ready) return;
    const wheel = (event: WheelEvent) => {
      const current = runtime.current, active = gesture.current;
      // Ctrl marks a trackpad pinch, which the browser zooms with.
      if (!current || selected.current !== 'scrape' || event.ctrlKey) return;
      event.preventDefault();
      const grip = active?.grip;
      if (active && (!grip || grip.pending || grip.fingers.size > 1)) return;
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const delta = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * scale * .15;
      const by = Math.max(-30, Math.min(30, delta));
      if (grip) { current.engine.scrape(grip.centre, current.engine.angle + by); grip.steer?.rebase(current.engine.angle); showGrip(current.engine, grip); }
      else turnBlade(by);
    };
    paper.addEventListener('wheel', wheel, { passive: false });
    return () => paper.removeEventListener('wheel', wheel);
  }, [ready]);

  const pointFrom = (clientX: number, clientY: number): Point => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width * W, y: (clientY - rect.top) / rect.height * H };
  };
  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = runtime.current;
    const held = gesture.current?.grip;
    if (current && held?.touch && event.pointerType === 'touch' && held.fingers.size === 1) {
      // A second finger: the card is lifted and set back down between the two,
      // turned to match, whether or not the first finger had started pulling.
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      clearTimeout(held.timer); held.pending = null;
      held.fingers.set(event.pointerId, pointFrom(event.clientX, event.clientY));
      const [a, b] = [...held.fingers.values()];
      const pose = twoFingerPose(a, b, current.engine.angle);
      current.engine.endScrape(); current.engine.turn(pose.angle); current.engine.beginScrape(pose.centre); held.centre = pose.centre;
      showGrip(current.engine, held);
      return;
    }
    if (!current || !ready || gesture.current || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event.clientX, event.clientY);
    releaseUntil.current = 0; hideAfterRelease.current = false; hoverPoint.current = point;
    current.history.checkpoint(); setContact(true); setCursor(point);
    if (selected.current === 'paint') {
      wetColours.current.add(colour.current);
      const squeeze = new SqueezeStroke(current.engine, point, rgb(colour.current), performance.now());
      squeeze.flow = event.pointerType === 'pen' && event.pressure > 0 ? .5 + event.pressure * 1.5 : 1;
      gesture.current = { pointerId: event.pointerId, squeeze };
    } else if (selected.current === 'pen') {
      gesture.current = { pointerId: event.pointerId, pen: current.engine.beginInk(point, rgb(penColour), penWidth) };
    } else {
      const grip: Grip = { touch: event.pointerType === 'touch', fingers: new Map([[event.pointerId, point]]), pending: null, centre: point, steer: event.pointerType === 'touch' ? null : new PathSteer(point) };
      gesture.current = { pointerId: event.pointerId, grip };
      if (event.pointerType === 'touch') {
        grip.pending = [point];
        grip.timer = setTimeout(() => {
          const now = runtime.current;
          if (!now || gesture.current?.grip !== grip || !grip.pending) return;
          settleOneFinger(now.engine, grip); showGrip(now.engine, grip);
        }, SECOND_FINGER_MS);
      } else current.engine.beginScrape(point);
    }
    refresh();
  };
  const holds = (active: Gesture, pointerId: number) => active.grip ? active.grip.fingers.has(pointerId) : active.pointerId === pointerId;
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = runtime.current; if (!current) return;
    const point = pointFrom(event.clientX, event.clientY);
    hoverPoint.current = point;
    if ((event.pointerType !== 'touch' || gesture.current) && performance.now() >= releaseUntil.current) setCursor(point);
    const active = gesture.current; if (!active || !holds(active, event.pointerId)) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() || [];
    const grip = active.grip;
    if (grip && (grip.pending || grip.fingers.size > 1)) {
      grip.fingers.set(event.pointerId, point);
      if (grip.fingers.size > 1) holdTwo(current.engine, grip);
      else if (grip.pending) {
        grip.pending.push(point);
        if (Math.hypot(point.x - grip.pending[0].x, point.y - grip.pending[0].y) > SECOND_FINGER_SLOP) settleOneFinger(current.engine, grip);
      }
      if (!grip.pending) showGrip(current.engine, grip);
      return;
    }
    for (const sample of samples.length ? samples : [event.nativeEvent]) {
      const at = pointFrom(sample.clientX, sample.clientY);
      if (active.squeeze) active.squeeze.move(at);
      else if (active.pen) current.engine.extendInk(active.pen, at);
      else if (grip) holdOne(current.engine, grip, at, event.shiftKey);
    }
    if (grip) showGrip(current.engine, grip);
    if (active.squeeze && event.pointerType === 'pen' && event.pressure > 0) active.squeeze.flow = .5 + event.pressure * 1.5;
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current, current = runtime.current;
    if (!active || !current || !holds(active, event.pointerId)) return;
    const grip = active.grip;
    // A touch that lifts before a second finger lands still makes its pull.
    if (grip?.pending) settleOneFinger(current.engine, grip);
    if (event.type === 'pointerup') {
      const point = pointFrom(event.clientX, event.clientY);
      if (active.squeeze) { active.squeeze.move(point); active.squeeze.finish(performance.now()); }
      else if (active.pen) current.engine.extendInk(active.pen, point);
      else if (grip && grip.fingers.size === 1) holdOne(current.engine, grip, point, event.shiftKey);
    } else {
      active.squeeze?.finish(performance.now());
    }
    const now = performance.now();
    if (active.squeeze && event.type === 'pointerup') {
      dispensingTube.current?.advance(now, active.squeeze.output);
      dispensingTube.current?.release(now);
      releaseUntil.current = now + DISPENSE_RELEASE_MS;
      hideAfterRelease.current = event.pointerType === 'touch' || !hoverPoint.current || hoverPoint.current.x < 0 || hoverPoint.current.y < 0 || hoverPoint.current.x > W || hoverPoint.current.y > H;
      // Keep the filament attached to the last deposit while the mouse moves
      // away. Restore the live cursor once that connection has broken.
    } else {
      dispensingTube.current?.cancel(); releaseUntil.current = 0;
      if (event.pointerType === 'touch') setCursor(null);
    }
    clearTimeout(grip?.timer); current.engine.endScrape(); gesture.current = null; setContact(false);
    // Every pull starts level, however the last one ended.
    if (grip) current.engine.turn(0);
    // Lifting either finger lifts the card; the other one is let go too.
    for (const id of grip ? grip.fingers.keys() : [event.pointerId]) if (event.currentTarget.hasPointerCapture(id)) event.currentTarget.releasePointerCapture(id);
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

  return <main className="studio dock-studio" data-keyboard={keyboardMotion} onPointerDownCapture={() => setKeyboardMotion(false)}>
    <header className="header">
      <a className="wordmark" href="#" aria-label="Scrape studio" onClick={event => event.preventDefault()}>scrape<span className="brand-dot">.</span></a>
      <div className="header-actions">
        <button className="new-sheet" aria-label="New sheet" disabled={!hasPaint || contact || !ready} onClick={() => { const current = runtime.current; if (current) { cancelRelease(); current.history.checkpoint(); current.engine.clear(); refresh(); persist(); } }}><Plus className="ui-icon" aria-hidden="true"/><span>New sheet</span></button>
        <button className="export-button" aria-label={exporting ? 'Saving picture…' : 'Save as a picture'} title="Save as a picture" disabled={!ready || exporting || contact} onClick={exportPainting}><Download className="ui-icon" aria-hidden="true"/></button>
      </div>
    </header>

    <section className="workspace" aria-label="Painting desk">
      <div className="paper-area">
        <div className={`paper-host ${ready ? 'ready' : ''}`}>
          <div className="paper-surface"><canvas ref={canvas} className="painting" aria-label="Painting paper. Select a colour, hold to squeeze a blob, or drag to draw a bead. Select the scraper and drag to scrape, or select the pen to draw clean lines." tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onPointerLeave={() => { if (!gesture.current) { hoverPoint.current = null; if (performance.now() < releaseUntil.current) hideAfterRelease.current = true; else setCursor(null); } }}/></div>
          <div className="border-tape tape-top" aria-hidden="true"/><div className="border-tape tape-bottom" aria-hidden="true"/><div className="border-tape tape-left" aria-hidden="true"/><div className="border-tape tape-right" aria-hidden="true"/>
          {!hasPaint && !contact && ready && <div className="paper-invitation" aria-hidden="true"><span>nothing precious.</span><span>just play.</span><ArrowDownRight className="ui-icon" aria-hidden="true"/></div>}
          {cursor && ready && <div className={`tool-cursor ${tool} ${contact ? 'touching' : 'lifted'}`} style={{ left: `${cursor.x / W * 100}%`, top: `${cursor.y / H * 100}%`, width: tool === 'scrape' ? `${bladeWidth / W * 100 * squeegeeWidthScale}%` : undefined, '--blade-angle': `${angle}deg`, '--squeegee-anchor': squeegeeAnchor } as React.CSSProperties} aria-hidden="true">{tool === 'scrape' ? <Squeegee paint={carriedPaint} pose="working" blade={blade}/> : tool === 'pen' ? <Pen colour={penColour}/> : <DispensingTube ref={dispensingTube} colour={paint} wet={wetColours.current.has(paint)}/>}</div>}
          {!ready && !error && <div className="loading-paper">Getting your paper ready…</div>}
        </div>
      </div>
    </section>

    <div className="dock-guidance" role="status">{tool === 'paint' ? 'Hold to squeeze · drag to lay a bead' : tool === 'pen' ? 'Drag to draw · lift to finish' : touchFirst ? 'Drag to pull · two fingers to turn' : 'Drag to pull · curve to steer · scroll to turn'}</div>
    <StudioDock tool={tool} open={settingsOpen} onOpen={setSettingsOpen} disabled={!ready || contact}
      onSelect={next => next === 'paint' ? selectPaint(paint) : next === 'pen' ? selectPen() : selectScraper()}
      paint={paint} onPaint={selectPaint} penColour={penColour} penWidth={penWidth} onPenColour={setPenColour} onPenWidth={setPenWidth}
      bladeWidth={bladeWidth} angle={angle} blade={blade} onBlade={changeBlade} carriedPaint={carriedPaint}
      undo={historyState.undo} redo={historyState.redo} onHistory={historyAction}
      onAbout={() => setCredits(true)}/>
    {storageWarning && <div className="desk-meta"><div className="save-status" role="status">Export to keep this painting</div></div>}
    {credits && <About onClose={() => setCredits(false)} onWelcome={() => { setCredits(false); setWelcome(true); }}/>}
    {welcome && <Welcome onClose={() => { setWelcome(false); try { localStorage.setItem(WELCOMED, '1'); } catch { /* Shows again next visit. */ } }}/>}
    {error && <div className="error-message" role="alert">{error}</div>}
  </main>;
}
