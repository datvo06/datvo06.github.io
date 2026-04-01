{% include autumn_stdlib.js %}
{% include autumn_programs.js %}
{% include autumn_renderer.js %}

// ── Homepage inline player ──
const canvas = document.getElementById('autumn-canvas');
const ctx = canvas.getContext('2d');
const select = document.getElementById('autumn-program-select');
const btnReset = document.getElementById('autumn-reset');
const btnPause = document.getElementById('autumn-pause');

let interpreter = null;
let wasmModule = null;
let gridSize = 16;
let fps = 8;
let paused = false;
let animFrameId = null;
let lastStepTime = 0;
let canvasSize = 480;

function resizeCanvas() {
  const wrapper = document.getElementById('autumn-inline-wrapper');
  const w = wrapper.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  canvasSize = w * dpr;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  canvas.style.width = w + 'px';
  canvas.style.height = w + 'px';
  if (interpreter) {
    try { gridSize = renderGrid(ctx, interpreter.renderAll(), canvasSize); } catch(e) {}
  }
}

for (const name of Object.keys(PROGRAMS)) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
}

function loadProgram(name) {
  const code = PROGRAMS[name];
  if (!code || !wasmModule) return;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  try {
    interpreter = new wasmModule.Interpreter();
    interpreter.runScript(code, autumnstdlib, '', BigInt(42));
    fps = interpreter.getFrameRate() || 8;
    paused = false;
    btnPause.textContent = 'Pause';
    gridSize = renderGrid(ctx, interpreter.renderAll(), canvasSize);
    lastStepTime = performance.now();
    gameLoop(performance.now());
  } catch (e) { console.error(e); }
}

function gameLoop(ts) {
  if (!interpreter) return;
  if (!paused) {
    const interval = 1000 / fps;
    if (ts - lastStepTime >= interval) {
      lastStepTime = ts;
      try {
        interpreter.step();
        gridSize = renderGrid(ctx, interpreter.renderAll(), canvasSize);
      } catch (e) { console.error(e); return; }
    }
  }
  animFrameId = requestAnimationFrame(gameLoop);
}

select.addEventListener('change', () => loadProgram(select.value));
btnReset.addEventListener('click', () => loadProgram(select.value));
btnPause.addEventListener('click', () => {
  paused = !paused;
  btnPause.textContent = paused ? 'Resume' : 'Pause';
});

document.addEventListener('keydown', (e) => {
  if (!interpreter) return;
  const actions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (actions[e.key]) {
    e.preventDefault();
    try {
      interpreter[actions[e.key]]();
      interpreter.step();
      gridSize = renderGrid(ctx, interpreter.renderAll(), canvasSize);
    } catch (err) { console.error(err); }
  }
});

canvas.addEventListener('click', (e) => {
  if (!interpreter) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cellSize = canvasSize / gridSize;
  const x = Math.floor((e.clientX - rect.left) * dpr / cellSize);
  const y = Math.floor((e.clientY - rect.top) * dpr / cellSize);
  try {
    interpreter.click(x, y);
    interpreter.step();
    gridSize = renderGrid(ctx, interpreter.renderAll(), canvasSize);
  } catch (err) { console.error(err); }
});

window.addEventListener('resize', resizeCanvas);

async function init() {
  resizeCanvas();
  try {
    const moduleUrl = '{{ "/assets/wasm/interpreter_web.js" | relative_url }}';
    const wasmUrl = '{{ "/assets/wasm/interpreter_web.wasm" | relative_url }}';
    const { default: createInterpreterModule } = await import(moduleUrl);
    wasmModule = await createInterpreterModule({
      locateFile: (path) => path.endsWith('.wasm') ? wasmUrl : path
    });
    loadProgram(select.value);
  } catch (e) {
    console.error('Failed to load Autumn WASM:', e);
  }
}

init();
