// PAC-MAN CHAMPIONSHIP EDITION 2
// Phaser 3 — Cycle 3 — Bug fixes + full CE2 visual pass
// ─ fixed: dotsLeft counting, pac spawn in open cell
// ─ added: rainbow power mode, wall shimmer, CE2 color scheme

const CELL = 24;
const COLS = 29;
const ROWS = 23;
const W    = COLS * CELL; // 696
const H    = ROWS * CELL; // 552

// ─── MAZE ────────────────────────────────────────────────────────────────────
// Left half (15 cols, 23 rows). 0=open 1=wall 2=dot 3=power 4=ghost-interior
const HALF = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,2,1,2,1,2,1,1,3,1],
  [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,1,0,0,0,1,2,2,2,2,1],
  [1,1,1,1,2,1,0,4,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,4,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,0,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,1,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,0,0,0,0,0,2,1,1,1,1],
  [1,1,1,1,2,1,1,0,1,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,1,1,2,1,1,3,1],
  [1,2,2,1,2,2,2,1,2,2,2,1,2,2,1],
  [1,1,2,1,2,1,2,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,0,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,0,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Alternate maze L2 — outer corridors differ, ghost house rows 5-12 identical to HALF
const HALF2 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // 0
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],  // 1 full top corridor
  [1,2,1,1,1,2,1,1,2,1,2,1,1,2,1],  // 2 staggered
  [1,3,1,2,2,2,2,1,2,2,2,2,1,3,1],  // 3 power + open
  [1,2,1,2,2,2,2,2,2,2,2,2,1,2,1],  // 4 wide corridor
  [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],  // 5 same as HALF row 5
  [1,2,2,2,2,1,0,0,0,1,2,2,2,2,1],  // 6 same as HALF row 6
  [1,1,1,1,2,1,0,4,0,1,2,1,1,1,1],  // 7 same as HALF row 7
  [1,1,1,1,2,1,0,4,0,1,2,1,1,1,1],  // 8 same as HALF row 8
  [0,0,0,0,2,0,0,0,0,0,2,0,0,0,0],  // 9 tunnel same
  [1,1,1,1,2,1,1,1,1,1,2,1,1,1,1],  // 10 same
  [1,1,1,1,2,0,0,0,0,0,2,1,1,1,1],  // 11 same
  [1,1,1,1,2,1,1,0,1,1,2,1,1,1,1],  // 12 same
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],  // 13
  [1,3,1,1,1,1,1,1,1,1,1,1,1,3,1],  // 14 open row + power
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],  // 15
  [1,1,2,2,2,1,2,1,2,1,2,2,2,1,1],  // 16 different
  [1,2,2,2,2,1,2,2,2,1,2,2,2,2,1],  // 17 pac spawn col13=2 ✓
  [1,2,1,2,1,1,1,0,1,1,1,2,1,2,1],  // 18
  [1,2,1,2,1,1,1,0,1,1,1,2,1,2,1],  // 19
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],  // 20
  [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],  // 21
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // 22
];

let _mazeLevel = 1;
function buildMaze(level=_mazeLevel) {
  const h2 = (level % 2 === 0) ? HALF2 : HALF;
  const maze = [];
  for (let r = 0; r < ROWS; r++) {
    const h = h2[r];
    const row = [];
    for (let c = 0; c < 15; c++) row.push(h[c]);
    for (let c = 13; c >= 0; c--) row.push(h[c]);
    maze.push(row);
  }
  return maze;
}

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const PAL = {
  bg:       0x000008,
  wallEdge: 0x11bbff,   // electric cyan-blue — CE2 primary wall color
  wallGlow: 0x0055cc,   // deep blue outer glow
  wallCore: 0x99ddff,   // near-white hot core
  dot:      0xffdd44,
  power:    0xff33ee,
  pac:      0xffee00,
  pacGlow:  0xff8800,
  blinky:   0xff2020,
  pinky:    0xff88ff,
  inky:     0x00ccff,
  clyde:    0xff9900,
  scared:   0x1100bb,
  trail:    0xff7700,
};

// CE2 level color themes — maze neon shifts each level
const LEVEL_THEMES = [
  { edge: 0x11bbff, glow: 0x0055cc, core: 0x99ddff, floor: 0x001844 }, // L1 cyan
  { edge: 0xffdd00, glow: 0x885500, core: 0xffee99, floor: 0x1a1000 }, // L2 yellow
  { edge: 0xff33ee, glow: 0x880088, core: 0xff99ff, floor: 0x1a0018 }, // L3 magenta
  { edge: 0x00ff88, glow: 0x007744, core: 0x99ffcc, floor: 0x001a10 }, // L4 green
  { edge: 0xff6600, glow: 0x882200, core: 0xffbb88, floor: 0x1a0800 }, // L5 orange
  { edge: 0x8844ff, glow: 0x440088, core: 0xccaaff, floor: 0x0a0018 }, // L6 purple
];

