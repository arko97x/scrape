import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Info, Palette, Redo2, RotateCw, Undo2 } from 'lucide-react';
import { Pen, Squeegee, Tube } from './tools';
import type { BladeKind } from './squeegee-geometry';
import type { BladePaintBand } from './blade-paint';
import './dock.css';

export type StudioTool = 'paint' | 'pen' | 'scrape';
export const studioColours = [
  { name: 'Butter', hex: '#e5b84e' }, { name: 'Tomato', hex: '#c55c43' },
  { name: 'Rose', hex: '#d99092' }, { name: 'Lake', hex: '#649295' },
  { name: 'Moss', hex: '#7a8963' }, { name: 'Ink', hex: '#344c5a' },
];

type LabelEvents = {
  onPointerEnter: (event: React.PointerEvent) => void; onPointerLeave: () => void; onPointerDown: () => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void; onBlur: () => void;
};

type Props = {
  tool: StudioTool; open: boolean; onOpen: (open: boolean) => void;
  onSelect: (tool: StudioTool) => void; disabled: boolean;
  paint: string; onPaint: (hex: string) => void;
  penColour: string; penWidth: number;
  onPenColour: (hex: string) => void; onPenWidth: (width: number) => void;
  bladeWidth: number; angle: number; blade: BladeKind; onBlade: (width: number, angle: number, blade?: BladeKind) => void;
  carriedPaint: BladePaintBand[];
  undo: boolean; redo: boolean; onHistory: (action: 'undo' | 'redo') => void;
  onAbout: () => void;
};

const inkColours = [
  { name: 'dark', hex: '#344c5a' }, { name: 'tomato', hex: '#c55c43' },
  { name: 'lake', hex: '#649295' }, { name: 'cream', hex: '#f5f1e5' },
];

/** The rainbow "any colour" swatch shared by the paint palette and the pen inks.
 *  While its colour is in use it shows that colour inside a rainbow ring. */
function CustomColour({ label, value, selected, disabled, onChange, events, tip, describedBy }: {
  label: string; value: string; selected: boolean; disabled: boolean;
  onChange: (hex: string) => void; events: LabelEvents; tip: ReactNode; describedBy: string;
}) {
  // A click opens the picker; only keyboard focus should draw a focus ring.
  const [pointer, setPointer] = useState(false);
  return <label className="dock-colour custom-colour" data-selected={selected} data-pointer={pointer} {...events}
    onPointerDown={() => { events.onPointerDown(); setPointer(true); }} onBlur={() => { events.onBlur(); setPointer(false); }}>
    {selected
      ? <span className="custom-face custom-picked" style={{ '--picked': value } as CSSProperties} aria-hidden="true"/>
      : <Palette className="custom-face" aria-hidden="true"/>}
    <input type="color" aria-label={label} aria-describedby={describedBy} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}/>
    {tip}
  </label>;
}

// Two fixed nibs, like a fineliner pair, instead of a free-form slider.
export const penWidths = [
  { name: 'Thin', width: 2.5, stroke: 1.75 },
  { name: 'Thick', width: 6, stroke: 4.5 },
] as const;

// A plain card pulls paint flat; a comb card's teeth leave ridged stripes.
// The cards are short and wide, so their buttons crop the viewBox to the glyph.
const scraperCards: { kind: BladeKind; name: string; icon: string }[] = [
  { kind: 'flat', name: 'Flat', icon: 'M4 9Q4 7 6 7H18Q20 7 20 9V18H4Z' },
  { kind: 'comb', name: 'Comb', icon: 'M4 9Q4 7 6 7H18Q20 7 20 9V18H18.6V14.5H17.56V18H16.16V14.5H15.13V18H13.73V14.5H12.7V18H11.3V14.5H10.26V18H8.86V14.5H7.83V18H6.43V14.5H5.4V18H4Z' },
];

const toolInfo = [
  { id: 'paint', name: 'Paint', shortcut: 'P' },
  { id: 'pen', name: 'Pen', shortcut: 'N' },
  { id: 'scrape', name: 'Scraper', shortcut: 'S' },
] as const;

