import { useId } from 'react';
import type { BladePaintBand } from './blade-paint';
import { combGaps, squeegeeGeometry, type BladeKind } from './squeegee-geometry';

// One photographic atlas keeps the overhead camera and upper-left light
// consistent. Each crop puts the exposed nozzle at (100, 494), including
// the applicator, whose extrusion connects that nozzle to the deposit point.
const tubeSprites: Record<string, { tipX: number; bottom: number }> = {
  '#e5b84e': { tipX: 311, bottom: 489 },
  '#c55c43': { tipX: 615, bottom: 489 },
  '#d99092': { tipX: 918, bottom: 489 },
  '#649295': { tipX: 1226, bottom: 491 },
  '#7a8963': { tipX: 310, bottom: 1003 },
  '#344c5a': { tipX: 616, bottom: 1001 },
};
const customTube = { tipX: 917, bottom: 1001 };

export function TubeArtwork({ colour }: { colour: string }) {
  const sprite = tubeSprites[colour.toLowerCase()] ?? customTube;
  const custom = sprite === customTube;
  const x = 100 - sprite.tipX;
  const y = 494 - sprite.bottom;
  return <>
    <image href="/tools/paint-tubes-overhead.png" width="1536" height="1024" x={x} y={y}/>
    {custom && <path d={`M${843 + x} ${717 + y} Q${861 + x} ${712 + y} ${881 + x} ${716 + y} L${923 + x} ${718 + y} Q${958 + x} ${713 + y} ${994 + x} ${720 + y} L${994 + x} ${794 + y} Q${963 + x} ${791 + y} ${936 + x} ${795 + y} L${877 + x} ${791 + y} L${845 + x} ${795 + y}Z`} fill={colour} style={{ mixBlendMode: 'multiply' }}/>}
  </>;
}

export function Tube({ colour }: { colour: string }) {
  return <svg viewBox="0 0 200 500" className="tube-art" aria-hidden="true" focusable="false" style={{ isolation: 'isolate' }}><TubeArtwork colour={colour}/></svg>;
}

export function Pen({ colour }: { colour: string }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 44 250" className="pen-art" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-barrel`}><stop stopColor="#172125"/><stop offset=".3" stopColor="#505b60"/><stop offset=".55" stopColor="#303a3f"/><stop offset="1" stopColor="#151d20"/></linearGradient>
      <linearGradient id={`${id}-steel`}><stop stopColor="#7c817b"/><stop offset=".35" stopColor="#ece9dc"/><stop offset=".7" stopColor="#adb1a8"/><stop offset="1" stopColor="#696f68"/></linearGradient>
    </defs>
    <path d="M14 15 Q14 7 22 7 Q30 7 30 15V203L27 225H17L14 203Z" fill={`url(#${id}-barrel)`} stroke="#172125" strokeWidth=".6"/>
    <path d="M15 22H29M15 49H29M15 200H29" stroke="#929a90" strokeOpacity=".45"/>
    <rect x="15" y="54" width="14" height="9" rx="1" fill={colour}/>
    <path d="M16 66V178" stroke="#cbd0c5" strokeWidth=".7" opacity=".26"/>
    <path d="M27 16Q33 16 33 22V58Q32 62 29 62V21" fill={`url(#${id}-steel)`} stroke="#737c74" strokeWidth=".5"/>
    <path d="M17 217H27L25 235H19Z" fill={`url(#${id}-steel)`} stroke="#626d67" strokeWidth=".5"/>
    <path d="M20 234H24L23 244H21Z" fill={colour} stroke="#172125" strokeWidth=".6"/>
    <path d="M18 207H26M18 211H26M19 215H25" stroke="#a3aaa1" strokeWidth=".7" opacity=".4"/>
  </svg>;
}

