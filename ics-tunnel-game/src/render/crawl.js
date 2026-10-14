import {visionFootprint} from '../sim/vision.js';
import {createExteriorAssets,drawExteriorSky,exteriorMaterial,wallHeight} from './exterior.js';
import {pos,cellKey,distance,wrap,angle} from '../sim/world.js';
// Dependency-free first-person fallback. Rendering reads state and never changes it.
export class CrawlRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.textures={};this.sprites={};this.pitch=0;this.createTextures();this.createSprites();createExteriorAssets(this);
  // Tint outdoor assets once, preserving transparent fence gaps and beam brightness.
  for(const asset of [this.textures.office,this.textures.fence,this.textures.gate,this.sprites.guard_front,this.sprites.guard_back]){const ctx=asset.getContext('2d');ctx.save();ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(5,15,35,0.48)';ctx.fillRect(0,0,asset.width,asset.height);ctx.restore();}
  this.beamCanvas=document.createElement('canvas');this.resize();}
 resize(){const scale=Math.min(1,1400/innerWidth);this.canvas.width=Math.round(innerWidth*scale);this.canvas.height=Math.round(innerHeight*scale);this.w=this.canvas.width;this.h=this.canvas.height;this.focal=this.w/(2*Math.tan(Math.PI/5));this.depth=new Float32Array(this.w);this.beamCanvas.width=this.w;this.beamCanvas.height=this.h;}
 texture(name,base,draw){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,128,128);draw(x);this.textures[name]=c;}
 createTextures(){
  this.texture('wall','#36474b',c=>{c.fillStyle='#28393c';c.fillRect(3,3,122,122);c.strokeStyle='#556268';c.strokeRect(5,5,118,118);c.fillStyle='#1a272b';c.fillRect(11,17,106,3);c.fillRect(11,108,106,3);c.fillStyle='#53696b';for(const x of[12,116])for(const y of[12,116]){c.beginPath();c.arc(x,y,2,0,7);c.fill();}c.fillStyle='#354447';for(let i=0;i<120;i++){const x=(i*47)%128,y=(i*71)%128;c.fillRect(x,y,1,(i%5)+1);}c.fillStyle='#aa6e43';c.globalAlpha=.24;for(let i=0;i<18;i++)c.fillRect((i*37)%128,(i*61)%128,2,12);c.globalAlpha=1;});
  this.texture('panel','#55544a',c=>{c.fillStyle='#303b3a';c.fillRect(8,8,112,112);c.strokeStyle='#e0b66c';c.lineWidth=2;c.strokeRect(9,8,110,112);c.fillStyle='#768079';for(let y=32;y<96;y+=9)c.fillRect(24,y,80,3);c.fillStyle='#e9ad51';c.fillRect(8,8,112,8);c.fillStyle='#272e2e';for(let i=0;i<8;i++)c.fillRect(i*16,8,8,8);c.fillStyle='#d6bb80';c.font='bold 10px monospace';c.fillText('LOOSE PANEL',27,111);});
  this.texture('door','#314647',c=>{c.strokeStyle='#689293';c.lineWidth=2;c.strokeRect(8,3,112,122);c.fillStyle='#1d2e34';c.fillRect(14,13,78,103);c.fillStyle='#102125';c.fillRect(43,37,34,40);c.fillStyle='#67e2c4';c.fillRect(47,41,26,10);c.fillStyle='#5e8585';for(let y=56;y<72;y+=6)for(let x=49;x<73;x+=8)c.fillRect(x,y,4,3);c.fillStyle='#bd9760';c.fillRect(98,42,7,45);c.fillStyle='#84afae';c.font='8px monospace';c.fillText('ACCESS',31,103);});
  this.texture('sealed','#4c3541',c=>{c.fillStyle='#271e2a';c.fillRect(7,7,114,114);c.strokeStyle='#ef6477';c.lineWidth=10;c.beginPath();c.moveTo(20,20);c.lineTo(108,108);c.moveTo(108,20);c.lineTo(20,108);c.stroke();c.fillStyle='#edafad';c.font='bold 10px monospace';c.fillText('RESTRICTED',33,68);});
  this.texture('computer','#243b40',c=>{c.fillStyle='#07191d';c.fillRect(7,12,114,72);c.strokeStyle='#64eac8';c.strokeRect(8,13,112,70);c.fillStyle='#66edc9';c.font='bold 11px monospace';c.fillText('ICS / CONTROL',13,33);c.font='8px monospace';c.fillText('AUTHENTICATION',16,53);c.fillText('REQUIRED',36,66);c.fillStyle='#718c8b';for(let y=98;y<119;y+=7)for(let x=16;x<115;x+=9)c.fillRect(x,y,6,3);});
 }
 sprite(name,draw){const c=document.createElement('canvas');c.width=128;c.height=160;draw(c.getContext('2d'));this.sprites[name]=c;}
 createSprites(){
  for(const side of ['front','back','friend'])this.sprite('bot_'+side,c=>{c.fillStyle='#09191b';c.fillRect(20,123,23,27);c.fillRect(85,123,23,27);c.fillStyle='#45575a';c.fillRect(25,69,78,66);c.fillStyle='#849895';c.fillRect(33,74,62,8);c.fillStyle='#243d40';c.fillRect(39,37,50,45);c.fillStyle='#637e7d';c.fillRect(36,33,56,30);c.fillStyle=side==='front'?'#ff655c':side==='friend'?'#75ebbb':'#e4be65';c.shadowColor=c.fillStyle;c.shadowBlur=14;c.fillRect(42,43,44,8);c.shadowBlur=0;c.strokeStyle='#adc6bd';c.lineWidth=3;c.beginPath();c.moveTo(64,33);c.lineTo(64,18);c.stroke();c.fillStyle='#263f40';c.fillRect(35,91,58,27);c.fillStyle='#a5b7ab';c.font='9px monospace';c.fillText(side==='back'?'LINK / 08':'SECURITY',40,107);});
  this.sprite('code',c=>{c.shadowBlur=20;c.shadowColor='#f2d58b';c.fillStyle='#e4d9b1';c.fillRect(30,67,66,67);c.shadowBlur=0;c.fillStyle='#5d6054';for(let i=0;i<5;i++)c.fillRect(39,78+i*10,i===1?43:32,3);c.fillStyle='#bf8b46';c.fillRect(30,67,66,5);});
  this.sprite('token',c=>{c.shadowBlur=22;c.shadowColor='#67bfff';c.fillStyle='#5cbbd4';c.fillRect(34,76,62,47);c.shadowBlur=0;c.fillStyle='#142c3b';c.fillRect(40,83,50,31);c.fillStyle='#f2d586';c.fillRect(49,90,16,18);c.fillStyle='#8acde5';c.fillRect(72,90,12,4);c.fillRect(72,99,12,4);});
  this.sprite('zero_day',c=>{c.shadowBlur=24;c.shadowColor='#c490ff';c.fillStyle='#ae80de';c.beginPath();c.moveTo(64,54);c.lineTo(103,96);c.lineTo(64,138);c.lineTo(25,96);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle='#271b46';c.font='bold 30px monospace';c.fillText('Ø',54,108);});
  this.sprite('cart',c=>{c.fillStyle='#102127';c.fillRect(12,128,21,21);c.fillRect(96,128,21,21);c.fillStyle='#a69260';c.fillRect(9,91,110,39);c.fillStyle='#dec785';c.fillRect(9,85,110,12);c.fillStyle='#243d3e';c.fillRect(16,101,96,18);c.fillStyle='#84ecc2';c.font='11px monospace';c.fillText('AUTHORIZED',26,115);});
  this.sprite('terminal',c=>{c.fillStyle='#3e6266';c.fillRect(24,58,80,78);c.fillStyle='#09272d';c.fillRect(31,66,66,41);c.fillStyle='#8affd0';c.font='12px monospace';c.fillText('CONNECT',34,90);c.fillStyle='#c2b676';c.fillRect(46,116,38,6);});
  this.sprite('camera',c=>{c.strokeStyle='#698e90';c.lineWidth=8;c.beginPath();c.moveTo(64,10);c.lineTo(64,38);c.stroke();c.fillStyle='#657f7d';c.fillRect(37,36,58,31);c.fillStyle='#081d23';c.fillRect(32,39,22,25);c.fillStyle='#ff7b6d';c.fillRect(35,45,9,12);});
  this.sprite('exit',c=>{c.shadowColor='#77ffd2';c.shadowBlur=18;c.strokeStyle='#67d4ae';c.lineWidth=5;c.strokeRect(21,15,86,137);c.fillStyle='#67d4ae';c.font='12px monospace';c.fillText('UPLINK',40,45);c.font='42px monospace';c.fillText('↑',50,100);});
 }
 prepare(g){this.blocks=new Map();this.housing=new Set();for(const t of g.transports)if(t.type==='conveyor')for(const c of t.path)this.housing.add(cellKey(c));
  for(const s of [...g.slots,...g.decoys]){if(g.isOpen(s))continue;let texture=g.stage===0&&s.id==='gate'?'gate':s.restricted||s.reinforced?'sealed':s.type==='loose_panel'?'panel':'door';let solid=['loose_panel','keypad_door','mfa_door','service_door','cart_checkpoint','honeypot_door','conveyor'].includes(s.type)||s.restricted;
   if(g.ride?.slotId===s.id)solid=false;if(solid)for(const c of(s.type==='conveyor'?s.barrierCells||[s.cell]:[s.cell]))this.blocks.set(cellKey(c),texture);
  }if(g.level.computer)this.blocks.set(cellKey(g.level.computer.cell),'computer');
 }
 material(g,x,y){const k=x+','+y;if(this.blocks.has(k))return this.blocks.get(k);if(this.housing.has(k))return null;if(g.stage===0)return exteriorMaterial(g,x,y);const c=g.level.grid[y]?.[x];return !c||c==='#'?'wall':null;}
 cast(g,dx,dz){
  const p=g.player;let x=Math.floor(p.x/2),y=Math.floor(p.z/2),sx=dx<0?-1:1,sy=dz<0?-1:1;
  const ddx=Math.abs(2/dx),ddy=Math.abs(2/dz);let tx=(dx<0?p.x-x*2:(x+1)*2-p.x)/Math.abs(dx),ty=(dz<0?p.z-y*2:(y+1)*2-p.z)/Math.abs(dz),side=0,d=0;const glass=[];
  for(let i=0;i<90;i++){
   if(tx<ty){d=tx;tx+=ddx;x+=sx;side=0;}else{d=ty;ty+=ddy;y+=sy;side=1;}
   if(g.stage===0&&!g.level.grid[y]?.[x])break;
   const mat=this.material(g,x,y);if(mat){const raw=side?(p.x+dx*d)%2:(p.z+dz*d)%2;let u=(raw+2)%2/2;if(!side&&dx>0||side&&dz<0)u=1-u;
    const hit={d:Math.max(.05,d),u,side,mat};if(mat==='fence'||mat==='gate')glass.push(hit);else return {...hit,glass};
   }
  }return{d:70,u:0,side:0,mat:g.stage===0?null:'wall',glass};
 }
 // Clip a world polygon at the near plane before projecting. This keeps beams
 // visible even when their source is behind or beside the player's camera.
 projectPolygon(g,points,height=.018){
  const sy=Math.sin(g.player.yaw),cy=Math.cos(g.player.yaw);
  const view=points.map(p=>{const dx=p.x-g.player.x,dz=p.z-g.player.z;return{side:dx*cy-dz*sy,depth:dx*sy+dz*cy};});
  const clipped=[];for(let i=0;i<view.length;i++){const a=view[i],b=view[(i+1)%view.length],insideA=a.depth>=.04,insideB=b.depth>=.04;if(insideA)clipped.push(a);if(insideA!==insideB){const t=(.04-a.depth)/(b.depth-a.depth);clipped.push({side:a.side+(b.side-a.side)*t,depth:.04});}}
  return clipped.map(p=>({x:this.w/2+p.side/p.depth*this.focal,y:this.horizon+(this.eyeHeight-height)/p.depth*this.focal}));
 }
 drawFloorPolygon(g,points,color,ctx=this.ctx){const projected=this.projectPolygon(g,points);if(projected.length<3)return;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(projected[0].x,projected[0].y);for(const p of projected.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();}
 drawBeams(g){
  const c=this.beamCanvas.getContext('2d');c.clearRect(0,0,this.w,this.h);
  const observers=[...g.bots.filter(b=>!b.ignore&&b.state!=='trap'),...g.sensors.filter(s=>s.type==='camera'&&!g.sensorDisabled(s))];
  for(const o of observers){const points=visionFootprint(g,o);const color=o.progress>0?'#f5906266':g.stage===0?'#ffecaa66':'#efe2aa55';
   // Triangles avoid joining disconnected wall-clipped sections across a doorway.
   for(let i=1;i<points.length-1;i++)this.drawFloorPolygon(g,[points[0],points[i],points[i+1]],color,c);
  }
  // Floor illumination cannot paint over an opaque wall or door.
  for(let x=0;x<this.w;x+=2){const bottom=this.horizon+this.eyeHeight*this.focal/this.depth[x];c.clearRect(x,0,2,Math.max(0,bottom));}
  this.ctx.drawImage(this.beamCanvas,0,0);
 }
 drawColumn(hit,x,outdoor){if(!hit.mat)return;const c=this.ctx,d=hit.d,top=this.horizon-(wallHeight(hit.mat,outdoor)-this.eyeHeight)*this.focal/d,bottom=this.horizon+this.eyeHeight*this.focal/d;
  c.drawImage(this.textures[hit.mat],Math.floor(hit.u*127),0,1,128,x,top,2,bottom-top);
  if(hit.mat==='fence'||hit.mat==='gate')return;
  const shade=outdoor?Math.min(.55,.12+d/120+(hit.side?.06:0)):Math.min(.9,Math.max(.12,(d-1)/35)+(hit.side?.09:0));c.fillStyle=outdoor?`rgba(4,10,23,${shade})`:`rgba(2,14,22,${shade})`;c.fillRect(x,top,2,bottom-top);
 }

 project(g,p,height=0){const dx=p.x-g.player.x,dz=p.z-g.player.z,depth=dx*Math.sin(g.player.yaw)+dz*Math.cos(g.player.yaw),side=dx*Math.cos(g.player.yaw)-dz*Math.sin(g.player.yaw);if(depth<.08)return null;return{x:this.w/2+side/depth*this.focal,y:this.horizon+(this.eyeHeight-height)/depth*this.focal,depth};}
 draw(g,pitch=0){this.prepare(g);const c=this.ctx,w=this.w,h=this.h;this.horizon=h*.46+pitch*h*.3;this.eyeHeight=g.stage===0?1.55:.72;const outdoor=g.stage===0;
  if(outdoor){drawExteriorSky(this,g);
   this.drawFloorPolygon(g,[{x:2,z:2},{x:21,z:2},{x:21,z:9},{x:2,z:9}],'#14251f');
   this.drawFloorPolygon(g,[{x:2,z:21},{x:21,z:21},{x:21,z:30},{x:2,z:30}],'#17291f');
   this.drawFloorPolygon(g,[{x:2,z:12},{x:28,z:12},{x:28,z:18},{x:2,z:18}],'#242e38');
   for(let x=3;x<28;x+=4)this.drawFloorPolygon(g,[{x,z:14.9},{x:x+1.8,z:14.9},{x:x+1.8,z:15.04},{x,z:15.04}],'#626b72');
  }else{
  const ceiling=c.createLinearGradient(0,0,0,this.horizon);ceiling.addColorStop(0,'#243338');ceiling.addColorStop(1,'#07181e');c.fillStyle=ceiling;c.fillRect(0,0,w,h);
  const floor=c.createLinearGradient(0,this.horizon,0,h);floor.addColorStop(0,'#091e23');floor.addColorStop(1,'#3b4d4d');c.fillStyle=floor;c.fillRect(0,this.horizon,w,h-this.horizon);
  c.strokeStyle='#74908822';c.lineWidth=1;for(let i=1;i<15;i++){const y=this.horizon+.72*this.focal/(i*1.2);c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}for(let i=-12;i<=12;i++){c.beginPath();c.moveTo(w/2+i*10,this.horizon);c.lineTo(w/2+i*180,h);c.stroke();}
  }
  const dirX=Math.sin(g.player.yaw),dirZ=Math.cos(g.player.yaw),rightX=Math.cos(g.player.yaw),rightZ=-Math.sin(g.player.yaw),plane=Math.tan(Math.PI/5);
  const transparent=[];
  for(let x=0;x<w;x+=2){const k=(2*x/w-1)*plane,dx=dirX+rightX*k,dz=dirZ+rightZ*k,hit=this.cast(g,dx,dz);
   this.depth[x]=this.depth[x+1]=hit.d;this.drawColumn(hit,x,outdoor);
   for(const pane of hit.glass)transparent.push({x,hit:pane});
   if(hit.mat==='wall'){const top=this.horizon-(1.8-this.eyeHeight)*this.focal/hit.d,bottom=this.horizon+this.eyeHeight*this.focal/hit.d;c.fillStyle=g.stage===3?'#cc77c944':g.stage===2?'#f3ca6944':'#78e2d844';c.fillRect(x,top+(bottom-top)*.18,2,Math.max(1,(bottom-top)*.012));}
  }
  this.drawBeams(g);
  // Non-solid inspection strips.
  for(const s of g.slots)if(s.type==='inspection_gap'&&!g.isOpen(s)){const p=this.project(g,pos(s.cell),.04);if(p&&p.depth<18&&Math.abs(p.x-w/2)<w&&p.depth<=this.depth[Math.max(0,Math.min(w-1,Math.floor(p.x)))]+.5){c.strokeStyle=g.scannerOpen(s)?'#67e3b5':'#ef8070';c.lineWidth=Math.max(2,4/p.depth);const size=this.focal/p.depth;c.strokeRect(p.x-size*.7,this.horizon-1.0*size,size*1.4,size*1.7);}}
  const objects=[...g.pickups.filter(p=>!p.taken).map(p=>({...p,sprite:p.type})),...g.bots.map(b=>({...b,sprite:(b.human?'guard_':'bot_')+(b.ignore?'friend':Math.abs(wrap(angle(b,g.player)-b.yaw))<Math.PI/2?'front':'back')})),...g.transports.filter(t=>t!==g.ride).map(t=>({...t,sprite:'cart'})),...g.sensors.filter(s=>s.type==='camera'&&!g.sensorDisabled(s)).map(s=>({...s,sprite:'camera'})),...g.decoys.filter(d=>d.type==='honeypot_terminal'&&!g.isOpen(d)).map(d=>({...pos(d.cell),sprite:'terminal'}))];
  if(g.level.exit)objects.push({...pos(g.level.exit.cell),sprite:'exit'});if(g.level.terminal)objects.push({...pos(g.level.terminal.cell),sprite:outdoor?'laptop':'terminal'});
  const layers=objects.map(o=>({o,p:this.project(g,o)})).filter(v=>v.p&&v.p.depth<35).map(v=>({...v,depth:v.p.depth}));
  for(const pane of transparent)layers.push({...pane,depth:pane.hit.d});layers.sort((a,b)=>b.depth-a.depth);
  for(const layer of layers){
   if(layer.hit){this.drawColumn(layer.hit,layer.x,outdoor);continue;}
   const {o,p}=layer,size=(o.human?1.8:outdoor&&o.sprite==='camera'?2.4:1.3)*this.focal/p.depth,left=p.x-size*.4,top=p.y-size,image=this.sprites[o.sprite];if(!image)continue;
   for(let x=Math.max(0,Math.floor(left));x<Math.min(w,left+size*.8);x+=2)if(p.depth<this.depth[x]+.3){const u=Math.max(0,Math.min(127,(x-left)/(size*.8)*128));c.globalAlpha=outdoor?1:Math.max(.3,1-p.depth/45);c.drawImage(image,u,0,Math.min(2/(size*.8)*128,128-u),160,x,top,2,size);}c.globalAlpha=1;
  }
  const bob=Math.sin(g.attemptTime*4)*2;
  if(outdoor){
   // Bolt cutters for the physical padlock; the network keeps its pry bar.
   c.save();c.translate(w*.80,h-52+bob);c.rotate(-.16);c.lineCap='round';
   c.strokeStyle='#a4aaa0';c.lineWidth=13;c.beginPath();c.moveTo(-25,-25);c.lineTo(-9,-115);c.lineTo(8,-139);c.moveTo(25,-25);c.lineTo(9,-115);c.lineTo(-8,-139);c.stroke();
   c.strokeStyle='#994e3c';c.lineWidth=18;c.beginPath();c.moveTo(-25,-25);c.lineTo(-41,79);c.moveTo(25,-25);c.lineTo(41,79);c.stroke();c.fillStyle='#65716c';c.beginPath();c.arc(0,-105,10,0,7);c.fill();c.restore();
  }else{
   c.save();c.translate(w*.76,h+bob);c.rotate(-.24);c.fillStyle='#111d23';c.fillRect(-26,-99,53,145);c.fillStyle='#415558';c.fillRect(-19,-202,29,130);c.fillStyle='#83958c';c.fillRect(-19,-213,70,19);c.fillStyle='#ac9566';for(let i=0;i<5;i++)c.fillRect(-23,-78+i*14,46,7);c.restore();
  }
  const vignette=c.createRadialGradient(w*.5,h*.5,w*.1,w*.5,h*.5,w*.7);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,outdoor?'#32392d44':'#010911a0');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  if(g.trap){c.fillStyle='#e4a03130';c.fillRect(0,0,w,h);}if(g.windup){c.fillStyle='#a3e9ff88';c.fillRect(0,0,w,h);}
 }
 dispose(){}
}
