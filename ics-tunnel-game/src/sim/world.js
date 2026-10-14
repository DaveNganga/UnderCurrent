// Pure data + deterministic simulation. Distances are metres; grid cells are 2 m.
export const cellKey = c => c.join(',');
export const pos = c => ({x:c[0]*2+1,z:c[1]*2+1});
export const cell = p => [Math.floor(p.x/2),Math.floor(p.z/2)];
export const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
export const angle = (a,b) => Math.atan2(b.x-a.x,b.z-a.z);
export const facing = f => ({N:Math.PI,E:Math.PI/2,S:0,W:-Math.PI/2}[f]??0);
export function rng(seed){let a=2166136261;for(const c of String(seed))a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function choose(r,arr){return arr[Math.floor(r()*arr.length)];}
export function mergeModule(raw,module){
 const b=structuredClone(raw);b.grid=b.grid.map(r=>r.split(''));
 if(!b.finalModule)return b;
 const [ax,ay]=b.finalModule.anchor,shift=c=>[c[0]+ax,c[1]+ay];
 module.grid.forEach((r,y)=>[...r].forEach((v,x)=>b.grid[y+ay][x+ax]=v));
 for(const k of ['patrols','decoyBranches','sensors','sockets','zones'])for(const rawItem of module[k]||[]){
  const a=structuredClone(rawItem);for(const p of ['cell','doorCell','terminalCell','responderPathFrom'])if(a[p])a[p]=shift(a[p]);
  if(a.waypoints)a.waypoints=a.waypoints.map(shift);if(a.rect){a.rect[0]+=ax;a.rect[1]+=ay;}(b[k]??=[]).push(a);
 }
 b.computer={...module.computer,cell:shift(module.computer.cell)};b.dock=shift(module.serviceDock.cell);
 for(const c of b.carts)if(c.continuesIntoModule)c.path.push(...module.serviceTunnel.path.map(shift));
 return b;
}
export function buildLevel(raw,module,seed){
 const b=mergeModule(raw,module),r=rng(seed+':obstacles:'+b.id),used=new Set(),pickups=[],slots=[];
 const supply=(s,kind,reserved=false)=>b.supplyPoints.find(p=>p.routeId===s.routeId&&p.order<s.order&&p.accepts.includes(kind)&&!used.has(p.id)&&(reserved||!p.reservedForSlotId));
 // Every chosen auth barrier has its own reachable upstream supply. Hardened gates
 // never appear as initial mandatory gates: all three starting routes are FREE.
 for(const source of b.slots){
  const s={...source};let options=s.allowedTypes.filter(t=>t!=='hardened_gate');
  options=options.filter(t=>!['keypad_door','mfa_door'].includes(t)||supply(s,'code_note'));
  options=options.filter(t=>t!=='mfa_door'||supply(s,'token'));
  options=options.filter(t=>t!=='service_door'||(b.tier<3&&b.patrols.some(p=>p.id===s.patrolRef&&p.grantsDoorSlotIds.includes(s.id))));
  if(!options.length)throw Error(`No free initial fill for ${b.id}/${s.id}`);
  s.type=choose(r,options);s.code=String(10000+Math.floor(r()*90000));s.hp=3;
  if(['keypad_door','mfa_door'].includes(s.type)){
   const p=supply(s,'code_note');used.add(p.id);pickups.push({...p,type:'code',target:s.id,code:s.code});
   if(s.type==='mfa_door'){const p=supply(s,'token');used.add(p.id);pickups.push({...p,type:'token',target:s.id});}
  }
  slots.push(s);
 }
 // Final access items are physical data already in the authored map.
 for(const p of b.supplyPoints){if(p.accepts.includes('final_code_note'))pickups.push({...p,type:'code',target:'computer',code:String(10000+Math.floor(r()*90000))});if(p.accepts.includes('final_token'))pickups.push({...p,type:'token',target:'computer'});}
 const decoys=b.decoyBranches.map(d=>({...d,type:choose(r,d.allowedTypes)}));
 // Keep genuine dead ends as well as at least one trap, without revealing which.
 if(decoys.length&&!decoys.some(d=>d.type!=='dead_end')){const d=decoys.find(d=>d.allowedTypes.includes('honeypot_door'));if(d)d.type='honeypot_door';}
 const patrols=b.patrols.filter(p=>p.slotless||slots.some(s=>s.patrolRef===p.id&&['service_door','paired_patrol'].includes(s.type))).map(p=>({...p,paired:b.tier===3||slots.some(s=>s.patrolRef===p.id&&s.type==='paired_patrol')||(b.tier===2&&p.slotless&&r()<.5)}));
 return {...b,slots,pickups,decoys,patrols,initialRoutes:{A:'FREE',B:'FREE',C:'FREE'}};
}
export function findPath(grid,start,end,blocked=()=>false){
 const key=cellKey,queue=[start],seen=new Map([[key(start),null]]);let head=0;
 while(head<queue.length){const c=queue[head++];if(key(c)===key(end)){let p=c,out=[];while(p){out.push(p);p=seen.get(key(p));}return out.reverse();}
  for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[c[0]+d[0],c[1]+d[1]],k=key(n);if(!seen.has(k)&&grid[n[1]]?.[n[0]]&&grid[n[1]][n[0]]!=='#'&&!blocked(n)){seen.set(k,c);queue.push(n);}}
 }return [];
}
export function expandPatrol(grid,p){
 let out=[];for(let i=1;i<p.waypoints.length;i++){const path=findPath(grid,p.waypoints[i-1],p.waypoints[i]);out.push(...path.slice(i===1?0:1));}
 if(p.mode==='cycle')out.push(...findPath(grid,p.waypoints.at(-1),p.waypoints[0]).slice(1));
 return out.length?out:p.waypoints;
}
