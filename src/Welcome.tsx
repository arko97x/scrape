import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import { PaintEngine, type Point } from './engine';
import { PaintRenderer } from './renderer';
import { SqueezeStroke } from './input';
import type { InkStroke } from './ink';
import { bladePaint, type BladePaintBand } from './blade-paint';
import { squeegeeAnchor, squeegeeWidthScale, type BladeKind } from './squeegee-geometry';
import { Pen, Squeegee, Tube } from './tools';
import { rgb, pigmentBlend } from './pigment';
import { PathSteer } from './scrape-grip';
import { Modal } from './Modal';
import './modal.css';

// A small landscape sheet keeps the demos cheap; brush sizes stay in field
// cells, so blobs read a little larger here than on the studio paper.
const W = 320, H = 240;

type Tool = 'paint' | 'pen' | 'scrape';
type Cursor = { tool: Tool; at: Point; touching: boolean; colour?: string; blade?: BladeKind; angle?: number; width?: number };
type Frame = { cursor: Cursor | null; label?: string; undo?: boolean; fingers?: Point[]; pointer?: { at: Point; pressed: boolean } };
// Each demo first picks its tool from the dock, then the camera pans up to the
// paper. `touch` picks the version for a touch screen over a mouse or trackpad.
type Demo = { tool: Tool; before: Tool; length: number; start: (engine: PaintEngine, loop: number, touch: boolean) => (t: number) => Frame };

const ease = (u: number) => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
const clamp = (u: number) => Math.max(0, Math.min(1, u));
const smooth = (u: number) => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
const glide = (from: Point, to: Point, u: number): Point => { const k = ease(clamp(u)); return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }; };

const colourNames: Record<string, string> = { '#e5b84e': 'Butter', '#c55c43': 'Tomato', '#649295': 'Lake' };
const squeezes = [
  { colour: '#e5b84e', from: 500, to: 1400, path: (): Point => ({ x: 92, y: 108 }) },
  { colour: '#c55c43', from: 1900, to: 2700, path: (): Point => ({ x: 158, y: 136 }) },
  { colour: '#649295', from: 3200, to: 4600, path: (u: number): Point => ({ x: 206 + 52 * u, y: 72 + 96 * u + 16 * Math.sin(u * Math.PI * 2) }) },
];

// The turning demo's card is shorter, so it stays on the sheet as it swings.
const TURN_WIDTH = 130;

// A row of dollops like the reference study, ready for one pull.
const dollops = (engine: PaintEngine) => {
  const palette = ['#649295', '#e5b84e', '#c55c43', '#e5b84e', '#d99092', '#e5b84e', '#7a8963'];
  palette.forEach((hex, i) => engine.deposit({ x: 100 + i * 20, y: 72 }, rgb(hex), i % 2 ? 5 : 10, i % 2 ? 50 : 210));
};

