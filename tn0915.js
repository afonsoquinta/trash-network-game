import * as THREE from 'https://esm.sh/three@0.160.1';
import { FBXLoader } from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/FBXLoader.js';

const path = location.pathname.replace(/\/+$/, '');
if (path !== '/p/0915.html' || window.__TN0915_EXTERNAL_FBX__) {
  // Do nothing outside 0915 or on duplicate load.
} else {
  window.__TN0915_EXTERNAL_FBX__ = true;
  boot();
}

function boot() {
  const host = document.getElementById('tn0915');
  if (!host) return;

  const base = new URL('.', import.meta.url);
  const fbxURL = new URL('ARZ.fbx', base).href;
  const texURL = new URL('texture_0.png', base).href;

  const style = document.createElement('style');
  style.textContent = `
    html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#e8e8e6!important}
    #tn0915{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#e8e8e6;z-index:999999;touch-action:none;user-select:none;-webkit-user-select:none}
    #tn0915 canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    #tn0915 .tnHud{position:absolute;top:14px;right:14px;z-index:30;padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.84);color:#111;font:700 11px/1.4 Arial,sans-serif;text-align:right;pointer-events:none;backdrop-filter:blur(6px)}
    #tn0915 .tnStatus{position:absolute;left:14px;top:14px;z-index:40;padding:8px 11px;border-radius:8px;background:rgba(0,0,0,.78);color:#fff;font:700 11px Arial,sans-serif;letter-spacing:.08em}
  `;
  document.head.appendChild(style);

  const status = document.createElement('div');
  status.className = 'tnStatus';
  status.textContent = 'TN 3D · LOADING';
  host.appendChild(status);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e8e6);
  scene.fog = new THREE.Fog(0xe8e8e6, 11, 32);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xe8e8e6, 1);
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x77706a, 2.25));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(6, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9e5ff, 0.9);
  fill.position.set(-5, 4, -5);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0xd7d7d4, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const hud = document.createElement('div');
  hud.className = 'tnHud';
  hud.innerHTML = 'WASD / ARROWS · MOVE<br>SPACE · JUMP<br>P · PUNCH &nbsp; K · KICK &nbsp; R · RESET<br>DRAG · CAMERA &nbsp; WHEEL · ZOOM<br><span id="tnState">LOADING</span>';
  host.appendChild(hud);
  const stateEl = hud.querySelector('#tnState');

  const character = new THREE.Group();
  scene.add(character);
  let visual = null;
  const bones = {};

  const tex = new THREE.TextureLoader().load(texURL);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;

  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => /texture_0\.png|\.fbm\//i.test(url) ? texURL : url);

  const loader = new FBXLoader(manager);
  status.textContent = 'TN 3D · DECODING MODEL';
  loader.load(fbxURL, object => {
    visual = object;
    object.traverse(child => {
      if (child.isBone) {
        bones[child.name] = child;
        child.userData.baseRot = child.rotation.clone();
        child.userData.basePos = child.position.clone();
      }
      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.filter(Boolean).forEach(m => {
          m.map = tex;
          m.color.set(0xffffff);
          if ('roughness' in m) m.roughness = 0.96;
          if ('metalness' in m) m.metalness = 0;
          m.needsUpdate = true;
        });
      }
    });
    normalizeModel(object, 2.15);
    character.add(object);
    neutralPose();
    stateEl.textContent = 'IDLE';
    status.textContent = 'TN 3D · READY';
    setTimeout(() => { status.style.transition = 'opacity .5s'; status.style.opacity = '0'; }, 1000);
  }, undefined, err => {
    console.error(err);
    status.textContent = 'TN ERROR · MODEL LOAD FAILED';
    status.style.background = '#a50025';
  });

  function normalizeModel(obj, targetHeight) {
    let box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) obj.scale.setScalar(targetHeight / size.y);
    box = new THREE.Box3().setFromObject(obj);
    box.getCenter(center);
    obj.position.x -= center.x;
    obj.position.z -= center.z;
    box = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box.min.y;
  }

  function bone(name) { return bones[name] || null; }
  function resetBones() {
    Object.values(bones).forEach(b => {
      if (b.userData.baseRot) b.rotation.copy(b.userData.baseRot);
      if (b.userData.basePos) b.position.copy(b.userData.basePos);
    });
  }
  function addRot(name, x=0, y=0, z=0) {
    const b = bone(name); if (!b) return;
    b.rotation.x += x; b.rotation.y += y; b.rotation.z += z;
  }
  function neutralPose() {
    if (!visual) return;
    resetBones();
    addRot('LeftArm', 0.08, 0, -0.42);
    addRot('RightArm', 0.08, 0, 0.42);
    addRot('LeftForeArm', -0.55, 0, -0.18);
    addRot('RightForeArm', -0.55, 0, 0.18);
    addRot('LeftUpLeg', 0.03, 0, -0.08);
    addRot('RightUpLeg', 0.03, 0, 0.08);
    addRot('LeftLeg', 0.16, 0, 0);
    addRot('RightLeg', 0.16, 0, 0);
    addRot('Spine', -0.05, 0, 0);
    addRot('Spine01', 0.04, 0, 0);
    addRot('Head', 0.02, 0, 0);
  }

  const keys = Object.create(null);
  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const smoothLook = new THREE.Vector3();
  let speed = 2.6, gravity = -15, jumpSpeed = 5.9, velocityY = 0;
  let grounded = true, jumpQueued = false, yaw = 0, walkPhase = 0, time = 0;
  let attack = null, kickLeft = true;
  let cameraYaw = 0.78, cameraPitch = 0.26, cameraDistance = 8.7;
  let dragging = false, pointerId = null, lastX = 0, lastY = 0;

  function shortestAngle(a,b) {
    let d = (b-a+Math.PI)%(Math.PI*2)-Math.PI;
    if (d < -Math.PI) d += Math.PI*2;
    return d;
  }
  function reset() {
    character.position.set(0,0,0); character.rotation.set(0,0,0);
    velocityY = 0; grounded = true; jumpQueued = false; yaw = 0; attack = null;
    neutralPose();
  }
  function punch() {
    if (!visual || attack) return;
    attack = { type:'punch', side:Math.random()<.5?'L':'R', t:0, dur:.28 };
  }
  function kick() {
    if (!visual || attack || !grounded) return;
    attack = { type:'kick', side:kickLeft?'L':'R', t:0, dur:.38 };
    kickLeft = !kickLeft;
  }
  function animateAttack(dt) {
    if (!attack || !visual) return false;
    neutralPose();
    attack.t += dt;
    const u = Math.min(1, attack.t/attack.dur);
    const a = Math.sin(u*Math.PI);
    if (attack.type === 'punch') {
      if (attack.side === 'L') {
        addRot('RightArm', .22,0,.25); addRot('RightForeArm',-.85,0,.12);
        addRot('LeftArm',-.25-.65*a,0,-.12); addRot('LeftForeArm',-.30+.55*a,0,.06);
      } else {
        addRot('LeftArm', .22,0,-.25); addRot('LeftForeArm',-.85,0,-.12);
        addRot('RightArm',-.25-.65*a,0,.12); addRot('RightForeArm',-.30+.55*a,0,-.06);
      }
      stateEl.textContent = 'PUNCH';
    } else {
      addRot('LeftArm',.28,0,-.20); addRot('RightArm',.28,0,.20);
      addRot('LeftForeArm',-.82,0,-.08); addRot('RightForeArm',-.82,0,.08);
      const prep = u<.34?u/.34:1;
      const strike = u<.34?0:Math.sin(((u-.34)/.66)*Math.PI);
      const L = attack.side==='L';
      addRot(L?'LeftUpLeg':'RightUpLeg', .18+prep*.45-strike*1.0,0,L?-.12:.12);
      addRot(L?'LeftLeg':'RightLeg', .18+prep*.85-strike*.85,0,0);
      stateEl.textContent = 'KICK';
    }
    if (u>=1) attack = null;
    return true;
  }
  function animate(dt, walking) {
    time += dt;
    if (!visual) return;
    if (animateAttack(dt)) return;
    neutralPose();
    if (walking && grounded) {
      walkPhase += dt*7.2;
      const s = Math.sin(walkPhase);
      addRot('LeftUpLeg', s*.42,0,-.03); addRot('RightUpLeg',-s*.42,0,.03);
      addRot('LeftLeg',Math.max(0,-s)*.42); addRot('RightLeg',Math.max(0,s)*.42);
      addRot('LeftArm',-s*.14,0,-.40); addRot('RightArm',s*.14,0,.40);
      addRot('Head',0,Math.sin(walkPhase*.35)*.02,0);
      stateEl.textContent = 'WALK';
    } else if (!grounded) {
      addRot('LeftUpLeg',.20,0,-.05); addRot('RightUpLeg',-.05,0,.05);
      addRot('LeftLeg',.18); addRot('RightLeg',.18);
      stateEl.textContent = velocityY>0?'JUMP':'FALL';
    } else {
      addRot('Head',Math.sin(time*1.4)*.01,Math.sin(time*.7)*.01,0);
      addRot('Spine01',Math.sin(time*1.6)*.01,0,0);
      stateEl.textContent = 'IDLE';
    }
  }
  function update(dt) {
    desired.set(0,0,0);
    if (keys.KeyW||keys.ArrowUp) desired.z-=1;
    if (keys.KeyS||keys.ArrowDown) desired.z+=1;
    if (keys.KeyA||keys.ArrowLeft) desired.x-=1;
    if (keys.KeyD||keys.ArrowRight) desired.x+=1;
    const walking = desired.lengthSq()>.001;
    if (walking && !attack && visual) {
      desired.normalize();
      const fx=-Math.sin(cameraYaw), fz=-Math.cos(cameraYaw), rx=Math.cos(cameraYaw), rz=-Math.sin(cameraYaw);
      movement.set(rx*desired.x+fx*(-desired.z),0,rz*desired.x+fz*(-desired.z)).normalize();
      character.position.x += movement.x*speed*dt;
      character.position.z += movement.z*speed*dt;
      const targetYaw = Math.atan2(movement.x,movement.z);
      yaw += shortestAngle(yaw,targetYaw)*Math.min(1,dt*10);
      character.rotation.y = yaw;
    }
    if (jumpQueued && grounded && !attack && visual) { grounded=false; velocityY=jumpSpeed; }
    jumpQueued=false;
    if (!grounded) {
      velocityY += gravity*dt;
      character.position.y += velocityY*dt;
      if (character.position.y<=0) { character.position.y=0; velocityY=0; grounded=true; }
    }
    animate(dt, walking && !attack);
    updateCamera(dt);
  }
  function updateCamera(dt) {
    look.set(character.position.x,1.15+character.position.y*.15,character.position.z);
    const h=Math.cos(cameraPitch)*cameraDistance;
    camPos.set(look.x+Math.sin(cameraYaw)*h,look.y+Math.sin(cameraPitch)*cameraDistance,look.z+Math.cos(cameraYaw)*h);
    const smooth=1-Math.pow(.0015,dt);
    camera.position.lerp(camPos,smooth); smoothLook.lerp(look,smooth); camera.lookAt(smoothLook);
  }

  const blocked = {KeyW:1,KeyA:1,KeyS:1,KeyD:1,ArrowUp:1,ArrowDown:1,ArrowLeft:1,ArrowRight:1,Space:1,KeyP:1,KeyK:1,KeyR:1};
  addEventListener('keydown',e=>{
    if(blocked[e.code]) e.preventDefault();
    if(e.code==='Space'){if(!e.repeat&&grounded&&!attack)jumpQueued=true;return;}
    if(e.code==='KeyP'){if(!e.repeat)punch();return;}
    if(e.code==='KeyK'){if(!e.repeat)kick();return;}
    if(e.code==='KeyR'){reset();return;}
    keys[e.code]=true;
  },{passive:false});
  addEventListener('keyup',e=>keys[e.code]=false);
  addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));

  renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;pointerId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==pointerId)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    cameraYaw-=dx*.006;cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*.004,.06,.75);
  });
  renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===pointerId){dragging=false;pointerId=null;}});
  renderer.domElement.addEventListener('pointercancel',e=>{if(e.pointerId===pointerId){dragging=false;pointerId=null;}});
  renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.006,5.5,14.5);},{passive:false});

  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(host);resize();reset();camera.position.set(6.8,4.2,7.4);smoothLook.set(0,1.1,0);
  (function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.033);update(dt);renderer.render(scene,camera);})();
}
