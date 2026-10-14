import {observerSees} from './vision.js';
import {rng,choose,pos,cell,cellKey,distance,angle,wrap,facing,buildLevel,findPath,expandPatrol} from './world.js';
const electronic=new Set(['keypad_door','mfa_door','service_door','inspection_gap','camera_corridor','cart_checkpoint','honeypot_door','honeypot_terminal','computer','camera','listening']);
const solidTypes=new Set(['loose_panel','keypad_door','mfa_door','service_door','cart_checkpoint','honeypot_door']);
const nice=t=>({loose_panel:'Loose access panel',keypad_door:'Access terminal',mfa_door:'Two-factor access',service_door:'Maintenance permissions',inspection_gap:'Inspection scanner',camera_corridor:'Audit camera',cart_checkpoint:'Service checkpoint',conveyor:'Trusted conveyor',paired_patrol:'Paired patrol',computer:'Control computer',honeypot_door:'Access terminal',honeypot_terminal:'Service terminal'}[t]||t.replaceAll('_',' '));
export class Game{
 constructor(assets,config,seed){this.assets=assets;this.cfg=config;this.seed=String(seed);this.tick=0;this.events=[];this.inputs=[];this.stage=0;this.zeroDays=config.zeroDaysAtStart;this.rewardClaimed=false;this.codes={};this.tags=new Set();this.mapKnowledge=new Set();this.trapKnowledge=new Set();this.message='';this.messageUntil=0;this.status='briefing';this.layoutRng=rng(seed+':layout');this.archRng=rng(seed+':architect');this.layoutIds=[1,2,3].map(n=>choose(this.layoutRng,assets.index.tiers[n]));this.loadPrologue();}
 log(type,data={}){this.events.push({tick:this.tick,level:this.stage,type,...data});}
 say(message){this.message=message;this.messageUntil=this.tick+360;this.log('caption',{message});}
 loadPrologue(){
  const grid=Array.from({length:16},(_,y)=>Array.from({length:23},(_,x)=>x===0||x===22||y===0||y===15?'#':'.'));
  for(let y=1;y<15;y++)grid[y][11]='#';grid[7][11]='.';
  // Real-world guardhouse, with a west-facing entrance behind the fence.
  for(let y=5;y<=10;y++)for(let x=14;x<=19;x++)if(x===14||x===19||y===5||y===10)grid[y][x]='#';
  grid[7][14]='.';
  this.level={id:'perimeter',tier:0,name:'Water treatment plant / perimeter',grid,start:[3,7],slots:[{id:'gate',cell:[11,7],facing:'E',type:'loose_panel',routeId:'shared',hp:1}],pickups:[],decoys:[],patrols:[{id:'guard',human:true,routeId:'shared',slotless:true,mode:'pingpong',waypoints:[[8,5],[8,11]],grantsTags:[],grantsDoorSlotIds:[],paired:false}],sensors:[{id:'perimeter_cam',kind:'camera',cell:[10,3],facing:'S',routeId:'shared'}],conveyors:[],carts:[],sockets:[],zones:[],terminal:{cell:[17,7]}};
  this.initLevel();this.say('Stay out of the flashlights. Cut the gate padlock, enter the guardhouse, and connect your laptop.');
 }
 loadStage(n){this.stage=n;this.level=buildLevel(this.assets[this.layoutIds[n-1]],this.assets.control_room_v1,this.seed);this.mapKnowledge=new Set();this.trapKnowledge=new Set();this.codes={};this.initLevel();this.status='playing';this.say(['','Initial foothold. Find a route to the next network.','Operations network. A fresh exploit is cached near your entry point.','Control network. Paired patrols cannot be hacked. Obtain final access or use an exploit.'][n]);this.log('level_start',{blueprint:this.level.id,initialRoutes:this.level.initialRoutes});}
 initLevel(){this.lives=3;this.forts=[];this.openings=new Set();this.patched=new Set();this.reports=[];this.attempt=1;this.resetAttempt(false);}
 resetAttempt(captured=true){
  if(captured)this.tags.clear();this.tokens=new Set();this.permissions=new Set();this.player={...pos(this.level.start),yaw:Math.PI/2};this.slots=structuredClone(this.level.slots).map(s=>({...s,open:false,hp:this.stage===0&&s.id==='gate'?1:3,wrong:0,locked:false}));
  this.sensors=structuredClone(this.level.sensors).map(s=>({...s,type:s.kind,...pos(s.cell),yaw:facing(s.facing),baseYaw:facing(s.facing),progress:0,cooldown:0}));
  for(const s of this.slots)if(s.type==='camera_corridor')this.sensors.push({id:'sensor_'+s.id,type:'camera',cell:s.cell,...pos(s.cell),routeId:s.routeId,yaw:facing(s.facing)+Math.PI,baseYaw:facing(s.facing)+Math.PI,progress:0,cooldown:0,slotId:s.id});
  this.pickups=structuredClone(this.level.pickups).map(p=>({...p,taken:false,...pos(p.cell)}));
  if(this.stage===2&&!this.rewardClaimed&&this.level.rewardPickup)this.pickups.push({id:'deep_reward',type:'zero_day',cell:this.level.rewardPickup.cell,...pos(this.level.rewardPickup.cell),taken:false});
  this.decoys=structuredClone(this.level.decoys).filter(d=>d.type!=='dead_end').map(d=>({...d,id:d.id,cell:d.type==='honeypot_door'?d.doorCell:d.terminalCell,open:false,routeId:d.routeHint}));
  this.bots=[];for(const p of this.level.patrols)this.spawnPatrol(p);
  this.transports=[];
  for(const c of this.level.conveyors||[])if(this.slots.some(s=>s.id===c.slotId&&s.type==='conveyor')){const count=Math.max(1,Math.floor(c.path.length*2/20));for(let i=0;i<count;i++)this.transports.push({...structuredClone(c),id:c.id+'_'+i,baseId:c.id,type:'conveyor',progress:i*c.path.length/count,speed:this.cfg.conveyorSpeed,active:true,...pos(c.path[Math.floor(i*c.path.length/count)])});}
  for(const c of this.level.carts||[])if(c.finalService||this.slots.some(s=>s.id===c.slotId&&s.type==='cart_checkpoint'))this.transports.push({...structuredClone(c),type:'cart',progress:0,speed:this.cfg.cartSpeed,active:false,remaining:Math.ceil((c.path.length-1)*2/this.cfg.cartSpeed*1.25+5),started:false,...pos(c.startCell)});
  this.ride=null;this.hack=null;this.trap=null;this.windup=null;this.keypad=null;this.confirmExploit=null;this.strikeWait=0;this.attemptTime=0;this.threat=0;
  for(const f of this.forts)this.applyFortification(f);
  this.discover();this.revision=(this.revision||0)+1;this.log('attempt_start',{attempt:this.attempt});
 }
 spawnPatrol(p){const path=expandPatrol(this.level.grid,p);if(!path.length)return;const n=p.paired?2:1;
  for(let i=0;i<n;i++){const index=Math.min(i,path.length-1),v=pos(path[index]);this.bots.push({...p,id:p.id+(i?'_pair':''),patrolId:p.id,type:'bot',...v,path,index,direction:1,yaw:angle(v,pos(path[Math.min(index+1,path.length-1)])),paired:!!p.paired,progress:0,state:'patrol',ignore:false,buffer:[],cooldown:0,search:0});}
 }
 zoneAt(p){const [x,y]=cell(p);return this.level.zones.find(z=>x>=z.rect[0]&&y>=z.rect[1]&&x<z.rect[0]+z.rect[2]&&y<z.rect[1]+z.rect[3]);}
 report(kind,source,target=null){const z=this.zoneAt(this.player),report={tick:this.tick,kind,sourceId:source.id,routeId:z?.routeId||source.routeId||'shared',zoneId:z?.id,targetId:target?.id||null,position:{x:this.player.x,z:this.player.z},attempt:this.attempt};this.reports.push(report);if(source.buffer){source.buffer.push(report);source.buffer=source.buffer.filter(r=>this.tick-r.tick<=3600).slice(-8);}this.log('report',report);return report;}
 isOpen(s){return s.open||this.openings.has(s.id)&&!this.patched.has(s.id);}
 blocked(c,forBot=false){const ch=this.level.grid[c[1]]?.[c[0]];if(!ch||ch==='#'||ch==='K')return true;
  for(const s of [...this.slots,...this.decoys]){
   if(this.isOpen(s))continue;const cells=s.type==='conveyor'?(s.barrierCells||[s.cell]):[s.cell];if(!cells.some(v=>cellKey(v)===cellKey(c)))continue;
   if(s.restricted||s.reinforced||solidTypes.has(s.type)||s.type==='conveyor')return true;
  }return false;
 }
 los(a,b,ignore=null){const d=distance(a,b),steps=Math.ceil(d/.18);for(let i=1;i<steps;i++){const t=i/steps;const c=cell({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});if(cellKey(c)!==ignore&&this.blocked(c))return false;}return true;}
 seenBy(o){return observerSees(this,o,this.player);}
 canStand(x,z){const r=.22;return [[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dz])=>!this.blocked(cell({x:x+dx,z:z+dz})));}
 move(dx,dz){if(this.canStand(this.player.x+dx,this.player.z))this.player.x+=dx;if(this.canStand(this.player.x,this.player.z+dz))this.player.z+=dz;}
 interactable(){
  if(this.finalService())return {id:'computer',type:'computer',...pos(this.level.computer.cell),label:'E · Authenticate using trusted service / Q exploit'};
  if(this.ride)return {type:'ride',id:this.ride.id,label:'E · Leave transport',...this.ride};
  const all=[...this.pickups.filter(p=>!p.taken),...this.slots.filter(s=>!this.isOpen(s)&&!['paired_patrol','camera_corridor'].includes(s.type)).map(s=>({...s,...pos(s.cell)})),...this.decoys.filter(d=>!this.isOpen(d)).map(d=>({...d,...pos(d.cell)})),...this.bots,...this.transports,...this.sensors.filter(s=>!s.disabled&&!this.openings.has(s.id))];
  if(this.level.exit)all.push({id:'exit',type:'exit',...pos(this.level.exit.cell)});
  if(this.level.computer)all.push({id:'computer',type:'computer',...pos(this.level.computer.cell)});
  if(this.level.terminal)all.push({id:'terminal',type:'terminal',...pos(this.level.terminal.cell)});
  const near=all.filter(o=>distance(o,this.player)<(o.type==='bot'?1.7:2.65)&&Math.abs(wrap(angle(this.player,o)-this.player.yaw))<.85&&this.los(this.player,o,cellKey(cell(o))));
  near.sort((a,b)=>distance(a,this.player)-distance(b,this.player));const o=near[0];if(!o)return null;
  o.label=this.label(o);return o;
 }
 label(o){if(o.restricted)return 'Connection sealed · Find another route';if(o.reinforced)return 'Reinforced panel · Cannot force';
  if(o.human)return 'Security guard · Stay outside the flashlight beam';
  if(this.stage===0&&o.id==='gate')return `LMB · Cut padlock [${1-o.hp}/1] · Makes noise`;
  if(this.stage===0&&o.type==='camera')return 'CCTV · Stay outside the light';
  if(o.type==='bot')return o.paired?'Paired patrol · Cannot hack':o.ignore?'Permissions already copied':this.canHack(o)?'E · Copy permissions [8 seconds, cannot cancel]':'Approach silently from behind';
  if(o.type==='code')return 'E · Read access note';if(o.type==='token')return 'E · Collect physical token';if(o.type==='zero_day')return 'E · Collect zero-day tool';
  if(o.type==='loose_panel')return `LMB · Strike loose panel [${3-o.hp}/3] · Loud`;
  if(o.type==='inspection_gap')return this.scannerOpen(o)?'Scanner gap · Cross now':'Inspection active · Wait for green / Q exploit';
  if(o.type==='conveyor')return o.path?'E · Board trusted conveyor':'Wait for a conveyor carrier at a platform';
  if(o.type==='cart')return o.revoked?'Service authorization revoked':o.remaining<=0?'Service session expired':`E · Board service cart [${Math.ceil(o.remaining)}s]`;
  if(o.type==='exit')return 'E · Establish persistence / next level';if(o.type==='terminal')return 'E · Connect to the plant network';
  if(o.type==='computer')return 'E · Authenticate at control computer / Q exploit';
  if(o.type==='camera'||o.type==='listening')return 'Q · Disable sensor with zero-day';
  if(o.type==='service_door')return 'E · Present copied robot permissions / Q exploit';
  if(o.type==='cart_checkpoint')return 'Authorized transport only / Q exploit';
  return 'E · '+nice(o.type)+(o.locked?' [locked for this attempt]':' / Q exploit');
 }
 canHack(b){return !b.human&&!b.paired&&!b.ignore&&!this.hack&&['patrol','return'].includes(b.state)&&b.progress===0&&distance(b,this.player)<=1.7&&Math.abs(wrap(angle(b,this.player)-b.yaw))>Math.PI*2/3&&this.los(b,this.player);}
 action(name,value){if(this.status!=='playing')return;this.inputs.push({tick:this.tick,name,value});
  if(name==='abort'){if(this.hack){this.windup={remaining:.2,botId:this.hack.botId};this.say('Hack aborted. The robot is turning on you.');this.hack=null;}return;}
  if(this.hack||this.trap||this.windup)return;
  if(name==='code'){this.submitCode(value);return;}
  if(name==='closeKeypad'){this.keypad=null;return;}
  if(this.keypad)return;
  const o=this.interactable();if(!o)return;
  if(name==='exploit'){this.exploit(o);return;}
  if(name==='strike'){
   const s=this.slots.find(s=>s.id===o.id);if(!s||s.type!=='loose_panel'||s.reinforced||s.restricted||this.strikeWait>0)return;
   this.strikeWait=this.cfg.strikeCooldown;s.hp--;this.noise(12,s);this.log('panel_strike',{target:s.id,hp:s.hp});this.say(this.stage===0?(s.hp?'Cutting the padlock. Guards may hear the metal.':'Padlock cut. The gate is open. Enter the guardhouse.'):(s.hp?'Metal strike. Nearby patrols may investigate.':'Panel removed. The opening lasts until capture.'));if(s.hp<=0)s.open=true;return;
  }
  if(name!=='interact')return;
  if(this.ride){if(o.type==='computer'&&this.finalService())this.win('trusted service');else this.dismount();return;}
  if(o.restricted||o.reinforced){this.say('This path has been fortified. Explore another branch.');return;}
  if(['code','token','zero_day'].includes(o.type)){
   const p=this.pickups.find(p=>p.id===o.id);p.taken=true;
   if(p.type==='code'){this.codes[p.target]=p.code;this.say(`Access note saved: ${p.target} → ${p.code}. Open M to review.`);}
   if(p.type==='token'){this.tokens.add(p.target);this.say(`Physical token collected for ${p.target}. Lost on capture.`);}
   if(p.type==='zero_day'){this.zeroDays++;this.rewardClaimed=true;this.say('Additional zero-day acquired. Use it carefully.');}this.log('pickup',{id:p.id,kind:p.type});return;
  }
  if(o.type==='bot'){if(o.human){this.say('That is a human guard. Avoid the flashlight and slip past.');return;}const b=this.bots.find(b=>b.id===o.id);if(this.canHack(b)){this.hack={botId:b.id,remaining:this.cfg.hackSeconds};b.state='hacking';this.say('Copying permissions. Stay committed. Backspace aborts and triggers a zap.');}else this.say(o.paired?'Paired robots cannot be hacked. Find another route.':'Get behind an unaware solo robot.');return;}
  if(o.type==='conveyor'&&o.path||o.type==='cart'){this.board(this.transports.find(t=>t.id===o.id));return;}
  if(o.type==='exit'){this.status='levelComplete';this.log('persistence_established');return;}
  if(o.type==='terminal'){this.loadStage(1);return;}
  if(o.type==='computer'){
   if(this.tokens.has('computer')||this.finalService()){this.win(this.tokens.has('computer')?'physical token':'trusted service');return;}
   this.keypad={id:'computer',title:'CONTROL COMPUTER',value:''};this.say('Authenticate with the final code or a physical token. A zero-day can bypass this check.');return;
  }
  if(o.type==='honeypot_terminal'){this.triggerTrap(o);return;}
  const s=this.slots.find(s=>s.id===o.id)||this.decoys.find(d=>d.id===o.id);
  if(o.type==='service_door'){
   if(this.permissions.has(s.id)||(s.acceptsTags||[]).some(t=>this.tags.has(t))){s.open=true;this.say('Copied permissions accepted.');this.log('authorized_open',{target:s.id});}else this.say('This door requires permissions from a solo maintenance robot.');return;
  }
  if(['keypad_door','mfa_door','honeypot_door'].includes(o.type)&&!o.locked)this.keypad={id:o.id,title:'ACCESS TERMINAL · '+o.id,value:''};
 }
 submitCode(code){if(!this.keypad||!/^\d{5}$/.test(code))return;const id=this.keypad.id;
  if(id==='computer'){if(code===this.level.pickups.find(p=>p.target==='computer'&&p.type==='code')?.code){this.keypad=null;this.win('credential');}else this.say('Access denied. Final control credential required.');return;}
  const s=this.slots.find(s=>s.id===id)||this.decoys.find(d=>d.id===id);if(!s)return;
  if(s.type==='honeypot_door'){this.keypad=null;this.triggerTrap(s);return;}
  if(s.code===code&&(!s.extraToken||this.tokens.has(s.id))&&(s.type!=='mfa_door'||this.tokens.has(s.id))){s.open=true;this.keypad=null;this.say('Access accepted.');this.log('authorized_open',{target:id});}
  else if(s.code===code){this.say('Code accepted. You still need the matching physical token.');}
  else{s.wrong++;this.noise(8,s);if(s.wrong>=3){s.locked=true;this.keypad=null;this.say('Three failures. Terminal locked until your next attempt.');}else this.say(`Incorrect code. ${3-s.wrong} attempts remaining.`);}
 }
 exploit(o){
  if(this.stage===0){this.say('Network tools are available after connecting to the computer.');return;}
  if(!electronic.has(o.type)||o.restricted||this.patched.has(o.id)){this.say(o.paired?'A zero-day cannot bypass paired robots.':'This barrier cannot be bypassed with a zero-day.');return;}
  if(this.zeroDays<=0){this.say('No unused zero-days remain.');return;}
  if(this.confirmExploit?.id!==o.id||this.confirmExploit.until<this.tick){this.confirmExploit={id:o.id,until:this.tick+180};this.say('Press Q again to consume one zero-day at this exact target.');return;}
  this.confirmExploit=null;this.zeroDays--;if(o.type==='computer'){this.win('zero-day');return;}
  this.openings.add(o.id);if(o.type==='camera_corridor')this.openings.add('sensor_'+o.id);
  this.log('zero_day',{target:o.id});this.say('Exploit opening established. Reusable here until patched.');
  // A local sensor must observe the tamper before the architect learns about it.
  for(const s of this.sensors)if(!this.sensorDisabled(s)&&distance(s,this.player)<12&&this.los(s,this.player))this.report('opening',s,o);
 }
 scannerOpen(s){return this.openings.has(s.id)||this.attemptTime%this.cfg.scannerPeriod<this.cfg.scannerGaps[Math.max(0,this.stage-1)];}
 sensorDisabled(s){return s.disabled||this.openings.has(s.id)||s.slotId&&this.openings.has(s.slotId);}
 noise(radius,target){this.noiseUntil=this.tick+60;
  for(const b of this.bots){const d=distance(b,this.player);if(d<radius&&!b.ignore&&b.state!=='hacking'){const attenuation=this.los(b,this.player)?0:3;if(d+attenuation<=radius){this.report('noise',b,target);this.investigate(b,this.player);}}}
  for(const s of this.sensors)if(s.type==='listening'&&!this.sensorDisabled(s)&&distance(s,this.player)<14){this.report('noise',s,target);this.summon(s,this.player);}
 }
 investigate(b,p){const path=findPath(this.level.grid,cell(b),cell(p),c=>this.blocked(c,true));if(path.length){b.investigation=path;b.investIndex=1;b.state='investigate';b.search=10;}}
 summon(source,p){this.bots.filter(b=>!b.ignore&&b.state!=='hacking').map(b=>({b,path:findPath(this.level.grid,cell(b),cell(p),c=>this.blocked(c,true))})).filter(v=>v.path.length&&v.path.length*2<=25).sort((a,b)=>a.path.length-b.path.length).slice(0,2).forEach(v=>this.investigate(v.b,p));}
 triggerTrap(o){this.keypad=null;this.trap={id:o.id,remaining:this.cfg.honeypotSeconds,routeId:o.routeId};this.trapKnowledge.add(o.id);this.say('HONEY TRAP · Movement locked. A security responder is inbound.');
  const source={id:o.id,routeId:o.routeId};this.report('honeypot',source,o);this.summon(source,this.player);
  // A dedicated chamber hatch ensures the visible bot zap occurs within 3s.
  const yaw=this.player.yaw,p={x:this.player.x+Math.sin(yaw)*1.45,z:this.player.z+Math.cos(yaw)*1.45};
  this.bots.push({id:'trap_responder',type:'bot',...p,yaw:yaw+Math.PI,paired:this.stage===3,state:'trap',progress:0,ignore:false,routeId:o.routeId,buffer:[]});
 }
 board(t){if(!t||t.revoked||t.remaining<=0)return;
  if(t.type==='conveyor'){const atPlatform=t.platforms.some(p=>p.cells.some(c=>distance(pos(c),this.player)<3));if(!atPlatform){this.say('Board the conveyor from a marked platform.');return;}}
  this.ride=t;t.active=true;t.started=true;this.say(t.type==='cart'?'Riding authorized service. Watch the session timer.':'Riding trusted transport. E to dismount at a platform.');this.log('board',{target:t.id});
 }
 dismount(forced=false){if(!this.ride)return;const t=this.ride;
  if(t.type==='conveyor'&&!forced&&!t.platforms.some(p=>p.cells.some(c=>distance(pos(c),t)<3))){this.say('Wait until the next platform before leaving the housing.');return false;}
  let spots=[cell(t),...[[-1,0],[1,0],[0,-1],[0,1]].map(d=>[cell(t)[0]+d[0],cell(t)[1]+d[1]])];
  if(t.type==='conveyor')spots=[...t.platforms.flatMap(p=>p.cells).filter(c=>distance(pos(c),t)<4),...spots];
  const c=spots.find(c=>this.canStand(pos(c).x,pos(c).z));if(!c&&!forced){this.say('No safe dismount here. Stay aboard.');return false;}
  const safe=c||this.level.start;Object.assign(this.player,pos(safe));if(t.type==='cart')t.active=false;this.ride=null;this.log('dismount',{target:t.id});return true;
 }
 finalService(){return !!(this.ride?.finalService&&this.ride.remaining>0&&distance(this.ride,pos(this.level.dock))<2.2);}
 win(method){this.status='won';this.log('win',{method});this.say('Control computer accepted your access. Objective complete.');}
 capture(botId,cause='detection'){
  if(this.status!=='playing')return;const b=this.bots.find(b=>b.id===botId)||{id:botId,routeId:'shared',buffer:[]};this.report('capture',b,this.trap?{id:this.trap.id}:null);
  if(this.stage===0){this.resetAttempt();this.say('Spotted at the perimeter. Try a different timing.');return;}
  this.lives--;this.log('capture',{botId,cause,lives:this.lives});this.lastFort=this.architect();this.status=this.lives<=0?'lost':'captured';this.lastCapture=cause;this.keypad=null;this.hack=null;this.windup=null;
 }
 architect(){
  const patchRoll=this.archRng(),counterRoll=this.archRng(),pickRoll=this.archRng();
  const reports=this.reports.filter(r=>r.attempt===this.attempt&&this.tick-r.tick<=3600);
  const scores={};for(const r of reports)if(['A','B','C'].includes(r.routeId))scores[r.routeId]=(scores[r.routeId]||0)+1/(1+(this.tick-r.tick)/900);
  const routeId=Object.keys(scores).sort((a,b)=>scores[b]-scores[a])[0]||'shared';
  const sockets=this.level.sockets.filter(s=>s.routeId===routeId);let candidates=[];
  const observedOpenings=reports.filter(r=>r.kind==='opening'&&this.openings.has(r.targetId));
  if(patchRoll<.6)for(const s of sockets)if(s.allowedActions.includes('PATCH_OPENING')&&observedOpenings.some(r=>r.targetId===s.targetSlotId))candidates.push({action:'PATCH_OPENING',socket:s});
  if(!candidates.length){
   for(const s of sockets){const target=this.slots.find(t=>t.id===s.targetSlotId);for(const action of s.allowedActions){
    if(this.forts.some(f=>f.socket.id===s.id&&f.action===action))continue;
    if(action==='PATCH_OPENING')continue;
    if(action==='REINFORCE_PANEL'&&target?.type!=='loose_panel')continue;
    if(action==='CLOSE_GAP'&&target?.type!=='inspection_gap')continue;
    if(action==='STRENGTHEN_AUTH'&&(!['keypad_door','mfa_door'].includes(target?.type)||!s.reservedTokenSupplyId))continue;
    if(action==='RESTRICT_CONNECTION'&&!target)continue;
    if(action==='INSPECT_CONVEYOR'&&target?.type!=='conveyor')continue;
    if(action==='REVOKE_CART_SESSION'&&target?.type!=='cart_checkpoint')continue;
    if(['PAIR_ROBOT','RESTRICT_ROBOT_PERMISSIONS'].includes(action)&&target?.type!=='service_door')continue;
    if(action==='DEPLOY_HONEYPOT'&&!this.level.decoys.some(d=>d.id===s.decoyBranchId&&d.type==='dead_end'))continue;
    if(routeId==='shared'&&!['ADD_CAMERA','ADD_LISTENING_SENSOR'].includes(action))continue;
    candidates.push({action,socket:s});
   }}
   if(counterRoll<.7){const targets=new Set(reports.filter(r=>r.kind==='noise').map(r=>r.targetId));const counters=candidates.filter(c=>targets.has(c.socket.targetSlotId)&&c.action==='REINFORCE_PANEL');if(counters.length)candidates=counters;}
  }
  if(!candidates.length){const socket=sockets[0]||this.level.sockets.find(s=>s.routeId==='shared')||{id:'entry_audit',cell:this.level.start,routeId:'shared'};candidates=[{action:'ADD_LISTENING_SENSOR',socket}];}
  const f=candidates[Math.floor(pickRoll*candidates.length)];this.forts.push(structuredClone(f));this.log('fortification',{action:f.action,socket:f.socket.id,routeId:f.socket.routeId,reports:reports.length});return f;
 }
 applyFortification(f){const s=this.slots.find(s=>s.id===f.socket.targetSlotId),a=f.action;
  if(a==='PATCH_OPENING'&&s){this.openings.delete(s.id);this.openings.delete('sensor_'+s.id);this.patched.add(s.id);}
  if(a==='REINFORCE_PANEL'&&s)s.reinforced=true;
  if(['CLOSE_GAP','RESTRICT_CONNECTION'].includes(a)&&s)s.restricted=true;
  if(a==='STRENGTHEN_AUTH'&&s){s.extraToken=true;const p=this.level.supplyPoints.find(p=>p.id===f.socket.reservedTokenSupplyId);if(p&&!this.pickups.some(v=>v.id===p.id))this.pickups.push({...p,...pos(p.cell),type:'token',target:s.id,taken:false});}
  if(a==='REVOKE_CART_SESSION')for(const t of this.transports)if(t.slotId===s?.id)t.revoked=true;
  if(a==='RESTRICT_ROBOT_PERMISSIONS'&&s)for(const b of this.bots)if(b.patrolId===s.patrolRef)b.grantsDoorSlotIds=[];
  if(a==='PAIR_ROBOT'&&s){const b=this.bots.find(b=>b.patrolId===s.patrolRef);if(b&&!b.paired){b.paired=true;this.bots.push({...structuredClone(b),id:b.id+'_fort_pair',index:Math.min(1,b.path.length-1),...pos(b.path[Math.min(1,b.path.length-1)])});}}
  if(['ADD_CAMERA','ADD_LISTENING_SENSOR','INSPECT_CONVEYOR'].includes(a))this.sensors.push({id:'fort_'+this.sensors.length,type:a==='ADD_LISTENING_SENSOR'?'listening':'camera',cell:f.socket.cell,...pos(f.socket.cell),routeId:f.socket.routeId,yaw:Math.PI/2,baseYaw:Math.PI/2,progress:0,cooldown:0});
  if(a==='DEPLOY_HONEYPOT'){const d=this.level.decoys.find(d=>d.id===f.socket.decoyBranchId);if(d&&!this.decoys.some(v=>v.id===d.id))this.decoys.push({...d,type:'honeypot_door',cell:d.doorCell,routeId:d.routeHint,open:false});}
 }
 resumeAfterCapture(){if(this.status!=='captured')return;this.attempt++;this.resetAttempt();this.status='playing';this.say('Reconnected. Your discoveries remain; physical tokens and copied robot access must be recovered.');}
 advance(){if(this.status==='levelComplete')this.loadStage(this.stage+1);}
 update(dt,input={}){
  if(this.status!=='playing')return;this.tick++;this.attemptTime+=dt;this.strikeWait=Math.max(0,this.strikeWait-dt);this.threat=0;
  if(input.yaw!==undefined)this.player.yaw=input.yaw;
  if(!this.hack&&!this.trap&&!this.windup&&!this.keypad&&!this.ride){const f=input.forward||0,s=input.strafe||0,l=Math.hypot(f,s)||1,speed=this.cfg.moveSpeed*dt;this.move((Math.sin(this.player.yaw)*f+Math.cos(this.player.yaw)*s)/l*speed,(Math.cos(this.player.yaw)*f-Math.sin(this.player.yaw)*s)/l*speed);}
  for(const t of this.transports)this.updateTransport(t,dt);
  if(this.ride){this.player.x=this.ride.x;this.player.z=this.ride.z;}
  if(this.hack){const b=this.bots.find(b=>b.id===this.hack.botId);this.hack.remaining-=dt;if(this.hack.remaining<=0){for(const tag of b.grantsTags||[])this.tags.add(tag);for(const id of b.grantsDoorSlotIds||[])this.permissions.add(id);for(const c of b.path)this.mapKnowledge.add(cellKey(c));b.ignore=true;b.state='patrol';this.hack=null;this.say('Permissions and patrol path copied. Robot continues its route.');this.log('hack_complete',{botId:b.id});}}
  if(this.trap){this.trap.remaining-=dt;const b=this.bots.find(b=>b.id==='trap_responder');if(b){b.progress=(this.cfg.honeypotSeconds-this.trap.remaining);b.yaw=angle(b,this.player);}this.threat=1;if(this.trap.remaining<=0){this.capture('trap_responder','honeypot');return;}}
  for(const b of this.bots){this.updateBot(b,dt);if(this.status!=='playing')return;}
  for(const s of this.sensors){if(this.sensorDisabled(s))continue;s.yaw=s.baseYaw+Math.sin(this.attemptTime*2*Math.PI/this.cfg.cameraSweepPeriod)*Math.PI/4;s.cooldown=Math.max(0,s.cooldown-dt);
   if(s.type==='camera'){if(this.seenBy(s)){s.progress+=dt;this.threat=Math.max(this.threat,Math.min(.9,s.progress/2));if(s.progress>=2&&s.cooldown<=0){this.report('sighting',s);this.summon(s,this.player);s.cooldown=3;this.say(this.stage===0?'CCTV alert. A guard is investigating.':'Camera report. Nearby security robots are investigating.');}}else s.progress=Math.max(0,s.progress-dt*.75);}}
  for(const s of this.slots)if(s.type==='inspection_gap'&&!this.scannerOpen(s)&&cellKey(cell(this.player))===cellKey(s.cell)&&!this.ride&&this.tick-(s.lastReport||-999)>180){s.lastReport=this.tick;this.report('scanner',s);this.summon(s,this.player);this.say('Inspection scanner triggered. Leave the area.');}
  if(this.windup){this.windup.remaining-=dt;if(this.windup.remaining<=0){this.capture(this.windup.botId);return;}}
  if(this.tick%10===0)this.discover();
 }
 updateTransport(t,dt){
  if(t.revoked)return;if(t.type==='cart'&&t.started){t.remaining-=dt;if(t.remaining<=0){t.remaining=0;t.active=false;if(this.ride===t){this.dismount(true);this.say('Service authorization expired. You have been dropped off.');}return;}}
  if(!t.active)return;t.progress+=dt*t.speed/2;if(t.type==='conveyor')t.progress%=t.path.length;else t.progress=Math.min(t.path.length-1,t.progress);
  const i=Math.floor(t.progress),f=t.progress-i,a=pos(t.path[i]),b=pos(t.path[(i+1)%t.path.length]);t.x=a.x+(b.x-a.x)*f;t.z=a.z+(b.z-a.z)*f;
 }
 updateBot(b,dt){if(['hacking','trap'].includes(b.state))return;b.cooldown=Math.max(0,b.cooldown-dt);
  if(!b.ignore&&this.seenBy(b)){
   b.progress+=dt*(b.state==='patrol'?1:1.5);this.threat=Math.max(this.threat,Math.min(1,b.progress/this.cfg.detectionSeconds));b.yaw=angle(b,this.player);
   if(b.cooldown<=0){this.report('sighting',b);b.cooldown=2;
    for(const s of this.slots)if(this.openings.has(s.id)&&distance(b,pos(s.cell))<9&&this.los(b,pos(s.cell)))this.report('opening',b,s);
   }
   if(b.progress>=this.cfg.detectionSeconds&&!this.windup){this.windup={botId:b.id,remaining:.4};this.say(this.stage===0?'The guard has identified you.':'Target confirmed. Neutralizing.');}return;
  }
  b.progress=Math.max(0,b.progress-dt*this.cfg.detectionDecay);
  if(b.state==='investigate'){
   if(b.investIndex<b.investigation.length){if(this.walkBot(b,pos(b.investigation[b.investIndex]),dt,this.cfg.investigateSpeed))b.investIndex++;}
   else{b.search-=dt;b.yaw=wrap(b.yaw+dt*.7);if(b.search<=0){b.state='return';b.investigation=findPath(this.level.grid,cell(b),b.path[b.index],c=>this.blocked(c,true));b.investIndex=1;}}
  }else if(b.state==='return'){
   if(b.investIndex<b.investigation.length){if(this.walkBot(b,pos(b.investigation[b.investIndex]),dt,this.cfg.botSpeed))b.investIndex++;}else b.state='patrol';
  }else{
   let next=b.index+b.direction;if(next>=b.path.length||next<0){if(b.mode==='cycle'){next=0;}else{b.direction*=-1;next=b.index+b.direction;}}
   if(b.path[next]&&this.walkBot(b,pos(b.path[next]),dt,this.cfg.botSpeed))b.index=next;
  }
 }
 walkBot(b,target,dt,speed){const desired=angle(b,target),delta=wrap(desired-b.yaw);b.yaw=wrap(b.yaw+Math.max(-dt*this.cfg.botTurnSpeed,Math.min(dt*this.cfg.botTurnSpeed,delta)));if(Math.abs(delta)>.3)return false;
  const d=distance(b,target);if(d<speed*dt){b.x=target.x;b.z=target.z;return true;}
  const x=b.x+(target.x-b.x)/d*speed*dt,z=b.z+(target.z-b.z)/d*speed*dt;if(!this.blocked(cell({x,z}),true)){b.x=x;b.z=z;}return false;
 }
 discover(){const p=this.player,[cx,cy]=cell(p);for(let y=cy-5;y<=cy+5;y++)for(let x=cx-5;x<=cx+5;x++){if(!this.level.grid[y]?.[x])continue;const q=pos([x,y]);if(distance(p,q)<3||distance(p,q)<10&&Math.abs(wrap(angle(p,q)-p.yaw))<Math.PI*.28&&this.los(p,q))this.mapKnowledge.add(cellKey([x,y]));}}
 snapshot(){return this;}
}
