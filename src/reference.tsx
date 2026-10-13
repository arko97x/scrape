import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import mixbox from 'mixbox';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { PaintEngine, type Colour } from './engine';
import { PaintRenderer } from './renderer';
import { Squeegee } from './tools';
import { bladePaint, type BladePaintBand } from './blade-paint';
import './style.css';
import './reference.css';

function ReferenceStudy() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<{engine:PaintEngine;renderer:PaintRenderer} | null>(null);
  const animation = useRef(0);
  const [progress,setProgress] = useState(0);
  const [running,setRunning] = useState(false);
  const [error,setError] = useState('');
  const [carriedPaint,setCarriedPaint] = useState<BladePaintBand[]>([]);
  const prepare = () => {
    const current=runtime.current; if(!current)return;
    current.engine.clear(); current.engine.setBlade(240,0);
    const palette: Colour[] = [[.03,.40,.42],[.99,.85,.13],[.97,.29,.06],[.99,.85,.13],[.73,.02,.27],[.99,.85,.13],[.47,.77,.37]];
    palette.forEach((colour,i)=>current.engine.deposit({x:150+i*30,y:140},colour,i%2?6:13,i%2?70:330));
    current.renderer.render(); setProgress(0); setCarriedPaint(bladePaint(current.engine));
  };
  useEffect(()=>{
    if(!canvas.current)return;
    const engine=new PaintEngine(480,600,(a,b,t)=>mixbox.lerp(a.map(v=>v*255),b.map(v=>v*255),t).map(v=>v/255) as Colour);
    let renderer:PaintRenderer;
    try {renderer=new PaintRenderer(canvas.current,engine);}catch(e){setError(e instanceof Error?e.message:'The study could not start.');return;}
    runtime.current={engine,renderer}; prepare();
    return()=>{cancelAnimationFrame(animation.current);renderer.dispose();runtime.current=null;};
  },[]);
  const pull = () => {
    const current=runtime.current; if(!current||running)return;
    prepare(); setRunning(true); current.engine.beginScrape({x:240,y:115});
    const started=performance.now();
    const tick=(now:number)=>{
      const t=Math.min(1,(now-started)/4400);
      current.engine.scrape({x:240,y:115+t*390}); current.renderer.render(); setProgress(t); setCarriedPaint(bladePaint(current.engine));
      if(t<1)animation.current=requestAnimationFrame(tick);
      else{current.engine.endScrape();setRunning(false);}
    };
    animation.current=requestAnimationFrame(tick);
  };
  return <main className="studio reference-study">
    <header className="header"><a className="wordmark" href="/">scrape<span className="brand-dot">.</span></a><span className="header-caption">a reference study</span><a className="return-studio" href="/">Back to your studio <ArrowUpRight className="ui-icon" aria-hidden="true"/></a></header>
    <section className="reference-workspace">
      <div className="study-intro"><span className="eyebrow">A LITTLE MATERIAL STUDY</span><h1>A dollop.<br/>A little pressure.<br/>A wider ribbon.</h1><p>A repeatable swipe inspired by your acrylic references. Watch the mounds flatten, widen, and leave a raised edge.</p><button className="export-button" onClick={pull} disabled={running||!!error}>{running?'Pulling…':progress===1?'Pull it again':'Pull the squeegee'}<ArrowDown className="ui-icon" aria-hidden="true"/></button><p className="study-footnote">Then try it yourself with a few blobs in the studio.</p></div>
      <div className="paper-area"><div className="paper-host"><canvas ref={canvas} className="painting" width="960" height="1200" aria-label="Animated reference swipe showing acrylic-like spreading and raised edges"/><div className="border-tape tape-top"/><div className="border-tape tape-bottom"/><div className="border-tape tape-left"/><div className="border-tape tape-right"/>{(running||progress===1)&&<div className="reference-blade" style={{top:`${(115+progress*390)/600*100}%`}}><Squeegee paint={carriedPaint}/></div>}</div><p className="study-status" role="status">{error || (running?'Flattening · spreading · leaving an edge':progress===1?'The pull, with its raised shoulders.':'Seven dollops. Ready for one pull.')}</p></div>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<ReferenceStudy/>);
