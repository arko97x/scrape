import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { PaintEngine, PaintHistory } from '../src/engine.ts';
import { bladePaint } from '../src/blade-paint.ts';
import { Squeegee } from '../src/tools.tsx';

const stains = (engine: PaintEngine) => Array.from(renderToStaticMarkup(createElement(Squeegee, { paint: bladePaint(engine) })).matchAll(/<rect\b[^>]*fill="([^"]*)"/g), match => match[1]);

test('the squeegee shows only the picked-up pigment; wipe and undo restore its true state', () => {
  const engine = new PaintEngine(140, 180), history = new PaintHistory(engine);
  assert.deepEqual(stains(engine), []);
  engine.deposit({ x: 70, y: 40 }, [197 / 255, 92 / 255, 67 / 255], 9, 220);
  engine.beginScrape({ x: 70, y: 20 }); engine.scrape({ x: 70, y: 100 }); engine.endScrape();
  const loaded = bladePaint(engine);
  assert.ok(loaded.length > 0);
  assert.deepEqual(new Set(stains(engine)), new Set(['rgb(197, 92, 67)']));
  history.checkpoint(); engine.cleanBlade();
  assert.deepEqual(stains(engine), []);
  history.undo(); assert.deepEqual(bladePaint(engine), loaded);
  history.redo(); assert.deepEqual(stains(engine), []);
});

test('different picked-up pigments stay at their actual positions along the displayed blade', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(65, 0);
  engine.deposit({ x: 52, y: 40 }, [1, 0, 0], 7, 150);
  engine.deposit({ x: 86, y: 40 }, [0, 0, 1], 7, 150);
  engine.beginScrape({ x: 70, y: 20 }); engine.scrape({ x: 70, y: 100 }); engine.endScrape();
  const bands = bladePaint(engine);
  const left = bands.find(band => band.from <= .22 && band.to > .22), right = bands.find(band => band.from <= .75 && band.to > .75);
  assert.equal(left?.colour, 'rgb(255, 0, 0)');
  assert.equal(right?.colour, 'rgb(0, 0, 255)');
  assert.deepEqual(new Set(stains(engine)), new Set(['rgb(255, 0, 0)', 'rgb(0, 0, 255)']));
});
