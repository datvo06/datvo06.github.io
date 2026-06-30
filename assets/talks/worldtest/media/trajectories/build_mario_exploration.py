#!/usr/bin/env python3
"""Render the winning human's reset-and-replay exploration on the AutumnBench
`mario` planning environment (anonymized env code N2NTD) as a single-panel GIF.

Source: HF datvo06/autumnbench-trajectories  json/human/mario.json.
This is the TOP-SCORING human on mario_planning: user 686fdaf134a16302c77f4c2f,
score 0.9847267700970721, the decisive winner of the 60 people who played it
(runner-up 0.44). Its 5 segments are that human's 5 interactive-phase runs,
separated by 5 real resets. The segment seeds
[400698, 584177, 404831, 69433, 399857] were verified to match exactly the
winner's interactive-phase reset seeds in the raw participant log
MARA/data/autumnbench_human_participants.json.

There is no comparable agent grid-exploration trajectory: the protocol solver
(claude-sonnet-4-6) explores by synthesizing and running candidate world-model
programs, not by resetting and replaying the grid. So this is a single human
panel; the human-vs-AI contrast is carried by the numbers slide and the Basis
side-by-side clip.

Rasterizer matches _includes/autumn_renderer.js (same CSS color map, faint grid
lines, inset cell rects, lighter-color-wins on cell collisions). Mario's true
background is black, so entities render on black.

Every native frame animates (about 6 of ~144 cells change per step), so frames
are kept CONTIGUOUS (stride 1) to stay smooth; sparse sampling made the human
teleport. Each run is shown as a window of its first MAXF states (its opening),
not the full run, to keep the loop a sane length. The states are real and in
order; the clip just stops each run early before the reset.
"""
import json, os, re, urllib.request, hashlib
from PIL import Image, ImageDraw, ImageFont

OUT_GIF = os.path.join(os.path.dirname(__file__), "mario_winner_exploration.gif")
MONTAGE = os.path.join(os.path.dirname(__file__), "_verify_montage.png")

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

CANVAS = 400
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
    best={}
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

def cells_key(cells):
    return hashlib.md5(repr(sorted(cells.items())).encode()).hexdigest()

def hf(path):
    tok=open(os.path.expanduser("~/.cache/huggingface/token")).read().strip()
    req=urllib.request.Request(
        "https://huggingface.co/datasets/datvo06/autumnbench-trajectories/resolve/main/"+path,
        headers={"Authorization":f"Bearer {tok}"})
    return json.loads(urllib.request.urlopen(req).read())

# ── load the verified winner trajectory ──
human = hf("json/human/mario.json")
assert abs(human["source"]["score"]-0.9847267700970721) < 1e-9, "not the winner score"
GRID = human["grid_size"]
segments = human["trajectories"]            # 5 segments == 5 human runs (resets between)

# Build the panel: for each run, dedupe consecutive identical grids (compresses
# real-time noop idling), sample up to N_PER frames, then a held RESET flash.
MAXF = 34   # frames shown per run: a contiguous window from the start (stride 1),
            # so motion is one native game step per frame instead of teleporting.
panel_imgs = []
is_reset = []
for si, seg in enumerate(segments):
    distinct=[]; last=None
    for o in seg["observations"]:
        if not isinstance(o,dict): continue
        _,cells = entity_cells(o)
        k=cells_key(cells)
        if k!=last: distinct.append(cells); last=k
    if not distinct: continue
    sampled=distinct[:MAXF]
    for cells in sampled:
        img,d,cell=base_canvas(GRID)
        draw_cells(d,cell,cells)
        ImageDraw.Draw(img).text((10,9),f"RUN {si+1}/{len(segments)}",fill=(255,255,255),font=_font(20))
        panel_imgs.append(img); is_reset.append(False)
    if si < len(segments)-1:
        img=Image.new("RGB",(CANVAS,CANVAS),(30,12,12))
        dd=ImageDraw.Draw(img); f=_font(30); t="RESET"
        w=dd.textlength(t,font=f)
        dd.text(((CANVAS-w)/2,CANVAS/2-20),t,fill=(255,120,120),font=f)
        panel_imgs.append(img); is_reset.append(True)

# ── compose single panel with a header strip ──
HEADER=44; PANEL=CANVAS
W=PANEL; Hh=HEADER+PANEL
hf_label=_font(20)
strip=Image.new("RGB",(PANEL,HEADER),(248,249,251))
ImageDraw.Draw(strip).text((12,12),"WINNING HUMAN  ·  mario exploration",fill=(30,58,138),font=hf_label)

frames=[]
for img in panel_imgs:
    canvas=Image.new("RGB",(W,Hh),(248,249,251))
    canvas.paste(strip,(0,0)); canvas.paste(img,(0,HEADER))
    frames.append(canvas)

N=len(frames)
# Contiguous frames at ~6.7 fps (150ms): one native game step per frame, smooth.
# RESET held ~0.7s so it reads.
durations=[700 if is_reset[i] else 150 for i in range(N)]
frames[0].save(OUT_GIF,save_all=True,append_images=frames[1:],
               duration=durations,loop=0,optimize=True,disposal=2)
print("wrote",OUT_GIF,"frames=",len(frames),"size=",frames[0].size,
      "total_seconds=",round(sum(durations)/1000,1),"runs=",len(segments))

# ── verification montage: 12 evenly sampled frames ──
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