export function StudioDock(props: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const [tabStop, setTabStop] = useState('paint');
  const [tooltip, setTooltip] = useState<string | null>(null);
  const lastTooltip = useRef(0);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(tipTimer.current), []);
  const stop = (tabStop === 'undo' && !props.undo) || (tabStop === 'redo' && !props.redo) ? props.tool : tabStop;
  // Delayed mouse labels avoid flashing while crossing the dock. Moving between
  // neighbours is immediate once a label has been shown. Focus labels are instant.
  const hideTip = () => { clearTimeout(tipTimer.current); setTooltip(null); };
  const showTip = (id: string, immediate = false) => {
    clearTimeout(tipTimer.current);
    if (immediate || performance.now() - lastTooltip.current < 700) { setTooltip(id); lastTooltip.current = performance.now(); }
    else tipTimer.current = setTimeout(() => { setTooltip(id); lastTooltip.current = performance.now(); }, 400);
  };
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(bar.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault(); buttons[next]?.focus();
  };
  const closeSettings = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); props.onOpen(false);
    bar.current?.querySelector<HTMLButtonElement>(`[data-tool="${props.tool}"]`)?.focus();
  };
  const labelEvents = (id: string, roving = true): LabelEvents => ({
    onPointerEnter: (event: React.PointerEvent) => { if (event.pointerType === 'mouse' && matchMedia('(hover: hover) and (pointer: fine)').matches) showTip(id); },
    onPointerLeave: hideTip,
    onPointerDown: hideTip,
    onFocus: (event: React.FocusEvent<HTMLElement>) => { if (roving) setTabStop(id); if (event.target.matches(':focus-visible')) showTip(id, true); },
    onBlur: hideTip,
  });
  // Settings controls share the dock's labels but sit outside its arrow-key toolbar.
  const settingLabel = (id: string, name: string) => ({ events: labelEvents(id, false), tip: tip(id, name), describedBy: `tip-${id}` });
  const tip = (id: string, name: string, shortcut?: string) => <span id={`tip-${id}`} className="dock-tip" role="tooltip" aria-hidden={tooltip !== id} data-visible={tooltip === id}>{name}{shortcut && <kbd>{shortcut}</kbd>}</span>;

  return <div className="studio-dock" data-settings={props.open ? 'open' : 'closed'}>
    <div id="tool-settings" className="dock-settings" data-tool={props.tool} data-open={props.open} inert={!props.open} aria-hidden={!props.open} onKeyDown={closeSettings}>
      <div className="dock-settings-page" hidden={props.tool !== 'paint'} role="group" aria-label="Paint settings">
        <div className="dock-palette">
          {studioColours.map(item => { const label = settingLabel(`paint-${item.hex}`, item.name); return <button key={item.hex} className="paint-swatch" aria-label={`Use ${item.name} paint`} aria-describedby={label.describedBy} aria-pressed={props.paint === item.hex} disabled={props.disabled} {...label.events} onClick={() => props.onPaint(item.hex)}><span className="swatch-dot" style={{ background: item.hex }} aria-hidden="true"/>{label.tip}</button>; })}
          <CustomColour label="Choose a custom paint colour" value={props.paint} selected={!studioColours.some(item => item.hex === props.paint)} disabled={props.disabled} onChange={props.onPaint} {...settingLabel('paint-custom', 'Any colour')}/>
        </div>
      </div>
      <div className="dock-settings-page" hidden={props.tool !== 'pen'} role="group" aria-label="Pen settings">
        <div className="dock-choices" role="group" aria-label="Line width">{penWidths.map(item => { const label = settingLabel(`nib-${item.name}`, item.name); return <button key={item.name} className="dock-choice" aria-label={`${item.name} line`} aria-describedby={label.describedBy} aria-pressed={props.penWidth === item.width} disabled={props.disabled} {...label.events} onClick={() => props.onPenWidth(item.width)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c2-6 4.5-8 6.5-4.5s3.5 6.5 6 1.5S19.5 7 20 9" fill="none" stroke="currentColor" strokeWidth={item.stroke} strokeLinecap="round" strokeLinejoin="round"/></svg>{label.tip}</button>; })}</div>
        <div className="ink-swatches" role="group" aria-label="Ink colours">{inkColours.map(item => { const label = settingLabel(`ink-${item.hex}`, `${item.name[0].toUpperCase()}${item.name.slice(1)} ink`); return <button key={item.hex} className="paint-swatch" aria-label={`Use ${item.name} ink`} aria-describedby={label.describedBy} aria-pressed={props.penColour === item.hex} disabled={props.disabled} {...label.events} onClick={() => props.onPenColour(item.hex)}><span className="swatch-dot" style={{ background: item.hex }} aria-hidden="true"/>{label.tip}</button>; })}<CustomColour label="Choose a custom ink colour" value={props.penColour} selected={!inkColours.some(item => item.hex === props.penColour)} disabled={props.disabled} onChange={props.onPenColour} {...settingLabel('ink-custom', 'Any colour')}/></div>
      </div>
      <div className="dock-settings-page" hidden={props.tool !== 'scrape'} role="group" aria-label="Scraper settings">
        <div className="dock-choices" role="group" aria-label="Scraper card">{scraperCards.map(item => { const label = settingLabel(`card-${item.kind}`, item.name); return <button key={item.kind} className="dock-choice" aria-label={`${item.name} scraper`} aria-describedby={label.describedBy} aria-pressed={props.blade === item.kind} disabled={props.disabled} {...label.events} onClick={() => props.onBlade(props.bladeWidth, props.angle, item.kind)}><svg className="card-icon" viewBox="3 4.5 18 16" aria-hidden="true"><path d={item.icon} fill="currentColor" stroke="currentColor" strokeWidth=".8" strokeLinejoin="round"/></svg>{label.tip}</button>; })}</div>
        <div className="settings-actions">
          <button className="dock-action turn-action" aria-label={`Turn blade ${props.angle}°`} aria-describedby="tip-turn" disabled={props.disabled} {...labelEvents('turn', false)} onClick={() => props.onBlade(props.bladeWidth, props.angle === 0 ? 90 : 0)}><RotateCw className="ui-icon" aria-hidden="true"/><span className="rotation-label">Turn</span><span className="angle-value">{props.angle}°</span>{tip('turn', 'Turn the card')}</button>
        </div>
      </div>
    </div>

    <div ref={bar} className="dock-bar" role="toolbar" aria-label="Painting tools" onKeyDown={navigate} onPointerLeave={hideTip}>
      <div className="dock-tools">
        {toolInfo.map(item => <button key={item.id} className={`dock-tool dock-${item.id}`} data-tool={item.id} aria-label={`Pick up ${item.name.toLowerCase()}`} aria-pressed={props.tool === item.id} aria-keyshortcuts={item.shortcut} aria-describedby={`tip-${item.id}`} tabIndex={stop === item.id ? 0 : -1} disabled={props.disabled} {...labelEvents(item.id)} onClick={() => { hideTip(); if (props.tool === item.id) props.onOpen(!props.open); else props.onSelect(item.id); }}>
          <span className="dock-object-window"><span className="dock-object">{item.id === 'paint' ? <Tube colour={props.paint}/> : item.id === 'pen' ? <Pen colour={props.penColour}/> : <Squeegee paint={props.carriedPaint} blade={props.blade}/>}</span></span>
          <span className="dock-tool-name" aria-hidden="true">{item.name}</span>
          {tip(item.id, item.name, item.shortcut)}
        </button>)}
      </div>
      <div className="dock-history">
        {(['undo', 'redo'] as const).map(action => <button key={action} className="dock-icon" aria-label={action === 'undo' ? 'Undo' : 'Redo'} aria-describedby={`tip-${action}`} disabled={props.disabled || !props[action]} tabIndex={stop === action ? 0 : -1} {...labelEvents(action)} onClick={() => { hideTip(); props.onHistory(action); }}>{action === 'undo' ? <Undo2 className="ui-icon" aria-hidden="true"/> : <Redo2 className="ui-icon" aria-hidden="true"/>}{tip(action, action === 'undo' ? 'Undo' : 'Redo')}</button>)}
      </div>
      <button className="dock-icon settings-toggle" aria-label={props.open ? 'Hide tool settings' : 'Show tool settings'} aria-expanded={props.open} aria-controls="tool-settings" disabled={props.disabled} tabIndex={stop === 'settings' ? 0 : -1} {...labelEvents('settings')} onClick={() => { hideTip(); props.onOpen(!props.open); }}>{props.open ? <ChevronDown className="ui-icon" aria-hidden="true"/> : <ChevronUp className="ui-icon" aria-hidden="true"/>}{tip('settings', props.open ? 'Hide settings' : 'Show settings')}</button>
      <span className="dock-divider" aria-hidden="true"/>
      <button className="dock-icon about-toggle" aria-label="About Scrape" aria-haspopup="dialog" tabIndex={stop === 'about' ? 0 : -1} {...labelEvents('about')} onClick={() => { hideTip(); props.onAbout(); }}><Info className="ui-icon" aria-hidden="true"/>{tip('about', 'About')}</button>
    </div>
  </div>;
}
