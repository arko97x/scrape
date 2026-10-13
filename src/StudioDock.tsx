import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Info, Palette, Redo2, RotateCw, Undo2 } from 'lucide-react';
import { Pen, Squeegee, Tube } from './tools';
import type { BladePaintBand } from './blade-paint';
import './dock.css';

export type StudioTool = 'paint' | 'pen' | 'scrape';
export const studioColours = [
  { name: 'Butter', hex: '#e5b84e' }, { name: 'Tomato', hex: '#c55c43' },
  { name: 'Rose', hex: '#d99092' }, { name: 'Lake', hex: '#649295' },
  { name: 'Moss', hex: '#7a8963' }, { name: 'Ink', hex: '#344c5a' },
];

type Props = {
  tool: StudioTool; open: boolean; onOpen: (open: boolean) => void;
  onSelect: (tool: StudioTool) => void; disabled: boolean;
  paint: string; onPaint: (hex: string) => void;
  penColour: string; penWidth: number;
  onPenColour: (hex: string) => void; onPenWidth: (width: number) => void;
  bladeWidth: number; angle: number; onBlade: (width: number, angle: number) => void;
  carriedPaint: BladePaintBand[];
  undo: boolean; redo: boolean; onHistory: (action: 'undo' | 'redo') => void;
  about: boolean; onAbout: () => void;
};

