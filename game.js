/* ESCAPE THE CHANGING MAZE – v3: Fair + Addictive
   Braided maze (no dead-ends), anti-cornering AI, Blast emergency,
   combo system, dash, particles, 5 power-ups, 3 enemy types, minimap */
"use strict";

// === SOUND ===
const SoundFX=(()=>{let c;const g=()=>{if(!c)c=new(window.AudioContext||window.webkitAudioContext)();return c;};
function p(f,t,d,v=.12){try{const x=g(),o=x.createOscillator(),a=x.createGain();o.type=t;o.frequency.value=f;a.gain.setValueAtTime(v,x.currentTime);a.gain.exponentialRampToValueAtTime(.001,x.currentTime+d);o.connect(a).connect(x.destination);o.start();o.stop(x.currentTime+d);}catch(e){}}
return{coin(){p(880,"square",.08,.08);setTimeout(()=>p(1200,"square",.1,.08),50)},
combo(){p(1200,"sine",.1,.1);setTimeout(()=>p(1500,"sine",.12,.1),40)},
powerup(){p(523,"sine",.1);setTimeout(()=>p(784,"sine",.15),60)},
exit(){[0,60,120,180].forEach((d,i)=>setTimeout(()=>p(600+i*180,"sine",.18,.1),d))},
dash(){p(300,"sawtooth",.08,.08);p(450,"sine",.12,.06)},
shield(){p(660,"triangle",.15,.08)},
nearMiss(){p(1400,"sine",.06,.06);setTimeout(()=>p(1800,"sine",.06,.04),30)},
tick(){p(1000,"sine",.04,.04)},
gameOver(){[0,120,240].forEach((d,i)=>setTimeout(()=>p(350-i*90,"sawtooth",.2,.08),d))},
hit(){p(100,"sawtooth",.25,.1);p(80,"square",.3,.06)},
timeBonus(){p(700,"sine",.08,.08);setTimeout(()=>p(900,"sine",.1,.08),50)},
magnet(){p(400,"triangle",.12,.08)},
blast(){p(200,"sawtooth",.15,.15);p(350,"square",.2,.1);setTimeout(()=>p(100,"sine",.3,.08),80)},
};})();

// === MAZE ===
const Maze=(()=>{
  /** Generate braided maze: recursive backtracker then remove most dead-ends */
  function generate(cols,rows,braidFactor=0.8){
    const grid=Array.from({length:rows},()=>Array(cols).fill(0));
    const vis=Array.from({length:rows},()=>Array(cols).fill(false));
    const dirs=[{dr:-1,dc:0,w:1,o:4},{dr:0,dc:1,w:2,o:8},{dr:1,dc:0,w:4,o:1},{dr:0,dc:-1,w:8,o:2}];
    const stk=[{r:0,c:0}]; vis[0][0]=true;
    while(stk.length){
      const{r,c}=stk[stk.length-1]; const nb=[];
      for(const d of dirs){const nr=r+d.dr,nc=c+d.dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!vis[nr][nc])nb.push({nr,nc,...d});}
      if(!nb.length){stk.pop();continue;}
      const n=nb[Math.floor(Math.random()*nb.length)];
      grid[r][c]|=n.w; grid[n.nr][n.nc]|=n.o; vis[n.nr][n.nc]=true; stk.push({r:n.nr,c:n.nc});
    }
    // Braid: remove dead-ends by opening a random wall
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      if(Math.random()>braidFactor) continue;
      const cell=grid[r][c]; let openCount=0;
      if(cell&1)openCount++; if(cell&2)openCount++; if(cell&4)openCount++; if(cell&8)openCount++;
      if(openCount<=1){// dead-end
        const closed=[];
        if(!(cell&1)&&r>0)closed.push({w:1,o:4,nr:r-1,nc:c});
        if(!(cell&2)&&c<cols-1)closed.push({w:2,o:8,nr:r,nc:c+1});
        if(!(cell&4)&&r<rows-1)closed.push({w:4,o:1,nr:r+1,nc:c});
        if(!(cell&8)&&c>0)closed.push({w:8,o:2,nr:r,nc:c-1});
        if(closed.length){const w=closed[Math.floor(Math.random()*closed.length)];grid[r][c]|=w.w;grid[w.nr][w.nc]|=w.o;}
      }
    }
    return grid;
  }
  function bfs(grid,sr,sc,er,ec){
    const rows=grid.length,cols=grid[0].length;
    const vis=Array.from({length:rows},()=>Array(cols).fill(false));
    const prev=Array.from({length:rows},()=>Array(cols).fill(null));
    const q=[{r:sr,c:sc}]; vis[sr][sc]=true;
    const wb=[{dr:-1,dc:0,bit:1},{dr:0,dc:1,bit:2},{dr:1,dc:0,bit:4},{dr:0,dc:-1,bit:8}];
    while(q.length){const{r,c}=q.shift();if(r===er&&c===ec){const p=[];let cur={r,c};while(cur){p.unshift(cur);cur=prev[cur.r][cur.c];}return p;}
    for(const w of wb){if(!(grid[r][c]&w.bit))continue;const nr=r+w.dr,nc=c+w.dc;if(nr<0||nr>=rows||nc<0||nc>=cols||vis[nr][nc])continue;vis[nr][nc]=true;prev[nr][nc]={r,c};q.push({r:nr,c:nc});}}return null;
  }
  /** Count open exits from a cell */
  function exits(grid,r,c){let n=0;const cell=grid[r][c];if(cell&1)n++;if(cell&2)n++;if(cell&4)n++;if(cell&8)n++;return n;}
  return{generate,bfs,exits};
})();

