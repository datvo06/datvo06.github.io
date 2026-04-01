// ── Autumn stdlib ──
const autumnstdlib = `
(module
  (= GRID_SIZE 16)
  (= FRAME_RATE 8)
  (= background "black")
  (= move (--> (obj dir)
    (updateObj obj "origin"
      (Position
        (+ (.. (.. obj origin) x) (.. dir x))
        (+ (.. (.. obj origin) y) (.. dir y))
      )
    )
  ))
  (= moveRight (--> obj (move obj (Position 1 0))))
  (= moveLeft (--> obj (move obj (Position -1 0))))
  (= moveUp (--> obj (move obj (Position 0 -1))))
  (= moveDown (--> obj (move obj (Position 0 1))))
  (= moveNoCollision (--> (obj x y)
    (if (isFreeExcept (move obj (Position x y)) obj) then (move obj (Position x y)) else obj)
  ))
  (= moveCanCollision (--> (obj x y obj2)
    (if (isFreeExcept (move obj (Position x y)) (list obj obj2)) then (move obj (Position x y)) else obj)
  ))
  (= rotateNoCollision (--> (obj)
    (if (& (isWithinBounds (rotate obj)) (isFreeExcept (rotate obj) obj)) then (rotate obj) else obj)
  ))
  (= movePos (--> (pos dir)
    (Position
      (+ (.. pos x) (.. dir x))
      (+ (.. pos y) (.. dir y))
    )
  ))
  (= moveRightPos (--> pos (movePos pos (Position 1 0))))
  (= moveLeftPos (--> pos (movePos pos (Position -1 0))))
  (= moveUpPos (--> pos (movePos pos (Position 0 -1))))
  (= moveDownPos (--> pos (movePos pos (Position 0 1))))
  (= abs (--> x (if (< x 0) then (- x) else x)))
  (= sign (--> x
    (if (== x 0)
      then 0
      else (if (< x 0) then -1 else 1))
  ))
  (= vcat concat)
  (= deltaPos (--> (pos1 pos2)
    (Position
      (- (.. pos2 x) (.. pos1 x))
      (- (.. pos2 y) (.. pos1 y))
    )
  ))
  (= rect (--> (pos1 pos2) (
    let (= xmin (.. pos1 x))
        (= xmax (.. pos2 x))
        (= ymin (.. pos1 y))
        (= ymax (.. pos2 y))
        (= rectPos (concat (map (--> y (map (--> x (Position x y)) (range xmin xmax))) (range ymin ymax))))
        rectPos
  )))
  (= displacement deltaPos)
  (= deltaElem (--> (e1 e2)
    (deltaPos (.. e1 position) (.. e2 position))
  ))
  (= deltaObj (--> (obj1 obj2)
    (deltaPos (.. obj1 origin) (.. obj2 origin))
  ))
  (= adjacentElem (--> (e1 e2) (
      let (= delta (deltaPos (.. e1 position) (.. e2 position)))
          (== (+ (abs (.. delta x)) (abs (.. delta y))) 1)
      )
  ))
  (= adjacentPoss (--> (p1 p2 unitSize) (
    let (= delta (deltaPos p1 p2))
        (<= (+ (abs (.. delta x)) (abs (.. delta y))) unitSize)
    )
  ))
  (= adjacentTwoObjs (--> (obj1 obj2 unitSize) (
    adjacentPoss (.. obj1 origin) (.. obj2 origin) unitSize
  )))
  (= adjacentPossDiag (--> (p1 p2) (
    let (= delta (deltaPos p1 p2))
        (& (<= (abs (.. delta x)) 1)
           (<= (abs (.. delta y)) 1))
  )))
  (= adjacentTwoObjsDiag (--> (obj1 obj2) (
    adjacentPossDiag (.. obj1 origin) (.. obj2 origin)
  )))
  (= adjacentObjs (--> (obj1 unitSize)
    (if (isList obj1) then
    (filter (--> obj2 (any (--> o1 (adjacentTwoObjs o1 obj2 unitSize)) obj1)) ((allObjs)))
    else
    (filter (--> obj2 (adjacentTwoObjs obj1 obj2 unitSize)) ((allObjs)))
  )))
  (= adjacentObjsDiag (--> obj (
    if (isList obj) then
    (filter (--> obj2 (any (--> o1 (adjacentTwoObjsDiag o1 obj2)) obj)) ((allObjs)))
    else
    (filter (--> obj2 (adjacentTwoObjsDiag obj obj2)) ((allObjs)))
  )))
  (= adj (--> (obj objs unitSize)
    (any (--> obj2 (adjacentTwoObjs obj obj2 unitSize)) objs)
  ))
  (= objClicked (--> (objs) (
    filter (--> obj (clicked obj)) objs
  )))
  (= sqdist (--> (pos1 pos2)
           (let
             (= delta (deltaPos pos1 pos2))
             (+ (* (.. delta x) (.. delta x)) (* (.. delta y) (.. delta y)))
           )
  ))
  (= unitVector (--> (obj target)
    (let
      (= delta (deltaPos (.. obj origin) (.. target origin)))
      (= sign_x (sign (.. delta x)))
      (= sign_y (sign (.. delta y)))
      (if (and (== (abs sign_x) 1)
               (== (abs sign_y) 1)) then
          (Position sign_x 0) else (Position sign_x sign_y)
      )
    )))
  (= unitVectorObjPos (--> (obj pos)
    (let
      (= delta (deltaPos (.. obj origin) pos))
      (= sign_x (sign (.. delta x)))
      (= sign_y (sign (.. delta y)))
      (if (and (== (abs sign_x) 1)
               (== (abs sign_y) 1)) then
          (Position sign_x 0) else (Position sign_x sign_y)
      )
    )
  ))
  (= unitVectorSinglePos (--> (pos)
    (let
      (= sign_x (sign (.. pos x)))
      (= sign_y (sign (.. pos y)))
      (Position sign_x sign_y)
    )
  ))
  (= max (--> (a b) (if (< a b) then b else a)))
  (= min (--> (a b) (if (< a b) then a else b)))
  (= closest (--> (obj listObjs)
            (if (== (length listObjs) 0) then obj else
            (foldl (--> (obj1 obj2)
              (if (< (sqdist (.. obj1 origin) (.. obj origin)) (sqdist (.. obj2 origin) (.. obj origin))) then obj1 else obj2
            )) (head listObjs) listObjs)
            )))
  (= closestPos (--> (obj listPoss)
            (if (== (length listPoss) 0) then (.. obj origin) else
            (foldl (--> (pos1 pos2)
              (if (< (sqdist pos1 (.. obj origin)) (sqdist pos2 (.. obj origin))) then pos1 else pos2
            )) (head listPoss) listPoss)
            )))
  (= renderValue (--> obj (if (isList obj) then (concat (map renderValue obj)) else ((.. obj render)))))
  (= sum (--> (l) (foldl (--> (acc x) (+ acc x)) 0 l)))
  (= intersectsElems (--> (elems1 elems2) (
        if (or (== (length elems1) 0) (== (length elems2) 0)) then false else
        (any (--> elem1
                  (any (--> elem2 (== (.. elem1 position) (.. elem2 position))) elems2)) elems1)
        )
  ))
  (= intersectsPosElems (--> (pos elems)
                          (any (--> elem (== (.. elem position) pos)) elems)))
  (= intersectsPosPoss (--> (pos poss)
                          (any (--> pos2 (== pos pos2)) poss)))
  (= intersects (--> (obj1 obj2) (intersectsElems (renderValue obj1) (renderValue obj2))))
  (= isFree (--> obj (! (any (--> e (! (isFreePos (.. e position)))) (renderValue obj)))))
  (= in (--> (e l) (any (--> x (== x e)) l)))
  (= isFreeExcept (--> (obj prev_obj) (
    let (= prev_elems (renderValue prev_obj))
        (= curr_elems (renderValue obj))
        (= filtered_elems (filter (--> elem (! (in elem prev_elems))) curr_elems))
        (! (any (--> elem (! (isFreePos (.. elem position)))) filtered_elems))
  )))
  (= isFreePosExceptObj (--> (pos obj) (
    if (| (isFreePos pos) (intersectsPosElems pos (renderValue obj))) then true else false
    )
  ))
  (= isFreeRangeExceptObj (--> (start end obj) (
    let (= allCheckedPos (map (--> (x) (Position x 0)) (range start end)))
        (= prev_elems (renderValue obj))
        (= filtered_pos (filter (--> pos (! (intersectsPosElems pos prev_elems))) allCheckedPos))
        (! (any (--> pos (! (isFreePos pos))) filtered_pos))
  )))
  (= moveLeftNoCollision (--> obj (let
      (if (and (isWithinBounds (moveLeft obj)) (isFreeExcept (moveLeft obj) obj)) then (moveLeft obj) else obj))))
  (= moveRightNoCollision (--> obj (let
      (= wbound (isWithinBounds (moveRight obj)))
      (= fr (isFreeExcept (moveRight obj) obj))
      (= ret (if (& wbound fr) then (moveRight obj) else obj))
      ret
      ))
  )
  (= moveUpNoCollision (--> obj (if (and (isWithinBounds (moveUp obj)) (isFreeExcept (moveUp obj) obj)) then (moveUp obj) else obj)))
  (= moveDownNoCollision (--> obj (if (and (isWithinBounds (moveDown obj)) (isFreeExcept (moveDown obj) obj)) then (moveDown obj) else obj)))
  (= nextSolid moveDownNoCollision)
  (= nextLiquidClosestHole (--> (obj holes)
      (if (== (length holes) 0) then obj else (
              let (= closestHole (closestPos obj holes))
                  (nextLiquidMoveClosestHole obj closestHole)
          )
      ))
  )
  (= nextLiquid (--> (obj) (
    if (and
        (!= (.. (.. obj origin) y) (- GRID_SIZE 1))
        (isFree (moveDown obj))
        ) then (moveDown obj) else (
          let (= nextRowPos (rect (Position 0 (+ (.. (.. obj origin) y) 1)) (Position GRID_SIZE (+ (.. (.. obj origin) y) 2))))
              (= nextRowPos (filter (--> p (!= (.. p y) GRID_SIZE)) nextRowPos))
              (= holes (filter (--> p (and (isFreePos p) (isFreePos (moveUpPos p)))) nextRowPos))
              (nextLiquidClosestHole obj holes)
          )
    )))
  (= nextLiquidMoveClosestHole (--> (obj closestHole) (
     let (= dir (unitVectorObjPos obj (moveUpPos closestHole)))
         (= movedObj (move obj dir))
         (if (and (isFreePos (moveUpPos closestHole))
              (and (isFreePos (.. movedObj origin))
                    (isWithinBounds movedObj))
             ) then movedObj else obj)
     )
  ))
)
`;