// Two fixed nibs, like a fineliner pair, instead of a free-form slider.
export const penWidths = [
  { name: 'Thin', width: 2.5, stroke: 1.75 },
  { name: 'Thick', width: 6, stroke: 4.5 },
] as const;

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
  const labelEvents = (id: string) => ({
    onPointerEnter: (event: React.PointerEvent) => { if (event.pointerType === 'mouse' && matchMedia('(hover: hover) and (pointer: fine)').matches) showTip(id); },
    onPointerLeave: hideTip,
    onPointerDown: hideTip,
    onFocus: (event: React.FocusEvent<HTMLButtonElement>) => { setTabStop(id); if (event.currentTarget.matches(':focus-visible')) showTip(id, true); },
    onBlur: hideTip,
  });
  const tip = (id: string, name: string, shortcut?: string) => <span id={`tip-${id}`} className="dock-tip" role="tooltip" aria-hidden={tooltip !== id} data-visible={tooltip === id}>{name}{shortcut && <kbd>{shortcut}</kbd>}</span>;

  return <div className="studio-dock">
    <div id="tool-settings" className="dock-settings" data-tool={props.tool} data-open={props.open} inert={!props.open} aria-hidden={!props.open} onKeyDown={closeSettings}>
      <div className="dock-settings-page" hidden={props.tool !== 'paint'} role="group" aria-label="Paint settings">
        <div className="dock-palette">
          {studioColours.map(item => <button key={item.hex} className="paint-swatch" title={`${item.name} paint`} aria-label={`Use ${item.name} paint`} aria-pressed={props.paint === item.hex} disabled={props.disabled} onClick={() => props.onPaint(item.hex)}><span style={{ background: item.hex }} aria-hidden="true"/></button>)}
          <label className="dock-colour custom-paint" data-selected={!studioColours.some(item => item.hex === props.paint)} title="Custom paint colour"><Palette aria-hidden="true"/><input type="color" aria-label="Choose a custom paint colour" value={props.paint} disabled={props.disabled} onChange={event => props.onPaint(event.target.value)}/></label>
        </div>
      </div>
      <div className="dock-settings-page" hidden={props.tool !== 'pen'} role="group" aria-label="Pen settings">
        <div className="pen-widths" role="group" aria-label="Line width">{penWidths.map(item => <button key={item.name} className="pen-width" title={item.name} aria-label={`${item.name} line`} aria-pressed={props.penWidth === item.width} disabled={props.disabled} onClick={() => props.onPenWidth(item.width)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c2-6 4.5-8 6.5-4.5s3.5 6.5 6 1.5S19.5 7 20 9" fill="none" stroke="currentColor" strokeWidth={item.stroke} strokeLinecap="round" strokeLinejoin="round"/></svg></button>)}</div>
        <div className="ink-swatches" role="group" aria-label="Ink colours">{['#344c5a', '#c55c43', '#649295', '#f5f1e5'].map((hex, index) => <button key={hex} className="ink-swatch" aria-label={`Use ${['dark', 'tomato', 'lake', 'cream'][index]} ink`} aria-pressed={props.penColour === hex} disabled={props.disabled} onClick={() => props.onPenColour(hex)}><i style={{ background: hex }} aria-hidden="true"/></button>)}</div>
        <label className="dock-colour custom-ink" style={{ background: props.penColour }}><Palette aria-hidden="true"/><input type="color" aria-label="Choose pen ink colour" value={props.penColour} disabled={props.disabled} onChange={event => props.onPenColour(event.target.value)}/></label>
      </div>
      <div className="dock-settings-page" hidden={props.tool !== 'scrape'} role="group" aria-label="Scraper settings">
        <div className="dock-width"><label htmlFor="blade-width">Blade width <output>{Math.round(props.bladeWidth / 480 * 100)}%</output></label><input id="blade-width" type="range" min="50" max="180" step="10" value={props.bladeWidth} style={{ '--range-progress': `${(props.bladeWidth - 50) / 130 * 100}%` } as React.CSSProperties} disabled={props.disabled} onChange={event => props.onBlade(Number(event.target.value), props.angle)}/></div>
        <div className="settings-actions">
          <button className="dock-action turn-action" aria-label={`Turn blade ${props.angle}°`} title="Turn blade" disabled={props.disabled} onClick={() => props.onBlade(props.bladeWidth, props.angle === 0 ? 90 : 0)}><RotateCw className="ui-icon" aria-hidden="true"/><span className="rotation-label">Turn</span><span className="angle-value">{props.angle}°</span></button>
        </div>
      </div>
    </div>

    <div ref={bar} className="dock-bar" role="toolbar" aria-label="Painting tools" onKeyDown={navigate} onPointerLeave={hideTip}>
      <div className="dock-tools">
        {toolInfo.map(item => <button key={item.id} className={`dock-tool dock-${item.id}`} data-tool={item.id} aria-label={`Pick up ${item.name.toLowerCase()}`} aria-pressed={props.tool === item.id} aria-keyshortcuts={item.shortcut} aria-describedby={`tip-${item.id}`} tabIndex={stop === item.id ? 0 : -1} disabled={props.disabled} {...labelEvents(item.id)} onClick={() => { hideTip(); if (props.tool === item.id) props.onOpen(!props.open); else props.onSelect(item.id); }}>
          <span className="dock-object-window"><span className="dock-object">{item.id === 'paint' ? <Tube colour={props.paint}/> : item.id === 'pen' ? <Pen colour={props.penColour}/> : <Squeegee paint={props.carriedPaint}/>}</span></span>
          {tip(item.id, item.name, item.shortcut)}
        </button>)}
      </div>
      <div className="dock-history">
        {(['undo', 'redo'] as const).map(action => <button key={action} className="dock-icon" aria-label={action === 'undo' ? 'Undo' : 'Redo'} aria-describedby={`tip-${action}`} disabled={props.disabled || !props[action]} tabIndex={stop === action ? 0 : -1} {...labelEvents(action)} onClick={() => { hideTip(); props.onHistory(action); }}>{action === 'undo' ? <Undo2 className="ui-icon" aria-hidden="true"/> : <Redo2 className="ui-icon" aria-hidden="true"/>}{tip(action, action === 'undo' ? 'Undo' : 'Redo')}</button>)}
      </div>
      <button className="dock-icon settings-toggle" aria-label={props.open ? 'Hide tool settings' : 'Show tool settings'} aria-expanded={props.open} aria-controls="tool-settings" disabled={props.disabled} tabIndex={stop === 'settings' ? 0 : -1} {...labelEvents('settings')} onClick={() => { hideTip(); props.onOpen(!props.open); }}>{props.open ? <ChevronDown className="ui-icon" aria-hidden="true"/> : <ChevronUp className="ui-icon" aria-hidden="true"/>}{tip('settings', props.open ? 'Hide settings' : 'Show settings')}</button>
      <span className="dock-divider" aria-hidden="true"/>
      <button className="dock-icon about-toggle" aria-label="About Scrape" aria-expanded={props.about} aria-controls="about-scrape" tabIndex={stop === 'about' ? 0 : -1} {...labelEvents('about')} onClick={() => { hideTip(); props.onAbout(); }}><Info className="ui-icon" aria-hidden="true"/>{tip('about', 'About')}</button>
    </div>
  </div>;
}
