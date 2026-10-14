import {visionFootprint} from '../sim/vision.js';
import {createExteriorAssets} from './exterior.js';
import {CrawlRenderer} from './crawl.js';
import {pos,cellKey,distance} from '../sim/world.js';
// Optional full 3D renderer. Install the pinned optional dependency, or allow the
// browser to reach the pinned CDN. Simulation has no dependency on Three.js.
export class ThreeRenderer{
 static async create(inputCanvas,{allowCDN=false}={}){
  let THREE;
  const local=await fetch('./node_modules/three/build/three.module.js',{method:'HEAD'}).then(r=>r.ok).catch(()=>false);
  if(local)THREE=await import('../../node_modules/three/build/three.module.js');
  else if(allowCDN)THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  else throw Error('Local Three.js is not installed.');
  return new ThreeRenderer(THREE,inputCanvas);
 }
 constructor(T,inputCanvas){this.horizontalLookSign=-1;this.T=T;this.canvas=document.createElement('canvas');this.canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;';this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.04,90);this.camera.rotation.order='YXZ';this.entities=new Map();this.materials={};
  const painter={textures:{},texture:CrawlRenderer.prototype.texture,sprite(){}};CrawlRenderer.prototype.createTextures.call(painter);createExteriorAssets(painter);this.textureAssets=painter.textures;
  this.resize();inputCanvas.before(this.canvas);inputCanvas.style.opacity='0';}
 resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 material(color,emissive=0){const key=color+':'+emissive;if(!this.materials[key])this.materials[key]=new this.T.MeshStandardMaterial({color,roughness:.85,metalness:.35,emissive,emissiveIntensity:.7});return this.materials[key];}
 box(w,h,d,color,emissive=0){return new this.T.Mesh(new this.T.BoxGeometry(w,h,d),this.material(color,emissive));}
 addBox(group,x,y,z,w,h,d,color,emissive=0){const m=this.box(w,h,d,color,emissive);m.position.set(x,y,z);group.add(m);return m;}
 clearWorld(){if(this.root){this.scene.remove(this.root);this.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});}this.root=new this.T.Group();this.scene.add(this.root);this.entities.clear();}
 build(g){this.clearWorld();const T=this.T;this.key=g.level.id+':'+g.revision;if(g.stage===0){this.buildExterior(g);return;}const accent=[0x95ceb7,0x63cbb8,0xcda75e,0xc286c1][g.stage];this.scene.background=new T.Color(0x07151b);this.scene.fog=new T.FogExp2(0x07151b,.035);
  const ambient=new T.HemisphereLight(0xb6e2dc,0x273340,1.7);this.root.add(ambient);const sunlight=new T.DirectionalLight(0xc3e4de,1.0);sunlight.position.set(2,6,3);this.root.add(sunlight);
  this.lamp=new T.PointLight(0xc6f3e7,8,17,1.8);this.root.add(this.lamp);
  const housing=new Set(g.transports.filter(t=>t.type==='conveyor').flatMap(t=>t.path.map(cellKey))),grid=g.level.grid;
  const floorCells=[];const wallCells=[];for(let y=0;y<grid.length;y++)for(let x=0;x<grid[y].length;x++){const isFloor=grid[y][x]!=='#'||housing.has(x+','+y);if(isFloor)floorCells.push([x,y]);else if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>grid[y+dy]?.[x+dx]&&grid[y+dy][x+dx]!=='#'||housing.has((x+dx)+','+(y+dy))))wallCells.push([x,y]);}
  const walls=new T.InstancedMesh(new T.BoxGeometry(2,1.8,2),this.textured('wall'),wallCells.length),m=new T.Matrix4();wallCells.forEach(([x,y],i)=>{m.makeTranslation(x*2+1,.9,y*2+1);walls.setMatrixAt(i,m);});this.root.add(walls);
  const floors=new T.InstancedMesh(new T.BoxGeometry(1.98,.08,1.98),this.material(0x263c41),floorCells.length);floorCells.forEach(([x,y],i)=>{m.makeTranslation(x*2+1,-.04,y*2+1);floors.setMatrixAt(i,m);});this.root.add(floors);
  const ceiling=new T.InstancedMesh(new T.BoxGeometry(1.98,.06,1.98),this.material(0x22353e),floorCells.length);floorCells.forEach(([x,y],i)=>{m.makeTranslation(x*2+1,1.83,y*2+1);ceiling.setMatrixAt(i,m);});this.root.add(ceiling);
  for(const[x,y]of floorCells){if((x+y)%3===0){this.addBox(this.root,x*2+1,1.77,y*2+1,.8,.04,.1,accent,accent);}if(x%4===0)this.addBox(this.root,x*2+1,1.65,y*2+1,.08,.1,2,0x646459);}
  for(const s of [...g.slots,...g.decoys]){if(!['loose_panel','keypad_door','mfa_door','service_door','cart_checkpoint','conveyor','inspection_gap','honeypot_door'].includes(s.type)&&!s.restricted)continue;const group=new T.Group(),p=pos(s.cell);group.position.set(p.x,0,p.z);const solid=s.type!=='inspection_gap';let width=1.94,depth=.22;if(['E','W'].includes(s.facing)){width=.22;depth=1.94;}
   const color=s.restricted||s.reinforced?0x8d4357:s.type==='loose_panel'?0x968864:0x426768;
   if(solid){this.addBox(group,0,.9,0,width,1.8,depth,color);for(let i=0;i<5;i++)this.addBox(group,0,.5+i*.18,depth/2+.015,width*.8,.04,.025,0x1d2b30);}else{this.addBox(group,-.85,.9,0,.04,1.8,.04,0x7ff5b0,0x7ff5b0);this.addBox(group,.85,.9,0,.04,1.8,.04,0x7ff5b0,0x7ff5b0);}
   this.root.add(group);this.entities.set('barrier:'+s.id,group);
  }
  // Service-terminal decoys need a visible prop as well as an interaction target.
  for(const d of g.decoys.filter(d=>d.type==='honeypot_terminal')){
   const p=pos(d.cell),group=new T.Group();group.position.set(p.x,0,p.z);
   this.addBox(group,0,.6,0,.9,1.2,.5,0x466965);
   for(const side of [-1,1]){
    this.addBox(group,0,1,side*.26,.7,.3,.03,0x73dfac,0x298060);
    this.addBox(group,0,.73,side*.28,.5,.06,.08,0xc2b676);
   }
   this.root.add(group);this.entities.set('barrier:'+d.id,group);
  }
  if(g.level.computer){const p=pos(g.level.computer.cell),group=new T.Group();group.position.set(p.x,0,p.z);this.addBox(group,0,.5,0,1.7,1,.8,0x354f56);this.addBox(group,0,1.15,-.35,1.5,.5,.09,0x6fffd1,0x348f78);this.addBox(group,0,1.15,.35,1.5,.5,.09,0x6fffd1,0x348f78);this.root.add(group);}
  for(const p of g.pickups){const group=new T.Group();group.position.set(p.x,.3,p.z);this.addBox(group,0,0,0,p.type==='token'?.3:.35,.03,.35,p.type==='zero_day'?0xbb88ed:p.type==='code'?0xedd6a1:0x80d4ed,p.type==='zero_day'?0x7246ba:0x524630);this.root.add(group);this.entities.set('pickup:'+p.id,group);}
  for(const t of g.transports){const group=new T.Group();this.addBox(group,0,.2,0,1.2,.3,1.4,0xb19966);for(const x of[-.45,.45])for(const z of[-.5,.5])this.addBox(group,x,.08,z,.25,.2,.3,0x112029);this.addBox(group,0,.37,0,.8,.025,1,0x496d5d,0x1c503c);this.root.add(group);this.entities.set('transport:'+t.id,group);}
  for(const s of g.sensors){const group=new T.Group();this.addBox(group,0,1.4,0,.35,.18,.3,0x9aaa9e);this.addBox(group,0,1.4,.18,.15,.1,.05,0xff6666,0xff3333);this.root.add(group);group.position.set(s.x,0,s.z);this.entities.set('sensor:'+s.id,group);}
  const goal=g.level.exit?.cell||g.level.terminal?.cell;if(goal){const p=pos(goal),group=new T.Group();group.position.set(p.x,0,p.z);this.addBox(group,0,.6,0,.9,1.2,.5,0x466965);this.addBox(group,0,1,.26,.7,.3,.03,0x73dfac,0x298060);this.addBox(group,0,1,-.26,.7,.3,.03,0x73dfac,0x298060);this.root.add(group);}
 }
 makeBot(){const group=new this.T.Group();this.addBox(group,0,.35,0,.5,.5,.5,0x68817e);for(const x of[-.3,.3])this.addBox(group,x,.13,0,.16,.23,.6,0x11222b);this.addBox(group,0,.72,0,.36,.3,.36,0x99aca0);this.addBox(group,0,.76,.21,.26,.07,.06,0xfb8068,0xed563e);return group;}
 draw(g,pitch=0){if(this.key!==g.level.id+':'+g.revision)this.build(g);this.camera.position.set(g.player.x,g.stage===0?1.55:.72,g.player.z);this.camera.rotation.set(pitch*.8,Math.PI+g.player.yaw,0);this.lamp.position.copy(this.camera.position);
  for(const s of [...g.slots,...g.decoys]){const obj=this.entities.get('barrier:'+s.id);if(obj)obj.visible=!g.isOpen(s)&&g.ride?.slotId!==s.id;}
  for(const p of g.pickups){const obj=this.entities.get('pickup:'+p.id);if(obj){obj.visible=!p.taken;obj.rotation.y=g.attemptTime*.6;}}
  for(const t of g.transports){const obj=this.entities.get('transport:'+t.id);if(obj){obj.position.set(t.x,0,t.z);obj.visible=t!==g.ride;}}
  const live=new Set(g.bots.map(b=>'bot:'+b.id));for(const[key,obj]of this.entities)if(key.startsWith('bot:')&&!live.has(key))obj.visible=false;
  for(const b of g.bots){let obj=this.entities.get('bot:'+b.id);if(!obj){obj=b.human?this.makeHuman():this.makeBot();this.root.add(obj);this.entities.set('bot:'+b.id,obj);}obj.position.set(b.x,0,b.z);obj.rotation.y=b.yaw;}
  for(const s of g.sensors){const obj=this.entities.get('sensor:'+s.id);if(obj){obj.rotation.y=s.yaw;obj.visible=!g.sensorDisabled(s);}}
  this.updateBeams(g);this.renderer.render(this.scene,this.camera);
 }
 textured(name,transparent=false){
  const key='texture:'+name;if(!this.materials[key]){const texture=new this.T.CanvasTexture(this.textureAssets[name]);texture.colorSpace=this.T.SRGBColorSpace;this.materials[key]=new this.T.MeshStandardMaterial({map:texture,roughness:.85,metalness:.15,side:this.T.DoubleSide,alphaTest:transparent?.12:0,transparent:false});}return this.materials[key];
 }
 fencePanel(x,z,vertical=true,gate=false){
  const T=this.T,group=new T.Group();group.position.set(x,0,z);
  const mesh=new T.Mesh(new T.PlaneGeometry(2,2.25),this.textured(gate?'gate':'fence',true));mesh.position.y=1.125;if(vertical)mesh.rotation.y=Math.PI/2;group.add(mesh);
  for(const d of[-.97,.97])this.addBox(group,vertical?0:d,1.13,vertical?d:0,.07,2.3,.07,0x8a9189);
  return group;
 }
 buildExterior(g){
  const T=this.T;this.scene.background=new T.Color(0x050b18);this.scene.fog=new T.Fog(0x050b18,35,110);
  this.root.add(new T.HemisphereLight(0x8499c6,0x17251f,.45));const moon=new T.DirectionalLight(0x9aafe0,.35);moon.position.set(-20,35,15);this.root.add(moon);this.lamp=new T.PointLight(0xffeacd,0,1);this.root.add(this.lamp);
  this.addBox(this.root,23,-.1,16,80,.15,75,0x70796b);
  for(const [x,z,w,d]of[[11,5,19,7],[11,26,19,8],[37,27,19,7]])this.addBox(this.root,x,0,z,w,.025,d,0x647b4c);
  this.addBox(this.root,15,.005,15,27,.03,6,0x81847c);
  for(let x=3;x<28;x+=4)this.addBox(this.root,x,.03,15,1.8,.01,.09,0xd9ccaa);
  for(let y=0;y<g.level.grid.length;y++)for(let x=0;x<g.level.grid[y].length;x++)if(g.level.grid[y][x]==='#'){
   if(x>=14&&x<=19&&y>=5&&y<=10){const wall=new T.Mesh(new T.BoxGeometry(2,3.3,2),this.textured('office'));wall.position.set(x*2+1,1.65,y*2+1);this.root.add(wall);}
   else this.root.add(this.fencePanel(x*2+1,y*2+1,x===11||x===0||x===22));
  }
  this.addBox(this.root,34,3.4,16,12.5,.2,12.5,0x68716b);
  // Concrete service apron and a familiar desk/laptop inside the guardhouse.
  this.addBox(this.root,33,.025,15,13,.03,5,0xa7a394);
  const terminal=pos(g.level.terminal.cell);this.addBox(this.root,terminal.x,.85,terminal.z,1.5,.1,.8,0xaba18a);for(const dx of[-.6,.6])this.addBox(this.root,terminal.x+dx,.4,terminal.z,.07,.8,.6,0x686e67);
  this.addBox(this.root,terminal.x,1.07,terminal.z,.65,.4,.05,0x343c3f);this.addBox(this.root,terminal.x,1.07,terminal.z-.03,.56,.31,.01,0x9cbfbb,0x325651);this.addBox(this.root,terminal.x,.91,terminal.z-.23,.65,.035,.45,0x8b928d);
  const gate=this.fencePanel(23,15,true,true);this.root.add(gate);this.entities.set('barrier:gate',gate);
  for(const s of g.sensors){const group=new T.Group();this.addBox(group,0,1.2,0,.065,2.4,.065,0x697870);this.addBox(group,0,2.25,0,.28,.18,.42,0xd4d4c7);this.addBox(group,0,2.25,.24,.14,.1,.035,0x252e2f);this.root.add(group);group.position.set(s.x,0,s.z);this.entities.set('sensor:'+s.id,group);}
  // Background plant equipment sits outside the playable perimeter.
  for(const x of[12,28,40]){const tank=new T.Mesh(new T.CylinderGeometry(3.2,3.2,5.8,24),this.material(0xaab0aa));tank.position.set(x,2.9,-9);this.root.add(tank);this.addBox(this.root,x,5.8,-9,7,.08,.2,0x636c68);}
  for(const x of[5,41]){this.addBox(this.root,x,2.1,25,.08,4.2,.08,0x65706a);this.addBox(this.root,x,4.12,24.7,.7,.15,.4,0xc8c4a5,0x3c3822);}
 }
 makeHuman(){
  const T=this.T,group=new T.Group();
  for(const x of[-.13,.13]){this.addBox(group,x,.08,.03,.18,.13,.3,0x30372e);this.addBox(group,x,.42,0,.17,.6,.19,0x586052);}
  this.addBox(group,0,1.0,0,.46,.56,.26,0xa7a58a);this.addBox(group,0,.76,0,.48,.07,.28,0x3b4035);
  this.addBox(group,0,1.36,0,.12,.15,.13,0xbd9376);
  const head=new T.Mesh(new T.SphereGeometry(.135,12,10),this.material(0xcda488));head.scale.set(1,1.22,1);head.position.set(0,1.53,0);group.add(head);
  this.addBox(group,0,1.67,0,.29,.075,.29,0x495747);this.addBox(group,0,1.635,.17,.28,.025,.13,0x495747);
  for(const x of[-.3,.3]){this.addBox(group,x,1.02,0,.13,.4,.16,0x8d967e);this.addBox(group,x,.81,.07,.12,.13,.14,0xbd9476);}
  this.addBox(group,-.13,1.13,.15,.07,.11,.01,0xd5c078);this.addBox(group,.12,1.12,.15,.09,.13,.055,0x3c4738);
  this.addBox(group,.3,.83,.22,.075,.075,.24,0x344139);this.addBox(group,.3,.83,.36,.085,.08,.025,0xf8e9b4,0x746034);
  return group;
 }
 updateBeams(g){
  const T=this.T;const observers=[...g.bots.filter(b=>!b.ignore&&b.state!=='trap'),...g.sensors.filter(s=>s.type==='camera'&&!g.sensorDisabled(s))];const alive=new Set();
  for(const o of observers){const key='beam:'+o.id;alive.add(key);const points=visionFootprint(g,o);let mesh=this.entities.get(key);
   if(!mesh){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array((points.length-2)*9),3));const material=new T.MeshBasicMaterial({color:0xffe9a5,opacity:.32,transparent:true,depthWrite:false,side:T.DoubleSide});mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=2;this.root.add(mesh);this.entities.set(key,mesh);}
   mesh.visible=true;mesh.material.color.set(o.progress>0?0xffa577:0xffeab0);const data=mesh.geometry.attributes.position.array;let index=0;
   for(let i=1;i<points.length-1;i++)for(const p of[points[0],points[i],points[i+1]]){data[index++]=p.x;data[index++]=g.stage===0?.055:.025;data[index++]=p.z;}
   mesh.geometry.attributes.position.needsUpdate=true;
  }
  for(const[key,mesh]of this.entities)if(key.startsWith('beam:')&&!alive.has(key))mesh.visible=false;
 }

 dispose(){this.clearWorld();this.renderer.dispose();this.canvas.remove();}
}
