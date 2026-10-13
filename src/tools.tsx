import { useId } from 'react';
import type { BladePaintBand } from './blade-paint';

export function Tube({ colour, label, small = false }: { colour: string; label?: string; small?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 72 158" className={`tube-art ${small ? 'small' : ''}`} aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" x2="1"><stop stopColor="#c9c8bd"/><stop offset=".23" stopColor="#faf9ee"/><stop offset=".72" stopColor="#e7e5da"/><stop offset="1" stopColor="#b9b9b0"/></linearGradient>
      <linearGradient id={`${id}-band`} x1="0" x2="1"><stop stopColor="#000" stopOpacity=".17"/><stop offset=".45" stopColor="#fff" stopOpacity=".1"/><stop offset="1" stopColor="#000" stopOpacity=".12"/></linearGradient>
    </defs>
    <path d="M14 20 Q13 15 19 15 L53 15 Q59 15 58 21 L57 101 Q54 116 44 127 L44 138 L28 138 L28 127 Q16 117 15 102Z" fill={`url(#${id}-metal)`} stroke="#777b70" strokeWidth="1.1"/>
    <path d="M15 47 L57 47 L57 103 Q55 111 50 116 L23 116 Q17 110 15 103Z" fill={colour}/>
    <path d="M15 47 L57 47 L57 103 Q55 111 50 116 L23 116 Q17 110 15 103Z" fill={`url(#${id}-band)`}/>
    <path d="M15 19 L57 19 M15 23 L57 23 M18 28 L54 28" stroke="#929487" strokeWidth="1" opacity=".7"/>
    <path d="M19 32 L20 99 M53 32 L52 104" stroke="#fff" strokeWidth="1.2" opacity=".55"/>
    <path d="M18 108 L24 112 M52 117 L45 120 M21 119 L29 124" stroke="#96968a" strokeWidth="1" opacity=".6"/>
    <rect x="28" y="134" width="16" height="8" rx="2" fill="#d9d8ca" stroke="#898d7d"/>
    <path d="M30 142 L42 142 L40 150 L32 150Z" fill="#e1dfd2" stroke="#898d7d"/>
    <ellipse cx="36" cy="150" rx="4" ry="1.4" fill={colour}/>
    {!small && <><text x="36" y="38" textAnchor="middle" fill="#39483e" fontSize="7" fontFamily="Georgia" fontStyle="italic">scrape</text><rect x="20" y="61" width="32" height="29" fill="#f7f3e8" opacity=".94"/><text x="36" y="73" textAnchor="middle" fill="#39483e" fontSize="5.5" fontFamily="sans-serif" letterSpacing=".5">COLOUR</text><text x="36" y="83" textAnchor="middle" fill="#39483e" fontSize="5.5" fontFamily="sans-serif">{label || 'STUDIO'}</text></>}
  </svg>;
}

export function Squeegee({ paint = [] }: { paint?: BladePaintBand[] }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 240 145" className="squeegee-art" aria-hidden="true">
    <defs><linearGradient id={`${id}-handle`} x1="0" x2="1"><stop stopColor="#ba644e"/><stop offset=".45" stopColor="#df967b"/><stop offset="1" stopColor="#b76851"/></linearGradient></defs>
    <path d="M106 99 L108 23 Q108 12 120 12 Q132 12 132 23 L134 99Z" fill={`url(#${id}-handle)`} stroke="#824e3d" strokeWidth="1.5"/>
    <path d="M114 26 L114 76" stroke="#f2bf9a" strokeWidth="2" opacity=".5"/>
    <circle cx="120" cy="24" r="3" fill="#704d3c"/>
    <path d="M12 96 L228 96 L224 119 L16 119Z" fill="#c8d0b9" stroke="#64745e" strokeWidth="1.5"/>
    <path d="M21 101 L219 101" stroke="#e6eadb" strokeWidth="3"/>
    <path d="M13 119 L227 119 L229 125 L11 125Z" fill="#394b3e" stroke="#273c2f"/>
    {paint.map(band => <rect key={band.from} x={13 + band.from * 214} y="120" width={(band.to - band.from) * 214} height="4" fill={band.colour} opacity={band.opacity}/>)}
    <path d="M83 97 L103 71 L107 95 M157 97 L137 71 L133 95" fill="#b9c1aa" stroke="#64745e"/>
    <circle cx="120" cy="108" r="4" fill="#71806b"/><path d="M118 108 L122 108" stroke="#e1e6d4"/>
  </svg>;
}

