import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PaintEngine } from '../../src/engine';
import { PaintRenderer } from '../../src/renderer';
import { SqueezeStroke } from '../../src/input';
import { DispensingTube, type DispensingTubeHandle } from '../../src/DispensingTube';
import '../../src/style.css';

function Check() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tube = useRef<DispensingTubeHandle>(null);
  const [frame, setFrame] = useState(600);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState('Feeding');
  const [point, setPoint] = useState({ x: 240, y: 230 });
  useEffect(() => {
    const engine = new PaintEngine(480, 600);
    const renderer = new PaintRenderer(canvas.current!, engine);
    let animation = 0;
    let squeeze = new SqueezeStroke(engine, { x: 240, y: 230 }, [.773, .361, .263], 0);
    tube.current?.cancel();
    const renderAt = (at: number) => {
      engine.clear(); tube.current?.cancel();
      squeeze = new SqueezeStroke(engine, { x: 240, y: 230 }, [.773, .361, .263], 0);
      const press = Math.min(at, 1000);
      for (let time = 20; time < press; time += 20) squeeze.advance(time);
      squeeze.advance(press);
      tube.current?.advance(press, squeeze.output);
      const end = Math.min(at, 2000);
      for (let time = 1020; time <= end; time += 20) {
        squeeze.move({ x: 240 + (time - 1000) * .08, y: 230 + (time - 1000) * .15 });
        squeeze.advance(time);
      }
      if (at > 1000) tube.current?.advance(end, squeeze.output);
      if (at > 2000) { squeeze.finish(2000); tube.current?.release(2000); tube.current?.advance(at); }
      renderer.render(true);
      setPoint({ x: 240 + Math.max(0, end - 1000) * .08, y: 230 + Math.max(0, end - 1000) * .15 });
      setStage(at <= 1000 ? 'Feeding' : at <= 2000 ? 'Drawing a bead' : at < 2180 ? 'Pinch-off' : 'Released');
    };
    if (!playing) renderAt(frame);
    else {
      const start = performance.now();
      const tick = (now: number) => {
        const at = (now - start) % 3200;
        renderAt(at);
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
    }
    return () => { cancelAnimationFrame(animation); renderer.dispose(); };
  }, [frame, playing]);
  return <main style={{ padding: 24, background: '#e9e3d7', minHeight: '100dvh' }}>
    <h1>Tube dispensing</h1>
    <p>Isolated paint engine and real applicator. This does not load or save the studio painting.</p>
    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      <button onClick={() => { setPlaying(false); setFrame(35); }}>Press</button>
      <button onClick={() => { setPlaying(false); setFrame(600); }}>Feeding</button>
      <button onClick={() => { setPlaying(false); setFrame(2090); }}>Pinch-off</button>
      <button onClick={() => { setPlaying(false); setFrame(2250); }}>Released</button>
      <button onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play squeeze & drag'}</button>
    </div>
    <p role="status">{stage}</p>
    <div className="paper-host ready" style={{ width: 480, maxWidth: '100%' }}>
      <canvas ref={canvas} className="painting" width="960" height="1200"/>
      <div className={`tool-cursor paint ${frame <= 2000 || playing ? 'touching' : 'lifted'}`} style={{ left: `${point.x / 480 * 100}%`, top: `${point.y / 600 * 100}%` }}><DispensingTube colour="#c55c43" wet={false} ref={tube}/></div>
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Check/>);