// === PARTICLES ===
const Particles=(()=>{const pool=[];
  function spawn(x,y,n,color,speed,life,size){for(let i=0;i<n&&pool.length<250;i++){const a=Math.random()*6.28,s=speed*(.5+Math.random()*.8);pool.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,ml:life,color,size:size*(.6+Math.random()*.6)});}}
  function update(dt){for(let i=pool.length-1;i>=0;i--){const p=pool[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt;if(p.life<=0)pool.splice(i,1);}}
  function render(ctx){for(const p of pool){const a=Math.max(0,p.life/p.ml);ctx.globalAlpha=a;ctx.fillStyle=p.color;const s=p.size*a;ctx.fillRect(p.x-s/2,p.y-s/2,s,s);}ctx.globalAlpha=1;}
  function clear(){pool.length=0;} return{spawn,update,render,clear};
})();

// === UI ===
const UI=(()=>{
  function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));document.getElementById(id).classList.add("active");}
  function updateHUD(d){setText("display-level",d.level);setText("display-score",d.score);setText("display-timer",d.timeLeft);setText("display-coins",d.coins);
    const ce=document.getElementById("display-combo"),ci=document.getElementById("hud-combo");
    if(d.combo>1){ce.textContent="×"+d.combo;ci.classList.add("active");setTimeout(()=>ci.classList.remove("active"),300);}else{ce.textContent="—";}
    document.getElementById("display-dash").textContent="●".repeat(d.dashCharges)+"○".repeat(Math.max(0,3-d.dashCharges));
    document.getElementById("display-blast").textContent=d.blastCharges;}
  function setText(id,v){const e=document.getElementById(id);if(e.textContent!=v){e.textContent=v;e.classList.remove("bump");void e.offsetWidth;e.classList.add("bump");}}
  function updatePowerups(now,b){const c=document.getElementById("powerup-indicators");let h="";
    if(now<b.speed)h+=`<div class="pu-indicator pu-speed">⚡ Speed ${Math.ceil((b.speed-now)/1000)}s</div>`;
    if(now<b.freeze)h+=`<div class="pu-indicator pu-freeze">❄ Freeze ${Math.ceil((b.freeze-now)/1000)}s</div>`;
    if(now<b.shield)h+=`<div class="pu-indicator pu-shield">🛡 Shield ${Math.ceil((b.shield-now)/1000)}s</div>`;
    if(now<b.magnet)h+=`<div class="pu-indicator pu-magnet">🧲 Magnet ${Math.ceil((b.magnet-now)/1000)}s</div>`;
    c.innerHTML=h;}
  function scorePopup(rect,cx,cy,text,color){const e=document.createElement("div");e.className="score-popup";e.textContent=text;e.style.color=color;e.style.left=(rect.left+cx)+"px";e.style.top=(rect.top+cy)+"px";document.getElementById("popup-layer").appendChild(e);setTimeout(()=>e.remove(),900);}
  function toast(text){const e=document.createElement("div");e.className="toast";e.textContent=text;document.getElementById("toast-container").appendChild(e);setTimeout(()=>e.remove(),3000);}
  function shake(){const c=document.getElementById("game-canvas");c.classList.remove("shake");void c.offsetWidth;c.classList.add("shake");}
  function showLeaderboard(){const l=document.getElementById("leaderboard-list");const s=JSON.parse(localStorage.getItem("maze_lb")||"[]");
    if(!s.length){l.innerHTML='<div class="lb-empty">No scores yet!</div>';}else{l.innerHTML=s.sort((a,b)=>b.score-a.score).slice(0,10).map((s,i)=>`<div class="lb-row"><span class="lb-rank">${i+1}.</span><span class="lb-name">${esc(s.name)}</span><span class="lb-score">${s.score}</span><span class="lb-level">Lv.${s.level}</span></div>`).join("");}showScreen("leaderboard-screen");}
  function saveScore(){const inp=document.getElementById("player-name");const nm=inp.value.trim()||"Anonymous";const s=JSON.parse(localStorage.getItem("maze_lb")||"[]");s.push({name:nm,score:+document.getElementById("go-score").textContent,level:+document.getElementById("go-level").textContent,date:Date.now()});localStorage.setItem("maze_lb",JSON.stringify(s));document.getElementById("name-entry").style.display="none";inp.value="";}
  function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  return{showScreen,updateHUD,updatePowerups,scorePopup,toast,shake,showLeaderboard,saveScore};
})();

