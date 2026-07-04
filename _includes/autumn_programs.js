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
  // AutumnBench env `mario` (code N2NTD) from the official Zenodo release (record 19498269).
  "Mario": `(program
  (= GRID_SIZE 12)
  (= background "white")
 (= FRAME_RATE 7)
  
  (object Mario (: bullets Number) (Cell 0 0 "red"))
  (object Step (: movingLeft Bool) (list (Cell -1 0 "darkorange") (Cell 0 0 "darkorange") (Cell 1 0 "darkorange")))
  (object Coin (Cell 0 0 "gold"))
  (object Enemy (: movingLeft Bool) (: lives Number) (list (Cell -1 0 "blue") (Cell 0 0 "blue") (Cell 1 0 "blue")
                                      (Cell -1 1 "blue") (Cell 0 1 "blue") (Cell 1 1 "blue")))
  (object Bullet (Cell 0 0 "mediumpurple"))
  
  (: mario Mario)
  (= mario (initnext (Mario 0 (Position 6 11)) (if (intersects (moveDown (prev mario)) (prev coins)) then (moveDown (prev mario)) else (moveDownNoCollision (prev mario)))))
  
  (: steps (List Step))
  (= steps (initnext (list (Step true (Position 1 10)) (Step true (Position 5 8)) (Step true (Position 9 6))) (updateObj (prev steps) (--> step (if (.. step movingLeft) then (moveLeft step) else (moveRight step))))))
  
  (: coins (List Coin))
  (= coins (initnext (list (Coin (Position 1 9)) (Coin (Position 7 4)) (Coin (Position 9 5))) (prev coins)))
  
  (: enemy Enemy)
  (= enemy (initnext (Enemy true 1 (Position 5 0)) (if (.. (prev enemy) movingLeft) then (moveLeft (prev enemy)) else (moveRight (prev enemy)))))
  
  (: bullets (List Bullet))
  (= bullets (initnext (list) (updateObj (prev bullets) (--> obj (if (intersects (moveUp obj) (prev steps)) then (removeObj obj) else (moveUp obj))))))
  
  (: enemyLives Number)
  (= enemyLives (initnext 1 (prev enemyLives)))
  
  (on (& (defined "enemy") ( == (.. (.. (prev enemy) origin) x) 1)) (= enemy (moveRight (updateObj (prev enemy) "movingLeft" false))))
  (on (& (defined "enemy") (== (.. (.. (prev enemy) origin) x) 10)) (= enemy (moveLeft (updateObj (prev enemy) "movingLeft" true))))
  
  (on left (= mario (if (intersects (moveLeft (prev mario)) (prev coins)) then (moveLeft (prev mario)) else (moveLeftNoCollision (prev mario)))))
  (on right (= mario (if (intersects (moveRight (prev mario)) (prev coins)) then (moveRight (prev mario)) else (moveRightNoCollision (prev mario)))))
  (on (& ((up)) (== (moveDownNoCollision (prev mario)) (prev mario))) (= mario (moveNoCollision (prev mario) 0 -4)))

  (on true (= steps (updateObj (prev steps) (--> step (updateObj step "movingLeft" false)) (--> step (== (.. (.. step origin) x) 1)))))
  (on true (= steps (updateObj (prev steps) (--> step (updateObj step "movingLeft" true)) (--> step (== (.. (.. step origin) x) 10)))))
  
  (on (intersects (prev mario) (prev coins)) 
    (let (= coins (removeObj (prev coins) (--> (obj) (intersects obj (prev mario))))) 
          (= mario (moveDownNoCollision (updateObj (prev mario) "bullets" (+ (.. (prev mario) bullets) 1))))) )
  
  (on (& ((clicked)) (> (.. (prev mario) bullets) 0)) 
    (let (= bullets (addObj (prev bullets) (Bullet (.. (prev mario) origin)))) 
          (= mario (moveDownNoCollision (updateObj (prev mario) "bullets" (- (.. (prev mario) bullets) 1))))
          true
          ))
  
  (on (& (defined "enemy") (intersects (prev enemy) (prev bullets)))
    (let (= bullets (removeObj (prev bullets) (--> obj (intersects obj (prev enemy))))) 
          (= enemy (if (== (prev enemyLives) 1) then (removeObj (prev enemy)) else (if (.. (prev enemy) movingLeft) then (moveLeft (prev enemy)) else (moveRight (prev enemy))) ))
          (= enemyLives (- (prev enemyLives) 1)))
          true
    )
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

  // AutumnBench env `ants` (code S2KT7) from the official Zenodo release (record 19498269).
  "ants": `(program
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

  // AutumnBench env `bottle` (code ADA85) from the official Zenodo release (record 19498269).
  "bottle": `(program 
  (= GRID_SIZE 11)

  (object Suzie (Cell 0 0 "blue"))
  (object Billy (Cell 0 0 "red"))

  (object Bottle (: broken Bool) (list (Cell 0 0 (if broken then "yellow" else "white"))
                                        (Cell 0 1 (if broken then "white" else "yellow"))
                                        (Cell 0 2 (if broken then "gold" else "yellow"))
                                        (Cell 0 3 (if broken then "white" else "yellow"))
                                        (Cell 0 4 (if broken then "yellow" else "white"))))

  (object BottleSpot (Cell 0 0 "white"))
  (object Rock (: breaksBottle Bool) (Cell 0 0 "gray"))

  (: suzie Suzie)
  (= suzie (Suzie (Position 0 0)))

  (: billy Billy)
  (= billy (Billy (Position 0 (- GRID_SIZE 1))))

  (: bottleSpot BottleSpot)
  (= bottleSpot (initnext (BottleSpot (Position (- GRID_SIZE 1) (/ GRID_SIZE 2))) (BottleSpot (Position (- GRID_SIZE 1) (/ GRID_SIZE 2)))))

  (: rocks (List Rock))
  (= rocks
    (initnext (list)
              (updateObj (prev rocks) (--> obj
                              (if (intersects bottleSpot obj) then (removeObj obj)
                                else (move obj (unitVector obj bottleSpot)))))))
  
  (= nextBottle (fn (bot rockst bottleSpott) (if 
  (> (length (filter (--> r (& (.. r breaksBottle) (intersects bottleSpott r))) rockst)) 0)
  then (updateObj bot "broken" true) 
  else bot)))

  (: bottle Bottle)
  (= bottle (initnext (Bottle false (Position (- GRID_SIZE 1) (- (/ GRID_SIZE 2) 2))) (nextBottle (prev bottle) (prev rocks) (prev bottleSpot))))

  (on (clicked suzie) (= rocks (addObj (prev rocks) (Rock (uniformChoice (list true false)) (Position 0 0)))))
  (on (clicked billy) (= rocks (addObj (prev rocks) (Rock (uniformChoice (list true false)) (Position 0 (- GRID_SIZE 1))))))
  (on (clicked bottle) (if (.. bottle broken) then (= bottle (updateObj bottle "broken" false)) else true))
  )`,

  // AutumnBench env `buoyancy` (code NRDF6) from the official Zenodo release (record 19498269).
  "buoyancy": `(program
    (= GRID_SIZE 7)

    (object Crate (: addWeight Number) (list (Cell -2 -1 "brown") (Cell 2 -1 "brown") (Cell -2 0 "brown") (Cell 2 0 "brown") 
    (Cell -2 1 "brown") (Cell -1 1 "brown") (Cell 0 1 "brown") (Cell 1 1 "brown") (Cell 2 1 "brown")))
    
    (object Rock (list (Cell 0 0 "silver")))
    (object Water (Cell 0 0 "blue"))

    ; rock in crate sinks the crate
    (= inCrate (--> (rock) (let 
        (= crateOrigin (.. crate origin))
        ; (= box (rect (Position (- (.. crateOrigin x) 2) 0) (Position (+ (.. crateOrigin x) 3) (+ (.. crateOrigin y) 1))))
        (= rock_x (.. (.. rock origin) x))
        (= rock_y (.. (.. rock origin) y))
        (= res (and (and (>= rock_x (- (.. crateOrigin x) 2)) (< rock_x (+ (.. crateOrigin x) 3))) (and (>= rock_y 0) (< rock_y (+ (.. crateOrigin y) 1)))))
        res
    )))

    (= nextCrate (--> (crate rocks) (let
        (= rocksInCrate (filter (--> r (inCrate r)) rocks))
        (= weight (length rocksInCrate))
        (if (& (< (.. crate addWeight) weight) (< weight 5)) then (moveDown (updateObj crate "addWeight" (+ (.. crate addWeight) 1))) else crate)
    )))

    (: water (List Water))
    (= water (initnext (map (--> p (Water p)) (rect (Position 0 3) (Position GRID_SIZE GRID_SIZE))) (updateObj water (--> w (if (intersectsPosPoss (.. w origin) (map (--> r (.. r origin)) rocks)) then (moveUp w) else (nextLiquid w))))))

    ; move down the rock if it is within bounds and does not collide with other rocks or the crate
    (= nextRock (--> (rock) (let
        (= next_rock (moveDown rock))
        (= crate_origin (.. crate origin))
        (= crate_pos (list (Position (- (.. crate_origin x) 2) (- (.. crate_origin y) 1)) (Position (+ (.. crate_origin x) 2) (- (.. crate_origin y) 1))
        (Position (- (.. crate_origin x) 2) (.. crate_origin y)) (Position (+ (.. crate_origin x) 2) (.. crate_origin y))
        (Position (- (.. crate_origin x) 2) (+ (.. crate_origin y) 1)) (Position (- (.. crate_origin x) 1) (+ (.. crate_origin y) 1))
        (Position (.. crate_origin x) (+ (.. crate_origin y) 1)) (Position (+ (.. crate_origin x) 1) (+ (.. crate_origin y) 1))
        (Position (+ (.. crate_origin x) 2) (+ (.. crate_origin y) 1))))
        (= noObjBelow (if (in (.. next_rock origin) (vcat (list crate_pos (map (--> r (.. r origin)) rocks)))) then false else true))
        (= res (if (& (isWithinBounds next_rock) noObjBelow) then next_rock else rock))
        res
    )))

    (: rocks (List Rock))
    (= rocks (initnext (list) (updateObj rocks nextRock)))

    (: crate Crate)
    (= crate (initnext (Crate 0 (Position 3 1)) (nextCrate (prev crate) (prev rocks))))

    (on clicked (if (isFreePos (Position (.. click x) (.. click y))) then (= rocks (addObj rocks (Rock (Position (.. click x) (.. click y))))) else true))
)`,

  // AutumnBench env `coins` (code QFSVC) from the official Zenodo release (record 19498269).
  "coins": `(program
  (= GRID_SIZE 16)
  
  (object Agent (Cell 0 0 "red"))
  (object Coin (Cell 0 0 "gold"))
  (object Bullet (Cell 0 0 "mediumpurple"))

  (: agent Agent)
  (= agent (initnext (Agent (Position 7 9)) (prev agent)))

  (: coins (List Coin))
  (= coins (initnext (map (--> pos (Coin pos)) (filter (--> p (& (== (% (.. p y) 2) 0) (== (% (.. p x) 2) 0))) (rect (Position 3 2) (Position 13 5)))) (prev coins)))

  (: bullets (List Bullet))
  (= bullets (initnext (list) (prev bullets)))
  
  (: numBullets Int)
  (= numBullets (initnext 0 (prev numBullets)))
  
  (on left (= agent (moveLeft agent)))
  (on right (= agent (moveRight agent)))
  (on up (= agent (moveUp agent)))
  (on down (= agent (moveDown agent)))

  (on true (= bullets (updateObj bullets (--> obj (moveUp (obj))))))
  
  (on (& ((clicked)) (> (prev numBullets) 0)) 
      (let (= numBullets (- (prev numBullets) 1)) 
            (= bullets (addObj bullets (Bullet (.. (prev agent) origin))))))  

  (on (intersects (prev agent) (prev coins)) 
      (let (= numBullets (+ (prev numBullets) 1)) 
            (= coins (removeObj coins (--> obj (intersects (obj) (prev agent)))))))
)`,

  // AutumnBench env `disease` (code DQ8GC) from the official Zenodo release (record 19498269).
  "disease": `(program
(= GRID_SIZE 16)
(object Particle (: health Bool) (Cell 0 0 (if health then "gray" else "darkgreen")))
(: inactiveParticles (List Particle))
(= inactiveParticles (initnext (list (Particle true (Position 7 5)) (Particle true (Position 4 3)) (Particle true (Position 6 6)) (Particle true (Position 3 5))) (updateObj (prev inactiveParticles)
          (--> obj (if true then (updateObj obj "health" false) else obj))
          (--> obj (adj obj
                        (filter (--> o2 (! (.. o2 health))) (vcat (list (list (prev activeParticle)) (prev inactiveParticles))))
                        1)))))
(: activeParticle Particle)
(= activeParticle (initnext (Particle false (Position 2 2)) (prev activeParticle)))
(on (any (--> obj (! (.. obj health))) (adjacentObjs activeParticle 1)) (= activeParticle (updateObj activeParticle "health" false)))
(on (clicked (prev inactiveParticles)) (let 
        (= inactiveParticles (addObj (filter (--> obj (! (clicked obj))) (prev inactiveParticles)) activeParticle))
        (= activeParticle (head (objClicked (prev inactiveParticles))))
        true
        ))
(on left (= activeParticle (move (prev activeParticle) (Position -1 0))))
(on right (= activeParticle (move (prev activeParticle) (Position 1 0))))
(on up (= activeParticle (move (prev activeParticle) (Position 0 -1))))
(on down (= activeParticle (move (prev activeParticle) (Position 0 1))))
)`,

  // AutumnBench env `gravity` (code VQJH6) from the official Zenodo release (record 19498269).
  "gravity": `(program
    (= GRID_SIZE 17)
      
    (object Button (: color String) (Cell 0 0 color))
    (object Blob (list (Cell 0 -1 "blue") (Cell 0 0 "blue") (Cell 1 -1 "blue") (Cell 1 0 "blue")))
    
    (: leftButton Button)
    (= leftButton (initnext (Button "red" (Position 0 (/ GRID_SIZE 2))) (prev leftButton)))
    
    (: rightButton Button)
    (= rightButton (initnext (Button "darkorange" (Position (- GRID_SIZE 1) (/ GRID_SIZE 2))) (prev rightButton)))
      
    (: upButton Button)
    (= upButton (initnext (Button "gold" (Position (/ GRID_SIZE 2) 0)) (prev upButton)))
    
    (: downButton Button)
    (= downButton (initnext (Button "green" (Position (/ GRID_SIZE 2) (- GRID_SIZE 1))) (prev downButton)))
    
    (: blobs (List Blob))
    (= blobs (initnext (list) (prev blobs)))
    
    (: gravity String)
    (= gravity (initnext "down" (prev "gravity")))
    
    (on (== gravity "left") (= blobs (updateObj blobs (--> obj (moveLeft obj)))))
    (on (== gravity "right") (= blobs (updateObj blobs (--> obj (moveRight obj)))))
    (on (== gravity "up") (= blobs (updateObj blobs (--> obj (moveUp obj)))))
    (on (== gravity "down") (= blobs (updateObj blobs (--> obj (moveDown obj)))))
    
    (on (& ((clicked)) (isFreePos click)) (= blobs (addObj blobs (Blob (Position (.. click x) (.. click y))))) )
    
    (on (clicked leftButton) (= gravity "left"))
    
    (on (clicked rightButton) (= gravity "right"))
    
    (on (clicked upButton) (= gravity "up"))
    
    (on (clicked downButton) (= gravity "down"))
)`,

  // AutumnBench env `grow` (code 7XF97) from the official Zenodo release (record 19498269).
  "grow": `(program
  (= GRID_SIZE 16)
  
  (object Water (Cell 0 0 "blue"))
  (object Leaf (: color String) (Cell 0 0 color))
  (object Cloud (list (Cell -1 0 "gray") (Cell 0 0 "gray") (Cell 1 0 "gray") (Cell 2 0 "gray")
                      (Cell -1 1 "gray") (Cell 0 1 "gray") (Cell 1 1 "gray") (Cell 2 1 "gray")
                      (Cell -1 2 "gray") (Cell 0 2 "gray") (Cell 1 2 "gray") (Cell 2 2 "gray")))
  
  (object Sun (: movingLeft Bool) (list (Cell 0 0 "gold")
                                        (Cell 0 1 "gold")
                                        (Cell 1 0 "gold")
                                        (Cell 1 1 "gold")
                                        (Cell 0 2 "gold")
                                        (Cell 1 2 "gold")
                                        (Cell 2 0 "gold")
                                        (Cell 2 1 "gold")
                                        (Cell 2 2 "gold")))
  
  (: sun Sun)
  (= sun (initnext (Sun false (Position 0 0)) (prev sun)))
  
  (: water (List Water))
  (= water (initnext (list) (filter isWithinBounds (map (--> o (moveDown o)) (prev water))) ))
  
  (: cloud Cloud)
  (= cloud (initnext (Cloud (Position 13 0)) (prev cloud)))
  
  (: leaves (List Leaf))
  (= leaves (initnext (list (Leaf "green" (Position 1 15) ) (Leaf "green" (Position 3 15)) (Leaf "green" (Position 5 15)) (Leaf "green" (Position 7 15)) (Leaf "green" (Position 9 15)) (Leaf "green" (Position 11 15)) (Leaf "green" (Position 13 15)) (Leaf "green" (Position 15 15))) (prev leaves)))
  
  (on down
    (= water (addObj (prev water) (Water (.. (moveDown (prev cloud)) origin)))))
  
  (on (intersects (map (--> obj (moveDown obj)) (prev water) ) (prev leaves))
    (= water (filter (--> obj (!(intersects (moveDown obj) (prev leaves)))) water) ) )
  
  (on (and (intersects (map moveDown (prev water)) (filter (--> obj (== (.. obj color) "green")) (prev leaves))) (! (intersects (prev sun) (prev cloud))))
    (= leaves (addObj (prev leaves) (map (--> obj (Leaf (if (== (.. (.. (moveUp obj) origin) y) 12) then "mediumpurple" else "green") (.. (moveUp obj) origin))) (filter (--> obj (intersects (moveUp obj) (prev water))) (prev leaves))))))
    
  (on left (= cloud (moveLeft (prev cloud))))
  (on right (= cloud (moveRight (prev cloud))))
  
  (on (== (.. (.. (prev sun) origin) x) 0) (= sun (updateObj (prev sun) "movingLeft" false)))
  (on (== (.. (.. (prev sun) origin) x) (- GRID_SIZE 3)) (= sun (updateObj (prev sun) "movingLeft" true)))
  
  (on (clicked (prev sun)) (= sun (if (.. (prev sun) movingLeft) then (moveLeft (prev sun)) else (moveRight (prev sun)))))
)`,

  // AutumnBench env `hatch` (code AW9WD) from the official Zenodo release (record 19498269).
  "hatch": `(program
  (= GRID_SIZE 16)

  (object Eggshell (: broken Bool) (Cell 0 0 "tan"))
  (object Feather (: hidden Bool) (: color String) (Cell 0 0 color))

  (= makeEgg (fn () (list                                    
          (Eggshell false (Position 7 15)) 
          (Eggshell false (Position 8 15))
          (Eggshell false (Position 9 15))  
          (Eggshell false (Position 6 14)) 
          (Eggshell false (Position 7 14)) 
          (Eggshell false (Position 8 14)) 
          (Eggshell false (Position 9 14))
          (Eggshell false (Position 10 14)) 
          (Eggshell false (Position 5 13)) 
          (Eggshell false (Position 6 13))
          (Eggshell false (Position 7 13)) 
          (Eggshell false (Position 8 13)) 
          (Eggshell false (Position 9 13)) 
          (Eggshell false (Position 10 13))
          (Eggshell false (Position 11 13)) 
          (Eggshell false (Position 5 12)) 
          (Eggshell false (Position 6 12)) 
          (Eggshell false (Position 7 12))
          (Eggshell false (Position 8 12)) 
          (Eggshell false (Position 9 12)) 
          (Eggshell false (Position 10 12)) 
          (Eggshell false (Position 11 12))
          (Eggshell false (Position 5 11)) 
          (Eggshell false (Position 6 11)) 
          (Eggshell false (Position 7 11)) 
          (Eggshell false (Position 8 11))
          (Eggshell false (Position 9 11)) 
          (Eggshell false (Position 10 11)) 
          (Eggshell false (Position 11 11)) 
          (Eggshell false (Position 6 10)) 
          (Eggshell false (Position 7 10)) 
          (Eggshell false (Position 8 10)) 
          (Eggshell false (Position 9 10))
          (Eggshell false (Position 10 10))
          (Eggshell false (Position 7 9)) 
          (Eggshell false (Position 8 9)) 
          (Eggshell false (Position 9 9)))))

  (= makeChick (fn () (list (Feather true "orange" (Position 7 15))
            (Feather true  "orange" (Position 8 15))
            (Feather true  "yellow" (Position 6 14))
            (Feather true  "yellow" (Position 7 14))
            (Feather true  "yellow" (Position 8 14))
            (Feather true  "yellow" (Position 9 14))
            (Feather true  "yellow" (Position 6 13))
            (Feather true  "yellow" (Position 7 13))
            (Feather true  "yellow" (Position 8 13))
            (Feather true  "yellow" (Position 9 13))
            (Feather true  "yellow" (Position 6 12))
            (Feather true  "yellow" (Position 7 12))
            (Feather true  "yellow" (Position 8 12))
            (Feather true  "yellow" (Position 9 12))
            (Feather true  "yellow" (Position 9 11))
            (Feather true  "yellow" (Position 10 11))
            (Feather true  "orange" (Position 11 11))
            (Feather true  "yellow" (Position 9 10))
            )))


  (: feathers (List Feather))
  (= feathers (initnext ((makeChick)) (prev feathers)))



  (: eggshells (List Eggshell))
  (= eggshells (initnext ((makeEgg)) (nextEggshells (prev eggshells) (prev feathers))))


  (on (clicked eggshells) (= eggshells (updateObj (prev eggshells) 
                                                  (--> eggshell 
                                                        (if (clicked eggshell) 
                                                        then (updateObj eggshell "broken" true) 
                                                        else eggshell)))))
                        
  (= nextEggshells (--> (eggshells feathers) 
                        (let (= brokenEggshell (filter (--> (es) (.. es broken)) eggshells))
                             (= brokenEggshell (filter (--> (es) (! (intersects es feathers))) brokenEggshell))
                             (= unbrokenEggshell (filter (--> (es) (! (.. es broken) )) eggshells))
                             (= nextBrokenEggShell (map nextLiquid brokenEggshell))
                             (concat (list nextBrokenEggShell unbrokenEggshell)))))

)`,

  // AutumnBench env `ice` (code BT3GB) from the official Zenodo release (record 19498269).
  "ice": `(program
    (= GRID_SIZE 16)
    (object CelestialBody (: day Bool) (list (Cell 0 0 (if day then "gold" else "gray"))
                                            (Cell 0 1 (if day then "gold" else "gray"))
                                            (Cell 1 0 (if day then "gold" else "gray"))
                                            (Cell 1 1 (if day then "gold" else "gray"))))
    (object Cloud (list (Cell -1 0 "gray")
                        (Cell 0 0 "gray")
                        (Cell 1 0 "gray")))
    
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

  // AutumnBench env `lights` (code E3V6M) from the official Zenodo release (record 19498269).
  "lights": `(program
  (= GRID_SIZE 16)

  (object Lights (: turnedOn Bool) (: dir Number) 
  (map
    (--> (i)
      (Cell 
        (* i 
           (if (== dir 0) then 1 else
           (if (== dir 1) then 1 else
           (if (== dir 2) then 0 else
           (if (== dir 3) then -1 else
           (if (== dir 4) then -1 else
           (if (== dir 5) then -1 else
           (if (== dir 6) then 0 else
           (if (== dir 7) then 1 else
               0)))))))))
        (* i 
           (if (== dir 0) then 0 else
           (if (== dir 1) then 1 else
           (if (== dir 2) then 1 else
           (if (== dir 3) then 1 else
           (if (== dir 4) then 0 else
           (if (== dir 5) then -1 else
           (if (== dir 6) then -1 else
           (if (== dir 7) then -1 else
               0)))))))))
        (if turnedOn then "yellow" else "white")
      ))
    (range -2 3)))
  
  (: lights Lights)
  (= lights (initnext (Lights false 1 (Position 7 7))
                      (prev lights)))

  (on clicked (= lights (updateObj lights "turnedOn" (! (.. lights turnedOn)))))

  ; Move the lights up, down, left, and right if they are turned off
  (on (& up (! (.. lights turnedOn))) (= lights (updateObj lights moveUp)))
  (on (& down (! (.. lights turnedOn))) (= lights (updateObj lights moveDown)))
  (on (& left (! (.. lights turnedOn))) (= lights (updateObj lights moveLeft)))
  (on (& right (! (.. lights turnedOn))) (= lights (updateObj lights moveRight)))

  ;; ; rotate the lights if they are turned on
  (on (& (.. lights turnedOn) up) (= lights  (updateObj lights "dir" (% (+ (.. lights dir) 1) 8))))
  (on (& (.. lights turnedOn) down) (= lights  (updateObj lights "dir" (% (+ (.. lights dir) 7) 8))))
  (on (& (.. lights turnedOn) left) (= lights  (updateObj lights "dir" (% (+ (.. lights dir) 2) 8))))
  (on (& (.. lights turnedOn) right) (= lights  (updateObj lights "dir" (% (+ (.. lights dir) 6) 8))))

)`,

  // AutumnBench env `magnets` (code 7WWW9) from the official Zenodo release (record 19498269).
  "magnets": `(program
  (= GRID_SIZE 16)
  
  (object Magnet (: color String) (list (Cell 0 0 color) (Cell 0 1 color)))
  
  (: fixedMagnet Magnet)
  (= fixedMagnet (initnext (Magnet "red" (Position 7 7)) (prev fixedMagnet)))
  
  (: mobileMagnet Magnet)
  (= mobileMagnet (initnext (Magnet "blue" (Position 4 7)) (prev mobileMagnet)))
  
  (on left (= mobileMagnet (moveNoCollision (prev "mobileMagnet") -1 0)))
  (on right (= mobileMagnet (moveNoCollision (prev "mobileMagnet") 1 0)))
  (on up (= mobileMagnet (moveNoCollision (prev "mobileMagnet") 0 -1)))
  (on down (= mobileMagnet (moveNoCollision (prev "mobileMagnet") 0 1)))
  (on (adjacentElem (posPole mobileMagnet) (posPole fixedMagnet) 1) (= mobileMagnet (prev "mobileMagnet")))
  (on (adjacentElem (negPole mobileMagnet) (negPole fixedMagnet) 1) (= mobileMagnet (prev "mobileMagnet")))
  (on (in (deltaElem (posPole mobileMagnet) (negPole fixedMagnet)) attractVectors) (
    let
    (= mPos (posPole mobileMagnet))
    (= fNeg (negPole fixedMagnet))
    (= dvec (deltaElem mPos fNeg))
    (= mobileMagnet (move mobileMagnet (unitVectorSinglePos dvec))))
  )
  (on (in (deltaElem (negPole mobileMagnet) (posPole fixedMagnet)) attractVectors) (
    let
    (print "Here2")
    (= mobileMagnet (move mobileMagnet (unitVectorSinglePos (deltaElem (negPole mobileMagnet) (posPole fixedMagnet))))))
  )
    
  (= posPole (--> (magnet) (head (renderValue magnet))))  
  (= negPole (--> (magnet) (tail (renderValue magnet))))  
  
  (= attractVectors (list (Position 0 2) (Position 2 0) (Position -2 0) (Position 0 -2)))
)`,

  // AutumnBench env `paint` (code EAHCW) from the official Zenodo release (record 19498269).
  "paint": `(program
    (= GRID_SIZE 16)
    
    (object Particle (: color String) (Cell 0 0 color))
    
    (: particles (List Particle))
    (= particles (initnext (list) (prev "particles")))
    
    (: currColor String)
    (= currColor (initnext "red" (prev currColor)))

    (: active_arrow String)
    (= active_arrow (initnext "none" (prev active_arrow)))
    
    (on clicked (= particles (addObj (prev "particles") (Particle (if (== active_arrow "none") then "red" else currColor) (Position (.. click x) (.. click y))))))
    (on up (let (= currColor "gold") (= active_arrow "up")))
    (on down (let (= currColor "purple") (= active_arrow "down")))
    (on left (let (= currColor "green") (= active_arrow "left")))
    (on right (let (= currColor "blue") (= active_arrow "right")))

    (on (and down (== (prev active_arrow) "up")) (let (= active_arrow "none") (= currColor "red")))
    (on (and up (== (prev active_arrow) "down")) (let (= active_arrow "none") (= currColor "red")))
    (on (and left (== (prev active_arrow) "right")) (let (= active_arrow "none") (= currColor "red")))
    (on (and right (== (prev active_arrow) "left")) (let (= active_arrow "none") (= currColor "red")))
)`,

  // AutumnBench env `particles` (code 83WKQ) from the official Zenodo release (record 19498269).
  "particles": `(program
         (= GRID_SIZE 16) ;16x16 grid

         (object Particle (Cell 0 0 "blue"))

         (: particles (List Particle))
         (= particles 
            (initnext (list) 
                      (updateObj (prev particles) (--> obj (updateObj obj "origin" (uniformChoice (adjPositions (.. obj origin))))))))

         (on clicked (= particles (addObj (prev particles) (Particle (Position (.. click x) (.. click y)))))))`,

  // AutumnBench env `sand` (code VA6FQ) from the official Zenodo release (record 19498269).
  "sand": `(program
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
    ; (= poss (rect (Position (- (.. (.. obj1 origin) x) unitSize) (- (.. (.. obj1 origin) y) unitSize)) (Position (+ (.. (.. obj1 origin) x) (+ unitSize 1)) (+ (.. (.. obj1 origin) y) (+ unitSize 1)))))
    (= poss (list (Position (- (.. (.. obj1 origin) x) 1) (.. (.. obj1 origin) y)) (Position (+ (.. (.. obj1 origin) x) 1) (.. (.. obj1 origin) y)) (Position (.. (.. obj1 origin) x) (- (.. (.. obj1 origin) y) 1)) (Position (.. (.. obj1 origin) x) (+ (.. (.. obj1 origin) y) 1))))
    (filter (--> obj2 (in (.. obj2 origin) poss)) objs)
  )))
  
  (on true (= sand (updateObj (prev sand) (--> obj (let
  (= adjWater (!= 0 (length (adjacentObjsTemp obj (prev water)))))
  (= obj (if adjWater then(updateObj obj "liquid" true) else obj))
  (if (.. obj liquid) then (nextLiquid obj) else (nextSolid obj))
  )))))
    
  (on (clicked sandButton) (= clickType "sand"))
  (on (clicked waterButton) (= clickType "water"))
  (on (& (& ((clicked)) (isFreePos click)) (== clickType "sand"))  (= sand (addObj sand (Sand false (Position (.. click x) (.. click y))))))
  (on (& (& ((clicked)) (isFreePos click)) (== clickType "water")) (= water (addObj water (Water (Position (.. click x) (.. click y))))))   
)`,

  // AutumnBench env `space_invaders` (code F5W3N) from the official Zenodo release (record 19498269).
  "space_invaders": `(program
(= GRID_SIZE 16)

(object Enemy (Cell 0 0 "blue"))
(object Hero (: alive Bool) (Cell 0 0 (if alive then "gray" else "black")))
(object Bullet (Cell 0 0 "red"))
(object EnemyBullet (Cell 0 0 "orange"))

(: enemies1 (List Enemy))
(= enemies1 (initnext (map 
                        (--> pos (Enemy pos)) 
                        (filter (--> pos (and (== (.. pos y) 1) (== (% (.. pos x) 3) 1))) (allPositions GRID_SIZE)))
                      (prev "enemies1")))

(: enemies2 (List Enemy))
(= enemies2 (initnext (map 
                        (--> pos (Enemy pos)) 
                        (filter (--> pos (and (== (.. pos y) 3) (== (% (.. pos x) 3) 2))) (allPositions GRID_SIZE)))
                      (prev "enemies2")))


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
  (let (= bullets (removeObj (prev "bullets") (--> obj (intersects obj (prev "enemies1")))))
        (= enemies1 (removeObj (prev "enemies1") (--> obj (intersects obj (prev "bullets"))))))
)          
        
