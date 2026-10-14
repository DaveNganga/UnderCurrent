// One wall-clipped footprint powers both the visible light and sight detection.
// A cone behind the viewer still illuminates visible floor: renderers clip its
// triangles against the camera plane rather than hiding an off-screen source.
const cache = new WeakMap();
export function visionProfile(game, observer) {
  const camera = observer.type === 'camera';
  return {range: camera ? game.cfg.cameraRange : game.cfg.botRange,
    halfAngle: (camera ? game.cfg.cameraHalfAngle ?? 30 : game.cfg.botHalfAngle) * Math.PI / 180};
}
export function blocksSight(game, c) {
  // Chain-link admits light, but still blocks movement. Guardhouse walls do not.
  if(game.stage === 0 && c[0] === 11 && c[1] > 0 && c[1] < 15) return false;
  return game.blocked(c);
}
function castLight(game, origin, yaw, range) {
  const dx=Math.sin(yaw), dz=Math.cos(yaw);
  let x=Math.floor(origin.x/2), z=Math.floor(origin.z/2);
  const sx=dx<0?-1:1, sz=dz<0?-1:1;
  const stepX=Math.abs(dx)<1e-12?Infinity:Math.abs(2/dx);
  const stepZ=Math.abs(dz)<1e-12?Infinity:Math.abs(2/dz);
  let tx=stepX===Infinity?Infinity:(dx<0?origin.x-x*2:(x+1)*2-origin.x)/Math.abs(dx);
  let tz=stepZ===Infinity?Infinity:(dz<0?origin.z-z*2:(z+1)*2-origin.z)/Math.abs(dz);
  let length=range;
  for(let i=0;i<100;i++) {
    let d;
    if(tx<tz){d=tx;tx+=stepX;x+=sx;}else{d=tz;tz+=stepZ;z+=sz;}
    if(d>=range)break;
    if(blocksSight(game,[x,z])){length=Math.max(0,d-.003);break;}
  }
  return {x:origin.x+dx*length,z:origin.z+dz*length};
}
export function visionFootprint(game, observer) {
  let entries=cache.get(game);if(!entries){entries=new Map();cache.set(game,entries);}
  const {range,halfAngle}=visionProfile(game,observer);
  const signature=[game.tick,game.revision,observer.x,observer.z,observer.yaw,range,halfAngle].join(':');
  const old=entries.get(observer.id);if(old?.signature===signature)return old.points;
  const points=[{x:observer.x,z:observer.z}];
  const rays=64;
  for(let i=0;i<=rays;i++)points.push(castLight(game,observer,observer.yaw-halfAngle+2*halfAngle*i/rays,range));
  entries.set(observer.id,{signature,points});return points;
}
export function insideFootprint(points, p) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
export function observerSees(game,observer,p) {
  const {range,halfAngle}=visionProfile(game,observer),dx=p.x-observer.x,dz=p.z-observer.z;
  if(dx*dx+dz*dz>=range*range)return false;
  const delta=Math.atan2(Math.sin(Math.atan2(dx,dz)-observer.yaw),Math.cos(Math.atan2(dx,dz)-observer.yaw));
  if(Math.abs(delta)>=halfAngle)return false;
  return insideFootprint(visionFootprint(game,observer),p);
}
