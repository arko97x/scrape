import { useEffect, useImperativeHandle, useId, useRef, type Ref } from 'react';
import type { SqueezeOutput } from './input';
import { DispenseMotion, extrusionPath } from './dispense-motion';
import { TubeArtwork } from './tools';

export type DispensingTubeHandle = {
  advance(now: number, output?: SqueezeOutput): void;
  release(now: number): void;
  cancel(): void;
};

export function DispensingTube({ colour, wet, ref }: { colour: string; wet: boolean; ref?: Ref<DispensingTubeHandle> }) {
  const id = useId().replace(/:/g, '');
  const root = useRef<SVGSVGElement>(null);
  const photograph = useRef<SVGGElement>(null);
  const neck = useRef<SVGPathElement>(null);
  const glint = useRef<SVGPathElement>(null);
  const residue = useRef<SVGEllipseElement>(null);
  const tail = useRef<SVGEllipseElement>(null);
  const motion = useRef(new DispenseMotion(wet));
  const reduced = useRef(false);
  const previous = useRef('');

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => { reduced.current = query.matches; };
    changed(); query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);

  useEffect(() => { motion.current = new DispenseMotion(wet); previous.current = ''; }, [colour]);

  useImperativeHandle(ref, () => ({
    advance(now, output) {
      const pose = motion.current.update(now, output);
      // The stream still indicates dispensing with reduced motion; remove
      // the travelling highlight and the decorative lift on release.
      if (reduced.current) { pose.nozzleY = 440; if (pose.phase === 'feeding') pose.fill = 1; }
      const signature = JSON.stringify(pose);
      if (signature === previous.current && pose.phase !== 'feeding') return;
      previous.current = signature;
      if (root.current) root.current.dataset.phase = pose.phase;
      photograph.current?.setAttribute('transform', `translate(0 ${pose.nozzleY - 494})`);
      neck.current?.setAttribute('d', extrusionPath(pose));
      const end = pose.nozzleY + (494 - pose.nozzleY) * pose.fill;
      glint.current?.setAttribute('d', pose.neck > 0 ? `M96 ${pose.nozzleY + 2} Q${95 + pose.neck * 3} ${(pose.nozzleY + end) / 2} 96 ${end - 1}` : '');
      glint.current?.setAttribute('transform', reduced.current ? '' : `translate(0 ${(now % 280) / 280 * 5})`);
      residue.current?.setAttribute('cy', String(pose.nozzleY + 1));
      residue.current?.setAttribute('opacity', pose.wet ? '1' : '0');
      tail.current?.setAttribute('opacity', String(pose.tail));
      tail.current?.setAttribute('transform', `translate(100 494) scale(${Math.max(.01, pose.tail)} 1) translate(-100 -494)`);
    },
    release(now) { motion.current.release(now); },
    cancel() { motion.current.cancel(); previous.current = ''; },
  }));

  return <svg ref={root} viewBox="0 0 200 500" className="tube-art dispensing-tube" aria-hidden="true" focusable="false" data-phase="idle" style={{ isolation: 'isolate' }}>
    <defs>
      <clipPath id={`${id}-photo`}><rect width="200" height="500"/></clipPath>
      <path ref={neck} id={`${id}-neck`}/>
      <linearGradient id={`${id}-relief`} x1="0" x2="1">
        <stop stopColor="#000" stopOpacity=".24"/><stop offset=".25" stopColor="#fff" stopOpacity=".2"/><stop offset=".45" stopColor="#fff" stopOpacity=".06"/><stop offset="1" stopColor="#000" stopOpacity=".27"/>
      </linearGradient>
    </defs>
    <use href={`#${id}-neck`} fill={colour}/>
    <use href={`#${id}-neck`} fill={`url(#${id}-relief)`}/>
    <path ref={glint} stroke="#fff" strokeOpacity=".32" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <ellipse ref={tail} cx="100" cy="492" rx="17" ry="6" fill={colour} opacity="0"/>
    <g ref={photograph} transform="translate(0 -72)">
      <g className="dispense-body" clipPath={`url(#${id}-photo)`}><TubeArtwork colour={colour}/></g>
    </g>
    <ellipse ref={residue} cx="100" cy="423" rx="10" ry="4.5" fill={colour} opacity={wet ? 1 : 0}/>
  </svg>;
}