// ── Programs ──
const PROGRAMS = {
  "Ice": `(program
    (= GRID_SIZE 16)
    (object CelestialBody (: day Bool) (list (Cell 0 0 (if day then "gold" else "gray"))
                                            (Cell 0 1 (if day then "gold" else "gray"))
                                            (Cell 1 0 (if day then "gold" else "gray"))
                                            (Cell 1 1 (if day then "gold" else "gray"))))
    (object Cloud (list (Cell -1 0 "gray") (Cell 0 0 "gray") (Cell 1 0 "gray")))
    (object Water (: liquid Bool) (Cell 0 0 (if liquid then "blue" else "lightblue")))
    (: celestialBody CelestialBody)
    (= celestialBody (initnext (CelestialBody true (Position 0 0)) (prev celestialBody)))
    (: cloud Cloud)
    (= cloud (initnext (Cloud (Position 4 0)) (prev cloud)))
    (: water (List Water))
    (= water (initnext (list) (updateObj (prev water) nextWater)))
    (on left (= cloud (nextCloud cloud (Position -1 0))))
    (on right (= cloud (nextCloud cloud (Position 1 0))))
    (on down (= water (addObj water (Water (.. celestialBody day) (movePos (.. cloud origin) (Position 0 1))))))
    (on clicked (let
      (= celestialBody (updateObj celestialBody "day" (! (.. celestialBody day))))
      (= water (updateObj water (--> drop (updateObj drop "liquid" (! (.. drop liquid))))))
    ))
    (= nextWater (--> (drop)
                    (if (.. drop liquid)
                      then (nextLiquid drop)
                      else (nextSolid drop))))
    (= nextCloud (--> (cloud position)
                    (if (isWithinBounds (move cloud position))
                      then (move cloud position)
                      else cloud)))
)`,
  "Space Invaders": `(program
(= GRID_SIZE 16)
(object Enemy (Cell 0 0 "blue"))
(object Hero (: alive Bool) (Cell 0 0 (if alive then "gray" else "black")))
(object Bullet (Cell 0 0 "red"))
(object EnemyBullet (Cell 0 0 "orange"))
(: enemies1 (List Enemy))
(= enemies1 (initnext (map (--> pos (Enemy pos)) (filter (--> pos (and (== (.. pos y) 1) (== (% (.. pos x) 3) 1))) (allPositions GRID_SIZE))) (prev "enemies1")))
(: enemies2 (List Enemy))
(= enemies2 (initnext (map (--> pos (Enemy pos)) (filter (--> pos (and (== (.. pos y) 3) (== (% (.. pos x) 3) 2))) (allPositions GRID_SIZE))) (prev "enemies2")))
(: hero Hero)
(= hero (initnext (Hero true (Position 8 15)) (prev "hero")))
(: enemyBullets (List EnemyBullet))
(= enemyBullets (initnext (list) (prev "enemyBullets")))
(: bullets (List Bullet))
(= bullets (initnext (list) (prev "bullets")))
(: time Int)
(= time (initnext 0 (+ (prev "time") 1)))
(on true (= enemyBullets (updateObj enemyBullets (--> obj (moveDown obj)))))
(on true (= bullets (updateObj bullets (--> obj (moveUp obj)))))
(on left (= hero (moveLeftNoCollision (prev "hero"))))
(on right (= hero (moveRightNoCollision (prev "hero"))))
(on (and ((up)) (.. (prev "hero") alive)) (= bullets (addObj bullets (Bullet (.. (prev "hero") origin)))))
(on (== (% time 10) 5) (= enemies1 (updateObj enemies1 (--> obj (moveLeft obj)))))
(on (== (% time 10) 0) (= enemies1 (updateObj enemies1 (--> obj (moveRight obj)))))
(on (== (% time 10) 5) (= enemies2 (updateObj enemies2 (--> obj (moveRight obj)))))
(on (== (% time 10) 0) (= enemies2 (updateObj enemies2 (--> obj (moveLeft obj)))))
(on (intersects (prev "bullets") (prev "enemies1"))
  (let (= bullets (removeObj (prev "bullets") (--> obj (intersects obj (prev "enemies1"))))) (= enemies1 (removeObj (prev "enemies1") (--> obj (intersects obj (prev "bullets")))))))
(on (intersects (prev "bullets") (prev "enemies2"))
  (let (= bullets (removeObj (prev "bullets") (--> obj (intersects obj (prev enemies2))))) (= enemies2 (removeObj (prev "enemies2") (--> obj (intersects obj (prev bullets)))))))
(on (== (% time 5) 2) (= enemyBullets (addObj enemyBullets (EnemyBullet (uniformChoice (map (--> obj (.. obj origin)) (vcat (list (prev "enemies1") (prev "enemies2")))))))))
(on (intersects (prev "hero") (prev "enemyBullets")) (= hero (updateObj (prev "hero") "alive" false)))
(on (intersects (prev "bullets") (prev "enemyBullets"))
  (let (= bullets (removeObj (prev "bullets") (--> obj (intersects obj (prev enemyBullets))))) (= enemyBullets (removeObj (prev "enemyBullets") (--> obj (intersects obj (prev bullets)))))))
)`,
  "Sokoban": `(program
  (= GRID_SIZE 16)
  (object Agent (Cell 0 0 "blue"))
  (object Box (Cell 0 0 "gray"))
  (object Goal (Cell 0 0 "red"))
  (: agent Agent)
  (= agent (initnext (Agent (Position 7 4)) (prev agent)))
  (: boxes (List Box))
  (= boxes (initnext (list (Box (Position 14 2)) (Box (Position 9 14)) (Box (Position 1 2)) (Box (Position 0 4)) (Box (Position 4 4)) (Box (Position 9 9)) (Box (Position 10 9)) (Box (Position 0 11))) (prev boxes)))
  (: goal Goal)
  (= goal (initnext (Goal (Position 0 0)) (prev goal)))
  (on left (let (= boxes (moveBoxes (prev boxes) (prev agent) (prev goal) -1 0)) (= agent (moveAgent (prev agent) (prev boxes) (prev goal) -1 0))))
  (on right (let (= boxes (moveBoxes (prev boxes) (prev agent) (prev goal) 1 0)) (= agent (moveAgent (prev agent) (prev boxes) (prev goal) 1 0))))
  (on up (let (= boxes (moveBoxes (prev boxes) (prev agent) (prev goal) 0 -1)) (= agent (moveAgent (prev agent) (prev boxes) (prev goal) 0 -1))))
  (on down (let (= boxes (moveBoxes (prev boxes) (prev agent) (prev goal) 0 1)) (= agent (moveAgent (prev agent) (prev boxes) (prev goal) 0 1))))
  (on (& ((clicked)) (isFreePos click)) (= boxes (addObj boxes (Box (Position (.. click x) (.. click y))))))
  (= moveBoxes (fn (boxes agent goal x y) (updateObj boxes (--> obj (if (intersects (move obj Position (x y)) goal) then (removeObj obj) else (moveNoCollision obj Position (x y)))) (--> obj (== (displacement (.. obj origin) (.. agent origin)) (Position (- 0 x) (- 0 y)))))))
  (= moveAgent (fn (agent boxes goal x y) (if (intersects (list (move agent x y)) (moveBoxes boxes agent goal x y)) then agent else (move agent x y))))
)`,
  "Particles": `(program
  (= GRID_SIZE 16)
  (object Particle (Cell 0 0 "blue"))
  (: particles (List Particle))
  (= particles (initnext (list) (updateObj (prev particles) (--> obj (Particle (uniformChoice (adjPositions (.. obj origin))))))))
  (on clicked (= particles (addObj (prev particles) (Particle (Position (.. click x) (.. click y)))))))`,
  "Game of Life": `(program
  (= GRID_SIZE 16)
  (object Particle (: living Bool) (Cell 0 0 (if living then "lightpink" else "black")))
  (= create_initial_particles (fn () (let
   (= particles (map (--> (pos) (Particle false pos)) (allPositions GRID_SIZE)))
   (= particles (updateObj particles (--> obj (updateObj obj "living" true)) (--> obj (in (.. obj origin)
    (list (Position 2 3) (Position 3 3) (Position 3 1) (Position 4 3) (Position 4 2))
   ))))
   particles
   )))
  (: particles (List Particle))
  (= particles (initnext ((create_initial_particles)) (prev particles)))
  (object Button (: color String) (Cell 0 0 color))
  (: buttonNext Button)
  (= buttonNext (initnext (Button "green" (Position 0 (- GRID_SIZE 1))) (prev "buttonNext")))
  (: buttonReset Button)
  (= buttonReset (initnext (Button "silver" (Position (- GRID_SIZE 1) (- GRID_SIZE 1))) (prev "buttonReset")))
  (on clicked (= particles (addObj (removeObj (prev particles) (--> obj (clicked obj))) (Particle true click))))
  (on (clicked buttonNext) (= particles
                      (let (= livingObjs (filter (--> o (.. o living)) (prev particles)))
                           (updateObj (prev particles)
                           (--> obj
                           (let (= neighbours (list
                            (Position (+ (.. (.. obj origin) x) 1) (+ (.. (.. obj origin) y) 1))
                            (Position (+ (.. (.. obj origin) x) 1) (- (.. (.. obj origin) y) 1))
                            (Position (- (.. (.. obj origin) x) 1) (+ (.. (.. obj origin) y) 1))
                            (Position (- (.. (.. obj origin) x) 1) (- (.. (.. obj origin) y) 1))
                            (Position (.. (.. obj origin) x) (+ (.. (.. obj origin) y) 1))
                            (Position (.. (.. obj origin) x) (- (.. (.. obj origin) y) 1))
                            (Position (+ (.. (.. obj origin) x) 1) (.. (.. obj origin) y))
                            (Position (- (.. (.. obj origin) x) 1) (.. (.. obj origin) y))
                            ))
                            (= livingAdjObjs (filter (--> o (in (.. o origin) neighbours)) livingObjs))
                            (= len (length livingAdjObjs))
                            (if (.. obj living) then (let
                              (if (| (<= len 1) (>= len 4)) then
                                (updateObj obj "living" false) else
                                obj)) else (let
                              (if (== len 3) then
                                (updateObj obj "living" true) else
                                obj))))))
                        )))
  (on (clicked buttonReset) (= particles (map (--> (obj) (updateObj obj "living" false)) (prev particles))))
)`,
  "Gravity": `(program
    (= GRID_SIZE 16)
    (object Button (: color String) (Cell 0 0 color))
    (object Blob (list (Cell 0 -1 "blue") (Cell 0 0 "blue") (Cell 1 -1 "blue") (Cell 1 0 "blue")))
    (: leftButton Button)
    (= leftButton (initnext (Button "red" (Position 0 7)) (prev leftButton)))
    (: rightButton Button)
    (= rightButton (initnext (Button "darkorange" (Position 15 7)) (prev rightButton)))
    (: upButton Button)
    (= upButton (initnext (Button "gold" (Position 7 0)) (prev upButton)))
    (: downButton Button)
    (= downButton (initnext (Button "green" (Position 7 15)) (prev downButton)))
    (: blobs (List Blob))
    (= blobs (initnext (list) (prev blobs)))
    (: gravity String)
    (= gravity (initnext "down" (prev "gravity")))
    (on (== gravity "left") (= blobs (updateObj blobs (--> obj (moveLeft obj)))))
    (on (== gravity "right") (= blobs (updateObj blobs (--> obj (moveRight obj)))))
    (on (== gravity "up") (= blobs (updateObj blobs (--> obj (moveUp obj)))))
    (on (== gravity "down") (= blobs (updateObj blobs (--> obj (moveDown obj)))))
    (on (& ((clicked)) (isFreePos click)) (= blobs (addObj blobs (Blob (Position (.. click x) (.. click y))))))
    (on (clicked leftButton) (= gravity "left"))
    (on (clicked rightButton) (= gravity "right"))
    (on (clicked upButton) (= gravity "up"))
    (on (clicked downButton) (= gravity "down"))
)`
};