// === GAME ===
const Game=(()=>{
const canvas=document.getElementById("game-canvas"),ctx=canvas.getContext("2d");
const miniC=document.getElementById("minimap-canvas"),miniCtx=miniC.getContext("2d");
let state="menu",level=1,score=0,coinsCollected=0,timeLeft=60,timerInt=null,animId=null;
let combo=0,comboTimer=0,bestCombo=0;const COMBO_WIN=2500;
let dashCharges=3,dashRecharge=0,isDashing=false,dashTimer=0,dashDR=0,dashDC=0;
const DASH_MAX=3,DASH_CD=4,DASH_DUR=.15;
let blastCharges=1; // Emergency blast charges
let nearMissCount=0,nearMissCDs=[];
const achs=new Set();
let grid=[],mazeCols=0,mazeRows=0,cellSize=0;
let player={r:0,c:0,x:0,y:0,speed:0},exitCell={r:0,c:0};
let enemies=[],coins=[],powerups=[],trail=[];
let boosts={speed:0,freeze:0,shield:0,magnet:0};
const keys={};let spaceJust=false,blastJust=false;
const FOG_R=4.5;let explored=[];

function cfg(l){return{
  cols:Math.min(8+l*2,32), rows:Math.min(8+l*2,26),
  enemies:Math.min(Math.floor(l*.6)+1,10),  // Fewer enemies early
  eSpeed:1.4+l*.2,                           // Slower ramp
  maxChasers:Math.min(1+Math.floor(l/3),4),  // Limit simultaneous chasers
  coins:6+l*3, powerups:2+Math.floor(l/2),
  time:Math.max(70-(l-1)*2,35),              // More time
  braidFactor:Math.max(.9-l*.03,.5),         // Less braiding at high levels
};}

function init(){
  window.addEventListener("keydown",e=>{if(!keys[e.key]){if(e.key===" ")spaceJust=true;if(e.key==="e"||e.key==="E"||e.key==="Shift")blastJust=true;}keys[e.key]=true;if(state==="playing"&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();});
  window.addEventListener("keyup",e=>{keys[e.key]=false;});
  window.addEventListener("resize",resizeCanvas);
}

function resizeCanvas(){if(state!=="playing")return;const mw=window.innerWidth-20,mh=window.innerHeight-130;cellSize=Math.max(Math.floor(Math.min(mw/mazeCols,mh/mazeRows)),14);canvas.width=mazeCols*cellSize;canvas.height=mazeRows*cellSize;const ms=Math.min(3,Math.floor(120/Math.max(mazeCols,mazeRows)));miniC.width=mazeCols*ms;miniC.height=mazeRows*ms;}

function start(){level=1;score=0;coinsCollected=0;bestCombo=0;achs.clear();setupLevel();}
function restart(){start();}
function nextLevel(){level++;setupLevel();}

function setupLevel(){
  state="playing"; UI.showScreen("game-screen");
  const c=cfg(level);
  mazeCols=c.cols;mazeRows=c.rows;timeLeft=c.time;
  boosts={speed:0,freeze:0,shield:0,magnet:0};
  combo=0;comboTimer=0;dashCharges=DASH_MAX;dashRecharge=0;isDashing=false;dashTimer=0;
  blastCharges=1+Math.floor(level/4); // Earn more blasts in later levels
  nearMissCount=0;trail=[];Particles.clear();

  // Generate braided maze (fewer dead-ends = fairer)
  grid=Maze.generate(mazeCols,mazeRows,c.braidFactor);
  explored=Array.from({length:mazeRows},()=>Array(mazeCols).fill(false));

  player={r:0,c:0,x:0,y:0,speed:4.5};
  exitCell=rndCell(Math.floor(mazeRows*.6),mazeRows-1,Math.floor(mazeCols*.6),mazeCols-1);

  // Spawn enemies with minimum distance from player
  enemies=[]; nearMissCDs=[];
  const minSpawnDist=Math.max(6,Math.floor(Math.max(mazeCols,mazeRows)*.3));
  for(let i=0;i<c.enemies;i++){
    let er,ec,att=0;
    do{er=ri(mazeRows);ec=ri(mazeCols);att++;}
    while((Math.abs(er-player.r)+Math.abs(ec-player.c)<minSpawnDist)&&att<150);
    let type="chaser";
    if(level>=3&&i%3===1)type="patrol";
    if(level>=5&&i%4===0)type="teleporter";
    enemies.push({r:er,c:ec,x:ec,y:er,speed:type==="patrol"?c.eSpeed*.7:c.eSpeed,path:[],pathTimer:0,frozen:false,type,patrolTarget:null,teleportTimer:6+Math.random()*6,stunTimer:0,isChasing:false});
    nearMissCDs.push(0);
  }

  // Coins
  coins=[];for(let i=0;i<c.coins;i++){const cell=rca([player,exitCell]);coins.push({r:cell.r,c:cell.c,collected:false,bob:Math.random()*6.28,sparkle:Math.random()*6.28});}
  // Power-ups (cycle through types, include rare ones)
  powerups=[];const puT=["speed","freeze","shield","time","magnet"];
  for(let i=0;i<c.powerups;i++){const cell=rca([player,exitCell,...coins]);powerups.push({r:cell.r,c:cell.c,type:puT[i%puT.length],collected:false,bob:Math.random()*6.28});}

  resizeCanvas();refreshHUD();startTimer();
  if(animId)cancelAnimationFrame(animId);lastT=performance.now();animId=requestAnimationFrame(loop);
}

function ri(n){return Math.floor(Math.random()*n);}
function rndCell(a,b,c,d){return{r:a+ri(b-a+1),c:c+ri(d-c+1)};}
function rca(av){let r,c,t=0;do{r=ri(mazeRows);c=ri(mazeCols);t++;}while(av.some(a=>a.r===r&&a.c===c)&&t<200);return{r,c};}
function refreshHUD(){UI.updateHUD({level,score,timeLeft,coins:coinsCollected,combo,dashCharges,blastCharges});}

function startTimer(){clearInterval(timerInt);timerInt=setInterval(()=>{if(state!=="playing")return;timeLeft--;if(timeLeft<=10){document.getElementById("hud-timer").classList.add("warning");SoundFX.tick();}else{document.getElementById("hud-timer").classList.remove("warning");}refreshHUD();if(timeLeft<=0)endGame("Time's up!");},1000);}

let lastT=0;
function loop(ts){if(state!=="playing")return;const dt=Math.min((ts-lastT)/1000,.05);lastT=ts;update(dt);render();animId=requestAnimationFrame(loop);}

// ========== UPDATE ==========
function update(dt){
  const now=performance.now();
  // Combo decay
  if(combo>0){comboTimer-=dt*1000;if(comboTimer<=0){combo=0;refreshHUD();}}
  // Dash recharge
  if(dashCharges<DASH_MAX){dashRecharge-=dt;if(dashRecharge<=0){dashCharges++;dashRecharge=DASH_CD;refreshHUD();}}
  if(isDashing){dashTimer-=dt;if(dashTimer<=0)isDashing=false;}

  // Input
  let dr=0,dc=0;
  if(keys["ArrowUp"]||keys["w"]||keys["W"])dr=-1;
  if(keys["ArrowDown"]||keys["s"]||keys["S"])dr=1;
  if(keys["ArrowLeft"]||keys["a"]||keys["A"])dc=-1;
  if(keys["ArrowRight"]||keys["d"]||keys["D"])dc=1;

  // === EMERGENCY BLAST (E or Shift key) ===
  if(blastJust&&blastCharges>0){
    blastCharges--;blastJust=false;SoundFX.blast();UI.shake();
    const px=player.x*cellSize+cellSize/2,py=player.y*cellSize+cellSize/2;
    Particles.spawn(px,py,35,"#ff3d00",160,.6,5);
    Particles.spawn(px,py,20,"#ffd740",120,.4,3);
    const cRect=canvas.getBoundingClientRect();
    UI.scorePopup(cRect,px,py,"💥 BLAST!","#ff3d00");
    // Push all enemies within 5 cells away and stun them
    for(const e of enemies){
      const d=Math.sqrt((e.x-player.x)**2+(e.y-player.y)**2);
      if(d<5){
        // Teleport enemy far away
        const pushDir={x:e.x-player.x,y:e.y-player.y};
        const pl=Math.sqrt(pushDir.x**2+pushDir.y**2)||1;
        let nr=Math.round(e.r+pushDir.y/pl*4);
        let nc=Math.round(e.c+pushDir.x/pl*4);
        nr=Math.max(0,Math.min(mazeRows-1,nr));
        nc=Math.max(0,Math.min(mazeCols-1,nc));
        Particles.spawn(e.x*cellSize+cellSize/2,e.y*cellSize+cellSize/2,10,"#ff5252",80,.4,3);
        e.r=nr;e.c=nc;e.x=nc;e.y=nr;e.path=[];e.stunTimer=3;e.pathTimer=3;
        Particles.spawn(e.x*cellSize+cellSize/2,e.y*cellSize+cellSize/2,10,"#ff5252",80,.4,3);
      }
    }
    if(!achs.has("blast1")){achs.add("blast1");UI.toast("💥 First Blast!");}
    refreshHUD();
  }
  blastJust=false;

  // Dash trigger
  if(spaceJust&&dashCharges>0&&!isDashing&&(dr||dc)){
    isDashing=true;dashTimer=DASH_DUR;dashDR=dr;dashDC=dc;dashCharges--;dashRecharge=DASH_CD;
    SoundFX.dash();Particles.spawn(player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,12,"#7c4dff",100,.4,4);refreshHUD();}
  spaceJust=false;

  let pSpeed=player.speed;
  if(now<boosts.speed)pSpeed*=1.8;
  if(isDashing)pSpeed*=4;

  // Move vertical
  if(dr!==0){const tR=player.r+dr;const can=dr===-1?(grid[player.r][player.c]&1):(grid[player.r][player.c]&4);
    if(can&&tR>=0&&tR<mazeRows){player.x+=(player.c-player.x)*Math.min(1,dt*15);player.y+=dr*pSpeed*dt;if(dr===-1&&player.y<=tR){player.y=tR;player.r=tR;}if(dr===1&&player.y>=tR){player.y=tR;player.r=tR;}}
    else{player.y+=(player.r-player.y)*Math.min(1,dt*15);}}
  else{player.y+=(player.r-player.y)*Math.min(1,dt*15);}
  // Move horizontal
  if(dc!==0){const tC=player.c+dc;const can=dc===-1?(grid[player.r][player.c]&8):(grid[player.r][player.c]&2);
    if(can&&tC>=0&&tC<mazeCols){player.y+=(player.r-player.y)*Math.min(1,dt*15);player.x+=dc*pSpeed*dt;if(dc===-1&&player.x<=tC){player.x=tC;player.c=tC;}if(dc===1&&player.x>=tC){player.x=tC;player.c=tC;}}
    else{player.x+=(player.c-player.x)*Math.min(1,dt*15);}}
  else{player.x+=(player.c-player.x)*Math.min(1,dt*15);}

  // Trail
  trail.push({x:player.x,y:player.y,t:now});if(trail.length>30)trail.shift();
  // Explore
  const fr=Math.ceil(FOG_R);for(let dr2=-fr;dr2<=fr;dr2++)for(let dc2=-fr;dc2<=fr;dc2++){const rr=player.r+dr2,cc=player.c+dc2;if(rr>=0&&rr<mazeRows&&cc>=0&&cc<mazeCols)explored[rr][cc]=true;}
  // Magnet
  if(now<boosts.magnet)for(const cn of coins){if(!cn.collected&&Math.sqrt((player.c-cn.c)**2+(player.r-cn.r)**2)<4){cn.r=player.r;cn.c=player.c;}}

  // Collect coins
  const cRect=canvas.getBoundingClientRect();
  for(const cn of coins){if(!cn.collected&&cn.r===player.r&&cn.c===player.c){cn.collected=true;coinsCollected++;combo++;comboTimer=COMBO_WIN;if(combo>bestCombo)bestCombo=combo;
    const mul=Math.min(combo,10),pts=10*mul;score+=pts;
    if(combo>=5)SoundFX.combo();else SoundFX.coin();
    const cx=cn.c*cellSize+cellSize/2,cy=cn.r*cellSize+cellSize/2;
    UI.scorePopup(cRect,cx,cy,`+${pts}${combo>1?" ×"+combo:""}`,combo>=5?"#ffd740":combo>=3?"#69f0ae":"#fff");
    Particles.spawn(cx,cy,8,"#ffd740",80,.5,3);
    if(combo===5&&!achs.has("c5")){achs.add("c5");UI.toast("🔥 5× Combo!");}
    if(combo===10&&!achs.has("c10")){achs.add("c10");UI.toast("💥 10× COMBO!");}
    refreshHUD();}}

  // Collect power-ups
  for(const pu of powerups){if(pu.collected||pu.r!==player.r||pu.c!==player.c)continue;pu.collected=true;
    const cx=pu.c*cellSize+cellSize/2,cy=pu.r*cellSize+cellSize/2;
    switch(pu.type){
      case"speed":boosts.speed=now+6000;SoundFX.powerup();UI.scorePopup(cRect,cx,cy,"⚡ SPEED!","#69f0ae");Particles.spawn(cx,cy,15,"#69f0ae",100,.6,4);break;
      case"freeze":boosts.freeze=now+5000;SoundFX.powerup();UI.scorePopup(cRect,cx,cy,"❄ FREEZE!","#40c4ff");Particles.spawn(cx,cy,15,"#40c4ff",100,.6,4);break;
      case"shield":boosts.shield=now+8000;SoundFX.shield();UI.scorePopup(cRect,cx,cy,"🛡 SHIELD!","#ffab40");Particles.spawn(cx,cy,15,"#ffab40",100,.6,4);break;
      case"time":timeLeft+=12;score+=25;SoundFX.timeBonus();UI.scorePopup(cRect,cx,cy,"+12s!","#00e5ff");Particles.spawn(cx,cy,12,"#00e5ff",90,.5,3);UI.toast("⏰ +12 seconds!");break;
      case"magnet":boosts.magnet=now+6000;SoundFX.magnet();UI.scorePopup(cRect,cx,cy,"🧲 MAGNET!","#ea80fc");Particles.spawn(cx,cy,15,"#ea80fc",100,.6,4);break;
    }refreshHUD();}
  UI.updatePowerups(now,boosts);

  // === SMART ENEMY AI ===
  const frozen=now<boosts.freeze;
  const c_=cfg(level);
  // Count how many are actively chasing
  let chaserCount=0;
  for(const e of enemies)if(e.isChasing&&!e.frozen)chaserCount++;

  for(let i=0;i<enemies.length;i++){
    const e=enemies[i];
    if(frozen){e.frozen=true;continue;} e.frozen=false;
    if(e.stunTimer>0){e.stunTimer-=dt;continue;} // Stunned by blast

    const distToPlayer=Math.abs(e.r-player.r)+Math.abs(e.c-player.c);

    if(e.type==="chaser"){
      // Only chase if under the chaser limit, otherwise patrol
      if(chaserCount<c_.maxChasers||e.isChasing){
        e.isChasing=true;
        e.pathTimer-=dt;
        if(e.pathTimer<=0||!e.path.length){
          // Imperfect pathfinding: 30% chance to target a cell near the player instead
          let tr=player.r,tc=player.c;
          if(Math.random()<.3){tr=Math.max(0,Math.min(mazeRows-1,tr+ri(5)-2));tc=Math.max(0,Math.min(mazeCols-1,tc+ri(5)-2));}
          e.path=Maze.bfs(grid,e.r,e.c,tr,tc)||[];
          if(e.path.length)e.path.shift();
          e.pathTimer=.4+Math.random()*.2; // Slight randomness
        }
      }else{
        e.isChasing=false;
        if(!e.path.length){const tr=ri(mazeRows),tc=ri(mazeCols);e.path=Maze.bfs(grid,e.r,e.c,tr,tc)||[];if(e.path.length)e.path.shift();}
      }
    }else if(e.type==="patrol"){
      if(!e.path.length){const tr=ri(mazeRows),tc=ri(mazeCols);e.path=Maze.bfs(grid,e.r,e.c,tr,tc)||[];if(e.path.length)e.path.shift();}
      // Chase if near
      if(distToPlayer<5){e.pathTimer-=dt;if(e.pathTimer<=0){e.path=Maze.bfs(grid,e.r,e.c,player.r,player.c)||[];if(e.path.length)e.path.shift();e.pathTimer=.6;}}
    }else if(e.type==="teleporter"){
      e.pathTimer-=dt;
      if(e.pathTimer<=0||!e.path.length){e.path=Maze.bfs(grid,e.r,e.c,player.r,player.c)||[];if(e.path.length)e.path.shift();e.pathTimer=.5;}
      e.teleportTimer-=dt;
      if(e.teleportTimer<=0){
        const cands=[];for(let rr=Math.max(0,player.r-5);rr<=Math.min(mazeRows-1,player.r+5);rr++)for(let cc=Math.max(0,player.c-5);cc<=Math.min(mazeCols-1,player.c+5);cc++)if(Math.abs(rr-player.r)+Math.abs(cc-player.c)>=3)cands.push({r:rr,c:cc});
        if(cands.length){const t=cands[ri(cands.length)];Particles.spawn(e.x*cellSize+cellSize/2,e.y*cellSize+cellSize/2,10,"#e040fb",80,.4,3);e.r=t.r;e.c=t.c;e.x=t.c;e.y=t.r;e.path=[];Particles.spawn(e.x*cellSize+cellSize/2,e.y*cellSize+cellSize/2,10,"#e040fb",80,.4,3);}
        e.teleportTimer=6+Math.random()*6;}}

    // Move
    if(e.path.length){const tgt=e.path[0];const edx=tgt.c-e.x,edy=tgt.r-e.y;const dist=Math.sqrt(edx*edx+edy*edy);
      if(dist<.1){e.x=tgt.c;e.y=tgt.r;e.r=tgt.r;e.c=tgt.c;e.path.shift();}
      else{e.x+=(edx/dist)*e.speed*dt;e.y+=(edy/dist)*e.speed*dt;}}

    // Near-miss
    const nmD=Math.sqrt((e.x-player.x)**2+(e.y-player.y)**2);
    if(nearMissCDs[i]>0)nearMissCDs[i]-=dt;
    if(nmD<1.2&&nmD>=.5&&nearMissCDs[i]<=0){nearMissCount++;score+=25;nearMissCDs[i]=3;SoundFX.nearMiss();
      UI.scorePopup(cRect,player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2-15,"NEAR MISS +25","#ea80fc");
      Particles.spawn(player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,6,"#ea80fc",60,.3,3);refreshHUD();}

    // Collision
    if(nmD<.45){
      if(now<boosts.shield){boosts.shield=0;SoundFX.hit();UI.shake();Particles.spawn(player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,20,"#ffab40",120,.5,5);UI.scorePopup(cRect,player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,"SHIELD!","#ffab40");e.path=[];e.stunTimer=2;e.r=Math.max(0,Math.min(mazeRows-1,e.r+Math.sign(e.r-player.r)*3));e.c=Math.max(0,Math.min(mazeCols-1,e.c+Math.sign(e.c-player.c)*3));e.x=e.c;e.y=e.r;}
      else if(isDashing){score+=50;SoundFX.nearMiss();UI.scorePopup(cRect,player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,"DASH +50!","#7c4dff");Particles.spawn(player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,15,"#7c4dff",100,.5,4);e.path=[];e.stunTimer=2;refreshHUD();}
      else{endGame("Caught by a monster!");return;}}
  }

  // Dash particles
  if(isDashing)Particles.spawn(player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,2,"#b388ff",40,.2,3);
  Particles.update(dt);
  // Exit check
  if(player.r===exitCell.r&&player.c===exitCell.c)completeLevel();
}

// ========== RENDER ==========
function render(){
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const cs=cellSize,now=performance.now();
  // Maze
  ctx.lineWidth=Math.max(2,cs*.07);ctx.lineCap="round";
  for(let r=0;r<mazeRows;r++)for(let c=0;c<mazeCols;c++){
    const x=c*cs,y=r*cs;ctx.fillStyle="#0c1120";ctx.fillRect(x,y,cs,cs);
    ctx.strokeStyle="#253050";ctx.beginPath();const cell=grid[r][c];
    if(!(cell&1)){ctx.moveTo(x,y);ctx.lineTo(x+cs,y);}
    if(!(cell&2)){ctx.moveTo(x+cs,y);ctx.lineTo(x+cs,y+cs);}
    if(!(cell&4)){ctx.moveTo(x,y+cs);ctx.lineTo(x+cs,y+cs);}
    if(!(cell&8)){ctx.moveTo(x,y);ctx.lineTo(x,y+cs);}ctx.stroke();}

  // Trail
  if(trail.length>2)for(let i=1;i<trail.length;i++){const t=trail[i],age=(now-t.t)/500,alpha=Math.max(0,.3-age*.3);if(alpha<=0)continue;ctx.globalAlpha=alpha;ctx.fillStyle=now<boosts.speed?"#69f0ae":"#00e5ff";ctx.beginPath();ctx.arc(t.x*cs+cs/2,t.y*cs+cs/2,Math.max(1,cs*.18*(1-age*.5)),0,6.28);ctx.fill();}ctx.globalAlpha=1;

  // Exit
  {const ex=exitCell.c*cs+cs/2,ey=exitCell.r*cs+cs/2,pulse=.7+.3*Math.sin(now*.004),rad=cs*.38*pulse;
  const g=ctx.createRadialGradient(ex,ey,0,ex,ey,rad*2);g.addColorStop(0,"rgba(124,77,255,.5)");g.addColorStop(.5,"rgba(124,77,255,.15)");g.addColorStop(1,"rgba(124,77,255,0)");ctx.fillStyle=g;ctx.fillRect(ex-rad*2.5,ey-rad*2.5,rad*5,rad*5);
  ctx.save();ctx.translate(ex,ey);ctx.rotate(now*.002);ctx.strokeStyle="rgba(179,136,255,.4)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,rad*1.3,0,3.77);ctx.stroke();ctx.restore();
  ctx.beginPath();ctx.arc(ex,ey,rad,0,6.28);ctx.fillStyle="#7c4dff";ctx.fill();ctx.beginPath();ctx.arc(ex,ey,rad*.45,0,6.28);ctx.fillStyle="#b388ff";ctx.fill();}

  // Coins
  for(const cn of coins){if(cn.collected)continue;const cx=cn.c*cs+cs/2,cy=cn.r*cs+cs/2+Math.sin(now*.003+cn.bob)*cs*.07,rad=cs*.19;
  ctx.fillStyle="rgba(255,215,64,.3)";const sx=cx+Math.cos(now*.005+cn.sparkle)*rad*1.5,sy=cy+Math.sin(now*.005+cn.sparkle)*rad*1.5;ctx.fillRect(sx-1.5,sy-1.5,3,3);
  ctx.beginPath();ctx.arc(cx,cy,rad,0,6.28);ctx.fillStyle="#ffd740";ctx.fill();ctx.beginPath();ctx.arc(cx,cy,rad*.45,0,6.28);ctx.fillStyle="#ffe082";ctx.fill();}

  // Power-ups
  const puC={speed:"105,240,174",freeze:"64,196,255",shield:"255,171,64",time:"0,229,255",magnet:"234,128,252"};
  const puF={speed:"#69f0ae",freeze:"#40c4ff",shield:"#ffab40",time:"#00e5ff",magnet:"#ea80fc"};
  const puI={speed:"⚡",freeze:"❄",shield:"🛡",time:"⏰",magnet:"🧲"};
  for(const pu of powerups){if(pu.collected)continue;const px=pu.c*cs+cs/2,py=pu.r*cs+cs/2+Math.sin(now*.0025+pu.bob)*cs*.09,rad=cs*.24;
  const rgb=puC[pu.type]||"255,255,255";const g=ctx.createRadialGradient(px,py,0,px,py,rad*2.5);g.addColorStop(0,`rgba(${rgb},.3)`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(px-rad*3,py-rad*3,rad*6,rad*6);
  ctx.beginPath();ctx.arc(px,py,rad,0,6.28);ctx.fillStyle=puF[pu.type];ctx.fill();
  ctx.fillStyle="#0a0e17";ctx.font=`bold ${cs*.26}px Outfit,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(puI[pu.type],px,py);}

  // Enemies
  for(const e of enemies){const ex=e.x*cs+cs/2,ey=e.y*cs+cs/2,rad=cs*.33;
  let bc="#ff5252",gr="255,82,82";if(e.type==="patrol"){bc="#ff9100";gr="255,145,0";}if(e.type==="teleporter"){bc="#e040fb";gr="224,64,251";}if(e.frozen||e.stunTimer>0){bc="#40c4ff";gr="64,196,255";}
  const g=ctx.createRadialGradient(ex,ey,0,ex,ey,rad*2.5);g.addColorStop(0,`rgba(${gr},.25)`);g.addColorStop(1,`rgba(${gr},0)`);ctx.fillStyle=g;ctx.fillRect(ex-rad*3,ey-rad*3,rad*6,rad*6);
  ctx.beginPath();ctx.arc(ex,ey,rad,0,6.28);ctx.fillStyle=bc;ctx.fill();
  // Eyes look at player
  const lx=player.x-e.x,ly=player.y-e.y,ld=Math.sqrt(lx*lx+ly*ly)||1,ox=(lx/ld)*rad*.15,oy=(ly/ld)*rad*.15;
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(ex-rad*.3+ox,ey-rad*.15+oy,rad*.2,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(ex+rad*.3+ox,ey-rad*.15+oy,rad*.2,0,6.28);ctx.fill();
  ctx.fillStyle="#0a0e17";ctx.beginPath();ctx.arc(ex-rad*.3+ox*1.5,ey-rad*.1+oy*1.5,rad*.11,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(ex+rad*.3+ox*1.5,ey-rad*.1+oy*1.5,rad*.11,0,6.28);ctx.fill();
  if(e.type==="teleporter"&&!e.frozen){ctx.strokeStyle="rgba(224,64,251,.4)";ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(ex,ey,rad*1.5,now*.003,now*.003+3.14);ctx.stroke();ctx.setLineDash([]);}}

  // Player
  {const px=player.x*cs+cs/2,py=player.y*cs+cs/2,rad=cs*.34,bst=now<boosts.speed,sh=now<boosts.shield,dsh=isDashing;
  const rgb=dsh?"124,77,255":bst?"105,240,174":"0,229,255";
  const g=ctx.createRadialGradient(px,py,0,px,py,rad*3.5);g.addColorStop(0,`rgba(${rgb},.4)`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(px-rad*4,py-rad*4,rad*8,rad*8);
  if(sh){ctx.strokeStyle=`rgba(255,171,64,${.4+.2*Math.sin(now*.006)})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,rad*1.4,0,6.28);ctx.stroke();}
  ctx.beginPath();ctx.arc(px,py,rad,0,6.28);ctx.fillStyle=dsh?"#b388ff":bst?"#69f0ae":"#00e5ff";ctx.fill();
  ctx.beginPath();ctx.arc(px,py,rad*.5,0,6.28);ctx.fillStyle=dsh?"#d1c4e9":bst?"#b9f6ca":"#80deea";ctx.fill();}

  Particles.render(ctx);

  // Fog
  {const px=player.x*cs+cs/2,py=player.y*cs+cs/2,fR=FOG_R*cs;ctx.save();ctx.fillStyle="rgba(5,8,15,0.92)";ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(px,py,fR,0,Math.PI*2,true);ctx.fill();
  const g=ctx.createRadialGradient(px,py,fR*.7,px,py,fR);g.addColorStop(0,"rgba(5,8,15,0)");g.addColorStop(1,"rgba(5,8,15,0.55)");ctx.beginPath();ctx.arc(px,py,fR,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.restore();}

  // Minimap
  renderMini();
}

function renderMini(){
  const mw=miniC.width,mh=miniC.height;if(!mw)return;const ms=mw/mazeCols;miniCtx.clearRect(0,0,mw,mh);
  miniCtx.fillStyle="#1a2240";for(let r=0;r<mazeRows;r++)for(let c=0;c<mazeCols;c++)if(explored[r][c])miniCtx.fillRect(c*ms,r*ms,ms,ms);
  miniCtx.strokeStyle="#334";miniCtx.lineWidth=.5;
  for(let r=0;r<mazeRows;r++)for(let c=0;c<mazeCols;c++){if(!explored[r][c])continue;const x=c*ms,y=r*ms,cell=grid[r][c];miniCtx.beginPath();
    if(!(cell&1)){miniCtx.moveTo(x,y);miniCtx.lineTo(x+ms,y);}
    if(!(cell&2)){miniCtx.moveTo(x+ms,y);miniCtx.lineTo(x+ms,y+ms);}
    if(!(cell&4)){miniCtx.moveTo(x,y+ms);miniCtx.lineTo(x+ms,y+ms);}
    if(!(cell&8)){miniCtx.moveTo(x,y);miniCtx.lineTo(x,y+ms);}miniCtx.stroke();}
  miniCtx.fillStyle="#7c4dff";miniCtx.fillRect(exitCell.c*ms,exitCell.r*ms,ms,ms);
  miniCtx.fillStyle="#00e5ff";miniCtx.fillRect(player.c*ms,player.r*ms,ms,ms);
  for(const e of enemies)if(explored[e.r]&&explored[e.r][e.c]){miniCtx.fillStyle=e.frozen||e.stunTimer>0?"#40c4ff":"#ff5252";miniCtx.fillRect(e.c*ms,e.r*ms,ms,ms);}
}

function completeLevel(){
  state="levelComplete";clearInterval(timerInt);if(animId)cancelAnimationFrame(animId);SoundFX.exit();
  const tb=timeLeft*5;score+=tb;
  document.getElementById("level-cleared").textContent=level;
  document.getElementById("stat-time").textContent=tb;
  document.getElementById("stat-coins").textContent=coinsCollected;
  document.getElementById("stat-combo").textContent=bestCombo+"×";
  document.getElementById("stat-nearmiss").textContent=nearMissCount+` (+${nearMissCount*25})`;
  document.getElementById("stat-total").textContent=score;
  UI.showScreen("level-screen");
}

function endGame(reason){
  state="gameOver";clearInterval(timerInt);if(animId)cancelAnimationFrame(animId);SoundFX.gameOver();UI.shake();
  Particles.spawn(player.x*cellSize+cellSize/2,player.y*cellSize+cellSize/2,30,"#ff5252",150,.8,5);
  document.getElementById("gameover-reason").textContent=reason;
  document.getElementById("go-level").textContent=level;
  document.getElementById("go-score").textContent=score;
  document.getElementById("go-combo").textContent=bestCombo+"×";
  document.getElementById("name-entry").style.display="flex";
  UI.showScreen("gameover-screen");
}

init();
return{start,restart,nextLevel};
})();
