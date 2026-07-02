// ── Autumn example programs (shared) ──
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
)`,
  "Ants": `(program
  (= GRID_SIZE 16)

  (object Ant (Cell 0 0 "gray"))
  (object Food (Cell 0 0 "red"))

  (: ants (List Ant))
  (= ants (initnext (list (Ant (Position 5 5)) (Ant (Position 1 14))) (prev ants)))

  (: foods (List Food))
  (= foods (initnext (list) (prev foods)))

  (on true (= foods (filter (--> obj (! (intersects obj (prev ants)))) (prev foods))))
  (on true (= ants (updateObj (prev ants) (--> obj (move obj (unitVector obj (closest obj foods)))))))

  (on clicked (= foods (addObj foods (map (--> pos (Food pos)) (randomPositions GRID_SIZE 2)))))
)`,
  "Sand": `(program
  (= GRID_SIZE 10)

  (object Button (: color String) (Cell 0 0 color))
  (object Sand (: liquid Bool) (Cell 0 0 (if liquid then "sandybrown" else "tan")))
  (object Water (Cell 0 0 "skyblue"))

  (: sandButton Button)
  (= sandButton (initnext (Button "red" (Position 2 0)) (prev sandButton)))

  (: waterButton Button)
  (= waterButton (initnext (Button "green" (Position 7 0)) (prev waterButton)))

  (: sand (List Sand))
  (= sand (initnext (list (Sand false (Position 2 9)) (Sand false (Position 3 9)) (Sand false (Position 4 9)) (Sand false (Position 5 9)) (Sand false (Position 6 9)) (Sand false (Position 7 9))
                          (Sand false (Position 2 8)) (Sand false (Position 3 8)) (Sand false (Position 4 8)) (Sand false (Position 5 8)) (Sand false (Position 6 8)) (Sand false (Position 7 8))
                          (Sand false (Position 2 7)) (Sand false (Position 3 7)) (Sand false (Position 4 7)) (Sand false (Position 5 7)) (Sand false (Position 6 7)) (Sand false (Position 7 7))
                          (Sand false (Position 2 6)) (Sand false (Position 4 6))  (Sand false (Position 5 6)) (Sand false (Position 7 6))
                          (Sand false (Position 2 5)) (Sand false (Position 4 5))  (Sand false (Position 5 5)) (Sand false (Position 7 5))
                    ) (prev sand)))

  (: water (List Water))
  (= water (initnext (list) (updateObj (prev water) (--> obj (nextLiquid obj)))))


  (: clickType String)
  (= clickType (initnext "sand" (prev "clickType")))

  (= adjacentObjsTemp (--> (obj1 objs) (let
    (= poss (list (Position (- (.. (.. obj1 origin) x) 1) (.. (.. obj1 origin) y)) (Position (+ (.. (.. obj1 origin) x) 1) (.. (.. obj1 origin) y)) (Position (.. (.. obj1 origin) x) (- (.. (.. obj1 origin) y) 1)) (Position (.. (.. obj1 origin) x) (+ (.. (.. obj1 origin) y) 1))))
    (filter (--> obj2 (in (.. obj2 origin) poss)) objs)
  )))

  (on true (= sand (updateObj (prev sand) (--> obj (let
  (= adjWater (!= 0 (length (adjacentObjsTemp obj (prev water)))))
  (= obj (if adjWater then (updateObj obj "liquid" true) else obj))
  (if (.. obj liquid) then (nextLiquid obj) else (nextSolid obj))
  )))))

  (on (clicked sandButton) (= clickType "sand"))
  (on (clicked waterButton) (= clickType "water"))
  (on (& (& ((clicked)) (isFreePos click)) (== clickType "sand"))  (= sand (addObj sand (Sand false (Position (.. click x) (.. click y))))))
  (on (& (& ((clicked)) (isFreePos click)) (== clickType "water")) (= water (addObj water (Water (Position (.. click x) (.. click y))))))
)`,
  // AutumnBench env `gravity_3` (code QQM74) from the official Zenodo release (record 19498269).
  "Gravity 3": `(program
  (= GRID_SIZE 21)
  (= background "black")
    
  (object Button (: color String) (Cell 0 0 color))
  (object Blob (list (Cell 0 0 "blue")))
  
  (: blobs (List Blob))
  (= blobs (initnext (list (Blob (Position (/ GRID_SIZE 2) (/ GRID_SIZE 2)))) (prev blobs)))
  
  (: xVel Number)
  (= xVel (initnext 0 (prev xVel)))
  
  (: yVel Number)
  (= yVel (initnext 0 (prev yVel)))
            
  (on (& ((clicked)) (isFreePos click)) (= blobs (addObj blobs (Blob (Position (.. click x) (.. click y))))))
  
  (on (& ((left)) (!= (prev xVel) -1)) (= xVel (- (prev xVel) 1)))
  (on (& ((right)) (!= (prev xVel) 1)) (= xVel (+ (prev xVel) 1)))
  
  (on (& ((up)) (!= (prev yVel) -1)) (= yVel (- (prev yVel) 1)))
  (on (& ((down)) (!= (prev yVel) 1)) (= yVel (+ (prev yVel) 1)))
  
  (on true (= blobs (updateObj blobs (--> obj (move obj (Position (prev xVel) (prev yVel)))))))
)`,

  // AutumnBench env `bbq` (code 27VWC) from the official Zenodo release (record 19498269).
  "BBQ": `(program
  (= GRID_SIZE 7)

  (object Bbq (: fire Bool) (: gas Number) (list (Cell 0 1 "gray") (Cell 2 1 "gray") (Cell 1 1 (if fire then "orange" else "white")) (Cell 0 2 "gray") (Cell 0 3 "gray") (Cell 2 2 "gray") (Cell 2 3 "gray") (Cell 1 2 (if (> gas 20) then "yellow" else "white")) (Cell 1 3 (if (> gas 0) then "yellow" else "white"))))

  (object Person (: health Number)
  	(map
  		(--> (i) (Cell i 0 (if (<= i health) then "blue" else "black" )))
  		(range 0 GRID_SIZE)
  	)
  )

  (object Meat (: cooked Number)  (Cell 0 0 (if (< cooked 10) then "lightblue" else (if (< cooked 30) then "pink" else (if (< cooked 60) then "sandybrown" else "brown")))))

  (object FillBBQ (Cell 0 0 "yellow"))

  (: bbq Bbq)
  (= bbq (initnext (Bbq true 65 (Position (- (/ GRID_SIZE 2) 1) (- GRID_SIZE 4)))
            (if (== (.. (prev bbq) gas) 0) then (updateObj (prev bbq) "fire" false) else
                  (if (.. (prev bbq) fire)
                    then (updateObj (prev bbq) "gas" (- (.. (prev bbq) gas) 1))
                    else (prev bbq)))))

  (: meat Meat)
  (= meat (initnext (Meat 0 (Position (/ GRID_SIZE 2) (- GRID_SIZE 4)))
          (if (.. bbq fire)
            then (updateObj (prev meat) "cooked" (+ (.. (prev meat) cooked) 1))
            else (prev meat))))


  (: fillButton FillBBQ)
  (= fillButton (initnext (FillBBQ (Position 0 (- GRID_SIZE 1))) (prev fillButton)))
   
  (: person Person)
  (= person (initnext (Person (/ GRID_SIZE 2) (Position 0 0)) (prev person)))

  (on (clicked bbq) (= bbq (if (== (.. (prev bbq) gas) 0) then (prev bbq) else (updateObj bbq "fire" (! (.. bbq fire))))))
  (on (clicked fillButton) (= bbq (updateObj bbq "gas" (+ (.. (prev bbq) gas) 5))))
  (on (clicked meat)
      (= person (if (< (.. person health) 0) 
        then (prev person)
        else (updateObj person "health" 
          (max -1 (min (- GRID_SIZE 1)
            (+ (.. person health)
              (if (< (.. meat cooked) 30) then -1
              else (if (> (.. meat cooked) 60) then -2
              else 1)))))))))
  (on (clicked meat)
    (= meat (updateObj meat "cooked" 0)))
)`,

};