const demos: Demo[] = [
  { tool: 'paint', before: 'pen', length: 5800, start: engine => {
    engine.clear();
    let active: SqueezeStroke | null = null, index = 0;
    return t => {
      const stroke = squeezes[index];
      if (stroke && t >= stroke.from) {
        const u = clamp((t - stroke.from) / (stroke.to - stroke.from)), at = stroke.path(u);
        if (!active) active = new SqueezeStroke(engine, at, rgb(stroke.colour), t);
        else { active.move(at); active.advance(t); }
        if (u >= 1) { active.finish(t); active = null; index++; }
        return { cursor: { tool: 'paint', at, touching: true, colour: stroke.colour }, label: colourNames[stroke.colour] };
      }
      const previous = squeezes[index - 1];
      if (!stroke) return { cursor: { tool: 'paint', at: glide(previous.path(1), { x: 270, y: 200 }, (t - previous.to) / 700), touching: false, colour: previous.colour } };
      const from = previous ? previous.path(1) : { x: 60, y: 200 };
      return { cursor: { tool: 'paint', at: glide(from, stroke.path(0), (t - (previous?.to ?? 0)) / (stroke.from - (previous?.to ?? 0))), touching: false, colour: stroke.colour }, label: colourNames[stroke.colour] };
    };
  } },
  { tool: 'scrape', before: 'paint', length: 4600, start: (engine, loop) => {
    // Alternate the flat card and the comb on each pass.
    const blade: BladeKind = loop % 2 ? 'comb' : 'flat';
    engine.clear(); engine.setBlade(170, 0, blade); dollops(engine);
    let pulling = false;
    const path = (u: number): Point => ({ x: 160 + 10 * Math.sin(u * Math.PI * 1.5), y: 46 + 164 * u });
    const label = blade === 'comb' ? 'Comb' : 'Flat';
    return t => {
      if (t < 600) return { cursor: { tool: 'scrape', at: glide({ x: 160, y: 18 }, path(0), t / 600), touching: false, blade }, label };
      const u = clamp((t - 600) / 2800), at = path(u);
      if (!pulling && u < 1) { engine.beginScrape(at); pulling = true; }
      if (pulling) { engine.scrape(at); if (u >= 1) { engine.endScrape(); pulling = false; } }
      return { cursor: { tool: 'scrape', at, touching: u < 1, blade }, label };
    };
  } },
  { tool: 'scrape', before: 'paint', length: 4600, start: (engine, _loop, touch) => {
    engine.clear(); engine.setBlade(TURN_WIDTH, 0, 'flat'); dollops(engine);
    const half = (TURN_WIDTH - 1) / 2;
    // Both versions sweep the card round the same quarter turn.
    const path = (u: number): Point => { const r = smooth(u) * Math.PI / 2; return { x: 112 + 112 * (1 - Math.cos(r)), y: 46 + 128 * Math.sin(r) }; };
    if (touch) {
      // Two fingers hold the card's ends and twist as they pull, keeping it
      // square to the curve.
      const pose = (u: number) => {
        const r = smooth(u) * Math.PI / 2;
        return { at: path(u), angle: Math.atan2(128 * Math.cos(r), 112 * Math.sin(r)) * 180 / Math.PI - 90 };
      };
      const ends = ({ at, angle }: { at: Point; angle: number }) => {
        const r = angle * Math.PI / 180;
        return [{ x: at.x - Math.cos(r) * half, y: at.y - Math.sin(r) * half }, { x: at.x + Math.cos(r) * half, y: at.y + Math.sin(r) * half }];
      };
      let pulling = false;
      return t => {
        const card = (at: Point, angle: number, touching: boolean): Cursor => ({ tool: 'scrape', at, touching, angle, width: TURN_WIDTH });
        if (t < 600) return { cursor: card(glide({ x: 112, y: 18 }, pose(0).at, t / 600), 0, false), label: 'Two fingers' };
        const u = clamp((t - 600) / 2800), now = pose(u);
        if (u >= 1) {
          // Lifted, the card turns level for the next pull.
          if (pulling) { engine.endScrape(); engine.turn(0); pulling = false; }
          return { cursor: card(glide(now.at, { x: 288, y: 120 }, (t - 3400) / 700), 0, false), label: 'Two fingers' };
        }
        if (!pulling) { engine.beginScrape(now.at); pulling = true; } else engine.scrape(now.at, now.angle);
        return { cursor: card(now.at, now.angle, true), fingers: ends(now), label: 'Two fingers' };
      };
    }
    // With a mouse, a curving drag steers the card round with it.
    let pulling = false, steer = new PathSteer(path(0));
    return t => {
      const card = (at: Point, angle: number, touching: boolean): Cursor => ({ tool: 'scrape', at, touching, angle, width: TURN_WIDTH });
      if (t < 600) return { cursor: card(glide({ x: 112, y: 18 }, path(0), t / 600), 0, false), label: 'Curve to steer' };
      const u = clamp((t - 600) / 2800), at = path(u);
      if (u >= 1) {
        if (pulling) { engine.endScrape(); engine.turn(0); pulling = false; }
        return { cursor: card(glide(at, { x: 288, y: 120 }, (t - 3400) / 700), 0, false), label: 'Curve to steer' };
      }
      if (!pulling) { engine.beginScrape(at); steer = new PathSteer(at); pulling = true; }
      else engine.scrape(at, steer.follow(at, engine.angle) ?? engine.angle);
      return { cursor: card(at, engine.angle, true), pointer: { at, pressed: true }, label: 'Curve to steer' };
    };
  } },
  { tool: 'pen', before: 'scrape', length: 5400, start: engine => {
    engine.clear(); engine.setBlade(240, 0, 'flat'); dollops(engine);
    engine.beginScrape({ x: 160, y: 46 });
    for (let y = 46; y <= 200; y += 2) engine.scrape({ x: 160, y });
    engine.endScrape(); engine.cleanBlade();
    const before = engine.snapshot();
    const path = (u: number): Point => { const turn = u * Math.PI * 8; return { x: 66 + 176 * u + 13 * Math.sin(turn), y: 150 - 15 * Math.cos(turn) }; };
    let stroke: InkStroke | null = null, undone = false;
    return t => {
      if (t < 500) return { cursor: { tool: 'pen', at: glide({ x: 40, y: 200 }, path(0), t / 500), touching: false } };
      const u = clamp((t - 500) / 2600), at = path(u);
      if (u < 1 || !stroke) {
        if (!stroke) stroke = engine.beginInk(at, rgb('#344c5a'), 3.5);
        else engine.extendInk(stroke, at);
        return { cursor: { tool: 'pen', at, touching: u < 1 } };
      }
      // Hold the finished doodle, then take it back with Undo.
      if (t >= 4100 && !undone) { engine.restore(before); undone = true; }
      return { cursor: { tool: 'pen', at: glide(path(1), { x: 280, y: 196 }, (t - 3100) / 600), touching: false }, undo: t >= 4100 };
    };
  } },
];

