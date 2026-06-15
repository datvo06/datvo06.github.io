#!/usr/bin/env python3
"""Render a real human (reset-and-replay) vs model (single run) side-by-side
GIF on the AutumnBench `mario` planning environment.

Human trajectory: HF datvo06/autumnbench-trajectories  json/human/mario.json
  (5 segments == the human resetting and re-running the task).
Model trajectory: local MARA mirror
  adversarial_solver_results_trajectory_raw/mario/planning/real_env_observations.json
  (one uninterrupted run: reset, then up/right/left/click navigation).

Rasterizer matches _includes/autumn_renderer.js: same CSS color map, faint grid
lines, inset cell rects, lighter-color-wins on cell collisions. Mario's true
background is black (confirmed from the model raw render), so both panels render
entities on black for visual consistency.
"""
import json, os, re, urllib.request, hashlib
from PIL import Image, ImageDraw, ImageFont

OUT_GIF = os.path.join(os.path.dirname(__file__), "mario_human_vs_model.gif")
MONTAGE = os.path.join(os.path.dirname(__file__), "_verify_montage.png")
MARA = "/Users/datnguyen/Marc/MARA"

# ── color map copied verbatim from _includes/autumn_renderer.js ──
CSS_COLORS = {
 "black":(0,0,0),"white":(255,255,255),"red":(255,0,0),"green":(0,128,0),
 "blue":(0,0,255),"yellow":(255,255,0),"orange":(255,165,0),"gray":(128,128,128),
 "grey":(128,128,128),"purple":(128,0,128),"pink":(255,192,203),
 "lightblue":(173,216,230),"lightpink":(255,182,193),"darkblue":(0,0,139),
 "darkorange":(255,140,0),"gold":(255,215,0),"silver":(192,192,192),
 "cyan":(0,255,255),"magenta":(255,0,255),"brown":(165,42,42),
 "darkgreen":(0,100,0),"lightgreen":(144,238,144),"darkred":(139,0,0),
 "navy":(0,0,128),"teal":(0,128,128),"maroon":(128,0,0),"olive":(128,128,0),
 "aqua":(0,255,255),"lime":(0,255,0),"coral":(255,127,80),
 "salmon":(250,128,114),"khaki":(240,230,140),"violet":(238,130,238),
 "indigo":(75,0,130),"crimson":(220,20,60),"tomato":(255,99,71),
 "turquoise":(64,224,208),"skyblue":(135,206,235),"steelblue":(70,130,180),
 "slategray":(112,128,144),"dimgray":(105,105,105),"darkgray":(169,169,169),
 "lightgray":(211,211,211),"deeppink":(255,20,147),"hotpink":(255,105,180),
 "firebrick":(178,34,34),"forestgreen":(34,139,34),"seagreen":(46,139,87),
 "sienna":(160,82,45),"peru":(205,133,63),"chocolate":(210,105,30),
 "tan":(210,180,140),"sandybrown":(244,164,96),"wheat":(245,222,179),
 "beige":(245,245,220),"burlywood":(222,184,135),"mediumpurple":(147,112,219),
}
def parse_color(s):
    l = s.lower().strip()
    if l in CSS_COLORS: return CSS_COLORS[l]
    if l.startswith("#"):
        h=l[1:]
        if len(h)==3: return tuple(int(h[i]*2,16) for i in range(3))
        if len(h)==6: return tuple(int(h[i:i+2],16) for i in (0,2,4))
    m=re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", l)
    if m: return (int(m[1]),int(m[2]),int(m[3]))
    return (0,0,0)

CANVAS = 300
BG = (8,8,10)         # mario background is black; nudge off pure-black so grid reads
GRID_LINE = (44,44,50)

def _font(sz):
    for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/System/Library/Fonts/Supplemental/Arial.ttf",
              "/Library/Fonts/Arial.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

