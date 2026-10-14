// Procedural real-world exterior: nighttime, concrete, chain-link, and human guards.
export function exteriorMaterial(g,x,y){
 if(!g.level.grid[y]?.[x])return null;
 if(g.level.grid[y][x]!=='#')return null;
 return x>=14&&x<=19&&y>=5&&y<=10?'office':'fence';
}
export function wallHeight(material,outdoor){return outdoor?(material==='office'?3.3:2.25):1.8;}
export function createExteriorAssets(r){
 r.texture('office','#c7beb0',c=>{
  c.fillStyle='#b2a797';c.fillRect(0,88,128,40);c.fillStyle='#938b7e';c.fillRect(0,88,128,5);
  c.strokeStyle='#e0d8ca';for(let y=8;y<88;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(128,y);c.stroke();}
  c.fillStyle='#dedbd0';c.fillRect(18,22,92,52);c.fillStyle='#71838a';c.fillRect(22,26,84,43);
  const glass=c.createLinearGradient(22,26,90,70);glass.addColorStop(0,'#9eacaf');glass.addColorStop(1,'#445960');c.fillStyle=glass;c.fillRect(23,27,81,40);
  c.strokeStyle='#e0d7c6';c.lineWidth=3;c.beginPath();c.moveTo(64,26);c.lineTo(64,69);c.stroke();
  c.fillStyle='#24443e';c.fillRect(11,101,106,15);c.fillStyle='#eee9ce';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('SECURITY OFFICE',64,112);
 });
 for(const name of ['fence','gate'])r.texture(name,'#00000000',c=>{
  c.clearRect(0,0,128,128);c.strokeStyle='#a6ada8';c.lineWidth=1;
  for(let i=-128;i<256;i+=12){c.beginPath();c.moveTo(i,7);c.lineTo(i+120,127);c.stroke();c.beginPath();c.moveTo(i,7);c.lineTo(i-120,127);c.stroke();}
  c.fillStyle='#69736b';c.fillRect(1,0,5,128);c.fillRect(122,0,5,128);c.fillStyle='#b0b6ab';c.fillRect(2,0,2,128);c.fillRect(0,7,128,4);c.fillRect(0,120,128,4);
  if(name==='gate'){
   c.fillStyle='#e4ded0';c.fillRect(26,33,76,31);c.fillStyle='#aa483c';c.fillRect(28,35,72,12);c.fillStyle='#fff8e5';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('KEEP OUT',64,44);c.fillStyle='#443f36';c.font='6px sans-serif';c.fillText('AUTHORIZED PERSONNEL',64,56);
   c.strokeStyle='#525957';c.lineWidth=3;c.beginPath();c.moveTo(66,71);c.lineTo(66,105);c.stroke();c.fillStyle='#baa060';c.fillRect(59,86,15,13);c.strokeStyle='#dac586';c.lineWidth=2;c.strokeRect(62,80,9,9);
  }
 });
 for(const side of ['front','back'])r.sprite('guard_'+side,c=>{
  // Boots, trouser legs, torso, arms, face, cap, belt, radio, and hand torch.
  c.fillStyle='#252b2b';c.fillRect(40,139,21,12);c.fillRect(69,139,23,12);
  c.fillStyle='#4b5451';c.fillRect(43,96,17,45);c.fillRect(70,96,17,45);
  c.fillStyle='#a7a68b';c.beginPath();c.moveTo(41,49);c.lineTo(86,49);c.lineTo(92,98);c.lineTo(38,98);c.closePath();c.fill();
  c.fillStyle='#848b76';c.fillRect(29,52,14,34);c.fillRect(87,52,13,30);
  c.fillStyle='#c49878';c.fillRect(29,83,12,17);c.fillRect(86,79,12,17);c.fillRect(52,29,25,26);
  c.fillStyle='#caaa8a';c.fillRect(57,47,16,11);c.fillStyle='#46524a';c.fillRect(47,24,34,9);c.fillRect(44,31,40,5);
  if(side==='front'){c.fillStyle='#524d41';c.fillRect(57,39,3,2);c.fillRect(70,39,3,2);c.fillStyle='#d4c38a';c.fillRect(48,62,8,12);c.fillStyle='#3c4640';c.fillRect(71,63,9,11);}else{c.fillStyle='#393c32';c.fillRect(52,35,25,14);c.fillStyle='#353c31';c.font='bold 7px sans-serif';c.fillText('SECURITY',45,71);}
  c.fillStyle='#343b35';c.fillRect(39,94,51,6);c.fillRect(42,92,10,15);c.fillRect(85,84,22,7);c.fillStyle='#f9e6b2';c.fillRect(102,83,6,9);
 });
 r.sprite('laptop',c=>{c.fillStyle='#777a71';c.fillRect(13,98,105,10);c.fillStyle='#4a504b';c.fillRect(22,108,7,43);c.fillRect(102,108,7,43);c.fillStyle='#383f42';c.fillRect(36,62,62,36);c.fillStyle='#b5cfca';c.fillRect(40,66,54,26);c.fillStyle='#334b50';c.font='8px monospace';c.fillText('PLANT LAN',44,82);c.fillStyle='#a9ada5';c.fillRect(29,94,76,5);c.strokeStyle='#293b39';c.lineWidth=2;c.beginPath();c.moveTo(98,92);c.lineTo(117,87);c.lineTo(117,125);c.stroke();});
}
export function drawExteriorSky(r,g){
 const c=r.ctx,w=r.w,h=r.h,horizon=r.horizon;
 const sky=c.createLinearGradient(0,0,0,Math.max(1,horizon));sky.addColorStop(0,'#030713');sky.addColorStop(.65,'#0a1528');sky.addColorStop(1,'#17273a');c.fillStyle=sky;c.fillRect(0,0,w,h);
 const offset=g.player.yaw*w*.25;
 c.fillStyle='#7386a012';for(let i=-2;i<8;i++){const x=((i*340-offset)%(w+500)+w+500)%(w+500)-250;c.beginPath();c.ellipse(x,horizon*.25+Math.sin(i*4)*22,145,13,0,0,7);c.fill();}
 c.fillStyle='#101c24';c.beginPath();c.moveTo(0,horizon+10);for(let x=0;x<=w;x+=15)c.lineTo(x,horizon-25-Math.sin((x+offset)*.004)*15-Math.sin((x+offset)*.016)*8);c.lineTo(w,h);c.lineTo(0,h);c.fill();
 // Distant water-treatment tanks, industrial sheds and pipework beyond the fence.
 const base=((w*.62-offset)%(w+950)+w+950)%(w+950)-200;
 c.fillStyle='#263444';c.fillRect(base,horizon-103,158,95);c.beginPath();c.ellipse(base+79,horizon-103,79,13,0,0,7);c.fill();c.fillStyle='#354457';c.beginPath();c.ellipse(base+79,horizon-104,79,10,0,0,7);c.fill();c.fillStyle='#1a2935';c.fillRect(base+35,horizon-75,88,22);c.fillStyle='#798894';c.font='9px sans-serif';c.fillText('WATER TREATMENT',base+39,horizon-60);c.fillStyle='#22313f';c.fillRect(base+190,horizon-67,118,65);c.fillRect(base+226,horizon-145,11,80);
 const ground=c.createLinearGradient(0,horizon,0,h);ground.addColorStop(0,'#15212a');ground.addColorStop(1,'#202b34');c.fillStyle=ground;c.fillRect(0,horizon,w,h-horizon);
}