export function Squeegee({ paint = [], pose = 'resting', blade = 'flat' }: { paint?: BladePaintBand[]; pose?: 'resting' | 'working'; blade?: BladeKind }) {
  const id = useId().replace(/:/g, '');
  const { width, height, bladeLeft, bladeRight, contactY, edgeThickness } = squeegeeGeometry;
  const bladeWidth = bladeRight - bladeLeft;
  const working = pose === 'working';
  // A comb card has notches cut up into its working edge between the teeth.
  const notchDepth = 100;
  const notches = blade === 'comb' ? combGaps.map(([from, to]) => [bladeLeft + from * bladeWidth, bladeLeft + to * bladeWidth]) : [];
  const notchRound = 10;
  const notchPath = (x1: number, x2: number) => `M${x1} ${contactY + 60}V${contactY - notchDepth + notchRound}Q${x1} ${contactY - notchDepth} ${x1 + notchRound} ${contactY - notchDepth}H${x2 - notchRound}Q${x2} ${contactY - notchDepth} ${x2} ${contactY - notchDepth + notchRound}V${contactY + 60}`;
  const cut = notches.length ? `url(#${id}-notches)` : undefined;
  return <svg viewBox={`0 0 ${width} ${height}`} className={`squeegee-art${working ? ' working-card' : ''}`} data-pose={pose} aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={`${id}-lip`}>{working ? <rect x={bladeLeft} y={contactY} width={bladeWidth} height={edgeThickness} rx="8"/> : <path d={`M${bladeLeft} ${contactY - 80} L${bladeRight} ${contactY - 80} L${bladeRight} ${contactY} L${bladeLeft} ${contactY}Z`}/>}</clipPath>
      <linearGradient id={`${id}-rubber-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#c39827"/><stop offset=".18" stopColor="#f4d169"/><stop offset=".38" stopColor="#e4bc4a"/><stop offset=".76" stopColor="#d6ac37"/><stop offset="1" stopColor="#98751f"/>
      </linearGradient>
      <linearGradient id={`${id}-edge-light`}>
        <stop stopColor="#fff3bc" stopOpacity=".6"/><stop offset=".65" stopColor="#fff3bc" stopOpacity=".18"/><stop offset="1" stopColor="#fff3bc" stopOpacity="0"/>
      </linearGradient>
      <filter id={`${id}-rubber-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".4" numOctaves="2" seed="7"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
      {notches.length > 0 && <mask id={`${id}-notches`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
        <rect width={width} height={height} fill="#fff"/>
        {notches.map(([x1, x2]) => <path key={x1} d={`${notchPath(x1, x2)}Z`} fill="#000"/>)}
      </mask>}
      <linearGradient id={`${id}-wet`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#fff" stopOpacity=".04"/><stop offset=".22" stopColor="#fff" stopOpacity=".28"/><stop offset=".5" stopColor="#fff" stopOpacity=".05"/><stop offset="1" stopColor="#000" stopOpacity=".28"/>
      </linearGradient>
    </defs>
    <g mask={cut}>
    {working ? <g data-profile="perpendicular-overhead" clipPath={`url(#${id}-lip)`}>
      <rect x={bladeLeft} y={contactY} width={bladeWidth} height={edgeThickness} fill={`url(#${id}-rubber-edge)`}/>
      <rect x={bladeLeft} y={contactY} width={bladeWidth} height={edgeThickness} filter={`url(#${id}-rubber-grain)`}/>
      <path d={`M${bladeLeft + 12} ${contactY + 4}H${bladeRight - 12}`} stroke={`url(#${id}-edge-light)`} strokeWidth="2" strokeLinecap="round"/>
    </g> : <image href="/tools/rubber-card-overhead.png" width={width} height={height}/>}
    {/* Carried paint sits on the lower face, hidden while the card is upright.
        Laying it down in the tray reveals that stained face. */}
    {!working && <g clipPath={`url(#${id}-lip)`}>
      {paint.map(band => {
        const x = bladeLeft + band.from * bladeWidth;
        const w = (band.to - band.from) * bladeWidth;
        const h = 12 + band.opacity * 28;
        const y = contactY - h;
        return <g key={band.from} opacity={band.opacity}>
          <rect data-paint-band="" x={x} y={y} width={w} height={h} fill={band.colour}/>
          <path d={`M${x} ${y}H${x + w}V${y + h}H${x}Z`} fill={`url(#${id}-wet)`}/>
        </g>;
      })}
    </g>}
    {/* A darker line along each cut gives the notches a moulded rubber edge. */}
    {!working && notches.map(([x1, x2]) => <path key={x1} d={notchPath(x1, x2)} fill="none" stroke="#9a7520" strokeOpacity=".55" strokeWidth="7"/>)}
    </g>
  </svg>;
}