def base_canvas(grid):
    img = Image.new("RGB",(CANVAS,CANVAS),BG)
    d = ImageDraw.Draw(img)
    cell = CANVAS/grid
    for i in range(grid+1):
        p=round(i*cell)
        d.line([(p,0),(p,CANVAS)],fill=GRID_LINE)
        d.line([(0,p),(CANVAS,p)],fill=GRID_LINE)
    return img,d,cell

def draw_cells(d, cell, cells):
    inset=max(0.5,cell*0.05)
    for (x,y),rgb in cells.items():
        x0=x*cell+inset; y0=y*cell+inset
        d.rectangle([x0,y0,x0+cell-2*inset,y0+cell-2*inset],fill=rgb)

def entity_cells(obs):
    """Human entity-JSON observation -> {(x,y):rgb}, lighter color wins on tie."""
    grid=obs.get("GRID_SIZE",12)
    best={}  # (x,y) -> (rgb, bias)
    for k,v in obs.items():
        if k in ("GRID_SIZE","background") or not isinstance(v,list): continue
        for e in v:
            if not isinstance(e,dict): continue
            pos=e.get("position"); col=e.get("color")
            if not pos or not col: continue
            x,y=pos.get("x"),pos.get("y")
            if x is None or y is None or not(0<=x<grid and 0<=y<grid): continue
            rgb=parse_color(col); bias=sum(rgb)
            if (x,y) not in best or bias>best[(x,y)][1]:
                best[(x,y)]=(rgb,bias)
    return grid, {k:v[0] for k,v in best.items()}

def raw_cells(render, grid):
    """Model raw render string -> {(x,y):rgb}; skip black background cells."""
    toks=render.replace("\\n"," ").replace("\n"," ").split()
    cells={}
    for i,t in enumerate(toks):
        if i>=grid*grid: break
        x=i%grid; y=i//grid
        if t.lower()=="black": continue   # background
        cells[(x,y)]=parse_color(t)
    return cells

def cells_key(cells):
    return hashlib.md5(repr(sorted(cells.items())).encode()).hexdigest()

# ── load human trajectory (HF) ──
def hf(path):
    tok=open(os.path.expanduser("~/.cache/huggingface/token")).read().strip()
    req=urllib.request.Request(
        "https://huggingface.co/datasets/datvo06/autumnbench-trajectories/resolve/main/"+path,
        headers={"Authorization":f"Bearer {tok}"})
    return json.loads(urllib.request.urlopen(req).read())

human = hf("json/human/mario.json")
GRID = human["grid_size"]
segments = human["trajectories"]            # 5 segments == 5 human runs (resets between)

# Build the human panel frame list: for each segment, dedupe consecutive identical
# grids (compresses real-time noop idling), sample up to N_PER frames, then a reset flash.
N_PER = 12
human_frames = []   # list of PIL image
human_is_reset = []  # parallel bool: is this frame a RESET flash?
for si, seg in enumerate(segments):
    obss = seg["observations"]
    distinct=[]
    last=None
    for o in obss:
        if not isinstance(o,dict): continue
        g,cells = entity_cells(o)
        k=cells_key(cells)
        if k!=last:
            distinct.append(cells); last=k
    if not distinct: continue
    # sample evenly to N_PER (keep first & last)
    if len(distinct)>N_PER:
        idx=[round(j*(len(distinct)-1)/(N_PER-1)) for j in range(N_PER)]
        sampled=[distinct[i] for i in sorted(set(idx))]
    else:
        sampled=distinct
    for cells in sampled:
        img,d,cell=base_canvas(GRID)
        draw_cells(d,cell,cells)
        ImageDraw.Draw(img).text((6,6),f"RUN {si+1}/{len(segments)}",fill=(255,255,255),font=_font(15))
        human_frames.append(img); human_is_reset.append(False)
    # reset flash (held long via per-frame duration) except after the last run
    if si < len(segments)-1:
        img=Image.new("RGB",(CANVAS,CANVAS),(30,12,12))
        dd=ImageDraw.Draw(img)
        f=_font(22)
        t="RESET"
        w=dd.textlength(t,font=f)
        dd.text(((CANVAS-w)/2,CANVAS/2-14),t,fill=(255,120,120),font=f)
        human_frames.append(img); human_is_reset.append(True)