const DIRS = {UP:{x:0,y:-1},DOWN:{x:0,y:1},LEFT:{x:-1,y:0},RIGHT:{x:1,y:0}};
const DKEYS = ['UP','DOWN','LEFT','RIGHT'];
const OPP   = {UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'};
function mdist(ax,ay,bx,by){return Math.abs(ax-bx)+Math.abs(ay-by);}

// ─── AUDIO ────────────────────────────────────────────────────────────────────
let _ac = null;
function getAC(){if(!_ac)try{_ac=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return _ac;}
function beep(freq,dur,type='square',vol=0.12,delay=0){
  const ctx=getAC();if(!ctx)return;
  try{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.type=type;o.frequency.value=freq;
    const t=ctx.currentTime+delay;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.start(t);o.stop(t+dur);
  }catch(e){}
}

// ─── MUSIC ENGINE (CE2 electronic beat — Web Audio lookahead scheduler) ───────
const Music = (function(){
  let _timer=null, _step=0, _nextTime=0, _bpm=128, _pow=false, _level=1, _vol=0.28;
  const AHEAD=0.12, LAP=30; // schedule 120ms ahead, check every 30ms

  function _nl(){ return (60/_bpm)/4; } // 16th-note duration in seconds

  // Drum patterns (16 steps): kick, snare, hihat, openhat
  const KK=[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
  const SN=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const HH=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
  const OH=[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0];

  // Bass pattern (note per step, 0=rest). Frequencies: C3=130.8, Eb3=155.6, G3=196, Bb3=233.1, D3=146.8
  const BASS_N=[130.8,0,0,130.8, 155.6,0,196,0, 130.8,0,0,146.8, 155.6,0,130.8,0];
  const BASS_P=[196,0,0,196, 233.1,0,261.6,0, 196,0,0,220, 233.1,0,196,0]; // power mode

  // Lead arpeggio (8 steps cycling, plays on steps 0,4,8,12)
  const LEAD=[523.3,392,659.3,523.3, 440,329.6,523.3,440]; // C5,G4,E5,C5,A4,E4,C5,A4
  let _leadIdx=0;

  function _kick(ctx, t, master){
    try{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(master);
      o.frequency.setValueAtTime(180,t);
      o.frequency.exponentialRampToValueAtTime(0.001,t+0.35);
      g.gain.setValueAtTime(1.0,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
      o.start(t); o.stop(t+0.4);
    }catch(e){}
  }

  function _snare(ctx, t, master){
    try{
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.12,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const src=ctx.createBufferSource(), g=ctx.createGain();
      const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1200;
      src.buffer=buf; src.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.45,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.14);
      src.start(t); src.stop(t+0.15);
    }catch(e){}
  }

  function _hihat(ctx, t, master, open){
    try{
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.06,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const src=ctx.createBufferSource(), g=ctx.createGain();
      const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=8000;
      src.buffer=buf; src.connect(f); f.connect(g); g.connect(master);
      const vol=open?0.22:0.10, dur=open?0.18:0.04;
      g.gain.setValueAtTime(vol,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      src.start(t); src.stop(t+dur+0.01);
    }catch(e){}
  }

  function _bass(ctx, t, freq, dur, master){
    try{
      const o=ctx.createOscillator(), g=ctx.createGain();
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=500;
      o.type='sawtooth'; o.frequency.value=freq;
      o.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.38,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+dur*0.9);
      o.start(t); o.stop(t+dur);
    }catch(e){}
  }

  function _lead(ctx, t, freq, dur, master){
    try{
      const o=ctx.createOscillator(), g=ctx.createGain();
      const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq*2; f.Q.value=0.8;
      o.type='square'; o.frequency.value=freq;
      o.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.15,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+dur*1.5);
      o.start(t); o.stop(t+dur*1.6);
    }catch(e){}
  }

  function _schedStep(ctx, t, master){
    const nl=_nl();
    const bp = _pow ? BASS_P : BASS_N;

    if(KK[_step]) _kick(ctx,t,master);
    if(SN[_step]) _snare(ctx,t,master);
    if(HH[_step]) _hihat(ctx,t,master,!!OH[_step]);

    if(bp[_step]) _bass(ctx,t,bp[_step],nl*1.6,master);

    // Lead every 4 steps (quarter note)
    if(_step%4===0){
      _lead(ctx,t,LEAD[_leadIdx%LEAD.length],nl*2,master);
      _leadIdx++;
    }

    _step=(_step+1)%16;
    _nextTime+=nl;
  }

  function _tick(ctx, master){
    while(_nextTime < ctx.currentTime+AHEAD){
      _schedStep(ctx,_nextTime,master);
    }
    _timer=setTimeout(()=>_tick(ctx,master), LAP);
  }

  return {
    start(){
      const ctx=getAC(); if(!ctx) return;
      try{ ctx.resume(); }catch(e){}
      const master=ctx.createGain(); master.gain.value=_vol;
      master.connect(ctx.destination);
      _step=0; _leadIdx=0;
      _nextTime=ctx.currentTime+0.05;
      _bpm=128+(_level-1)*6;
      _tick(ctx,master);
    },
    stop(){ clearTimeout(_timer); _timer=null; },
    setPowered(p){
      _pow=p;
      _bpm=_pow ? Math.min(148+(_level-1)*6,188) : Math.min(128+(_level-1)*6,160);
    },
    setLevel(l){ _level=l; _bpm=Math.min(128+(l-1)*6,160); },
    setVol(v){ _vol=v; },
  };
})();

// ─── TITLE SCENE ─────────────────────────────────────────────────────────────
class TitleScene extends Phaser.Scene {
  constructor(){ super('TitleScene'); }
  create(){
    const g=this.add.graphics();
    g.fillStyle(PAL.bg,1); g.fillRect(0,0,W,H);
    // Neon grid
    for(let x=0;x<=W;x+=CELL){g.lineStyle(1,0x001833,0.5);g.lineBetween(x,0,x,H);}
    for(let y=0;y<=H;y+=CELL){g.lineStyle(1,0x001833,0.5);g.lineBetween(0,y,W,y);}

    // Glow blob
    const gb=this.add.graphics();
    gb.fillStyle(0x002266,0.25); gb.fillEllipse(W/2,90,320,100);

    this.add.text(W/2,50,'PAC-MAN',{
      fontSize:'54px',fontFamily:'monospace',
      color:'#ffee00',stroke:'#aa5500',strokeThickness:6,
      shadow:{x:0,y:0,color:'#ffaa00',blur:24,fill:true}
    }).setOrigin(0.5);
    this.add.text(W/2,116,'CHAMPIONSHIP EDITION',{
      fontSize:'17px',fontFamily:'monospace',
      color:'#00ccff',stroke:'#003355',strokeThickness:3
    }).setOrigin(0.5);
    this.add.text(W/2,154,'2',{
      fontSize:'68px',fontFamily:'monospace',
      color:'#ff33ee',stroke:'#770077',strokeThickness:7,
      shadow:{x:0,y:0,color:'#ff00ff',blur:28,fill:true}
    }).setOrigin(0.5);

    const hi=localStorage.getItem('pacce2_hi')||'0';
    this.add.text(W/2,232,'HI-SCORE  '+hi,{
      fontSize:'15px',fontFamily:'monospace',color:'#aaaacc'
    }).setOrigin(0.5);

    const st=this.add.text(W/2,298,'▶  PRESS ANY KEY / TAP  ◀',{
      fontSize:'16px',fontFamily:'monospace',color:'#ffffff',
      stroke:'#000',strokeThickness:2
    }).setOrigin(0.5);
    this.tweens.add({targets:st,alpha:0.1,yoyo:true,repeat:-1,duration:620});

    this.add.text(W/2,H-44,'WASD / ARROW KEYS   •   SWIPE on mobile',{fontSize:'11px',fontFamily:'monospace',color:'#446677'}).setOrigin(0.5);
    this.add.text(W/2,H-28,'P = PAUSE   R = RESTART',{fontSize:'11px',fontFamily:'monospace',color:'#446677'}).setOrigin(0.5);

    this.input.keyboard.once('keydown',()=>this.scene.start('GameScene'));
    this.input.once('pointerdown',()=>this.scene.start('GameScene'));
  }
}

// ─── GAME SCENE ───────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene'); }

  create(){
    this.maze = buildMaze();
    this.score = 0;
    this.hiScore = parseInt(localStorage.getItem('pacce2_hi')||'0');
    this.lives = 3;
    this.level = 1;
    this.speedMult = 1.0;
    this.gameOver = false;
    this.paused = false;

    // Power state
    this.powered = false;
    this.powerTimer = 0;
    this.powerDuration = 7000;
    this.ghostEatSeq = 0;
    this.flashAcc = 0;
    this.flashPhase = false;

    // Visual
    this.trail = [];          // [{x,y,life,color}]
    this.particles = [];
    this.popups = [];
    this.rainbowHue = 0;      // cycles during power mode

    // Touch
    this.swipeStart = null;

    this.paused=true; // brief pause for READY display
    this._readyTimer=2200;
    _mazeLevel=this.level; // tell buildMaze which layout variant to use

    // Build scene
    this._buildBg();
    this._buildWalls();
    this._buildDotLayer();    // draws all dots; manages dotsLeft correctly
    this._spawnPac();
    this._spawnGhosts();
    this._spawnSleepGhosts();  // CE2 ghost train — sleeping ghosts on corridors
    this._buildUI();
    this._buildCRT();
    this._setupInput();

    // Music — start after brief delay to let AudioContext unlock on user gesture
    this.time.delayedCall(200, ()=>{ Music.start(); });
    this.events.once('shutdown', ()=>{ Music.stop(); });
    this.events.once('destroy',  ()=>{ Music.stop(); });
  }

  // ─── BACKGROUND ──────────────────────────────────────────────────────────────
  _buildBg(){
    const g=this.add.graphics().setDepth(0);
    g.fillStyle(PAL.bg,1); g.fillRect(0,0,W,H);
    // Subtle grid
    for(let x=0;x<=W;x+=CELL){g.lineStyle(1,0x001122,0.35);g.lineBetween(x,0,x,H);}
    for(let y=0;y<=H;y+=CELL){g.lineStyle(1,0x001122,0.35);g.lineBetween(0,y,W,y);}
    // CE2 corridor floor glow — open cells get a faint blue wash matching CE2's dark-but-glowing corridors
    const cg=this.add.graphics().setDepth(1);
    const maze=buildMaze();
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(maze[r][c]!==1){
          // Level-themed floor glow
          const theme=LEVEL_THEMES[(this.level-1)%LEVEL_THEMES.length];
          cg.fillStyle(theme.floor,0.55);
          cg.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
        }
      }
    }
    this.corridorGfx=cg;
  }

  // ─── WALLS (neon thin lines, CE2 style) ──────────────────────────────────────
  _buildWalls(){
    this.wallGfx=this.add.graphics().setDepth(2);
    this._redrawWalls();
  }

  _getLevelTheme(){
    return LEVEL_THEMES[(this.level-1) % LEVEL_THEMES.length];
  }

  _redrawWalls(hue=0, danger=false){
    const g=this.wallGfx; g.clear();
    const theme=this._getLevelTheme();
    // During power mode: rainbow; danger mode: red-orange pulse; else: level theme
    let edgeColor, glowColor;
    if(this.powered){
      edgeColor = Phaser.Display.Color.HSVToRGB(hue/360,0.9,1.0).color;
      glowColor = Phaser.Display.Color.HSVToRGB(hue/360,1.0,0.4).color;
    } else if(danger){
      edgeColor = Phaser.Display.Color.HSVToRGB(hue/360,1.0,1.0).color;  // red-orange
      glowColor = Phaser.Display.Color.HSVToRGB(hue/360,1.0,0.35).color;
    } else {
      edgeColor = theme.edge;
      glowColor = theme.glow;
    }

    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(this.maze[r]?.[c]!==1) continue;
        const x=c*CELL, y=r*CELL;
        // Draw each exposed edge as a neon line
        const top    = this.maze[r-1]?.[c]!==1;
        const bottom = this.maze[r+1]?.[c]!==1;
        const left   = this.maze[r]?.[c-1]!==1;
        const right  = this.maze[r]?.[c+1]!==1;
        if(top)    this._neonLine(g,x,y,x+CELL,y,edgeColor,glowColor);
        if(bottom) this._neonLine(g,x,y+CELL,x+CELL,y+CELL,edgeColor,glowColor);
        if(left)   this._neonLine(g,x,y,x,y+CELL,edgeColor,glowColor);
        if(right)  this._neonLine(g,x+CELL,y,x+CELL,y+CELL,edgeColor,glowColor);
        // Corner caps — small filled circles where tube ends meet
        // This makes CE2's signature neon tube look at wall junctions
        const core = this._getLevelTheme().core;
        const corners = [
          [x,y,top||left],[x+CELL,y,top||right],
          [x,y+CELL,bottom||left],[x+CELL,y+CELL,bottom||right]
        ];
        for(const [cx2,cy2,draw] of corners){
          if(draw){
            g.fillStyle(glowColor,0.18); g.fillCircle(cx2,cy2,5);
            g.fillStyle(edgeColor,0.55); g.fillCircle(cx2,cy2,3);
            g.fillStyle(core,0.9);       g.fillCircle(cx2,cy2,1.5);
          }
        }
      }
    }
    // Ghost house door
    g.lineStyle(3,0xff88ff,1);
    g.lineBetween(13*CELL, 7*CELL+CELL/2, 16*CELL, 7*CELL+CELL/2);
  }

  _neonLine(g,x1,y1,x2,y2,edge,glow){
    // CE2 fluorescent neon tube — 6 layers for true bloom
    const core = this._getLevelTheme().core;
    g.lineStyle(18,glow,0.07);  g.lineBetween(x1,y1,x2,y2); // far bloom
    g.lineStyle(12,glow,0.18);  g.lineBetween(x1,y1,x2,y2); // mid bloom
    g.lineStyle(7, glow,0.32);  g.lineBetween(x1,y1,x2,y2); // inner bloom
    g.lineStyle(4, edge,0.65);  g.lineBetween(x1,y1,x2,y2); // color body
    g.lineStyle(2, edge,1.0);   g.lineBetween(x1,y1,x2,y2); // bright edge
    g.lineStyle(1, core,1.0);   g.lineBetween(x1,y1,x2,y2); // tinted hot core
  }

  // ─── DOTS (separate tracking object — no counting bug) ────────────────────────
  _buildDotLayer(){
    // dotMap: key="r,c" -> { gfx, type }
    this.dotMap = new Map();
    this.dotsLeft = 0;
    this.dotGfx   = this.add.graphics().setDepth(3);
    this.pelletGfx= this.add.graphics().setDepth(4);

    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const v=this.maze[r][c];
        if(v===2||v===3){
          this.dotMap.set(r+','+c, {r,c,type:v,active:true});
          this.dotsLeft++;
        }
      }
    }
    this._redrawDots();
  }

  _redrawDots(){
    this.dotGfx.clear();
    for(const [,d] of this.dotMap){
      if(!d.active||d.type!==2) continue;
      const cx=d.c*CELL+CELL/2, cy=d.r*CELL+CELL/2;
      this.dotGfx.fillStyle(PAL.dot,1);
      this.dotGfx.fillCircle(cx,cy,2.5);
    }
  }

  _animPellets(t){
    const g=this.pelletGfx; g.clear();
    for(const [,d] of this.dotMap){
      if(!d.active||d.type!==3) continue;
      const cx=d.c*CELL+CELL/2, cy=d.r*CELL+CELL/2;
      const pulse=0.5+0.5*Math.sin(t*2.8*Math.PI);
      g.fillStyle(PAL.power,0.12*pulse); g.fillCircle(cx,cy,16);
      g.fillStyle(PAL.power,0.28*pulse); g.fillCircle(cx,cy,10);
      g.fillStyle(PAL.power,0.6+0.4*pulse); g.fillCircle(cx,cy,5.5);
      g.fillStyle(0xffffff,pulse*0.7); g.fillCircle(cx-1.5,cy-2,2);
    }
  }

  // ─── PAC-MAN ─────────────────────────────────────────────────────────────────
  _spawnPac(){
    // Spawn at column 13, row 17 — guaranteed open cell (maze[17][13]=2)
    this.pac = {
      x: 13*CELL+CELL/2,  // 324
      y: 17*CELL+CELL/2,  // 420
      dir:  {x:0,y:0},
      next: {x:-1,y:0},
      speed: 130,
      mouthA: 0.2,
      mouthD: 1,
      dead:  false,
      deadT: 0,
      invT:  0,
    };
    this.trailGfx = this.add.graphics().setDepth(10);
    this.pacGfx   = this.add.graphics().setDepth(12);
  }

  _drawPac(){
    const g=this.pacGfx; g.clear();
    const p=this.pac;

    // ── Death spin animation (CE2 signature clockwise collapse) ─────────────
    if(p.dead){
      const DEATH_DUR=1500; // ms for the spin/shrink phase
      const elapsed=2200-p.deadT;
      if(elapsed<0||elapsed>DEATH_DUR) return; // invisible after animation
      const prog=elapsed/DEATH_DUR;
      const r=12*(1-prog);           // shrinks to 0
      if(r<0.5) return;
      const cx=p.x, cy=p.y;
      const rot=prog*Math.PI*3;      // 1.5 clockwise rotations
      const mouth=prog*0.48*Math.PI; // mouth opens wider as pac dies
      g.fillStyle(PAL.pacGlow,0.15*(1-prog)); g.fillCircle(cx,cy,r+10);
      g.fillStyle(PAL.pac,(1-prog)*0.9);
      if(mouth<0.05){
        g.fillCircle(cx,cy,r);
      } else {
        g.slice(cx,cy,r,rot+mouth,rot+Math.PI*2-mouth,false);
        g.fillPath();
      }
      return;
    }

    // ── Invincibility blink ─────────────────────────────────────────────────
    if(p.invT>0 && Math.floor(p.invT/120)%2===0) return;

    const cx=p.x, cy=p.y, r=12;
    let rot=0;
    if(p.dir.x===1)       rot=0;
    else if(p.dir.x===-1) rot=Math.PI;
    else if(p.dir.y===-1) rot=-Math.PI/2;
    else if(p.dir.y===1)  rot=Math.PI/2;

    const m = p.mouthA * Math.PI;

    // Layered glow: big → small — big radius makes pac pop against dark bg
    g.fillStyle(PAL.pacGlow,0.07); g.fillCircle(cx,cy,r+18);
    g.fillStyle(PAL.pacGlow,0.15); g.fillCircle(cx,cy,r+11);
    g.fillStyle(PAL.pacGlow,0.28); g.fillCircle(cx,cy,r+6);
    g.fillStyle(PAL.pac,0.45);     g.fillCircle(cx,cy,r+3);
    // Body
    g.fillStyle(PAL.pac,1);
    if(m<0.04){
      g.fillCircle(cx,cy,r);
    } else {
      g.slice(cx,cy,r,rot+m,rot+Math.PI*2-m,false);
      g.fillPath();
    }
    // Eye
    const ex=cx+Math.cos(rot-Math.PI/3)*r*0.55;
    const ey=cy+Math.sin(rot-Math.PI/3)*r*0.55;
    g.fillStyle(0x000000,1); g.fillCircle(ex,ey,1.8);

    // Inner specular highlight — CE2 pseudo-3D shine on pac body
    const sx=cx+Math.cos(rot-Math.PI/4)*r*0.35;
    const sy=cy+Math.sin(rot-Math.PI/4)*r*0.35;
    g.fillStyle(0xffffff,0.22); g.fillCircle(sx,sy,r*0.28);

    // Power-up ring: CE2-style pulsing halo around pac during frightened mode
    if(this.powered){
      const hue=this.rainbowHue;
      const ring1=Phaser.Display.Color.HSVToRGB(hue/360,1,1).color;
      const ring2=Phaser.Display.Color.HSVToRGB(((hue+120)%360)/360,1,1).color;
      const pulse=0.5+0.5*Math.sin(this.time.now/80);
      const rr=r+8+4*pulse;
      g.lineStyle(3,ring1,0.9); g.strokeCircle(cx,cy,rr);
      g.lineStyle(5,ring2,0.3); g.strokeCircle(cx,cy,rr+3);
    }
  }

  _updateTrail(dt){
    const p=this.pac;
    const inDanger = this.dotsLeft < 30;
    if(!p.dead&&(p.dir.x||p.dir.y)){
      const trailColor = this.powered
        ? Phaser.Display.Color.HSVToRGB(this.rainbowHue/360,1,1).color
        : (inDanger ? 0xff3300 : PAL.trail);
      this.trail.push({ x:p.x, y:p.y, life:1.0, color:trailColor, big:inDanger });
    }
    const g=this.trailGfx; g.clear();
    for(let i=this.trail.length-1;i>=0;i--){
      const t=this.trail[i];
      const fade = t.big ? 2.5 : 3.5;
      t.life-=dt*fade;
      if(t.life<=0){this.trail.splice(i,1);continue;}
      const sz = t.big ? 14 : 9; // danger trail is bigger and more vivid
      // Outer glow ring
      g.fillStyle(t.color, t.life*(t.big?0.3:0.2));
      g.fillCircle(t.x,t.y,sz*t.life);
      // Core trail dot
      g.fillStyle(t.color, t.life*(t.big?0.85:0.65));
      g.fillCircle(t.x,t.y,(t.big?7:5)*t.life);
    }
    if(this.trail.length>120) this.trail.splice(0,this.trail.length-120);
  }

  // ─── GHOSTS ───────────────────────────────────────────────────────────────────
  _spawnGhosts(){
    this.ghosts=[
      this._makeGhost('blinky',PAL.blinky,14,7,  0,'scatter'),
      this._makeGhost('pinky', PAL.pinky, 13,9,2500,'house'),
      this._makeGhost('inky',  PAL.inky,  14,9,5500,'house'),
      this._makeGhost('clyde', PAL.clyde, 15,9,9000,'house'),
    ];
    this.ghostGfx=this.add.graphics().setDepth(9);
  }

  _makeGhost(name,color,c,r,releaseT,mode){
    return {name,color,x:c*CELL+CELL/2,y:r*CELL+CELL/2,
      dir:'LEFT',speed:105,mode,releaseT,
      frightened:false,eaten:false,flashPhase:false};
  }

  // ─── CE2 GHOST TRAIN — sleeping ghosts on corridors ──────────────────────────
  _spawnSleepGhosts(){
    // Fixed positions on open corridor cells — confirmed open in buildMaze()
    const POS=[
      {r:1, c:3,  color:PAL.pinky},
      {r:1, c:25, color:PAL.clyde},
      {r:9, c:1,  color:PAL.inky},
      {r:9, c:27, color:PAL.blinky},
      {r:20,c:5,  color:PAL.pinky},
      {r:20,c:23, color:PAL.inky},
    ];
    this.sleepGhosts=POS.map(p=>({
      x:p.c*CELL+CELL/2, y:p.r*CELL+CELL/2,
      color:p.color, state:'sleeping',
    }));
    this.sleepGfx=this.add.graphics().setDepth(8);
  }

  _drawSleepGhosts(){
    const g=this.sleepGfx; g.clear();
    const now=this.time.now;
    for(const sg of this.sleepGhosts){
      if(sg.state==='eaten') continue;
      const {x,y,color}=sg;
      if(sg.state==='sleeping'){
        const r=12;
        const breathe=Math.sin(now/800)*1.5; // slow breathing bob
        const yd=y+breathe;
        // Outer ghost aura — muted
        g.fillStyle(color,0.12); g.fillCircle(x,yd,r+10);
        g.fillStyle(color,0.22); g.fillCircle(x,yd,r+4);
        // Muted ghost body
        g.fillStyle(color,0.45);
        g.fillCircle(x,yd-2,r);
        g.fillRect(x-r,yd-2,r*2,r+2);
        // 3-bump skirt
        const bw=r*2/3;
        for(let i=0;i<3;i++){
          g.fillCircle(x-r+i*bw+bw/2, yd+r, bw/2+1);
        }
        // Closed sleepy eyes (lines)
        g.lineStyle(2,0xffffff,0.6);
        g.lineBetween(x-5,yd-4,x-2,yd-4);
        g.lineBetween(x+2,yd-4,x+5,yd-4);
        // Animated Zzz — three sizes, floating upward at different phases
        const zPhase=now/600;
        for(let zi=0;zi<3;zi++){
          const zAlpha=0.8-zi*0.22;
          const zSize=5+zi*3;
          const zx=x+r+2+zi*4;
          const zy=yd-r-4-zi*6+(Math.sin(zPhase+zi)*3);
          g.fillStyle(0xaabbff,zAlpha);
          // Draw 'Z' shape with small rectangles
          g.fillRect(zx,     zy,          zSize,   2);
          g.fillRect(zx,     zy+zSize/2,  zSize,   2);
          g.fillRect(zx,     zy+zSize,    zSize,   2);
          g.fillRect(zx+zSize-2, zy+2,    2, zSize/2);
          g.fillRect(zx,     zy+zSize/2+2,2, zSize/2);
        }
      } else if(sg.state==='frightened'){
        // Large frightened ghost — flashes + wriggles
        const flashOn=(Math.floor(now/120)%2===0);
        const col=flashOn?PAL.scared:0xffffff;
        const r=12;
        const wriggle=Math.sin(now/80)*3;
        // Frightened aura
        g.fillStyle(PAL.scared,0.2); g.fillCircle(x+wriggle,y,r+12);
        g.fillStyle(col,0.95);
        g.fillCircle(x+wriggle,y-2,r);
        g.fillRect(x+wriggle-r,y-2,r*2,r+2);
        const bw=r*2/3;
        for(let i=0;i<3;i++) g.fillCircle(x+wriggle-r+i*bw+bw/2, y+r, bw/2+1);
        // Scared wobbling eyes
        g.fillStyle(flashOn?0xffffff:0x0000aa,1);
        g.fillCircle(x+wriggle-4,y-3,3); g.fillCircle(x+wriggle+4,y-3,3);
      }
    }
  }

  _wakeSleepGhosts(){
    for(const sg of this.sleepGhosts){
      if(sg.state==='sleeping') sg.state='frightened';
    }
  }

  _checkSleepGhostCollisions(){
    if(!this.powered) return;
    const p=this.pac;
    for(const sg of this.sleepGhosts){
      if(sg.state!=='frightened') continue;
      if(Math.hypot(sg.x-p.x,sg.y-p.y)<CELL*0.85){
        sg.state='eaten';
        this.ghostEatSeq++;
        const pts=[200,400,800,1600][Math.min(this.ghostEatSeq-1,3)];
        this.score+=pts;
        this._popup(sg.x,sg.y,'+'+pts,0xffee00,22);
        this._burst(sg.x,sg.y,sg.color,28);
        this._screenFlash(0x8800ff,0.22,300);
        // Camera shake escalates with chain
        this.cameras.main.shake(200,Math.min(0.004+this.ghostEatSeq*0.002,0.014));
        beep(880,0.08,'sine',0.3);
        beep(1320,0.1,'sine',0.3,0.1);
        if(this.ghostEatSeq>=2) this._chainAnnounce(this.ghostEatSeq, pts);
        // Respawn after 10 seconds
        this.time.delayedCall(10000,()=>{sg.state='sleeping';});
      }
    }
  }

  _drawGhosts(){
    const g=this.ghostGfx; g.clear();
    for(const gh of this.ghosts){
      if(gh.eaten){
        this._eyes(g,gh.x,gh.y,gh.dir); continue;
      }
      const cx=gh.x, cy=gh.y, r=13;
      let col=gh.color;
      if(gh.frightened){ col=gh.flashPhase?0xffffff:PAL.scared; }
      // Outer glow aura
      if(!gh.frightened){
        g.fillStyle(col,0.08); g.fillCircle(cx,cy,r+16);
        g.fillStyle(col,0.18); g.fillCircle(cx,cy,r+8);
        g.fillStyle(col,0.30); g.fillCircle(cx,cy,r+3);
      }
      // Ghost body: semi-circle top + rectangular body
      g.fillStyle(col,1);
      g.fillCircle(cx,cy-2,r);          // domed head
      g.fillRect(cx-r,cy-2,r*2,r+4);   // body rectangle
      // 4-bump classic skirt (CE2 style)
      const bumpW=r*2/4;
      for(let i=0;i<4;i++){
        const bx=cx-r+i*bumpW+bumpW/2;
        const by=cy+r+2;
        g.fillCircle(bx,by,bumpW/2);
      }
      if(gh.frightened){
        // Scared face — wavy panicked mouth + wide eyes
        g.fillStyle(0xffffff,1);
        // Zigzag mouth (CE2 scared look: teeth showing)
        const mz=cx-7;
        g.fillTriangle(mz,cy+6,   mz+3.5,cy+3, mz+7,cy+6);
        g.fillTriangle(mz+7,cy+6, mz+10.5,cy+3,mz+14,cy+6);
        // Wide scared eyes
        g.fillStyle(0xffffff,1);
        g.fillCircle(cx-4,cy-4,3.5); g.fillCircle(cx+4,cy-4,3.5);
        // Pupils dart sideways in fear
        const wobble=Math.sin(this.time.now/60)*2;
        g.fillStyle(gh.flashPhase?0xff0000:0x0000dd,1);
        g.fillCircle(cx-4+wobble,cy-4,2); g.fillCircle(cx+4+wobble,cy-4,2);
      } else {
        this._eyes(g,cx,cy,gh.dir);
      }
      if(gh.mode==='house'){
        // Little 'Z' floating above sleeping ghost
        g.fillStyle(0x88aaff,0.7); g.fillCircle(cx+8,cy-13,3);
      }
    }
  }

  _eyes(g,cx,cy,dir){
    const d=DIRS[dir]||{x:0,y:0};
    g.fillStyle(0xffffff,1);
    g.fillCircle(cx-4+d.x,cy-4+d.y,4.5);
    g.fillCircle(cx+4+d.x,cy-4+d.y,4.5);
    g.fillStyle(0x0044ff,1);
    g.fillCircle(cx-4+d.x*2.2,cy-4+d.y*2.2,2.5);
    g.fillCircle(cx+4+d.x*2.2,cy-4+d.y*2.2,2.5);
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────
  _buildUI(){
    const s={fontSize:'13px',fontFamily:'monospace',color:'#ffee00',stroke:'#000',strokeThickness:3};
    this.scoreTxt=this.add.text(6,3,'SCORE 0',s).setDepth(50);
    this.lvTxt   =this.add.text(W/2,3,'LV 1',{...s,color:'#00ccff'}).setOrigin(0.5,0).setDepth(50);
    this.livesTxt=this.add.text(W-6,3,'♥♥♥',s).setOrigin(1,0).setDepth(50);
    this.hiTxt   =this.add.text(W/2,14,'HI 0',{...s,fontSize:'11px',color:'#889999'}).setOrigin(0.5,0).setDepth(50);
    this.chainTxt=this.add.text(W/2,H-22,'',{...s,fontSize:'26px',color:'#ff33ee',
      shadow:{x:0,y:0,color:'#ff00ff',blur:14,fill:true}
    }).setOrigin(0.5,0).setDepth(50);
    this.powerBarGfx=this.add.graphics().setDepth(55);
    this.flashGfx=this.add.graphics().setDepth(80).setAlpha(0);
    this.fruitGfx=this.add.graphics().setDepth(5);
    // DANGER! warning text — shows when < 30 dots remain
    this.dangerTxt=this.add.text(W/2,H/2-60,'DANGER!',{
      fontSize:'36px',fontFamily:'monospace',color:'#ff2200',
      stroke:'#880000',strokeThickness:4,
      shadow:{x:0,y:0,color:'#ff0000',blur:20,fill:true}
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    this.fruit=null;
    this._pauseTxt=null;
    // READY! text
    this._readyTxt=this.add.text(W/2,H/2,'READY!',{
      fontSize:'32px',fontFamily:'monospace',
      color:'#ffff00',stroke:'#886600',strokeThickness:5,
      shadow:{x:0,y:0,color:'#ffcc00',blur:16,fill:true}
    }).setOrigin(0.5).setDepth(95);
    this.tweens.add({targets:this._readyTxt,alpha:0,delay:1600,duration:400});
  }

  // ─── CRT OVERLAY ─────────────────────────────────────────────────────────────
  _buildCRT(){
    const sl=this.add.graphics().setDepth(98);
    for(let y=0;y<H;y+=4){sl.fillStyle(0x000000,0.06);sl.fillRect(0,y,W,2);}
    const vg=this.add.graphics().setDepth(97);
    vg.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,0.55,0.55,0,0);
    vg.fillRect(0,0,W,55);
    vg.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,0,0,0.55,0.55);
    vg.fillRect(0,H-55,W,55);
  }

  // ─── INPUT ───────────────────────────────────────────────────────────────────
  _setupInput(){
    const kb=this.input.keyboard;
    this.kb={
      up:   [kb.addKey(38),kb.addKey(87)],
      down: [kb.addKey(40),kb.addKey(83)],
      left: [kb.addKey(37),kb.addKey(65)],
      right:[kb.addKey(39),kb.addKey(68)],
    };
    kb.addKey(80).on('down',()=>{this.paused=!this.paused;});
    kb.addKey(82).on('down',()=>{this.scene.restart();});
    this.input.on('pointerdown',(p)=>{this.swipeStart={x:p.x,y:p.y};});
    this.input.on('pointerup',(p)=>{
      if(!this.swipeStart)return;
      const dx=p.x-this.swipeStart.x, dy=p.y-this.swipeStart.y;
      this.swipeStart=null;
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
      if(Math.abs(dx)>Math.abs(dy)) this.pac.next={x:dx>0?1:-1,y:0};
      else this.pac.next={x:0,y:dy>0?1:-1};
    });
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  update(time,delta){
    if(this.gameOver) return;
    const dt=delta/1000;
    const t=time/1000;

    if(!this.paused){
      this._readInput();
      this._movePac(dt);
      this._moveGhosts(dt,delta);
      this._updatePower(delta);
      this._checkCollisions();
      this._checkSleepGhostCollisions();
      this._animPellets(t);
      if(this.fruit&&!this.fruit.collected) this._drawFruit();
      this._updateTrail(dt);
      this._animParticles(dt);
      this._animPopups(dt);
    }
    this._drawSleepGhosts();

    // Visual updates (always)
    if(this.powered){
      this.rainbowHue=(this.rainbowHue+200*dt)%360;
      this._redrawWalls(this.rainbowHue);
    } else if(this.dotsLeft<30&&!this.gameOver){
      // Danger mode: walls pulse toward red-orange to signal urgency
      this._dangerAcc=(this._dangerAcc||0)+dt;
      const pulse=Math.sin(this._dangerAcc*5)*0.5+0.5; // 0→1→0 fast
      const hue=30*pulse; // 0=red, 30=orange
      this._redrawWalls(hue, true); // true = danger override
    }
    this._drawPac();
    this._drawGhosts();
    this._updateUI();
    // Ready countdown
    if(this._readyTimer>0){
      this._readyTimer-=delta;
      if(this._readyTimer<=0){
        this._readyTxt&&this._readyTxt.destroy();
        this._readyTxt=null;
        this.paused=false;
      }
    }
  }

  // ─── INPUT READ ──────────────────────────────────────────────────────────────
  _readInput(){
    const down=(arr)=>arr.some(k=>k.isDown);
    const k=this.kb;
    if(down(k.up))    this.pac.next={x:0,y:-1};
    if(down(k.down))  this.pac.next={x:0,y:1};
    if(down(k.left))  this.pac.next={x:-1,y:0};
    if(down(k.right)) this.pac.next={x:1,y:0};
  }

  // ─── PAC MOVEMENT ────────────────────────────────────────────────────────────
  _movePac(dt){
    const p=this.pac;
    if(p.dead){
      p.deadT-=dt*1000;
      if(p.deadT<=0) this._respawn();
      return;
    }
    if(p.invT>0) p.invT-=dt*1000;

    // Mouth — fast snappy chomp like CE2
    p.mouthA+=p.mouthD*5*dt;
    if(p.mouthA>0.44) p.mouthD=-1;
    if(p.mouthA<0.02) p.mouthD=1;

    const speed=p.speed*this.speedMult*(this.powered?1.15:1);

    // Attempt turn
    const nx=p.next;
    if(nx&&(nx.x!==p.dir.x||nx.y!==p.dir.y)){
      if(this._snapped(p.x)&&this._snapped(p.y)&&this._open(p.x,p.y,nx)){
        p.dir={x:nx.x,y:nx.y};
      }
    }
    // Move
    if(p.dir.x||p.dir.y){
      p.x+=p.dir.x*speed*dt;
      p.y+=p.dir.y*speed*dt;
      // Wall penetration correction: if pac entered a wall cell, push back
      const {c:cc2,r:rr2}=this._cellOf(p.x,p.y);
      if(this._isWall(cc2,rr2)){
        if(p.dir.x>0) p.x=cc2*CELL-CELL/2;
        else if(p.dir.x<0) p.x=(cc2+1)*CELL+CELL/2;
        if(p.dir.y>0) p.y=rr2*CELL-CELL/2;
        else if(p.dir.y<0) p.y=(rr2+1)*CELL+CELL/2;
      }
    }

    // Tunnel wrap
    if(p.x<-CELL)  p.x=W+CELL/2;
    if(p.x>W+CELL) p.x=-CELL/2;

    // Eat at current cell
    const {c,r}=this._cellOf(p.x,p.y);
    const cc=((c%COLS)+COLS)%COLS;
    const key=r+','+cc;
    const dot=this.dotMap.get(key);
    if(dot&&dot.active){
      dot.active=false;
      this.dotsLeft--;
      const isPow=dot.type===3;
      if(isPow){
        this.score+=50;
        this._popup(p.x,p.y,'50',PAL.power,14);
        this._activatePower();
      } else {
        this.score+=10;
        this._eatSnd();
        this._redrawDots();
        // Small score popup every 5 dots for satisfying visual feedback
        const eaten2 = 250 - this.dotsLeft;
        if(eaten2 % 5 === 0){
          this._popup(p.x,p.y-8,'+50',PAL.dot,11);
        }
      }
      if(this.dotsLeft<=0) this._nextLevel();
      // Spawn fruit at 70 and 170 dots eaten
      const eaten = 250 - this.dotsLeft;
      if((eaten===70||eaten===170)&&!this.fruit){
        this._spawnFruit();
      }
    }
    // Fruit collection
    if(this.fruit&&!this.fruit.collected){
      this.fruit.timer-=dt*1000;
      if(this.fruit.timer<=0){ this.fruit=null; this.fruitGfx.clear(); }
      else if(Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y)<CELL*0.8){
        this._collectFruit();
      }
    }
  }

  _snapped(v){ return Math.abs(v%CELL-CELL/2)<4; }

  _open(px,py,dir){
    const nx=px+dir.x*CELL, ny=py+dir.y*CELL;
    const {c,r}=this._cellOf(nx,ny);
    return !this._isWall(c,r);
  }

  _cellOf(px,py){ return {c:Math.floor(px/CELL),r:Math.floor(py/CELL)}; }

  _isWall(c,r){
    if(r<0||r>=ROWS) return true;
    c=((c%COLS)+COLS)%COLS;
    return this.maze[r]?.[c]===1;
  }

  // ─── POWER ───────────────────────────────────────────────────────────────────
  _spawnFruit(){
    const fx=14*CELL+CELL/2, fy=9*CELL+CELL/2; // center of ghost house
    this.fruit={x:fx,y:fy,timer:9000,collected:false};
    this._drawFruit();
  }

  _drawFruit(){
    if(!this.fruit||this.fruit.collected) return;
    const g=this.fruitGfx; g.clear();
    const {x,y}=this.fruit;
    const pulse=0.5+0.5*Math.sin(this.time.now/200);
    // Cherry-style: two red circles + stem
    g.fillStyle(0xff0000,0.2*pulse); g.fillCircle(x,y,14);
    g.fillStyle(0xff2244,1); g.fillCircle(x-4,y+2,5); g.fillCircle(x+4,y+2,5);
    g.lineStyle(2,0x33aa00,1);
    g.lineBetween(x-4,y-2,x,y-8);
    g.lineBetween(x+4,y-2,x,y-8);
    g.lineBetween(x,y-8,x+4,y-14);
    // Points label
    g.fillStyle(0xffffff,0.8); g.fillCircle(x-4+1,y+1,2); g.fillCircle(x+4+1,y+1,2);
  }

  _collectFruit(){
    if(!this.fruit||this.fruit.collected) return;
    this.fruit.collected=true;
    const pts=500*(1+(this.level-1)*0.5|0);
    this.score+=pts;
    this.fruitGfx.clear();
    this._popup(this.fruit.x,this.fruit.y,'FRUIT +'+pts,0xff2244,18);
    this._burst(this.fruit.x,this.fruit.y,0xff2244,20);
    this._screenFlash(0xff0000,0.2,250);
    beep(660,0.1,'sine',0.3);
    beep(880,0.1,'sine',0.3,0.1);
    beep(1100,0.15,'sine',0.3,0.2);
    this.fruit=null;
  }

  _activatePower(){
    this.powered=true;
    this.powerTimer=this.powerDuration;
    this.ghostEatSeq=0;
    this.flashAcc=0;
    this.ghosts.forEach(gh=>{
      if(gh.mode!=='house'&&!gh.eaten){ gh.frightened=true; gh.flashPhase=false; }
    });
    // CE2 ghost train: wake all sleeping ghosts — they join the chain
    this._wakeSleepGhosts();
    Music.setPowered(true);  // faster, more intense beat during power mode
    this._screenFlash(0x8800ff,0.35,300);
    this.cameras.main.shake(180,0.006); // CE2 power-up screen shake
    beep(880,0.12,'sawtooth',0.25);
    beep(660,0.12,'sawtooth',0.25,0.1);
  }

  _updatePower(delta){
    if(!this.powered) return;
    this.powerTimer-=delta;
    if(this.powerTimer<2000){
      this.flashAcc+=delta;
      const p=Math.floor(this.flashAcc/180)%2===0;
      this.ghosts.forEach(gh=>{if(gh.frightened&&!gh.eaten)gh.flashPhase=p;});
    }
    if(this.powerTimer<=0){
      this.powered=false; this.flashAcc=0;
      Music.setPowered(false); // return to normal tempo
      this.ghosts.forEach(gh=>{gh.frightened=false;gh.flashPhase=false;});
      this._redrawWalls(0); // restore normal wall color
    }
  }

  // ─── GHOST MOVEMENT ──────────────────────────────────────────────────────────
  _moveGhosts(dt,delta){
    // Danger boost: when fewer than 30 dots remain ghosts chase harder
    const dangerMult = (this.dotsLeft < 30 && !this.powered) ? 1.35 : 1.0;
    for(const gh of this.ghosts){
      if(gh.mode==='house'){
        gh.releaseT-=delta;
        if(gh.releaseT<=0){
          gh.mode='scatter'; gh.x=14*CELL+CELL/2; gh.y=7*CELL+CELL/2; gh.dir='LEFT';
        }
        continue;
      }
      const spd=gh.eaten?200:(gh.frightened?60:gh.speed*this.speedMult*dangerMult);
      this._stepGhost(gh,dt,spd);
    }
  }

  _stepGhost(gh,dt,speed){
    if(this._snapped(gh.x)&&this._snapped(gh.y)){
      const nd=this._pickDir(gh);
      if(nd) gh.dir=nd;
    }
    const d=DIRS[gh.dir];
    const nx=gh.x+d.x*speed*dt, ny=gh.y+d.y*speed*dt;
    const {c,r}=this._cellOf(nx,ny);
    if(!this._isWall(c,r)){gh.x=nx;gh.y=ny;}
    else{
      gh.x=Math.round((gh.x-CELL/2)/CELL)*CELL+CELL/2;
      gh.y=Math.round((gh.y-CELL/2)/CELL)*CELL+CELL/2;
    }
    if(gh.x<-CELL) gh.x=W+CELL/2;
    if(gh.x>W+CELL) gh.x=-CELL/2;

    if(gh.eaten){
      const tx=14*CELL+CELL/2,ty=9*CELL+CELL/2;
      if(Math.hypot(gh.x-tx,gh.y-ty)<8){
        gh.eaten=false;gh.frightened=false;gh.mode='house';gh.releaseT=2500;gh.x=tx;gh.y=ty;
      }
    }
  }

  _pickDir(gh){
    const {c,r}=this._cellOf(gh.x,gh.y);
    const opp=OPP[gh.dir];
    let tx,ty;

    if(gh.eaten){tx=14*CELL+CELL/2;ty=9*CELL+CELL/2;}
    else if(gh.frightened){
      const v=DKEYS.filter(dk=>dk!==opp&&!this._isWall(c+DIRS[dk].x,r+DIRS[dk].y));
      return v.length?v[Math.floor(Math.random()*v.length)]:opp;
    }else{
      switch(gh.name){
        case 'blinky': tx=this.pac.x;ty=this.pac.y; break;
        case 'pinky':  tx=this.pac.x+this.pac.dir.x*CELL*4;ty=this.pac.y+this.pac.dir.y*CELL*4; break;
        case 'inky':{
          const bl=this.ghosts.find(g=>g.name==='blinky');
          const ax=this.pac.x+this.pac.dir.x*CELL*2,ay=this.pac.y+this.pac.dir.y*CELL*2;
          tx=bl?ax*2-bl.x:this.pac.x;ty=bl?ay*2-bl.y:this.pac.y; break;
        }
        case 'clyde':
          if(Math.hypot(gh.x-this.pac.x,gh.y-this.pac.y)>CELL*8){tx=this.pac.x;ty=this.pac.y;}
          else{tx=CELL;ty=(ROWS-2)*CELL;}
          break;
      }
    }
    let best=null,bestD=Infinity;
    for(const dk of DKEYS){
      if(dk===opp) continue;
      const d=DIRS[dk];
      if(this._isWall(c+d.x,r+d.y)) continue;
      const dd=mdist((c+d.x)*CELL,(r+d.y)*CELL,tx,ty);
      if(dd<bestD){bestD=dd;best=dk;}
    }
    return best||opp;
  }

  // ─── COLLISIONS ──────────────────────────────────────────────────────────────
  _checkCollisions(){
    if(this.pac.dead||this.pac.invT>0) return;
    for(const gh of this.ghosts){
      if(gh.mode==='house'||gh.eaten) continue;
      if(Math.hypot(gh.x-this.pac.x,gh.y-this.pac.y)<CELL*0.72){
        if(gh.frightened) this._eatGhost(gh);
        else               this._killPac();
      }
    }
  }

  _eatGhost(gh){
    gh.eaten=true; gh.frightened=false;
    this.ghostEatSeq++;
    const pts=[200,400,800,1600][Math.min(this.ghostEatSeq-1,3)];
    this.score+=pts;
    this._popup(gh.x,gh.y,'+'+pts,PAL.power,22);
    this._burst(gh.x,gh.y,PAL.power,28);
    this._screenFlash(0x8800ff,0.28,350);
    // CE2 camera shake on ghost eat — stronger on higher chain
    const shakeI=0.004+this.ghostEatSeq*0.002;
    this.cameras.main.shake(220,Math.min(shakeI,0.014));
    beep(880,0.08,'sine',0.3);
    beep(1100,0.08,'sine',0.3,0.09);
    beep(1320,0.1,'sine',0.3,0.18);
    // CE2 chain announce — big center text for x2+
    if(this.ghostEatSeq>=2){
      this._chainAnnounce(this.ghostEatSeq, pts);
    }
  }

  _chainAnnounce(seq, pts){
    // Center-screen dramatic chain multiplier pop — CE2 style
    const labels=['','','x2 CHAIN!','x3 CHAIN!','x4 CHAIN!','x5 CHAIN!','x6 CHAIN!','x7 CHAIN!','x8 CHAIN!'];
    const label=labels[Math.min(seq,8)]||('x'+seq+' CHAIN!');
    const colors=[0,0,0xff33ee,0xff5500,0xffdd00,0x00ff88,0x00ccff,0x8844ff,0xffffff];
    const col=colors[Math.min(seq,8)]||0xffffff;
    const hex='#'+col.toString(16).padStart(6,'0');
    const ann=this.add.text(W/2,H/2-20,label,{
      fontSize:(24+seq*4)+'px',fontFamily:'monospace',color:hex,
      stroke:'#000000',strokeThickness:5,
      shadow:{x:0,y:0,color:hex,blur:20,fill:true}
    }).setOrigin(0.5).setDepth(88).setScale(0.5).setAlpha(0);
    // Scale + fade in, hold, fade out
    this.tweens.add({targets:ann,scale:1,alpha:1,duration:160,ease:'Back.easeOut',
      onComplete:()=>{
        this.tweens.add({targets:ann,alpha:0,scale:1.2,delay:500,duration:300,
          onComplete:()=>ann.destroy()
        });
      }
    });
  }

  _killPac(){
    if(this.pac.dead) return;
    this.pac.dead=true; this.pac.deadT=2200;
    this.lives--;
    this._burst(this.pac.x,this.pac.y,PAL.pac,36);
    this._screenFlash(0xff0000,0.5,600);
    beep(220,0.5,'sawtooth',0.3);
    if(this.lives<=0) this.time.delayedCall(2200,()=>this._gameOver());
  }

  _respawn(){
    this.pac.dead=false; this.pac.invT=3000;
    this.pac.x=13*CELL+CELL/2; this.pac.y=17*CELL+CELL/2;
    this.pac.dir={x:0,y:0}; this.pac.next={x:-1,y:0};
    this.powered=false; this.trail=[];
    this.ghosts.forEach((gh,i)=>{
      gh.frightened=false;gh.eaten=false;gh.mode='house';
      gh.releaseT=[0,2000,5000,8000][i];
      gh.x=14*CELL+CELL/2; gh.y=9*CELL+CELL/2;
    });
    this._redrawWalls(0);
  }

  // ─── EFFECTS ─────────────────────────────────────────────────────────────────
  _burst(x,y,color,n=20){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,s=50+Math.random()*130;
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color,size:3+Math.random()*4,g:this.add.graphics().setDepth(22)});
    }
  }

  _animParticles(dt){
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=90*dt;
      p.life-=dt*2; p.g.clear();
      if(p.life>0){p.g.fillStyle(p.color,p.life);p.g.fillCircle(p.x,p.y,p.size*p.life);}
      else{p.g.destroy();this.particles.splice(i,1);}
    }
  }

  _popup(x,y,text,color,size=16){
    const hex='#'+color.toString(16).padStart(6,'0');
    const t=this.add.text(x,y,text,{fontSize:size+'px',fontFamily:'monospace',color:hex,stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(30);
    this.popups.push({t,timer:1.4,startY:y});
  }

  _animPopups(dt){
    for(let i=this.popups.length-1;i>=0;i--){
      const p=this.popups[i];
      p.timer-=dt; p.t.y-=32*dt; p.t.setAlpha(Math.min(1,p.timer*2));
      if(p.timer<=0){p.t.destroy();this.popups.splice(i,1);}
    }
  }

  _screenFlash(color,alpha=0.3,duration=400){
    const f=this.flashGfx; f.clear();
    f.fillStyle(color,alpha); f.fillRect(0,0,W,H); f.setAlpha(1);
    this.tweens.add({targets:f,alpha:0,duration,onComplete:()=>f.clear()});
  }

  _eatSnd(){
    if(!this._ep) this._ep=0;
    this._ep=1-this._ep;
    beep(this._ep?390:280,0.04,'square',0.07);
  }

  // ─── LEVEL / GAMEOVER ────────────────────────────────────────────────────────
  _nextLevel(){
    this.level++;
    this.speedMult=Math.min(1+(this.level-1)*0.1,2.0);
    this.powerDuration=Math.max(3000,7000-(this.level-1)*400);
    Music.setLevel(this.level);  // speed up music each level
    this.paused=true;

    // Level-clear announcement — big text then fade
    const theme=LEVEL_THEMES[(this.level-2)%LEVEL_THEMES.length]; // prev level color
    const edgeHex='#'+theme.edge.toString(16).padStart(6,'0');
    const ann=this.add.text(W/2,H/2,'LEVEL '+(this.level-1)+' CLEAR!',{
      fontSize:'34px',fontFamily:'monospace',color:edgeHex,
      stroke:'#000000',strokeThickness:5,
      shadow:{x:0,y:0,color:edgeHex,blur:24,fill:true}
    }).setOrigin(0.5).setDepth(92);
    this.tweens.add({targets:ann,alpha:0,delay:900,duration:300,
      onComplete:()=>ann.destroy()
    });

    this._screenFlash(0x88ddff,0.55,400);
    this.time.delayedCall(500,()=>{
      this._screenFlash(0xffffff,0.8,400);
      this.time.delayedCall(600,()=>{
        _mazeLevel=this.level;
        this.maze=buildMaze(this.level);
        this.dotMap=new Map();
        this.dotsLeft=0;
        this.dotGfx.clear(); this.pelletGfx.clear();
        for(let r=0;r<ROWS;r++){
          for(let c=0;c<COLS;c++){
            const v=this.maze[r][c];
            if(v===2||v===3){this.dotMap.set(r+','+c,{r,c,type:v,active:true});this.dotsLeft++;}
          }
        }
        this._redrawDots();
        this._redrawWalls(0);  // apply new level color theme
        // Redraw corridor floor with new level theme color
        this.corridorGfx.clear();
        for(let r=0;r<ROWS;r++){
          for(let c=0;c<COLS;c++){
            if(this.maze[r][c]!==1){
              const theme=LEVEL_THEMES[(this.level-1)%LEVEL_THEMES.length];
              this.corridorGfx.fillStyle(theme.floor,0.55);
              this.corridorGfx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
            }
          }
        }
        // Reset sleeping ghost train for new level
        this.sleepGhosts.forEach(sg=>{ sg.state='sleeping'; });
        this._dangerAcc=0; // reset danger pulse accumulator
        this._respawn();
        // Brief READY! before unpausing
        this.paused=true; this._readyTimer=2200;
        const rt2=this.add.text(W/2,H/2,'READY!',{
          fontSize:'32px',fontFamily:'monospace',color:'#ffff00',
          stroke:'#886600',strokeThickness:5,
          shadow:{x:0,y:0,color:'#ffcc00',blur:16,fill:true}
        }).setOrigin(0.5).setDepth(95);
        this.tweens.add({targets:rt2,alpha:0,delay:1600,duration:400,onComplete:()=>rt2.destroy()});
      });
    });
  }

  _gameOver(){
    this.gameOver=true;
    if(this.score>this.hiScore){this.hiScore=this.score;localStorage.setItem('pacce2_hi',this.hiScore);}
    const ov=this.add.graphics().setDepth(85);
    ov.fillStyle(0x000000,0.78); ov.fillRect(0,0,W,H);
    const cx=W/2,cy=H/2;
    this.add.text(cx,cy-55,'GAME OVER',{
      fontSize:'40px',fontFamily:'monospace',color:'#ff2244',stroke:'#000',strokeThickness:5,
      shadow:{x:0,y:0,color:'#ff0000',blur:22,fill:true}
    }).setOrigin(0.5).setDepth(90);
    this.add.text(cx,cy+2,'SCORE  '+this.score,{
      fontSize:'22px',fontFamily:'monospace',color:'#ffee00',stroke:'#000',strokeThickness:3
    }).setOrigin(0.5).setDepth(90);
    this.add.text(cx,cy+38,'HI  '+Math.max(this.score,this.hiScore),{
      fontSize:'16px',fontFamily:'monospace',color:'#aaaaaa',stroke:'#000',strokeThickness:2
    }).setOrigin(0.5).setDepth(90);
    const btn=this.add.text(cx,cy+86,'[ PLAY AGAIN ]',{
      fontSize:'20px',fontFamily:'monospace',color:'#00ccff',stroke:'#000',strokeThickness:3
    }).setOrigin(0.5).setDepth(90).setInteractive({useHandCursor:true});
    btn.on('pointerdown',()=>this.scene.restart());
    this.tweens.add({targets:btn,alpha:0.2,yoyo:true,repeat:-1,duration:680});
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────
  _updateUI(){
    this.scoreTxt.setText('SCORE '+this.score);
    this.lvTxt.setText('LV '+this.level);
    this.livesTxt.setText('♥'.repeat(Math.max(0,this.lives)));
    this.hiTxt.setText('HI '+Math.max(this.score,this.hiScore));
    if(this.ghostEatSeq>1){
      this.chainTxt.setText('CHAIN x'+this.ghostEatSeq+'!');
      this.chainTxt.setScale(1+0.12*Math.sin(this.time.now/55));
    } else {
      this.chainTxt.setText('');
      this.chainTxt.setScale(1);
    }
    // DANGER! warning — pulse in/out when < 30 dots remain
    if(this.dotsLeft < 30 && !this.powered && !this.gameOver) {
      const pulse = Math.abs(Math.sin(this.time.now / 250));
      this.dangerTxt.setAlpha(pulse * 0.9);
      this.dangerTxt.setScale(0.95 + pulse * 0.1);
    } else {
      this.dangerTxt.setAlpha(0);
    }
    // CE2 power bar — depleting bar across bottom during power mode
    const pb=this.powerBarGfx; pb.clear();
    if(this.powered){
      const ratio=Math.max(0,this.powerTimer/this.powerDuration);
      const barW=W*ratio;
      const hue=this.rainbowHue;
      const col=Phaser.Display.Color.HSVToRGB(hue/360,1,1).color;
      // Glow underlay
      pb.fillStyle(col,0.25); pb.fillRect(0,H-4,barW,4);
      pb.fillStyle(col,0.6);  pb.fillRect(0,H-3,barW,3);
      pb.fillStyle(0xffffff,0.8); pb.fillRect(0,H-2,barW,2);
    }
    // Show PAUSED only when manually paused (not during READY countdown)
    const inReady=this._readyTimer>0;
    if(this.paused&&!inReady&&!this._pauseTxt){
      this._pauseTxt=this.add.text(W/2,H/2,'PAUSED',{
        fontSize:'32px',fontFamily:'monospace',color:'#00ccff',stroke:'#000',strokeThickness:5
      }).setOrigin(0.5).setDepth(95);
    }else if((!this.paused||inReady)&&this._pauseTxt){
      this._pauseTxt.destroy();this._pauseTxt=null;
    }
  }
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
window.game=new Phaser.Game({
  type:Phaser.AUTO,
  width:W,height:H,
  backgroundColor:'#000008',
  parent:'game',
  scene:[TitleScene,GameScene],
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,pixelArt:false},
});
