(() => {
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d',{alpha:false}),images={};
function img(name,path){const i=new Image();i.src='assets/'+path;images[name]=i;return new Promise(r=>{i.onload=r;i.onerror=()=>{console.warn('Could not load local scene asset:',path);r()}})}
const pending=[img('world','maps/city-reconstructed.webp'),img('map','maps/big-map.webp'),img('player','sprites/player.webp'),img('train','sprites/train.webp'),img('duck','sprites/duck.webp'),img('vortex','sprites/vortex.png'),img('sunburn','sprites/sunburn.png'),img('eating','sprites/player-eating.webp'),img('sitting','sprites/player-sitting.webp'),img('wind','sprites/windturbine.webp'),img('waves','sprites/waves.webp'),img('smoke','sprites/smoke-white.webp')];
for(let i=2;i<=8;i++){pending.push(img('man'+i,'sprites/npc-man'+i+'.webp'));pending.push(img('woman'+i,'sprites/npc-woman'+i+'.webp'))}
for(let i=1;i<=5;i++)pending.push(img('car'+i,'sprites/cars/car'+i+'.webp'));
pending.push(img('scientist','sprites/npc-scientist.webp'));
let W=innerWidth,H=innerHeight,zoom=24,spriteScale=4,cam={x:176.5,y:204},player={x:188,y:53,face:4,walk:0},mode='entry',last=0,clock=0,motion=null,idleAt=performance.now(),proximityAfter=0;
const keys=new Set();let joy={x:0,y:0},moving=false;
const obstacles=[[0,0,399,4],[136,5,244,42],[3,90,83,129],[87,99,128,127],[134,99,178,127],[193,99,258,127],[22,145,103,200],[297,97,394,143],[147,149,173,177],[194,150,218,177],[147,191,171,213],[197,190,224,215],[343,353,395,393]];
function blocked(x,y){return x<4||y<4||x>396||y>396||obstacles.some(([a,b,c,d])=>x>a&&x<c&&y>b&&y<d)||(y>356&&x<269&&!(x>174&&x<203))}
function resize(){W=innerWidth;H=innerHeight;zoom=W<=700?12:24;spriteScale=W<=700?2:4;canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false}resize();addEventListener('resize',resize);
const toScreen=(x,y)=>[(x-cam.x)*zoom+W/2,(y-cam.y)*zoom+H/2];
function visible(x,y,pad=200){const [a,b]=toScreen(x,y);return a>-pad&&a<W+pad&&b>-pad&&b<H+pad}
function drawSprite(im,x,y,frame=0,row=0,fw=48,fh=48,scale=spriteScale){if(!im?.complete||!im.naturalWidth||!visible(x,y,Math.max(fw,fh)*scale))return;const [sx,sy]=toScreen(x,y);ctx.drawImage(im,frame*fw,row*fh,fw,fh,Math.round(sx-fw*scale/2),Math.round(sy-fh*scale/2),fw*scale,fh*scale)}
const npcs=[];function crowd(x,y,n,radius,kind){for(let i=0;i<n;i++)npcs.push({x:x+Math.sin(i*2.399)*radius,y:y+Math.cos(i*2.399)*radius*.5,phase:i*1.73,type:kind||(i%2?'woman':'man')+(i%7+2),path:1.8+(i%4),speed:.18+(i%3)*.035})}
crowd(194,51,18,19);crowd(164,132,12,13);crowd(213,219,6,10);crowd(303,359,10,10);crowd(64,174,6,12,'scientist');crowd(82,304,5,7);
const ducks=[{x:160,y:197},{x:201,y:202},{x:164,y:158},{x:201,y:160},{x:119,y:363}];
function energy(x,y,t,blue=false,strength=1){if(!visible(x,y,300))return;const im=blue?images.vortex:images.sunburn;if(!im?.naturalWidth)return;const f=Math.floor(t*24)%60,[sx,sy]=toScreen(x,y),size=(blue?350:230)*(W<=700?.55:1)*strength;ctx.save();ctx.globalCompositeOperation='screen';if(blue)ctx.filter='hue-rotate(165deg) saturate(1.4)';ctx.globalAlpha=.9;ctx.drawImage(im,(f%10)*100,Math.floor(f/10)*100,100,100,sx-size/2,sy-size/2,size,size);ctx.restore();}
function drawAmbient(t){
 // All representational objects below are real supplied sprite artwork.
 for(const d of ducks){let x=d.x+Math.sin(t*.13+d.x)*2,y=d.y+Math.cos(t*.1+d.y)*.6;drawSprite(images.duck,x,y,3+Math.floor(t*6)%6,0,32,36,spriteScale*.75)}
 for(const n of (mode==='entry'?[]:npcs)){const v=Math.sin(t*n.speed+n.phase),x=n.x+v*n.path,y=n.y+Math.cos(t*n.speed*.6+n.phase)*.6;drawSprite(images[n.type],x,y,Math.floor(t*7+n.phase)%8,v>0?0:2)}
 for(let i=0;i<40;i++){const left=i%2===0,x=(left?153:196)+(i%7)*1.8,y=193+(i%9)*2.1;if(!visible(x,y))continue;const [sx,sy]=toScreen(x+Math.sin(t*.3+i)*.4,y);if(images.waves?.naturalWidth){ctx.globalAlpha=.25+.18*Math.sin(t*1.2+i);ctx.drawImage(images.waves,sx,sy,30*spriteScale*.65,3*spriteScale*.65);ctx.globalAlpha=1}}
 const tr=images.train;if(tr?.naturalWidth&&cam.y<90){const [tx,ty]=toScreen(188,64),tw=tr.naturalWidth*spriteScale,th=tr.naturalHeight*spriteScale;const drift=Math.sin(t*.045)*W*1.5;ctx.drawImage(tr,Math.round(tx-tw/2+drift),Math.round(ty-th/2),tw,th)}
 for(let i=1;i<=5;i++){const x=277+(i%2?5:-5),y=(t*(i%2?3:-2.5)+i*71+600)%320+68;drawSprite(images['car'+i],x,y,i%2?2:6,0,84,84,spriteScale)}
 for(let i=1;i<=3;i++){const x=(t*4+i*120)%380+10,y=82+(i%2?3:-3);drawSprite(images['car'+i],x,y,i%2?0:4,0,84,84,spriteScale)}
 if(images.wind?.naturalWidth){for(const [x,y] of [[77,296],[91,296]]){if(!visible(x,y,350))continue;const [sx,sy]=toScreen(x,y);ctx.save();ctx.translate(sx,sy);ctx.rotate(t*.45);const s=W<=700?160:320;ctx.drawImage(images.wind,-s/2,-s/2,s,s);ctx.restore()}}
 for(const l of window.Locations||[]){if(!visible(l.x,l.y,160))continue;energy(l.x,l.y,t,false,.6);const [x,y]=toScreen(l.x,l.y);ctx.font=`${W<=700?7:11}px Pixel`;ctx.textAlign='center';ctx.fillStyle='#111b';const width=ctx.measureText(l.label).width;ctx.fillRect(x-width/2-8,y+35*(W<=700?.5:1),width+16,20);ctx.fillStyle='#fff';ctx.fillText(l.label,x,y+49*(W<=700?.63:1))}
}
function frame(t){let dt=Math.min((t-last)/1000||.016,.05);last=t;clock=t/1000;moving=false;
 if(motion){const age=t-motion.start;
 if(motion.type==='start'){const f=Math.min(1,age/2600),e=f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;cam.x=motion.from.x+(188-motion.from.x)*e;cam.y=motion.from.y+(53-motion.from.y)*e;if(f===1){motion=null;mode='game';idleAt=t;proximityAfter=t+3500}}
 else{if(age>1050&&age<3800){const f=(age-1050)/2750,e=f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;cam.x=motion.from.x+(motion.to.x-motion.from.x)*e;cam.y=motion.from.y+(motion.to.y-motion.from.y)*e}else if(age>=3800){cam={...motion.to};player.x=motion.to.x;player.y=motion.to.y}if(age>=4900){const done=motion.done;motion=null;mode='panel';done?.()}}}
 else if(mode==='game'){let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0)+joy.x,dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0)+joy.y;const len=Math.hypot(dx,dy);if(len>.05){moving=true;idleAt=t;dx/=Math.max(1,len);dy/=Math.max(1,len);const nx=player.x+dx*7*dt,ny=player.y+dy*7*dt;if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;player.face=Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):(dy>0?4:6);player.walk=Math.floor(t/110)%8}else player.walk=0;cam.x+=(player.x-cam.x)*Math.min(1,dt*8);cam.y+=(player.y-cam.y)*Math.min(1,dt*8);
 if(moving&&t>proximityAfter){const hit=(window.Locations||[]).find(l=>Math.hypot(l.x-player.x,l.y-player.y)<2);if(hit){proximityAfter=t+15000;window.City.onProximity?.(hit.id)}}}
 ctx.fillStyle='#237444';ctx.fillRect(0,0,W,H);const m=images.world?.naturalWidth?images.world:images.map;if(m?.naturalWidth)ctx.drawImage(m,Math.round(W/2-cam.x*zoom),Math.round(H/2-cam.y*zoom),400*zoom,400*zoom);
 drawAmbient(clock);
 if(mode!=='entry'){
 const hidden=motion?.type==='travel'&&t-motion.start>1000&&t-motion.start<3800;
 if(!hidden){if(!moving&&!motion&&t-idleAt>25000){ctx.save();const [x,y]=toScreen(player.x,player.y);ctx.translate(x,y+spriteScale*6);ctx.rotate(-Math.PI/2);if(images.player?.naturalWidth)ctx.drawImage(images.player,0,192,48,48,-24*spriteScale,-24*spriteScale,48*spriteScale,48*spriteScale);ctx.restore();ctx.fillStyle='#fff';ctx.font=`${10*spriteScale/2}px Pixel`;ctx.fillText('z',x-10,y-20-Math.sin(t/700)*5)}else if(!moving&&!motion&&t-idleAt>6000&&t-idleAt<13000){const f=Math.floor(t/150)%64;drawSprite(images.eating,player.x,player.y,f%8,Math.floor(f/8),64,64)}else drawSprite(images.player,player.x,player.y,player.walk,player.face)}
 }
 if(motion?.type==='travel'){const age=t-motion.start;if(age<1200)energy(player.x,player.y,clock,true,Math.min(1.8,age/650));if(age>3650)energy(motion.to.x,motion.to.y,clock,false,1.8)}
 requestAnimationFrame(frame)
}
addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(key)){if(mode==='game')e.preventDefault();keys.add(key)}});addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));addEventListener('blur',()=>keys.clear());
window.City={ready:Promise.all(pending),images,get player(){return {...player}},get camera(){return {...cam}},get mode(){return mode},get clock(){return clock},setMode(v){mode=v;keys.clear();joy={x:0,y:0}},setJoystick(x,y){joy={x,y}},suppressProximity(ms){proximityAfter=performance.now()+ms},start(){mode='transition';motion={type:'start',start:performance.now(),from:{...cam}}},travel(x,y,done){mode='transition';keys.clear();joy={x:0,y:0};motion={type:'travel',start:performance.now(),from:{...cam},to:{x,y},done}},loadWorld(path){return img('world',path)}};
requestAnimationFrame(frame);
})();
