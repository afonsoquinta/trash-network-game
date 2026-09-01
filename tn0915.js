import * as THREE from 'https://esm.sh/three@0.160.1';
import { FBXLoader } from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/FBXLoader.js';

const pagePath = location.pathname.replace(/\/+$/, '');
if (pagePath === '/p/0915.html' && !window.__TN0915_FBX_STABLE_V2__) {
  window.__TN0915_FBX_STABLE_V2__ = true;
  boot();
}

function boot() {
  const host = document.getElementById('tn0915');
  if (!host) return;

  const baseURL = new URL('.', import.meta.url);
  const fbxURL = new URL('ARZ.fbx', baseURL).href;
  const textureURL = new URL('texture_0.png', baseURL).href;

  const style = document.createElement('style');
  style.textContent = `
    html,body{
      margin:0!important;padding:0!important;overflow:hidden!important;
      background:#e8e8e6!important
    }
    #tn0915{
      position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;
      background:#e8e8e6;z-index:999999;touch-action:none;
      user-select:none;-webkit-user-select:none
    }
    #tn0915 canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    #tn0915 .tnHud{
      position:absolute;top:14px;right:14px;z-index:30;padding:9px 11px;
      border-radius:9px;background:rgba(255,255,255,.84);color:#111;
      font:700 11px/1.4 Arial,sans-serif;text-align:right;pointer-events:none;
      backdrop-filter:blur(6px)
    }
    #tn0915 .tnStatus{
      position:absolute;left:14px;top:14px;z-index:40;padding:8px 11px;
      border-radius:8px;background:rgba(0,0,0,.78);color:#fff;
      font:700 11px Arial,sans-serif;letter-spacing:.08em
    }
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

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xe8e8e6, 1);
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x77706a, 2.25));

  const key = new THREE.DirectionalLight(0xffffff, 3);
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
    new THREE.MeshStandardMaterial({
      color: 0xd7d7d4,
      roughness: 1
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const hud = document.createElement('div');
  hud.className = 'tnHud';
  hud.innerHTML = `
    WASD / ARROWS · MOVE<br>
    SPACE · JUMP<br>
    P · PUNCH &nbsp; K · KICK &nbsp; R · RESET<br>
    DRAG · CAMERA &nbsp; WHEEL · ZOOM<br>
    <span id="tnState">LOADING</span>
  `;
  host.appendChild(hud);
  const stateEl = hud.querySelector('#tnState');

  const character = new THREE.Group();
  scene.add(character);

  let visual = null;
  let mixer = null;
  let nativeAction = null;
  let nativeClipName = '';
  let baseVisualY = 0;

  const keys = Object.create(null);
  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const smoothLook = new THREE.Vector3();

  let speed = 2.6;
  const gravity = -15;
  const jumpSpeed = 5.9;

  let velocityY = 0;
  let grounded = true;
  let jumpQueued = false;
  let yaw = 0;
  let time = 0;

  let attack = null;
  let kickLeft = true;

  let cameraYaw = 0.78;
  let cameraPitch = 0.26;
  let cameraDistance = 8.7;

  let dragging = false;
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;

  /*
   * FBX texture resolution.
   *
   * Important: FBXLoader is allowed to create and configure its own map.
   * We no longer force the atlas onto every material. That was the cause
   * of the incorrect paint / UV appearance.
   */
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (
      /texture_0\.png/i.test(url) ||
      /\.fbm\//i.test(url) ||
      /Character_output\.fbm/i.test(url)
    ) {
      return textureURL;
    }
    return url;
  });

  /*
   * Fallback texture is only used if a material came out of FBXLoader
   * without a colour map at all.
   *
   * FBX uses the normal TextureLoader UV convention, so flipY stays TRUE.
   */
  const fallbackTexture = new THREE.TextureLoader(manager).load(textureURL);
  fallbackTexture.colorSpace = THREE.SRGBColorSpace;
  fallbackTexture.flipY = true;
  fallbackTexture.needsUpdate = true;
  fallbackTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const loader = new FBXLoader(manager);

  status.textContent = 'TN 3D · DECODING MODEL';

  loader.load(
    fbxURL,
    object => {
      visual = object;

      object.traverse(child => {
        if (!(child.isMesh || child.isSkinnedMesh)) return;

        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;

        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.filter(Boolean).forEach(material => {
          /*
           * CRITICAL MATERIAL FIX
           * ---------------------
           * The atlas contains transparent pixels around its UV islands.
           * Those pixels are not intended to make the character see-through.
           */
          material.transparent = false;
          material.opacity = 1;
          material.alphaTest = 0;
          material.alphaMap = null;
          material.depthTest = true;
          material.depthWrite = true;
          material.side = THREE.FrontSide;
          material.blending = THREE.NormalBlending;

          if (!material.map) material.map = fallbackTexture;

          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
            material.map.flipY = true;
            material.map.wrapS = THREE.ClampToEdgeWrapping;
            material.map.wrapT = THREE.ClampToEdgeWrapping;
            material.map.anisotropy = Math.min(
              8,
              renderer.capabilities.getMaxAnisotropy()
            );
            material.map.needsUpdate = true;
          }

          if ('roughness' in material) material.roughness = 0.96;
          if ('metalness' in material) material.metalness = 0;

          material.needsUpdate = true;
        });
      });

      normalizeModel(object, 2.15);
      character.add(object);

      /*
       * Do not directly rotate FBX bones using guessed XYZ axes.
       * This rig has its own local bone orientations / pre-rotations.
       * The previous procedural animations were corrupting the pose.
       *
       * If the FBX contains an authored clip, use that clip through
       * AnimationMixer so Three.js respects the actual rig.
       */
      if (object.animations && object.animations.length) {
        const sourceClip = object.animations[0];

        /*
         * Remove only root translation tracks so the clip cannot drag
         * the character away from the game controller.
         */
        const safeTracks = sourceClip.tracks.filter(track => {
          const n = track.name.toLowerCase();
          const rootPosition =
            n.endsWith('.position') &&
            (n.includes('armature') || n.includes('hips'));
          return !rootPosition;
        });

        const safeClip = new THREE.AnimationClip(
          sourceClip.name || 'clip0',
          sourceClip.duration,
          safeTracks
        );

        mixer = new THREE.AnimationMixer(object);
        nativeAction = mixer.clipAction(safeClip);
        nativeAction.enabled = true;
        nativeAction.setLoop(THREE.LoopRepeat, Infinity);
        nativeAction.clampWhenFinished = false;
        nativeAction.play();
        nativeAction.paused = true;
        nativeAction.time = 0;

        nativeClipName = safeClip.name || 'clip0';
      }

      baseVisualY = object.position.y;

      stateEl.textContent = nativeAction
        ? `IDLE · ${nativeClipName}`
        : 'IDLE';

      status.textContent = 'TN 3D · READY';

      setTimeout(() => {
        status.style.transition = 'opacity .5s';
        status.style.opacity = '0';
      }, 1000);
    },
    undefined,
    err => {
      console.error(err);
      status.textContent = 'TN ERROR · MODEL LOAD FAILED';
      status.style.background = '#a50025';
    }
  );

  function normalizeModel(obj, targetHeight) {
    let box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);

    if (size.y > 0) {
      obj.scale.setScalar(targetHeight / size.y);
    }

    box = new THREE.Box3().setFromObject(obj);
    box.getCenter(center);

    obj.position.x -= center.x;
    obj.position.z -= center.z;

    box = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box.min.y;
  }

  function setNativeAnimation(active) {
    if (!nativeAction) return;

    if (active) {
      nativeAction.paused = false;
      nativeAction.enabled = true;
      nativeAction.timeScale = 1;
    } else {
      nativeAction.paused = true;
      nativeAction.time = 0;
      if (mixer) mixer.setTime(0);
    }
  }

  function shortestAngle(a, b) {
    let d = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function reset() {
    character.position.set(0, 0, 0);
    character.rotation.set(0, 0, 0);

    if (visual) {
      visual.position.y = baseVisualY;
      visual.rotation.set(0, 0, 0);
      visual.scale.set(
        visual.scale.x,
        visual.scale.y,
        visual.scale.z
      );
    }

    velocityY = 0;
    grounded = true;
    jumpQueued = false;
    yaw = 0;
    attack = null;

    setNativeAnimation(false);
  }

  function queueJump() {
    if (grounded && !attack) jumpQueued = true;
  }

  /*
   * Combat is kept at character-root level for now.
   *
   * No FBX bones are touched. This guarantees that P/K cannot
   * corrupt the imported skeleton.
   *
   * Proper limb combat should be supplied as authored FBX clips
   * (punch / kick) and played through AnimationMixer later.
   */
  function punch() {
    if (!visual || attack) return;

    attack = {
      type: 'punch',
      side: Math.random() < 0.5 ? -1 : 1,
      time: 0,
      duration: 0.22
    };

    setNativeAnimation(false);
  }

  function kick() {
    if (!visual || attack || !grounded) return;

    attack = {
      type: 'kick',
      side: kickLeft ? -1 : 1,
      time: 0,
      duration: 0.30
    };

    kickLeft = !kickLeft;
    setNativeAnimation(false);
  }

  function updateAttack(dt) {
    if (!attack || !visual) return false;

    attack.time += dt;

    const u = Math.min(1, attack.time / attack.duration);
    const a = Math.sin(u * Math.PI);

    visual.position.y = baseVisualY;
    visual.rotation.set(0, 0, 0);

    if (attack.type === 'punch') {
      visual.rotation.y = attack.side * 0.10 * a;
      visual.rotation.z = attack.side * -0.025 * a;
      visual.position.z = -0.05 * a;
      stateEl.textContent = 'PUNCH';
    } else {
      visual.rotation.z = attack.side * 0.08 * a;
      visual.rotation.x = -0.035 * a;
      visual.position.y = baseVisualY + 0.045 * a;
      stateEl.textContent = 'KICK';
    }

    if (u >= 1) {
      attack = null;
      visual.position.y = baseVisualY;
      visual.position.z = 0;
      visual.rotation.set(0, 0, 0);
    }

    return true;
  }

  function animateCharacter(dt, walking) {
    time += dt;

    if (!visual) return;

    if (updateAttack(dt)) return;

    visual.position.z = 0;
    visual.rotation.set(0, 0, 0);

    if (walking && grounded) {
      setNativeAnimation(true);

      /*
       * Tiny whole-model bob only.
       * All skeletal motion, if available, comes from the FBX clip.
       */
      visual.position.y =
        baseVisualY +
        Math.abs(Math.sin(time * 6.5)) * 0.008;

      stateEl.textContent = nativeAction
        ? `WALK · ${nativeClipName}`
        : 'WALK';
    } else if (!grounded) {
      setNativeAnimation(false);

      visual.position.y = baseVisualY;
      visual.rotation.x = velocityY > 0 ? -0.02 : 0.025;

      stateEl.textContent = velocityY > 0
        ? 'JUMP'
        : 'FALL';
    } else {
      setNativeAnimation(false);

      /*
       * Safe idle: whole object only.
       * No bones are modified.
       */
      visual.position.y =
        baseVisualY +
        Math.sin(time * 1.8) * 0.004;

      stateEl.textContent = nativeAction
        ? `IDLE · ${nativeClipName}`
        : 'IDLE';
    }
  }

  function update(dt) {
    desired.set(0, 0, 0);

    if (keys.KeyW || keys.ArrowUp) desired.z -= 1;
    if (keys.KeyS || keys.ArrowDown) desired.z += 1;
    if (keys.KeyA || keys.ArrowLeft) desired.x -= 1;
    if (keys.KeyD || keys.ArrowRight) desired.x += 1;

    const walking = desired.lengthSq() > 0.001;

    if (walking && !attack && visual) {
      desired.normalize();

      const fx = -Math.sin(cameraYaw);
      const fz = -Math.cos(cameraYaw);
      const rx = Math.cos(cameraYaw);
      const rz = -Math.sin(cameraYaw);

      movement.set(
        rx * desired.x + fx * (-desired.z),
        0,
        rz * desired.x + fz * (-desired.z)
      ).normalize();

      character.position.x += movement.x * speed * dt;
      character.position.z += movement.z * speed * dt;

      const targetYaw = Math.atan2(movement.x, movement.z);

      yaw +=
        shortestAngle(yaw, targetYaw) *
        Math.min(1, dt * 10);

      character.rotation.y = yaw;
    }

    if (jumpQueued && grounded && !attack && visual) {
      grounded = false;
      velocityY = jumpSpeed;
      setNativeAnimation(false);
    }

    jumpQueued = false;

    if (!grounded) {
      velocityY += gravity * dt;
      character.position.y += velocityY * dt;

      if (character.position.y <= 0) {
        character.position.y = 0;
        velocityY = 0;
        grounded = true;
      }
    }

    if (mixer && nativeAction && !nativeAction.paused) {
      mixer.update(dt);
    }

    animateCharacter(dt, walking && !attack);
    updateCamera(dt);
  }

  function updateCamera(dt) {
    look.set(
      character.position.x,
      1.15 + character.position.y * 0.15,
      character.position.z
    );

    const horizontal =
      Math.cos(cameraPitch) *
      cameraDistance;

    camPos.set(
      look.x + Math.sin(cameraYaw) * horizontal,
      look.y + Math.sin(cameraPitch) * cameraDistance,
      look.z + Math.cos(cameraYaw) * horizontal
    );

    const smooth =
      1 - Math.pow(0.0015, dt);

    camera.position.lerp(camPos, smooth);
    smoothLook.lerp(look, smooth);
    camera.lookAt(smoothLook);
  }

  const blocked = {
    KeyW: 1,
    KeyA: 1,
    KeyS: 1,
    KeyD: 1,
    ArrowUp: 1,
    ArrowDown: 1,
    ArrowLeft: 1,
    ArrowRight: 1,
    Space: 1,
    KeyP: 1,
    KeyK: 1,
    KeyR: 1
  };

  window.addEventListener(
    'keydown',
    event => {
      if (blocked[event.code]) event.preventDefault();

      if (event.code === 'Space') {
        if (!event.repeat) queueJump();
        return;
      }

      if (event.code === 'KeyP') {
        if (!event.repeat) punch();
        return;
      }

      if (event.code === 'KeyK') {
        if (!event.repeat) kick();
        return;
      }

      if (event.code === 'KeyR') {
        reset();
        return;
      }

      keys[event.code] = true;
    },
    { passive: false }
  );

  window.addEventListener('keyup', event => {
    keys[event.code] = false;
  });

  window.addEventListener('blur', () => {
    Object.keys(keys).forEach(key => {
      keys[key] = false;
    });
  });

  renderer.domElement.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    dragging = true;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;

    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    cameraYaw -= dx * 0.006;

    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + dy * 0.004,
      0.06,
      0.75
    );
  });

  function stopDrag(event) {
    if (event.pointerId !== pointerId) return;

    dragging = false;
    pointerId = null;
  }

  renderer.domElement.addEventListener('pointerup', stopDrag);
  renderer.domElement.addEventListener('pointercancel', stopDrag);

  renderer.domElement.addEventListener(
    'wheel',
    event => {
      event.preventDefault();

      cameraDistance = THREE.MathUtils.clamp(
        cameraDistance + event.deltaY * 0.006,
        5.5,
        14.5
      );
    },
    { passive: false }
  );

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);

    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(host);
  } else {
    window.addEventListener('resize', resize);
  }

  resize();
  reset();

  camera.position.set(6.8, 4.2, 7.4);
  smoothLook.set(0, 1.1, 0);

  function loop() {
    requestAnimationFrame(loop);

    const dt = Math.min(
      clock.getDelta(),
      0.033
    );

    update(dt);

    renderer.render(
      scene,
      camera
    );
  }

  loop();
}