// The dock sits below the sheet, in field cells: the camera starts on it,
// a pointer taps the tool, then the view pans up as the tool is carried over.
const PRELUDE = 2300, OUTRO = 450, PAN = 92, SLOT_Y = 312;
const slots: Record<Tool, number> = { paint: 84, pen: 136, scrape: 192 };
const toolNames: Record<Tool, string> = { paint: 'Paint', pen: 'Pen', scrape: 'Scraper' };

type Shot = Frame & { pan: number; fade: number; armed: Tool; pointer?: { at: Point; pressed: boolean }; tap?: Point };

function prelude(demo: Demo, t: number, first: Frame): Shot {
  const slot = { x: slots[demo.tool], y: SLOT_Y }, fade = clamp(t / 300);
  if (t < 950) return { cursor: null, pan: 1, fade, armed: demo.before, pointer: { at: glide({ x: 296, y: 336 }, slot, (t - 150) / 800), pressed: false } };
  if (t < 1250) return { cursor: null, pan: 1, fade, armed: t >= 1030 ? demo.tool : demo.before, pointer: { at: slot, pressed: t < 1110 }, tap: slot };
  const u = clamp((t - 1250) / (PRELUDE - 1250)), target = first.cursor?.at ?? { x: 160, y: 120 };
  const at = { x: slot.x + (target.x - slot.x) * smooth(u), y: SLOT_Y - 18 + (target.y - SLOT_Y + 18) * smooth(u) };
  return { cursor: first.cursor && { ...first.cursor, at, touching: false }, pan: 1 - smooth(u), fade: 1, armed: demo.tool, tap: t < 1700 ? slot : undefined };
}

const percent = (at: Point) => ({ left: `${at.x / W * 100}%`, top: `${at.y / H * 100}%` });