// ── Color map ──
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
  sienna:[160,82,45],peru:[205,133,63],chocolate:[210,105,30]
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

// ── Canvas setup ──
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

// Resize canvas to match wrapper
function resizeCanvas() {
  const wrapper = document.getElementById('autumn-inline-wrapper');
  const w = wrapper.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  canvasSize = w * dpr;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  canvas.style.width = w + 'px';
  canvas.style.height = w + 'px';
  // Re-render if interpreter is active
  if (interpreter) {
    try { renderGrid(interpreter.renderAll()); } catch(e) {}
  }
}

// Populate dropdown
for (const name of Object.keys(PROGRAMS)) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
}

function renderGrid(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  gridSize = parsed.GRID_SIZE || 16;
  const cellSize = canvasSize / gridSize;

  // Transparent background - inherits page bg
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  // Draw subtle grid lines
  ctx.strokeStyle = 'rgba(128,128,128,0.15)';
  ctx.lineWidth = Math.max(0.5, canvasSize / 960);
  for (let i = 0; i <= gridSize; i++) {
    const pos = i * cellSize;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, canvasSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(canvasSize, pos); ctx.stroke();
  }

  // Draw entities
  for (const key of Object.keys(parsed)) {
    if (key === 'GRID_SIZE' || key === 'background') continue;
    const entities = parsed[key];
    if (!Array.isArray(entities)) continue;
    for (const entity of entities) {
      if (entity.position && entity.color) {
        const { x, y } = entity.position;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          const [r, g, b] = parseColor(entity.color);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          // Slightly inset cells for a cleaner look
          const inset = Math.max(0.5, cellSize * 0.05);
          ctx.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
        }
      }
    }
  }
}