(on (intersects (prev "bullets") (prev "enemies2"))
  (let (= bullets (removeObj (prev "bullets") (--> obj (intersects obj (prev enemies2)))))
        (= enemies2 (removeObj (prev "enemies2") (--> obj (intersects obj (prev bullets))))))
)
        
(on (== (% time 15) 3) (= enemyBullets (if (and (== (length (prev "enemies1")) 0) (== (length (prev "enemies2")) 0)) then (prev "enemyBullets") else (addObj enemyBullets (EnemyBullet (uniformChoice (map (--> obj (.. obj origin)) (vcat (list (prev "enemies1") (prev "enemies2"))))))))))         
(on (intersects (prev "hero") (prev "enemyBullets")) (= hero (updateObj (prev "hero") "alive" false))
)

(on (intersects (prev "bullets") (prev "enemyBullets")) 
  (let 
    (= bullets (removeObj (prev "bullets") (--> obj (intersects obj (prev enemyBullets))))) 
    (= enemyBullets (removeObj (prev "enemyBullets") (--> obj (intersects obj (prev bullets)))))
    true
    ))           
)`,

  // AutumnBench env `waterplug` (code NTQ4Y) from the official Zenodo release (record 19498269).
  "waterplug": `(program
    (= GRID_SIZE 16)
    
    (object Button (: color String) (Cell 0 0 color))
    (object Vessel (Cell 0 0 "purple"))
    (object Plug (Cell 0 0 "orange"))
    (object Water (Cell 0 0 "blue"))
    
    (: vesselButton Button)
    (= vesselButton (Button "purple" (Position 2 0)))
    (: plugButton Button)
    (= plugButton (Button "orange" (Position 5 0)))
    (: waterButton Button)
    (= waterButton (Button "blue" (Position 8 0)))
    (: removeButton Button)
    (= removeButton (Button "gray" (Position 11 0)))
    (: clearButton Button)
    (= clearButton (Button "red" (Position 14 0)))
    
    (: vessels (List Vessel))
    (= vessels (initnext (list (Vessel (Position 6 15)) (Vessel (Position 6 14)) (Vessel (Position 6 13)) (Vessel (Position 5 12)) (Vessel (Position 4 11)) (Vessel (Position 3 10)) (Vessel (Position 9 15)) (Vessel (Position 9 14)) (Vessel (Position 9 13)) (Vessel (Position 10 12)) (Vessel (Position 11 11)) (Vessel (Position 12 10))) (prev "vessels")))
    (: plugs (List Plug))
    (= plugs (initnext (list (Plug (Position 7 15)) (Plug (Position 8 15)) (Plug (Position 7 14)) (Plug (Position 8 14)) (Plug (Position 7 13)) (Plug (Position 8 13))) (prev "plugs")))

    (: waterList (List Water))
    (= waterList (initnext (list) (prev "waterList")))
    
    (: currentParticle String)
    (= currentParticle (initnext "vessel" (prev "currentParticle")))
    
    (on true (= waterList (updateObj (prev "waterList") nextLiquid)))

    (on (and ((clicked)) (and (isFreePos click) (== currentParticle "vessel"))) (= vessels (addObj vessels (Vessel (Position (.. click x) (.. click y))))))

    (on (and ((clicked)) (and (isFreePos click) (== currentParticle "plug"))) (= plugs (addObj plugs (Plug (Position (.. click x) (.. click y))))))

    (on (and ((clicked)) (and (isFreePos click) (== currentParticle "water"))) (= waterList (addObj waterList (Water (Position (.. click x) (.. click y))))))

    (on (clicked vesselButton) (= currentParticle "vessel"))
    (on (clicked plugButton) (= currentParticle "plug"))
    (on (clicked waterButton) (= currentParticle "water"))

    (on (clicked removeButton) (= plugs (removeObj plugs (--> obj true))))

    (on (clicked clearButton) (
      let (= vessels (removeObj vessels (--> obj true)))
          (= plugs (removeObj plugs (--> obj true)))
          (= waterList (removeObj waterList (--> obj true)))))
)`,

  // AutumnBench env `wind` (code DGG2C) from the official Zenodo release (record 19498269).
  "wind": `(program
  (= GRID_SIZE 17)
  
  (object Water (Cell 0 0 "lightblue"))
  (: water (List Water))
  (= water (initnext (list) (filter isWithinBounds (prev water))))

  (object Cloud (map (--> pos (Cell (.. pos x) (.. pos y) "gray")) (rect (Position 0 0) (Position 17 2))))
  (: cloud Cloud)
  (= cloud (initnext (Cloud (Position 0 0)) (prev cloud)))
  
  (: wind Number)
  (= wind (initnext 0 (prev wind)))
  
  (: time Number)
  (= time (initnext 0 (+ (prev time) 1)))
  
  (on (== wind 0) (= water (updateObj (prev water) (--> obj (moveDown obj)))))
  (on (== wind 1) (= water (updateObj (prev water) (--> obj (moveRight (moveDown obj))))))
  (on (== wind -1) (= water (updateObj (prev water) (--> obj (moveLeft (moveDown obj))))))
  
  (on left (= wind (if (== (prev wind) -1) then (prev wind) else (- (prev wind) 1))))
  (on right (= wind (if (== (prev wind) 1) then (prev wind) else (+ (prev wind) 1))))
  
  
  (on (== (% time 5) 2) 
    (= water (addObj 
              water 
              (map (--> pos (Water pos)) (list (Position 2 2)
                                                
                                              (Position 6 2)
                                              
                                              (Position 10 2)
                                              
                                              (Position 14 2))))))
)`,

};
