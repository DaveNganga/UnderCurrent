import {Game} from './sim/game.js';
import {CrawlRenderer} from './render/crawl.js';
import {pos,cellKey} from './sim/world.js';
const $=id=>document.getElementById(id),show=(id,on)=>$(id).hidden=!on;
let game,renderer,paused=false,locked=false,drag=false,yaw=Math.PI/2,pitch=0,accumulator=0,last=0,uiTime=0,previousStatus='',previousKeypad=false,lastViewRevision='',audioContext,lastSoundEvent=0;
const keys=new Set();let mapOpen=false,sensitivity=1,keyValue='',soundEnabled=true;
const config=await fetch('./config/game.config.json').then(r=>r.json());
const index=await fetch('./public/blueprints/index.json').then(r=>r.json());
const ids=[...Object.values(index.tiers).flat(),'control_room_v1'];
const assets={index};
function reportError(e){show('loading',false);show('error',true);$('error').textContent='The prototype could not start.\n\n'+e.message+'\n\nLaunch it with Start Game.sh rather than opening index.html directly.';console.error(e);}
function randomSeed(){return String(crypto.getRandomValues(new Uint32Array(1))[0]).slice(0,8);}
function boot(seed){game=new Game(assets,config,seed);yaw=game.player.yaw;pitch=0;lastSoundEvent=0;previousStatus='';previousKeypad=false;mapOpen=false;paused=false;keyValue='';keys.clear();$('seedInput').value=seed;$('seedLabel').textContent=seed;show('mapPanel',false);show('keypadPanel',false);show('result',false);show('pause',false);show('menu',true);show('hud',false);}
try{
 await Promise.all(ids.map(async id=>assets[id]=await fetch('./public/blueprints/'+id+'.json').then(r=>{if(!r.ok)throw Error('Missing blueprint: '+id);return r.json();})));
 renderer=new CrawlRenderer($('world'));boot(new URLSearchParams(location.search).get('seed')||randomSeed());show('loading',false);requestAnimationFrame(frame);
 // An optional Three.js adapter uses the same simulation. The offline renderer is
 // available immediately, even on machines that cannot download packages.
 const rendererPreference=new URLSearchParams(location.search).get('renderer');
 const hasLocalThree=await fetch('./node_modules/three/build/three.module.js',{method:'HEAD'}).then(r=>r.ok).catch(()=>false);
 if(rendererPreference==='three'||hasLocalThree&&rendererPreference!=='offline'){
  import('./render/three.js').then(async({ThreeRenderer})=>{const replacement=await ThreeRenderer.create($('world'),{allowCDN:rendererPreference==='three'});renderer.dispose();renderer=replacement;$('rendererName').textContent='THREE.JS';}).catch(e=>{console.warn('Three.js unavailable; offline view retained.',e);game.say('Three.js could not load. The offline renderer is active.');});
 }
}catch(e){reportError(e);}
function tone(freq=220,length=.08,kind='sine',gain=.05){if(!soundEnabled)return;try{audioContext??=new AudioContext();const osc=audioContext.createOscillator(),amp=audioContext.createGain();osc.type=kind;osc.frequency.setValueAtTime(freq,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.55),audioContext.currentTime+length);amp.gain.setValueAtTime(gain,audioContext.currentTime);amp.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+length);osc.connect(amp);amp.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+length);}catch{}}
function lock(){if(game.status!=='playing'||game.keypad)return;try{const promise=$('world').requestPointerLock?.();promise?.catch(()=>{});}catch{}}
function unlock(){if(document.pointerLockElement)document.exitPointerLock();}
function start(skip=false){const seed=$('seedInput').value.trim()||randomSeed();if(seed!==game.seed)boot(seed);game.status='playing';if(skip)game.loadStage(1);yaw=game.player.yaw;show('menu',false);show('hud',true);tone(350);lock();}
$('start').onclick=()=>start();$('skip').onclick=()=>start(true);
$('resume').onclick=()=>{paused=false;keys.clear();show('pause',false);lock();};
$('restart').onclick=()=>{paused=false;unlock();boot(randomSeed());};
$('sensitivity').oninput=e=>sensitivity=Number(e.target.value);$('sound').onchange=e=>soundEnabled=e.target.checked;
function exportLog(){const blob=new Blob([JSON.stringify({version:1,seed:game.seed,layouts:game.layoutIds,config,events:game.events,actions:game.inputs},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='undercurrent-'+game.seed+'-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=exportLog;$('resultExport').onclick=exportLog;
$('continue').onclick=()=>{if(game.status==='captured')game.resumeAfterCapture();else if(game.status==='levelComplete')game.advance();else{boot(randomSeed());return;}yaw=game.player.yaw;pitch=0;show('result',false);keys.clear();lock();};
for(const text of ['1','2','3','4','5','6','7','8','9','⌫','0','ENTER']){const b=document.createElement('button');b.className='key'+(text==='ENTER'?' enter':'');b.textContent=text;b.onclick=()=>keypadInput(text);$('keyGrid').append(b);}
function keypadInput(key){if(!game.keypad)return;if(key==='ENTER'){game.action('code',keyValue);keyValue='';tone(300);}else if(key==='⌫')keyValue=keyValue.slice(0,-1);else if(keyValue.length<5)keyValue+=key;updateKeypad();}
function closeKeypad(){game.action('closeKeypad');show('keypadPanel',false);keys.clear();lock();}
$('closeKeypad').onclick=closeKeypad;
function updateKeypad(){if(!game.keypad)return;$('digits').textContent=(keyValue+'_____').slice(0,5).split('').join(' ');$('keypadTitle').textContent=game.keypad.title;
 $('keypadNotes').textContent=Object.keys(game.codes).length?'YOUR NOTES: '+Object.entries(game.codes).map(([id,code])=>id+' / '+code).join(' · '):'No access notes recovered yet.';}
document.addEventListener('pointerlockchange',()=>{const was=locked;locked=document.pointerLockElement===$('world');if(was&&!locked&&game.status==='playing'&&!game.keypad&&!paused){paused=true;keys.clear();show('pause',true);}});
document.addEventListener('mousemove',e=>{if((locked||drag)&&game.status==='playing'&&!paused&&!game.keypad){yaw+=e.movementX*.00187*sensitivity*(renderer.horizontalLookSign??1);pitch=Math.max(-.9,Math.min(.9,pitch-e.movementY*.0017*sensitivity));}});
$('world').addEventListener('mousedown',e=>{if(game.status!=='playing'||paused)return;if(!locked){drag=true;lock();}if(e.button===0){game.action('strike');}});
document.addEventListener('mouseup',()=>drag=false);
window.addEventListener('blur',()=>{keys.clear();if(game?.status==='playing'&&!game.keypad){paused=true;show('pause',true);unlock();}});
document.addEventListener('keydown',e=>{
 if(e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright','backspace','tab'].includes(k))e.preventDefault();
 if(game.keypad){if(/^\d$/.test(k))keypadInput(k);else if(k==='enter')keypadInput('ENTER');else if(k==='backspace')keypadInput('⌫');else if(k==='escape')closeKeypad();return;}
 if(k==='escape'){if(game.status==='playing'){paused=!paused;show('pause',paused);keys.clear();if(paused)unlock();else lock();}return;}
 if(paused||game.status!=='playing')return;keys.add(k);if(e.repeat)return;
 if(k==='e')game.action('interact');if(k==='q')game.action('exploit');if(k==='backspace')game.action('abort');
 if(k==='m'){mapOpen=!mapOpen;show('mapPanel',mapOpen);if(mapOpen)drawMap();}
 if(k==='l'){paused=true;show('pause',true);unlock();}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('resize',()=>renderer?.resize());
function frame(now){const elapsed=Math.min(.1,(now-(last||now))/1000);last=now;
 const viewRevision=game.level.id+':'+game.revision;if(viewRevision!==lastViewRevision){lastViewRevision=viewRevision;yaw=game.player.yaw;pitch=0;}
 if(!paused&&game.status==='playing'){accumulator+=elapsed;while(accumulator>=1/60){if(!game.keypad&&!game.hack){yaw+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*1.5/60*(renderer.horizontalLookSign??1);}
   game.update(1/60,{yaw,forward:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),strafe:(Number(keys.has('d'))-Number(keys.has('a')))*(renderer.horizontalLookSign??1)});accumulator-=1/60;if(game.status!=='playing')break;
  }}else accumulator=0;
 renderer.draw(game.snapshot(),pitch);
 uiTime+=elapsed;if(uiTime>.08){uiTime=0;updateUI();if(mapOpen)drawMap();}
 for(let i=lastSoundEvent;i<game.events.length;i++){const type=game.events[i].type;if(type==='panel_strike')tone(100,.16,'sawtooth',.08);if(type==='pickup'||type==='hack_complete')tone(680,.15,'sine',.06);if(type==='capture')tone(90,.45,'sawtooth',.06);if(type==='zero_day')tone(700,.25,'triangle',.07);}lastSoundEvent=game.events.length;
 requestAnimationFrame(frame);
}
function updateUI(){
 $('stageName').textContent=['PERIMETER','INITIAL FOOTHOLD','OPERATIONS','CONTROL NETWORK'][game.stage];$('layoutName').textContent=game.stage?'LEVEL '+game.stage+' / 03 · '+game.level.id.toUpperCase():'PHYSICAL ACCESS / INTRODUCTION';$('lives').textContent=game.stage?'●'.repeat(game.lives)+'○'.repeat(3-game.lives):'—';$('tools').textContent=game.stage?String(game.zeroDays).padStart(2,'0'):'—';
 document.body.classList.toggle('outdoor',game.stage===0);
 $('objectiveText').textContent=game.stage===0?'Cut the gate padlock, enter the guardhouse, and connect your laptop.':game.stage===3?'Reach the main computer with a final credential, token, trusted service, or zero-day.':'Find the uplink and establish persistence in the next network.';
 const target=!paused&&game.status==='playing'&&!game.hack&&!game.trap&&!game.keypad?game.interactable():null;$('prompt').textContent=target?.label||'';
 const threat=Math.min(1,game.threat);$('threatFill').style.width=(threat*100)+'%';$('threatFill').style.background=threat>.5?'#f1786c':'#9de6d0';$('threatLabel').textContent=game.trap?'TRAPPED / RESPONDER INBOUND':game.windup?'TARGET CONFIRMED':threat>.1?'SUSPICION RISING':'UNDETECTED';
 $('caption').textContent=game.tick<game.messageUntil?game.message:'';
 $('inventory').textContent=(game.tokens.size?game.tokens.size+' PHYSICAL TOKEN(S) · ':'')+(game.permissions.size?game.permissions.size+' COPIED ACCESS · ':'')+(game.ride?.type==='cart'?'SERVICE '+Math.ceil(game.ride.remaining)+'s':'');
 show('commit',!!(game.hack||game.trap));if(game.hack){$('commitText').textContent='COPYING PERMISSIONS · '+Math.ceil(game.hack.remaining)+'s';$('commitFill').style.width=(100*(1-game.hack.remaining/config.hackSeconds))+'%';}if(game.trap){$('commitText').textContent='HONEY TRAP · '+Math.ceil(game.trap.remaining)+'s';$('commitFill').style.width=(100*(1-game.trap.remaining/3))+'%';}
 if(!!game.keypad!==previousKeypad){previousKeypad=!!game.keypad;show('keypadPanel',previousKeypad);keys.clear();if(previousKeypad){keyValue='';unlock();updateKeypad();}else if(game.status==='playing')lock();}
 if(game.status!==previousStatus){previousStatus=game.status;if(['captured','lost','won','levelComplete'].includes(game.status)){showResult();keys.clear();unlock();}if(game.status==='playing'){show('result',false);yaw=game.player.yaw;}}
}
function showResult(){mapOpen=false;show('mapPanel',false);show('result',true);show('keypadPanel',false);
 const status=game.status;
 $('resultTag').textContent={captured:'CONNECTION NEUTRALIZED',lost:'RUN TERMINATED',won:'OBJECTIVE COMPLETE',levelComplete:'PERSISTENCE ESTABLISHED'}[status];
 $('resultTitle').textContent={captured:'They found you.',lost:'The network closed in.',won:'You’re at the controls.',levelComplete:'A foothold that lasts.'}[status];
 $('resultBody').textContent={captured:`${game.lives} connection${game.lives===1?'':'s'} left in this level. Your map and codes are safe. Recover physical tokens and robot permissions again.`,lost:'Three captures in one level ended this run. Begin again with a new network layout and fresh tools.',won:'The control computer accepted your access. You crossed three networks, adapted to the defender, and reached the asset.',levelComplete:'The next network starts with three lives. Unused zero-days and copied permission tags carry forward; physical tokens do not.'}[status];
 $('resultDetail').textContent=status==='captured'||status==='lost'?'DEFENDER RESPONSE · '+game.lastFort?.action.replaceAll('_',' ')+'\nSecurity has fortified one observed part of the network.':status==='won'?`Run seed ${game.seed} · ${game.events.filter(e=>e.type==='capture').length} captures · ${game.events.filter(e=>e.type==='zero_day').length} exploit openings`:'Your previous network is now permanently behind you.';
 $('continue').textContent={captured:'RECONNECT →',lost:'NEW RUN →',won:'NEW RUN →',levelComplete:'ENTER NEXT NETWORK →'}[status];
}
function drawMap(){const canvas=$('map'),box=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.floor(box.width));canvas.height=Math.max(1,Math.floor(box.height));const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.fillStyle='#071820';c.fillRect(0,0,w,h);const cols=game.level.grid[0].length,rows=game.level.grid.length,size=Math.min((w-25)/cols,(h-25)/rows),ox=(w-cols*size)/2,oy=(h-rows*size)/2;
 for(const k of game.mapKnowledge){const[x,y]=k.split(',').map(Number);c.fillStyle=game.level.grid[y]?.[x]==='#'?'#25434a':'#507271';c.fillRect(ox+x*size,oy+y*size,Math.max(1,size-.6),Math.max(1,size-.6));}
 for(const p of game.pickups)if(!p.taken&&game.mapKnowledge.has(cellKey(p.cell))){c.fillStyle='#e4c386';c.fillRect(ox+p.cell[0]*size+size*.25,oy+p.cell[1]*size+size*.25,size*.5,size*.5);}
 for(const d of game.decoys)if(game.trapKnowledge.has(d.id)){c.fillStyle='#f47874';c.fillRect(ox+d.cell[0]*size,oy+d.cell[1]*size,size,size);}
 c.save();c.translate(ox+game.player.x/2*size,oy+game.player.z/2*size);c.rotate(-game.player.yaw);c.fillStyle='#abffe1';c.beginPath();c.moveTo(0,6);c.lineTo(-4,-4);c.lineTo(4,-4);c.closePath();c.fill();c.restore();
 $('notes').replaceChildren();for(const[id,code]of Object.entries(game.codes)){const div=document.createElement('div');div.className='note';const a=document.createElement('span'),b=document.createElement('b');a.textContent=id;b.textContent=code;div.append(a,b);$('notes').append(div);}if(!Object.keys(game.codes).length)$('notes').textContent='No notes recovered.';
 $('access').textContent=[...game.tokens].map(t=>'TOKEN / '+t).concat([...game.permissions].map(p=>'ROBOT / '+p),[...game.tags].map(t=>'TAG / '+t)).join(' · ')||'No physical tokens or copied permissions.';
}