function doStep() {
  if (!interpreter) return;
  try {
    interpreter.step();
    renderGrid(interpreter.renderAll());
  } catch (e) { console.error(e); }
}

function doAction(action) {
  if (!interpreter) return;
  try {
    interpreter[action]();
    interpreter.step();
    renderGrid(interpreter.renderAll());
  } catch (e) { console.error(e); }
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
    renderGrid(interpreter.renderAll());
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
      doStep();
    }
  }
  animFrameId = requestAnimationFrame(gameLoop);
}

// ── Controls ──
select.addEventListener('change', () => loadProgram(select.value));
btnReset.addEventListener('click', () => loadProgram(select.value));
btnPause.addEventListener('click', () => {
  paused = !paused;
  btnPause.textContent = paused ? 'Resume' : 'Pause';
});

// Keyboard - only when canvas is nearby/visible
document.addEventListener('keydown', (e) => {
  if (!interpreter) return;
  const actions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (actions[e.key]) {
    e.preventDefault();
    doAction(actions[e.key]);
  }
});

// Click
canvas.addEventListener('click', (e) => {
  if (!interpreter) return;
  const rect = canvas.getBoundingClientRect();
  const cellSize = canvasSize / gridSize;
  const dpr = window.devicePixelRatio || 1;
  const x = Math.floor((e.clientX - rect.left) * dpr / cellSize);
  const y = Math.floor((e.clientY - rect.top) * dpr / cellSize);
  try {
    interpreter.click(x, y);
    interpreter.step();
    renderGrid(interpreter.renderAll());
  } catch (err) { console.error(err); }
});

// Responsive
window.addEventListener('resize', resizeCanvas);

// ── Init ──
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