# ── load model trajectory (local MARA) ──
model_path=os.path.join(MARA,"adversarial_solver_results_trajectory_raw/mario/planning/real_env_observations.json")
model=json.load(open(model_path))
def extract_render(o):
    if not isinstance(o,str): return None
    m=re.search(r'"render"\s*:\s*"([^"]*)"',o)
    return m.group(1) if m else None

model_states=[]
for r in model:
    rnd=extract_render(r.get("observation"))
    if rnd is None: continue
    model_states.append((r.get("action"), raw_cells(rnd, GRID)))
# dedupe consecutive identical
ded=[]; last=None
for act,cells in model_states:
    k=cells_key(cells)
    if k!=last: ded.append((act,cells)); last=k
model_states=ded

model_frames=[]
for act,cells in model_states:
    img,d,cell=base_canvas(GRID)
    draw_cells(d,cell,cells)
    ImageDraw.Draw(img).text((6,6),"RUN 1/1",fill=(255,255,255),font=_font(15))
    model_frames.append(img)
# repeat each model state so its single run spans more wall-clock (deliberate moves)
HOLD=2
model_frames=[f for f in model_frames for _ in range(HOLD)]

# ── synchronize lengths: pad the shorter panel by holding its last frame ──
N=max(len(human_frames),len(model_frames))
def pad(frames,n):
    return frames+[frames[-1]]*(n-len(frames)) if frames else []
human_frames=pad(human_frames,N)
model_frames=pad(model_frames,N)
human_is_reset = human_is_reset + [False]*(N-len(human_is_reset))

# ── compose side by side with header labels ──
HEADER=34; GAP=14; PANEL=CANVAS
W=PANEL*2+GAP; Hh=HEADER+PANEL
hf_label=_font(17)
def header(label,color):
    strip=Image.new("RGB",(PANEL,HEADER),(248,249,251))
    d=ImageDraw.Draw(strip)
    d.text((10,8),label,fill=color,font=hf_label)
    return strip

frames=[]
lh=header("HUMAN  ·  resets & re-runs",(30,58,138))
lm=header("MODEL  ·  one run",(192,57,43))
for i in range(N):
    canvas=Image.new("RGB",(W,Hh),(248,249,251))
    canvas.paste(lh,(0,0)); canvas.paste(lm,(PANEL+GAP,0))
    canvas.paste(human_frames[i],(0,HEADER))
    canvas.paste(model_frames[i],(PANEL+GAP,HEADER))
    frames.append(canvas)

# Per-frame timing: ~3.6 fps normal play (was ~7), RESET held ~0.9s so it reads.
durations=[900 if human_is_reset[i] else 280 for i in range(N)]
frames[0].save(OUT_GIF,save_all=True,append_images=frames[1:],
               duration=durations,loop=0,optimize=True,disposal=2)
print("wrote",OUT_GIF,"frames=",len(frames),"size=",frames[0].size,
      "total_seconds=",round(sum(durations)/1000,1))
print("human_frames=",len(human_frames),"(",len(segments),"segments )  model states=",len(model_states))

# ── verification montage: 12 evenly sampled composed frames ──
pick=[round(j*(N-1)/11) for j in range(12)]
cols,rows=4,3
mw,mh=W//2,Hh//2
mont=Image.new("RGB",(mw*cols+10*(cols+1),mh*rows+10*(rows+1)),(255,255,255))
for n,fi in enumerate(pick):
    th=frames[fi].resize((mw,mh))
    cx=10+(n%cols)*(mw+10); cy=10+(n//cols)*(mh+10)
    mont.paste(th,(cx,cy))
mont.save(MONTAGE)
print("wrote",MONTAGE)