function MiniDock({ armed }: { armed: Tool }) {
  return <div className="welcome-dock">
    {(['paint', 'pen', 'scrape'] as const).map(tool => <div key={tool} className={`welcome-slot ${tool}`} data-armed={armed === tool} style={{ left: `${(slots[tool] - 52) / 216 * 100}%` }}>
      <span className="welcome-tab"><span>{toolNames[tool]}</span></span>
      {tool === 'paint' ? <Tube colour="#e5b84e"/> : tool === 'pen' ? <Pen colour="#344c5a"/> : <Squeegee/>}
    </div>)}
    <span className="welcome-divider"/>
    <Undo2 className="ui-icon welcome-history"/><Redo2 className="ui-icon welcome-history"/>
  </div>;
}

function Pointer({ at, pressed, touch }: { at: Point; pressed: boolean; touch: boolean }) {
  if (touch) return <span className="welcome-finger" data-pressed={pressed} style={percent(at)}/>;
  return <svg className="welcome-pointer" data-pressed={pressed} viewBox="0 0 16 22" style={percent(at)}>
    <path d="M1.5 1.5V17.5L5.6 13.6L8.6 20.2L11.3 19L8.4 12.6H14Z" fill="#1f2a22" stroke="#fffdf8" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>;
}

function Demo({ step, reduced, touch }: { step: number; reduced: boolean; touch: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<{ engine: PaintEngine; renderer: PaintRenderer } | null>(null);
  const [shot, setShot] = useState<Shot>({ cursor: null, pan: 1, fade: 0, armed: demos[step].before });
  const [carried, setCarried] = useState<BladePaintBand[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    const engine = new PaintEngine(W, H, pigmentBlend);
    let renderer: PaintRenderer;
    try { renderer = new PaintRenderer(canvas.current, engine); } catch { setFailed(true); return; }
    runtime.current = { engine, renderer };
    const resize = () => {
      const rect = canvas.current!.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.current!.width = Math.max(1, Math.round(rect.width * ratio)); canvas.current!.height = Math.max(1, Math.round(rect.height * ratio));
      renderer.render(true);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas.current); resize();
    return () => { observer.disconnect(); renderer.dispose(); runtime.current = null; };
  }, []);

  useEffect(() => {
    const current = runtime.current; if (!current) return;
    const { engine, renderer } = current, demo = demos[step];
    if (reduced) {
      // Show the finished state of each demo without motion.
      const run = demo.start(engine, 0, touch);
      let last: Frame = { cursor: null };
      // The pen demo is shown with its doodle, before Undo takes it away.
      for (let t = 0; t <= demo.length; t += 16) { last = run(t); if (demo.tool === 'pen' && t > 3200) break; }
      renderer.render(true); setShot({ label: last.label, cursor: null, pan: 0, fade: 1, armed: demo.tool }); setCarried([]);
      return;
    }
    let loop = 0, t = 0, previous = performance.now(), animation = 0;
    let run = demo.start(engine, loop, touch), first = run(0), last = first;
    const tick = (now: number) => {
      // Cap the step so a backgrounded tab doesn't jump the script ahead.
      t += Math.min(50, now - previous); previous = now;
      if (t > PRELUDE + demo.length + OUTRO) { loop++; t = 0; run = demo.start(engine, loop, touch); first = last = run(0); }
      let next: Shot;
      if (t < PRELUDE) next = prelude(demo, t, first);
      else if (t < PRELUDE + demo.length) { last = run(t - PRELUDE); next = { ...last, pan: 0, fade: 1, armed: demo.tool }; }
      else next = { ...last, label: undefined, fingers: undefined, pointer: undefined, pan: 0, fade: 1 - clamp((t - PRELUDE - demo.length) / OUTRO), armed: demo.tool };
      renderer.render();
      setShot(next);
      if (next.cursor?.tool === 'scrape') setCarried(bladePaint(engine));
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animation); engine.endScrape(); };
  }, [step, reduced, touch]);

  const { cursor } = shot;
  return <div className="welcome-demo" aria-hidden="true" style={{ '--pan': shot.pan, '--fade': shot.fade, '--pan-cells': PAN } as React.CSSProperties}>
    <div className="welcome-scene">
      <div className="welcome-sheet"/>
      <div className="welcome-field">
        <canvas ref={canvas} width={W * 2} height={H * 2}/>
        <MiniDock armed={shot.armed}/>
        {shot.tap && <span className="welcome-tap" style={percent(shot.tap)}/>}
        {cursor && <div className={`tool-cursor ${cursor.tool} ${cursor.touching ? 'touching' : 'lifted'}`} style={{ ...percent(cursor.at), width: cursor.tool === 'scrape' ? `${(cursor.width ?? 170) / W * 100 * squeegeeWidthScale}%` : undefined, '--blade-angle': `${cursor.angle ?? 0}deg`, '--squeegee-anchor': squeegeeAnchor } as React.CSSProperties}>
          {cursor.tool === 'scrape' ? <Squeegee paint={carried} pose="working" blade={cursor.blade}/> : cursor.tool === 'pen' ? <Pen colour="#344c5a"/> : <Tube colour={cursor.colour ?? '#e5b84e'}/>}
        </div>}
        {shot.fingers?.map((at, i) => <span key={i} className="welcome-finger" data-pressed="true" style={percent(at)}/>)}
        {shot.pointer && <Pointer {...shot.pointer} touch={touch}/>}
      </div>
    </div>
    {failed && <p className="welcome-fallback">This browser can't show the paint demo, but the studio will explain itself as you go.</p>}
    {shot.label && shot.pan === 0 && <span className="welcome-chip">{shot.label}</span>}
    {shot.undo && <span className="welcome-chip welcome-undo"><Undo2 className="ui-icon" aria-hidden="true"/>Undo</span>}
  </div>;
}

