// ── Autumn grid renderer (shared) ──
const CSS_COLORS = {
  black:[0,0,0],white:[255,255,255],red:[255,0,0],green:[0,128,0],
  blue:[0,0,255],yellow:[255,255,0],orange:[255,165,0],gray:[128,128,128],
  grey:[128,128,128],purple:[128,0,128],pink:[255,192,203],
  lightblue:[173,216,230],lightpink:[255,182,193],darkblue:[0,0,139],
  darkorange:[255,140,0],gold:[255,215,0],silver:[192,192,192],
  cyan:[0,255,255],magenta:[255,0,255],brown:[165,42,42],
  darkgreen:[0,100,0],lightgreen:[144,238,144],darkred:[139,0,0],
  navy:[0,0,128],teal:[0,128,128],maroon:[128,0,0],olive:[128,128,0],
  aqua:[0,255,255],lime:[0,255,0],coral:[255,127,80],
  salmon:[250,128,114],khaki:[240,230,140],violet:[238,130,238],
  indigo:[75,0,130],crimson:[220,20,60],tomato:[255,99,71],
  turquoise:[64,224,208],skyblue:[135,206,235],steelblue:[70,130,180],
  slategray:[112,128,144],dimgray:[105,105,105],darkgray:[169,169,169],
  lightgray:[211,211,211],deeppink:[255,20,147],hotpink:[255,105,180],
  firebrick:[178,34,34],forestgreen:[34,139,34],seagreen:[46,139,87],
  sienna:[160,82,45],peru:[205,133,63],chocolate:[210,105,30],
  tan:[210,180,140],sandybrown:[244,164,96],wheat:[245,222,179],
  beige:[245,245,220],burlywood:[222,184,135],
  // remaining names from the AutumnBench palette (color_dict.yaml, Zenodo 19498269)
  mediumpurple:[147,112,219],orangered:[255,69,0],lightcyan:[224,255,255],
  darkgrey:[169,169,169],goldenrod:[218,165,32],limegreen:[50,205,50]
};

function parseColor(s) {
  const l = s.toLowerCase().trim();
  if (CSS_COLORS[l]) return CSS_COLORS[l];
  if (l.startsWith('#')) {
    const h = l.slice(1);
    if (h.length === 3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
    if (h.length === 6) return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  const m = l.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [+m[1],+m[2],+m[3]];
  return [0,0,0];
}

function renderGrid(ctx, jsonStr, canvasSize) {
  const parsed = JSON.parse(jsonStr);
  const gridSize = parsed.GRID_SIZE || 16;
  const cellSize = canvasSize / gridSize;

  ctx.clearRect(0, 0, canvasSize, canvasSize);

  // Paint the environment's declared background (e.g. gravity_3 sets "black");
  // benchmark programs rely on it for contrast.
  let bgLight = true;
  if (parsed.background && parsed.background !== 'transparent') {
    const [br, bg, bb] = parseColor(parsed.background);
    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    bgLight = (br + bg + bb) > 382;
  }

  // Subtle grid lines
  ctx.strokeStyle = bgLight ? 'rgba(128,128,128,0.15)' : 'rgba(200,200,210,0.18)';
  ctx.lineWidth = Math.max(0.5, canvasSize / 960);
  for (let i = 0; i <= gridSize; i++) {
    const pos = i * cellSize;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, canvasSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(canvasSize, pos); ctx.stroke();
  }

  // Painter's algorithm, matching the official AutumnBench renderer
  // (MARA python_test_mpl_viz.py adds patches in iteration order): draw
  // entities in renderAll's key order, later keys on top. Key order follows
  // the program's declaration order, so e.g. buoyancy's crate (declared after
  // water) floats visibly ON the water. The old lighter-color-wins merge
  // inverted that and hid dark objects under light ones.
  const inset = Math.max(0.5, cellSize * 0.05);
  for (const key of Object.keys(parsed)) {
    if (key === 'GRID_SIZE' || key === 'background') continue;
    const entities = parsed[key];
    if (!Array.isArray(entities)) continue;
    for (const entity of entities) {
      if (!entity.position || !entity.color) continue;
      // "transparent" is the palette's empty marker; drawing it would show black
      if (entity.color.toLowerCase().trim() === 'transparent') continue;
      const { x, y } = entity.position;
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      const [r, g, b] = parseColor(entity.color);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
      // white/near-white cells are real state (e.g. bbq's unlit fire); outline them
      // so they stay visible on a light background
      if (bgLight && r + g + b > 700) {
        ctx.strokeStyle = 'rgba(100,105,120,0.4)';
        ctx.lineWidth = Math.max(0.5, canvasSize / 960);
        ctx.strokeRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
      }
    }
  }

  return gridSize;
}
