#!/usr/bin/env python3
"""Per-run GIFs of the winning human's mario exploration, for the blog's
linearized story. Same source and rasterizer as build_mario_exploration.py
(HF datvo06/autumnbench-trajectories json/human/mario.json, verified winner),
but each of the 5 runs becomes its own GIF, no RESET card.
Also prints where the click actions fall inside each run, to check the
narrative (navigate first, discover clicking late in run 1, practice after).
"""
import json, os, re, urllib.request, hashlib
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/Users/datnguyen/Marc/datvo06.github.io/assets/img/worldtest_talk"
CSS_COLORS = {
 "black":(0,0,0),"white":(255,255,255),"red":(255,0,0),"green":(0,128,0),
 "blue":(0,0,255),"yellow":(255,255,0),"orange":(255,165,0),"gray":(128,128,128),
 "grey":(128,128,128),"purple":(128,0,128),"pink":(255,192,203),
 "lightblue":(173,216,230),"lightpink":(255,182,193),"darkblue":(0,0,139),
 "darkorange":(255,140,0),"gold":(255,215,0),"silver":(192,192,192),
 "cyan":(0,255,255),"magenta":(255,0,255),"brown":(165,42,42),
 "darkgreen":(0,100,0),"lightgreen":(144,238,144),"darkred":(139,0,0),
 "mediumpurple":(147,112,219),
}
def parse_color(s):
    l=s.lower().strip()
    if l in CSS_COLORS: return CSS_COLORS[l]
    return (0,0,0)

CANVAS=360; BG=(8,8,10); GRID_LINE=(44,44,50)
def _font(sz):
    try: return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", sz)
    except Exception: return ImageFont.load_default()

def base_canvas(grid):
    img=Image.new("RGB",(CANVAS,CANVAS),BG); d=ImageDraw.Draw(img)
    cell=CANVAS/grid
    for i in range(grid+1):
        p=round(i*cell)
        d.line([(p,0),(p,CANVAS)],fill=GRID_LINE); d.line([(0,p),(CANVAS,p)],fill=GRID_LINE)
    return img,d,cell

def entity_cells(obs):
    grid=obs.get("GRID_SIZE",12); best={}
    for k,v in obs.items():
        if k in ("GRID_SIZE","background") or not isinstance(v,list): continue
        for e in v:
            if not isinstance(e,dict): continue
            p=e.get("position"); c=e.get("color")
            if not p or not c: continue
            x,y=p.get("x"),p.get("y")
            if x is None or y is None or not(0<=x<grid and 0<=y<grid): continue
            best[(x,y)]=parse_color(c)
    return grid,best

def key(cells): return hashlib.md5(repr(sorted(cells.items())).encode()).hexdigest()

tok=open(os.path.expanduser("~/.cache/huggingface/token")).read().strip()
req=urllib.request.Request(
    "https://huggingface.co/datasets/datvo06/autumnbench-trajectories/resolve/main/json/human/mario.json",
    headers={"Authorization":f"Bearer {tok}"})
human=json.loads(urllib.request.urlopen(req).read())
GRID=human["grid_size"]

os.makedirs(OUT_DIR, exist_ok=True)
for si,seg in enumerate(human["trajectories"],1):
    acts=seg["actions"]
    clicks=[i for i,a in enumerate(acts) if isinstance(a,str) and a.startswith("click")]
    n=len(acts)
    print(f"run {si}: {n} actions, {len(clicks)} clicks at indices {clicks[:20]}"
          f" (first click at {clicks[0]/n:.0%} of the run)" if clicks else f"run {si}: {n} actions, no clicks")
    frames=[]; last=None
    for o in seg["observations"]:
        if not isinstance(o,dict): continue
        g,cells=entity_cells(o)
        k=key(cells)
        if k==last: continue
        last=k
        img,d,cell=base_canvas(GRID)
        inset=max(0.5,cell*0.05)
        for (x,y),rgb in cells.items():
            d.rectangle([x*cell+inset,y*cell+inset,(x+1)*cell-inset,(y+1)*cell-inset],fill=rgb)
        ImageDraw.Draw(img).text((8,7),f"RUN {si}/5",fill=(255,255,255),font=_font(17))
        frames.append(img)
    out=os.path.join(OUT_DIR,f"mario_run{si}.gif")
    frames[0].save(out,save_all=True,append_images=frames[1:],duration=60,loop=0,optimize=True,disposal=2)
    print(f"  -> {out}: {len(frames)} frames")
