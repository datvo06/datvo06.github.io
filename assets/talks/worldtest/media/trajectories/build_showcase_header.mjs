#!/usr/bin/env node
// Header GIF for the WorldTest blog post: run the same 20 AutumnBench
// environments as the post's live grid, drive them with the embed's random
// action stream, and rasterize each step into a 10x2 banner of tiles.
// Emits raw RGB frames to /tmp/showcase_frames.bin; a PIL step assembles
// the GIF. Run from the repo root: node assets/talks/worldtest/media/trajectories/build_showcase_header.mjs
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const src = ['autumn_stdlib.js', 'autumn_programs.js', 'autumn_renderer.js']
  .map((f) => readFileSync(`${ROOT}/_includes/${f}`, 'utf8')).join('\n;\n');
const { PROGRAMS, autumnstdlib, parseColor } = new Function(
  src + '\n;return { PROGRAMS, autumnstdlib, parseColor };')();

// Same set and order as the blog's grid of iframes
const GRID = ['ants', 'BBQ', 'bottle', 'buoyancy', 'coins', 'disease', 'gravity',
  'Gravity 3', 'grow', 'hatch', 'ice', 'lights', 'magnets', 'Mario', 'paint',
  'particles', 'sand', 'space_invaders', 'waterplug', 'wind'];

const TILE = 120, GAP = 6, COLS = 10, ROWS = 2;
const W = GAP + COLS * (TILE + GAP);           // 1266
const H = GAP + ROWS * (TILE + GAP);           // 258
const GAP_RGB = [24, 28, 36];

const { default: createInterpreterModule } = await import(
  pathToFileURL(`${ROOT}/assets/wasm/interpreter_web.js`).href);
const mod = await createInterpreterModule({
  locateFile: (p) => p.endsWith('.wasm') ? `${ROOT}/assets/wasm/interpreter_web.wasm` : p,
});

const envs = GRID.map((name) => {
  const it = new mod.Interpreter();
  it.runScript(PROGRAMS[name], autumnstdlib, '', BigInt(42));
  return { name, it, grid: 16, dead: false, last: null };
});

function fillRect(buf, x0, y0, x1, y1, rgb) {
  for (let y = y0; y < y1; y++) {
    let o = (y * W + x0) * 3;
    for (let x = x0; x < x1; x++) { buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2]; o += 3; }
  }
}

function drawTile(buf, ox, oy, env) {
  // bg=black, as in the blog embeds (the benchmark's canonical background)
  fillRect(buf, ox, oy, ox + TILE, oy + TILE, [0, 0, 0]);
  const parsed = env.last;
  if (!parsed) return;
  const grid = parsed.GRID_SIZE || 16;
  env.grid = grid;
  const cell = TILE / grid;
  if (parsed.background && parsed.background !== 'transparent') {
    fillRect(buf, ox, oy, ox + TILE, oy + TILE, parseColor(parsed.background));
  }
  const inset = cell * 0.06;
  for (const key of Object.keys(parsed)) {
    if (key === 'GRID_SIZE' || key === 'background') continue;
    const entities = parsed[key];
    if (!Array.isArray(entities)) continue;
    for (const e of entities) {
      if (!e.position || !e.color) continue;
      if (e.color.toLowerCase().trim() === 'transparent') continue;
      const { x, y } = e.position;
      if (x < 0 || x >= grid || y < 0 || y >= grid) continue;
      const x0 = ox + Math.round(x * cell + inset), x1 = ox + Math.round((x + 1) * cell - inset);
      const y0 = oy + Math.round(y * cell + inset), y1 = oy + Math.round((y + 1) * cell - inset);
      fillRect(buf, x0, y0, Math.max(x0 + 1, x1), Math.max(y0 + 1, y1), parseColor(e.color));
    }
  }
}

const dirs = ['left', 'right', 'up', 'down'];
function act(env) {
  // mirror the embed's auto stream: ~45% clicks, otherwise a random arrow;
  // buoyancy (autoclick=top) only ever clicks the top row
  const top = env.name === 'buoyancy';
  if (top || Math.random() < 0.45) {
    let x = Math.floor(Math.random() * env.grid);
    let y = top ? 0 : Math.floor(Math.random() * env.grid);
    // EAGER worlds respond to clicks on their objects, not empty cells:
    // aim at a random occupied cell from the last rendered state
    if (EAGER.has(env.name) && env.last) {
      const cells = [];
      for (const k of Object.keys(env.last)) {
        if (k === 'GRID_SIZE' || k === 'background' || !Array.isArray(env.last[k])) continue;
        for (const e of env.last[k]) if (e.position) cells.push(e.position);
      }
      if (cells.length) { const c = cells[Math.floor(Math.random() * cells.length)]; x = c.x; y = c.y; }
    }
    env.it.click(x, y);
  } else {
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    if (typeof env.it[d] === 'function') env.it[d]();
  }
}

// click-driven worlds whose dynamics stall without frequent input
const EAGER = new Set(['bottle', 'hatch', 'magnets']);
function stepAll(withActions) {
  for (const env of envs) {
    if (env.dead) continue;
    try {
      if (withActions && Math.random() < (EAGER.has(env.name) ? 0.8 : 0.3)) act(env);
      env.it.step();
      env.last = JSON.parse(env.it.renderAll());
    } catch (err) {
      console.error(`${env.name} died: ${err.message}`); env.dead = true;
    }
  }
}

for (let i = 0; i < 12; i++) stepAll(true);   // warm-up so worlds are underway

const OUT = '/tmp/showcase_frames.bin';
writeFileSync(OUT, Buffer.alloc(0));
const FRAMES = 90;
const frame = Buffer.alloc(W * H * 3);
for (let f = 0; f < FRAMES; f++) {
  stepAll(true);
  fillRect(frame, 0, 0, W, H, GAP_RGB);
  envs.forEach((env, i) => {
    const ox = GAP + (i % COLS) * (TILE + GAP);
    const oy = GAP + Math.floor(i / COLS) * (TILE + GAP);
    drawTile(frame, ox, oy, env);
  });
  appendFileSync(OUT, frame);
}
console.log(JSON.stringify({ W, H, FRAMES, dead: envs.filter(e => e.dead).map(e => e.name) }));