const stepsFor = (touch: boolean) => [
  { title: 'Squeeze some paint', body: 'Pick a colour and press on the paper. Hold still for a bigger blob, or drag to lay a line of paint.' },
  { title: 'Scrape it across', body: 'Pick the scraper and pull it through the paint. The flat card spreads colours smooth; the comb leaves ridges.' },
  touch
    ? { title: 'Turn as you pull', body: 'Hold the scraper with two fingers, one at each end. Twist them as you pull and the card turns too, sweeping paint into curves and fans.' }
    : { title: 'Turn as you pull', body: 'Curve your drag and the card turns with it; drag straight and it stays put. Scroll over the paper to set its angle first, or hold Shift to keep it steady.' },
  { title: 'Draw, undo, keep', body: 'The pen draws on top of the paint. Undo takes back a step, and the download button saves your painting as a picture. Scrape also remembers it in this browser.' },
];

export function Welcome({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [touch] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false);
  const steps = stepsFor(touch);
  const last = step === steps.length - 1;
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' && !last) setStep(step + 1);
    else if (event.key === 'ArrowLeft' && step > 0) setStep(step - 1);
  };
  return <Modal id="welcome" label="How Scrape works" className="welcome" closeOnBackdrop={false} onClose={onClose}>
    <div className="welcome-layout" onKeyDown={keys}>
      <p className="welcome-hello"><span className="modal-mark">scrape<span className="brand-dot">.</span></span></p>
      <Demo step={step} reduced={reduced} touch={touch}/>
      <div className="welcome-text" aria-live="polite">
        <p className="welcome-count">{step + 1} of {steps.length}</p>
        <h2>{steps[step].title}</h2>
        <p>{steps[step].body}</p>
      </div>
      <div className="welcome-nav">
        <div className="welcome-dots">{steps.map((item, i) => <button key={item.title} aria-label={`Step ${i + 1}: ${item.title}`} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}/>)}</div>
        {step > 0 && <button className="modal-secondary" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="modal-primary" data-autofocus onClick={() => last ? onClose() : setStep(step + 1)}>{last ? 'Start painting' : 'Next'}</button>
      </div>
    </div>
  </Modal>;
}
