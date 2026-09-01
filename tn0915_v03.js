/*
 * Trash Network — procedural raccoon player v03
 * Route: /p/0915.html
 * Character, rig, materials, animation, controls and showroom are generated here.
 * No character meshes, textures, sprites or external 3D assets are used.
 */

const TN0915_VERSION = "tn0915_v03";
const TN0915_ROUTE = "/p/0915.html";
const TN0915_INSTANCE = "__TN0915_V03_INSTANCE__";
const THREE_MODULE = "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";

// Set this to true before uploading a diagnostic iteration.
const DEBUG_RIG = false;
let TN0915_MESH_CLASS = null;

if (location.pathname === TN0915_ROUTE && !window[TN0915_INSTANCE]) {
  window[TN0915_INSTANCE] = { state: "loading", version: TN0915_VERSION };

  import(THREE_MODULE)
    .then((THREE) => bootTrashNetwork0915(THREE))
    .catch((error) => {
      console.error(`[${TN0915_VERSION}] Three.js failed to load.`, error);
      const mount = document.getElementById("tn0915");
      if (mount) {
        mount.innerHTML = '<p style="font:600 14px system-ui;padding:24px;color:#222">Não foi possível iniciar o showroom 3D.</p>';
      }
      delete window[TN0915_INSTANCE];
    });
}

function bootTrashNetwork0915(THREE) {
  TN0915_MESH_CLASS = THREE.Mesh;
  const mount = document.getElementById("tn0915");
  if (!mount) {
    delete window[TN0915_INSTANCE];
    return;
  }

  const PALETTE = Object.freeze({
    fur: 0x77757b,
    furLight: 0xe8e4df,
    furShadow: 0x59575d,
    mask: 0x2c2c31,
    maskDark: 0x211f20,
    skin: 0x77747a,
    earInner: 0xe6dfd8,
    black: 0x171719,
    charcoal: 0x242426,
    glove: 0x29292c,
    white: 0xf5f2eb,
    sole: 0xf8f7f1,
    metal: 0xbec2c2,
    eye: 0xf7f5eb,
    pupil: 0x16120f,
    floor: 0xe7e6e3,
    background: 0xf2f1ef,
  });

  const css = document.createElement("style");
  css.dataset.tn0915 = TN0915_VERSION;
  css.textContent = `
    #tn0915 { position:fixed; inset:0; width:100vw; height:100dvh; overflow:hidden; background:#f2f1ef; isolation:isolate; z-index:2147480000; touch-action:none; }
    #tn0915 * { box-sizing:border-box; }
    #tn0915 .tn0915-stage { position:absolute; inset:0; width:100%; height:100%; display:block; outline:none; touch-action:none; }
    #tn0915 .tn0915-hint { position:absolute; left:50%; top:18px; transform:translateX(-50%); max-width:min(92vw,720px); padding:8px 12px; border:1px solid rgba(20,20,20,.15); border-radius:999px; color:#2a2927; background:rgba(255,255,255,.78); backdrop-filter:blur(8px); font:600 11px/1.2 system-ui,sans-serif; letter-spacing:.045em; text-align:center; pointer-events:none; transition:opacity .5s ease; }
    #tn0915 .tn0915-mobile { position:absolute; inset:0; display:none; pointer-events:none; user-select:none; -webkit-user-select:none; }
    #tn0915 .tn0915-pad { position:absolute; left:18px; bottom:max(18px,env(safe-area-inset-bottom)); width:154px; height:154px; pointer-events:auto; }
    #tn0915 .tn0915-actions { position:absolute; right:18px; bottom:max(22px,env(safe-area-inset-bottom)); width:174px; height:150px; pointer-events:auto; }
    #tn0915 .tn0915-button { position:absolute; display:grid; place-items:center; border:1px solid rgba(0,0,0,.25); border-radius:50%; color:#fff; background:rgba(27,27,28,.76); box-shadow:0 3px 12px rgba(0,0,0,.14); font:800 13px/1 system-ui,sans-serif; touch-action:none; -webkit-tap-highlight-color:transparent; }
    #tn0915 .tn0915-button:active, #tn0915 .tn0915-button.is-down { transform:scale(.92); background:#b82026; }
    #tn0915 .tn0915-pad .tn0915-button { width:52px; height:52px; }
    #tn0915 [data-control="up"] { left:51px; top:0; }
    #tn0915 [data-control="left"] { left:0; top:51px; }
    #tn0915 [data-control="right"] { right:0; top:51px; }
    #tn0915 [data-control="down"] { left:51px; bottom:0; }
    #tn0915 .tn0915-actions .tn0915-button { width:58px; height:58px; }
    #tn0915 [data-action="jump"] { right:55px; top:0; background:rgba(184,32,38,.86); }
    #tn0915 [data-action="punch"] { left:0; bottom:0; }
    #tn0915 [data-action="kick"] { right:0; bottom:0; }
    #tn0915 [data-action="reset"] { right:62px; bottom:7px; width:42px; height:42px; font-size:10px; background:rgba(80,80,80,.72); }
    @media (pointer:coarse), (max-width:820px) {
      #tn0915 .tn0915-mobile { display:block; }
      #tn0915 .tn0915-hint { top:max(10px,env(safe-area-inset-top)); font-size:10px; }
    }
    @media (max-width:430px) {
      #tn0915 .tn0915-pad { left:10px; transform:scale(.88); transform-origin:left bottom; }
      #tn0915 .tn0915-actions { right:10px; transform:scale(.88); transform-origin:right bottom; }
    }
  `;

  const canvas = document.createElement("canvas");
  canvas.className = "tn0915-stage";
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Trash Network 3D character showroom");

  const hint = document.createElement("div");
  hint.className = "tn0915-hint";
  hint.textContent = "WASD / SETAS · SPACE SALTA · P SOCO · K PONTAPÉ · R RESET · ARRASTAR CÂMARA";

  const mobile = document.createElement("div");
  mobile.className = "tn0915-mobile";
  mobile.innerHTML = `
    <div class="tn0915-pad" aria-label="Movimento">
      <button class="tn0915-button" data-control="up" aria-label="Frente">▲</button>
      <button class="tn0915-button" data-control="left" aria-label="Esquerda">◀</button>
      <button class="tn0915-button" data-control="right" aria-label="Direita">▶</button>
      <button class="tn0915-button" data-control="down" aria-label="Trás">▼</button>
    </div>
    <div class="tn0915-actions" aria-label="Ações">
      <button class="tn0915-button" data-action="jump" aria-label="Saltar">JUMP</button>
      <button class="tn0915-button" data-action="punch" aria-label="Soco">P</button>
      <button class="tn0915-button" data-action="kick" aria-label="Pontapé">K</button>
      <button class="tn0915-button" data-action="reset" aria-label="Reset">R</button>
    </div>
  `;

  mount.replaceChildren(css, canvas, hint, mobile);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(PALETTE.background, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.background);
  scene.fog = new THREE.Fog(PALETTE.background, 16, 31);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb9b5b0, 1.35);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
  keyLight.position.set(5.5, 9, 6.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 24;
  keyLight.shadow.bias = -0.00035;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd9e4ff, 0.68);
  fillLight.position.set(-5, 4, -4);
  scene.add(fillLight);

  const floorMat = new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.95, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 48),
    new THREE.MeshBasicMaterial({ color: 0x6e6b66, transparent: true, opacity: 0.11, depthWrite: false })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.006;
  scene.add(contactShadow);

  const materials = makeMaterials(THREE, PALETTE);
  const player = buildCharacter(THREE, materials, PALETTE);
  scene.add(player.root);

  if (DEBUG_RIG) showRig(player.joints);

  const orbit = new SoftOrbitController(THREE, camera, canvas);
  orbit.radius = 13.8;
  orbit.theta = 0;
  orbit.phi = 1.47;
  orbit.target.set(0, 2.08, 0);
  orbit.targetGoal.copy(orbit.target);
  orbit.update(1);

  const clock = new THREE.Clock();
  const keys = Object.create(null);
  const relevantKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyP", "KeyK", "KeyR"]);

  const motion = {
    grounded: true,
    verticalSpeed: 0,
    landing: 0,
    speed: 0,
    walkPhase: 0,
    attack: null,
    nextPunch: Math.random() < 0.5 ? "L" : "R",
    nextKick: "L",
    elapsed: 0,
  };

  const movement = new THREE.Vector3();
  const desiredMovement = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const followTarget = new THREE.Vector3();

  const REST = makeRestPose();
  const pose = clonePose(REST);
  const desiredPose = clonePose(REST);

  function onKeyDown(event) {
    if (!relevantKeys.has(event.code)) return;
    if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
    if (!event.repeat) {
      if (event.code === "Space") tryJump();
      if (event.code === "KeyP") startAttack("punch");
      if (event.code === "KeyK") startAttack("kick");
      if (event.code === "KeyR") resetPlayer();
    }
    keys[event.code] = true;
  }

  function onKeyUp(event) {
    if (!relevantKeys.has(event.code)) return;
    keys[event.code] = false;
  }

  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearInput);

  function clearInput() {
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    mobile.querySelectorAll(".is-down").forEach((button) => button.classList.remove("is-down"));
  }

  const controlMap = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
  mobile.querySelectorAll("[data-control]").forEach((button) => {
    const code = controlMap[button.dataset.control];
    const press = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      keys[code] = true;
      button.classList.add("is-down");
    };
    const release = (event) => {
      event.preventDefault();
      keys[code] = false;
      button.classList.remove("is-down");
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  mobile.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.classList.add("is-down");
      const action = button.dataset.action;
      if (action === "jump") tryJump();
      if (action === "punch") startAttack("punch");
      if (action === "kick") startAttack("kick");
      if (action === "reset") resetPlayer();
    });
    const release = (event) => {
      event.preventDefault();
      button.classList.remove("is-down");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
  });

  function tryJump() {
    if (!motion.grounded || motion.attack || motion.landing > 0.08) return;
    motion.grounded = false;
    motion.verticalSpeed = 5.25;
  }

  function startAttack(type) {
    if (!motion.grounded || motion.attack || motion.landing > 0.05) return;
    if (type === "punch") {
      const side = Math.random() < 0.22 ? (Math.random() < 0.5 ? "L" : "R") : motion.nextPunch;
      motion.nextPunch = side === "L" ? "R" : "L";
      motion.attack = { type, side, time: 0, duration: 0.68 };
    } else {
      const side = motion.nextKick;
      motion.nextKick = side === "L" ? "R" : "L";
      motion.attack = { type, side, time: 0, duration: 0.9 };
    }
  }

  function resetPlayer() {
    clearInput();
    motion.grounded = true;
    motion.verticalSpeed = 0;
    motion.landing = 0;
    motion.speed = 0;
    motion.attack = null;
    movement.set(0, 0, 0);
    player.root.position.set(0, 0, 0);
    player.root.rotation.set(0, 0, 0);
    copyPose(pose, REST);
    applyPoseImmediate(player.joints, REST);
    orbit.targetGoal.set(0, 2.08, 0);
    contactShadow.position.set(0, 0.006, 0);
  }

  function resize() {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  resize();

  function animate() {
    const dt = Math.min(clock.getDelta(), 1 / 24);
    motion.elapsed += dt;

    updateMovement(dt);
    updatePhysics(dt);
    updateAnimation(dt);
    updateTail(dt);

    followTarget.set(player.root.position.x, 2.08 + player.root.position.y * 0.18, player.root.position.z);
    orbit.targetGoal.copy(followTarget);
    orbit.update(dt);

    contactShadow.position.x = player.root.position.x;
    contactShadow.position.z = player.root.position.z;
    const airborne = THREE.MathUtils.clamp(player.root.position.y / 2.2, 0, 1);
    contactShadow.scale.setScalar(1 - airborne * 0.28);
    contactShadow.material.opacity = 0.11 * (1 - airborne * 0.68);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function updateMovement(dt) {
    const horizontal = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const vertical = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);

    orbit.getPlanarAxes(forward, right);
    desiredMovement.set(0, 0, 0).addScaledVector(forward, vertical).addScaledVector(right, horizontal);
    if (desiredMovement.lengthSq() > 1) desiredMovement.normalize();

    const controlScale = motion.attack ? 0.12 : (motion.grounded ? 1 : 0.68);
    desiredMovement.multiplyScalar(2.25 * controlScale);
    movement.lerp(desiredMovement, 1 - Math.exp(-dt * 11));
    motion.speed = movement.length();

    player.root.position.addScaledVector(movement, dt);
    if (movement.lengthSq() > 0.012) {
      const wantedYaw = Math.atan2(movement.x, movement.z);
      player.root.rotation.y = dampAngle(player.root.rotation.y, wantedYaw, 1 - Math.exp(-dt * 13));
      motion.walkPhase += dt * (5.9 + motion.speed * 1.25);
    }
  }

  function updatePhysics(dt) {
    if (!motion.grounded) {
      motion.verticalSpeed -= 12.4 * dt;
      player.root.position.y += motion.verticalSpeed * dt;
      if (player.root.position.y <= 0) {
        player.root.position.y = 0;
        motion.verticalSpeed = 0;
        motion.grounded = true;
        motion.landing = 0.24;
      }
    } else {
      player.root.position.y = 0;
    }
    motion.landing = Math.max(0, motion.landing - dt);

    if (motion.attack) {
      motion.attack.time += dt;
      if (motion.attack.time >= motion.attack.duration) motion.attack = null;
    }
  }

  function updateAnimation(dt) {
    copyPose(desiredPose, REST);
    const moving = motion.speed > 0.13;

    if (motion.grounded && !motion.attack && motion.landing <= 0) {
      if (moving) applyWalkPose(desiredPose, motion.walkPhase, motion.speed);
      else applyIdlePose(desiredPose, motion.elapsed);
    }

    if (!motion.grounded) {
      if (motion.verticalSpeed >= 0) applyJumpPose(desiredPose, motion.verticalSpeed);
      else applyFallPose(desiredPose, motion.verticalSpeed);
    }

    if (motion.landing > 0) applyLandingPose(desiredPose, motion.landing / 0.24);

    if (motion.attack) {
      if (motion.attack.type === "punch") applyPunchPose(desiredPose, motion.attack);
      else applyKickPose(desiredPose, motion.attack);
    }

    const blend = 1 - Math.exp(-dt * (motion.attack ? 24 : 15));
    blendPose(pose, desiredPose, blend);
    applyPoseImmediate(player.joints, pose);
  }

  function updateTail(dt) {
    const base = [0.74, 0.19, 0.18, 0.17, 0.16, 0.13];
    const walkAmount = THREE.MathUtils.clamp(motion.speed / 2.25, 0, 1);
    const airborne = motion.grounded ? 0 : THREE.MathUtils.clamp(motion.verticalSpeed / 5.25, -1, 1);
    const attackSign = motion.attack ? (motion.attack.side === "L" ? 1 : -1) : 0;
    const attackPulse = motion.attack ? Math.sin(Math.min(1, motion.attack.time / motion.attack.duration) * Math.PI) : 0;

    player.tail.forEach((joint, index) => {
      const lag = index * 0.42;
      const idleWave = Math.sin(motion.elapsed * 1.45 - lag) * (0.025 + index * 0.004);
      const gaitWave = Math.sin(motion.walkPhase - lag) * walkAmount * (0.045 + index * 0.012);
      const inertialLift = -airborne * (0.035 + index * 0.018);
      const targetX = base[index] + idleWave + gaitWave + inertialLift;
      const targetY = Math.sin(motion.elapsed * 1.05 - lag) * 0.025 + Math.sin(motion.walkPhase - lag) * walkAmount * (0.028 + index * 0.01);
      const targetZ = -attackSign * attackPulse * (0.025 + index * 0.024);
      const response = 1 - Math.exp(-dt * (9 - index * 0.72));
      joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, targetX, response);
      joint.rotation.y = THREE.MathUtils.lerp(joint.rotation.y, targetY, response);
      joint.rotation.z = THREE.MathUtils.lerp(joint.rotation.z, targetZ, response);
    });
  }

  function applyIdlePose(target, time) {
    const breath = Math.sin(time * 1.65);
    target.CHEST.x = breath * 0.018;
    target.CHEST.z = Math.sin(time * 0.78) * 0.012;
    target.HEAD.y = Math.sin(time * 0.58) * 0.018;
    target.SHOULDER_L.x -= breath * 0.014;
    target.SHOULDER_R.x -= breath * 0.014;
    target.ELBOW_L.x = -0.24 - breath * 0.012;
    target.ELBOW_R.x = -0.24 - breath * 0.012;
  }

  function applyWalkPose(target, phase, speed) {
    const amount = THREE.MathUtils.clamp(speed / 2.25, 0, 1);
    const swing = Math.sin(phase) * 0.55 * amount;
    const opposite = Math.sin(phase + Math.PI);
    const liftL = Math.max(0, -Math.sin(phase)) * amount;
    const liftR = Math.max(0, -opposite) * amount;

    target.HIPS.y = Math.sin(phase) * 0.055 * amount;
    target.HIPS.z = Math.sin(phase * 2) * 0.035 * amount;
    target.CHEST.y = -target.HIPS.y * 0.72;
    target.CHEST.z = -target.HIPS.z * 0.6;
    target.HEAD.y = -target.HIPS.y * 0.25;

    target.THIGH_L.x = swing;
    target.THIGH_R.x = -swing;
    target.KNEE_L.x = 0.10 + liftL * 0.72 + Math.max(0, Math.sin(phase)) * 0.12 * amount;
    target.KNEE_R.x = 0.10 + liftR * 0.72 + Math.max(0, opposite) * 0.12 * amount;
    target.ANKLE_L.x = -0.12 - swing * 0.18 - liftL * 0.22;
    target.ANKLE_R.x = -0.12 + swing * 0.18 - liftR * 0.22;

    target.SHOULDER_L.x = -swing * 0.72 - 0.08;
    target.SHOULDER_R.x = swing * 0.72 - 0.08;
    target.ELBOW_L.x = -0.30 - Math.max(0, swing) * 0.38;
    target.ELBOW_R.x = -0.30 - Math.max(0, -swing) * 0.38;
  }

  function applyJumpPose(target, verticalSpeed) {
    const energy = THREE.MathUtils.clamp(verticalSpeed / 5.25, 0, 1);
    target.HIPS.x = -0.08;
    target.CHEST.x = 0.08;
    target.THIGH_L.x = -0.25 - energy * 0.18;
    target.THIGH_R.x = -0.18 - energy * 0.15;
    target.KNEE_L.x = 0.48;
    target.KNEE_R.x = 0.40;
    target.ANKLE_L.x = -0.18;
    target.ANKLE_R.x = -0.15;
    target.SHOULDER_L.x = -0.70;
    target.SHOULDER_R.x = -0.70;
    target.ELBOW_L.x = -0.42;
    target.ELBOW_R.x = -0.42;
  }

  function applyFallPose(target, verticalSpeed) {
    const fall = THREE.MathUtils.clamp(-verticalSpeed / 6, 0, 1);
    target.CHEST.x = -0.05;
    target.THIGH_L.x = -0.08;
    target.THIGH_R.x = 0.06;
    target.KNEE_L.x = 0.18 + fall * 0.18;
    target.KNEE_R.x = 0.14 + fall * 0.18;
    target.SHOULDER_L.x = -0.20;
    target.SHOULDER_R.x = -0.20;
    target.SHOULDER_L.z = 0.30;
    target.SHOULDER_R.z = -0.30;
    target.ELBOW_L.x = -0.18;
    target.ELBOW_R.x = -0.18;
  }

  function applyLandingPose(target, normalized) {
    const pulse = Math.sin(THREE.MathUtils.clamp(normalized, 0, 1) * Math.PI);
    target.HIPS.x = -0.12 * pulse;
    target.CHEST.x = 0.13 * pulse;
    target.THIGH_L.x = -0.16 * pulse;
    target.THIGH_R.x = -0.16 * pulse;
    target.KNEE_L.x = 0.10 + 0.62 * pulse;
    target.KNEE_R.x = 0.10 + 0.62 * pulse;
    target.ANKLE_L.x = -0.28 * pulse;
    target.ANKLE_R.x = -0.28 * pulse;
    target.SHOULDER_L.x = -0.34 * pulse;
    target.SHOULDER_R.x = -0.34 * pulse;
    target.ELBOW_L.x = -0.55 * pulse;
    target.ELBOW_R.x = -0.55 * pulse;
  }

  function applyPunchPose(target, attack) {
    const t = attack.time / attack.duration;
    const side = attack.side;
    const shoulder = `SHOULDER_${side}`;
    const elbow = `ELBOW_${side}`;
    const wrist = `WRIST_${side}`;
    const other = side === "L" ? "R" : "L";
    const direction = side === "L" ? 1 : -1;

    let shoulderX;
    let elbowX;
    if (t < 0.22) {
      const q = smooth01(t / 0.22);
      shoulderX = THREE.MathUtils.lerp(-0.08, 0.42, q);
      elbowX = THREE.MathUtils.lerp(-0.24, -1.38, q);
    } else if (t < 0.48) {
      const q = smooth01((t - 0.22) / 0.26);
      shoulderX = THREE.MathUtils.lerp(0.42, -1.48, q);
      elbowX = THREE.MathUtils.lerp(-1.38, -0.05, q);
    } else if (t < 0.72) {
      const q = smooth01((t - 0.48) / 0.24);
      shoulderX = THREE.MathUtils.lerp(-1.48, -0.88, q);
      elbowX = THREE.MathUtils.lerp(-0.05, -0.72, q);
    } else {
      const q = smooth01((t - 0.72) / 0.28);
      shoulderX = THREE.MathUtils.lerp(-0.88, -0.08, q);
      elbowX = THREE.MathUtils.lerp(-0.72, -0.24, q);
    }

    target[shoulder].x = shoulderX;
    target[shoulder].z = direction * 0.10;
    target[elbow].x = elbowX;
    target[wrist].z = direction * 0.08;
    target[`SHOULDER_${other}`].x = -0.62;
    target[`ELBOW_${other}`].x = -1.08;
    target.CHEST.y = -direction * Math.sin(Math.min(1, t) * Math.PI) * 0.24;
    target.HIPS.y = direction * Math.sin(Math.min(1, t) * Math.PI) * 0.08;
  }

  function applyKickPose(target, attack) {
    const t = attack.time / attack.duration;
    const side = attack.side;
    const direction = side === "L" ? 1 : -1;
    const thigh = `THIGH_${side}`;
    const knee = `KNEE_${side}`;
    const ankle = `ANKLE_${side}`;
    const plant = side === "L" ? "R" : "L";

    let thighX;
    let kneeX;
    if (t < 0.26) {
      const q = smooth01(t / 0.26);
      thighX = THREE.MathUtils.lerp(0, -0.74, q);
      kneeX = THREE.MathUtils.lerp(0.10, 1.46, q);
    } else if (t < 0.50) {
      const q = smooth01((t - 0.26) / 0.24);
      thighX = THREE.MathUtils.lerp(-0.74, -1.22, q);
      kneeX = THREE.MathUtils.lerp(1.46, 0.08, q);
    } else if (t < 0.73) {
      const q = smooth01((t - 0.50) / 0.23);
      thighX = THREE.MathUtils.lerp(-1.22, -0.70, q);
      kneeX = THREE.MathUtils.lerp(0.08, 1.25, q);
    } else {
      const q = smooth01((t - 0.73) / 0.27);
      thighX = THREE.MathUtils.lerp(-0.70, 0, q);
      kneeX = THREE.MathUtils.lerp(1.25, 0.10, q);
    }

    target[thigh].x = thighX;
    target[thigh].z = direction * 0.06;
    target[knee].x = kneeX;
    target[ankle].x = -0.20;
    target[`THIGH_${plant}`].x = 0.12;
    target[`KNEE_${plant}`].x = 0.24;
    target.HIPS.y = -direction * 0.16;
    target.HIPS.z = direction * 0.09;
    target.CHEST.y = direction * 0.18;
    target.SHOULDER_L.x = -0.70;
    target.SHOULDER_R.x = -0.70;
    target.ELBOW_L.x = -1.05;
    target.ELBOW_R.x = -1.05;
    target.SHOULDER_L.z = 0.20;
    target.SHOULDER_R.z = -0.20;
  }

  animate();
  setTimeout(() => { hint.style.opacity = "0.28"; }, 6500);

  window[TN0915_INSTANCE] = {
    state: "running",
    version: TN0915_VERSION,
    reset: resetPlayer,
    destroy() {
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
      orbit.destroy();
      renderer.dispose();
      mount.replaceChildren();
      delete window[TN0915_INSTANCE];
    },
  };

  function showRig(joints) {
    Object.values(joints).forEach((joint) => {
      if (!(joint instanceof THREE.Group)) return;
      joint.add(new THREE.AxesHelper(0.14));
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2040, depthTest: false })
      );
      marker.renderOrder = 99;
      joint.add(marker);
    });
  }
}

function makeMaterials(THREE, colors) {
  const standard = (color, roughness = 0.82, metalness = 0, flatShading = true) => new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading });
  return {
    fur: standard(colors.fur, 0.92),
    furLight: standard(colors.furLight, 0.9),
    furShadow: standard(colors.furShadow, 0.92),
    mask: standard(colors.mask, 0.96),
    maskDark: standard(colors.maskDark, 0.92),
    skin: standard(colors.skin, 0.9),
    earInner: standard(colors.earInner, 0.9),
    cap: standard(colors.black, 0.73, 0, false),
    capSoft: standard(colors.charcoal, 0.78, 0, false),
    pants: standard(colors.charcoal, 0.94),
    belt: standard(colors.black, 0.74),
    glove: standard(colors.glove, 0.9),
    white: standard(colors.white, 0.72),
    sole: standard(colors.sole, 0.8),
    metal: standard(colors.metal, 0.28, 0.75),
    pupil: standard(colors.pupil, 0.6),
  };
}

function buildCharacter(THREE, mat, colors) {
  const root = joint("ROOT");
  const joints = { ROOT: root };
  const tail = [];

  // Front-reference normalization: H ≈ 4.22, belt 0.42H, chin 0.65H, eyes 0.75H.
  const HIPS = addJoint(root, "HIPS", 0, 1.68, 0);
  const SPINE = addJoint(HIPS, "SPINE", 0, 0.22, 0);
  const CHEST = addJoint(SPINE, "CHEST", 0, 0.30, 0);
  const NECK = addJoint(CHEST, "NECK", 0, 0.34, 0);
  const HEAD = addJoint(NECK, "HEAD", 0, 0.08, 0);
  Object.assign(joints, { HIPS, SPINE, CHEST, NECK, HEAD });

  const torsoGeometry = latheBodyGeometry(THREE, [
    [-0.50, 0.43], [-0.39, 0.45], [-0.10, 0.49], [0.20, 0.51], [0.40, 0.46], [0.50, 0.35],
  ], 12, 0.82);
  const torso = mesh(torsoGeometry, mat.fur, "TORSO_MESH");
  torso.position.y = -0.01;
  CHEST.add(torso);

  const chestBib = shapeMesh(THREE, [
    [-0.35, 0.35], [-0.23, 0.29], [-0.16, 0.40], [0, 0.31], [0.16, 0.40], [0.23, 0.29], [0.35, 0.35],
    [0.31, 0.13], [0.36, 0.04], [0.30, -0.06], [0.34, -0.18], [0.25, -0.30], [0.12, -0.24],
    [0, -0.40], [-0.12, -0.24], [-0.25, -0.30], [-0.34, -0.18], [-0.30, -0.06], [-0.36, 0.04], [-0.31, 0.13],
  ], mat.furLight, 0.032);
  chestBib.position.set(0, -0.01, 0.431);
  CHEST.add(chestBib);

  const chestTuft = shapeMesh(THREE, [[-0.10, 0.07], [-0.02, 0.16], [0.10, 0.09], [0.06, -0.04], [-0.03, -0.16], [-0.12, -0.05]], mat.furLight, 0.020);
  chestTuft.position.set(0.03, -0.03, 0.462);
  chestTuft.rotation.z = -0.08;
  CHEST.add(chestTuft);

  const pelvis = mesh(taperedBoxGeometry(THREE, 0.98, 0.30, 0.64, 0.86), mat.pants, "PELVIS_MESH");
  pelvis.position.y = 0.00;
  HIPS.add(pelvis);

  const belt = mesh(roundedPrismGeometry(THREE, 1.03, 0.67, 0.16, 0.08), mat.belt, "BELT");
  belt.position.set(0, 0.13, 0);
  HIPS.add(belt);
  const buckle = mesh(roundedPrismGeometry(THREE, 0.28, 0.065, 0.22, 0.04), mat.metal, "BELT_BUCKLE");
  buckle.position.set(0, 0.13, 0.355);
  HIPS.add(buckle);
  const buckleInset = mesh(roundedPrismGeometry(THREE, 0.15, 0.025, 0.10, 0.018), mat.belt, "BELT_BUCKLE_INSET");
  buckleInset.position.set(0, 0.13, 0.392);
  HIPS.add(buckleInset);

  buildArm("L", 1);
  buildArm("R", -1);
  buildLeg("L", 1);
  buildLeg("R", -1);
  buildHead();
  buildTail();

  root.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return { root, joints, tail };

  function buildArm(side, sign) {
    const SHOULDER = addJoint(CHEST, `SHOULDER_${side}`, sign * 0.43, 0.41, 0);
    const UPPER = addJoint(SHOULDER, `UPPER_ARM_${side}`, 0, 0, 0);
    const ELBOW = addJoint(UPPER, `ELBOW_${side}`, 0, -0.54, 0);
    const FOREARM = addJoint(ELBOW, `FOREARM_${side}`, 0, 0, 0);
    const WRIST = addJoint(FOREARM, `WRIST_${side}`, 0, -0.44, 0);
    const HAND = addJoint(WRIST, `HAND_${side}`, 0, -0.02, 0);
    Object.assign(joints, {
      [`SHOULDER_${side}`]: SHOULDER, [`UPPER_ARM_${side}`]: UPPER, [`ELBOW_${side}`]: ELBOW,
      [`FOREARM_${side}`]: FOREARM, [`WRIST_${side}`]: WRIST, [`HAND_${side}`]: HAND,
    });

    const upperMesh = mesh(taperedLimbGeometry(THREE, 0.245, 0.205, 0.56, 10), mat.fur, `UPPER_ARM_${side}_MESH`);
    upperMesh.position.y = -0.27;
    UPPER.add(upperMesh);

    const foreMesh = mesh(taperedLimbGeometry(THREE, 0.22, 0.18, 0.46, 10), mat.fur, `FOREARM_${side}_MESH`);
    foreMesh.position.y = -0.22;
    FOREARM.add(foreMesh);

    const cuff = mesh(new THREE.CylinderGeometry(0.20, 0.215, 0.27, 10), mat.glove, `WRIST_${side}_CUFF`);
    cuff.position.y = -0.335;
    FOREARM.add(cuff);

    const armTuft = shapeMesh(THREE, [
      [-0.03 * sign, 0.02], [0.17 * sign, -0.06], [0.10 * sign, -0.14], [0.20 * sign, -0.22],
      [0.10 * sign, -0.30], [0.18 * sign, -0.39], [0.04 * sign, -0.53], [-0.06 * sign, -0.43],
    ], mat.fur, 0.055);
    armTuft.position.set(sign * 0.12, 0.00, 0.13);
    UPPER.add(armTuft);

    const cuffTuft = shapeMesh(THREE, [
      [-0.22, 0.05], [-0.12, 0.12], [-0.04, 0.05], [0.04, 0.12], [0.12, 0.05], [0.22, 0.12], [0.22, -0.05], [-0.22, -0.05],
    ], mat.glove, 0.045);
    cuffTuft.position.set(0, -0.215, 0.18);
    FOREARM.add(cuffTuft);

    const fist = mesh(new THREE.IcosahedronGeometry(0.25, 1), mat.glove, `FIST_${side}`);
    fist.scale.set(1.08, 1.08, 0.94);
    fist.position.set(sign * 0.035, -0.11, 0.035);
    HAND.add(fist);

    const thumb = mesh(new THREE.IcosahedronGeometry(0.11, 1), mat.glove, `THUMB_${side}`);
    thumb.scale.set(0.78, 1.05, 0.76);
    thumb.position.set(-sign * 0.15, -0.10, 0.13);
    HAND.add(thumb);

  }

  function buildLeg(side, sign) {
    const THIGH = addJoint(HIPS, `THIGH_${side}`, sign * 0.30, 0.00, 0);
    const KNEE = addJoint(THIGH, `KNEE_${side}`, 0, -0.49, 0);
    const SHIN = addJoint(KNEE, `SHIN_${side}`, 0, 0, 0);
    const ANKLE = addJoint(SHIN, `ANKLE_${side}`, 0, -0.66, 0.01);
    const FOOT = addJoint(ANKLE, `FOOT_${side}`, 0, 0, 0);
    Object.assign(joints, {
      [`THIGH_${side}`]: THIGH, [`KNEE_${side}`]: KNEE, [`SHIN_${side}`]: SHIN,
      [`ANKLE_${side}`]: ANKLE, [`FOOT_${side}`]: FOOT,
    });

    const thighMesh = mesh(latheBodyGeometry(THREE, [
      [-0.56, 0.35], [-0.49, 0.40], [-0.31, 0.42], [-0.11, 0.37], [0.00, 0.31],
    ], 10, 0.80), mat.pants, `THIGH_${side}_MESH`);
    THIGH.add(thighMesh);

    const shinMesh = mesh(latheBodyGeometry(THREE, [
      [-0.68, 0.34], [-0.60, 0.42], [-0.42, 0.44], [-0.22, 0.38], [0.00, 0.37],
    ], 10, 0.80), mat.pants, `SHIN_${side}_MESH`);
    SHIN.add(shinMesh);

    const kneeFold = shapeMesh(THREE, [
      [-0.30, 0.13], [-0.40, 0.04], [-0.31, -0.05], [-0.43, -0.15], [-0.31, -0.25],
      [0.31, -0.25], [0.43, -0.15], [0.31, -0.05], [0.40, 0.04], [0.30, 0.13],
    ], mat.pants, 0.050);
    kneeFold.position.set(0, -0.40, 0.225);
    SHIN.add(kneeFold);

    const ankleFold = shapeMesh(THREE, [
      [-0.29, 0.10], [-0.39, 0.01], [-0.30, -0.08], [-0.41, -0.17], [-0.28, -0.24],
      [0.28, -0.24], [0.41, -0.17], [0.30, -0.08], [0.39, 0.01], [0.29, 0.10],
    ], mat.pants, 0.055);
    ankleFold.position.set(0, -0.53, 0.235);
    SHIN.add(ankleFold);

    const outsole = mesh(roundedPrismGeometry(THREE, 0.92, 1.06, 0.06, 0.18), mat.cap, `OUTSOLE_${side}`);
    outsole.position.set(0, -0.518192, 0.21);
    FOOT.add(outsole);

    const sole = mesh(roundedPrismGeometry(THREE, 0.90, 1.03, 0.10, 0.18), mat.sole, `SOLE_${side}`);
    sole.position.set(0, -0.441192, 0.21);
    FOOT.add(sole);

    const shoe = mesh(roundedPrismGeometry(THREE, 0.82, 0.88, 0.28, 0.19), mat.cap, `SHOE_${side}`);
    shoe.position.set(0, -0.316192, 0.20);
    FOOT.add(shoe);

    const toe = mesh(roundedPrismGeometry(THREE, 0.79, 0.34, 0.14, 0.14), mat.white, `TOE_${side}`);
    toe.position.set(0, -0.306192, 0.51);
    FOOT.add(toe);

    for (let i = 0; i < 2; i += 1) {
      const lace = mesh(roundedPrismGeometry(THREE, 0.49, 0.045, 0.026, 0.02), mat.white, `LACE_${side}_${i}`);
      lace.position.set(0, -0.161192 + i * 0.012, 0.14 + i * 0.095);
      lace.rotation.x = -0.18;
      FOOT.add(lace);
    }
  }

  function buildHead() {
    const headMesh = mesh(new THREE.IcosahedronGeometry(0.70, 2), mat.fur, "HEAD_MESH");
    headMesh.scale.set(0.93, 0.87, 0.82);
    headMesh.position.y = 0.48;
    HEAD.add(headMesh);

    [1, -1].forEach((sign) => {
      const templeTuft = shapeMesh(THREE, [
        [-0.10, 0.18], [0.08, 0.15], [0.20, 0.06], [0.08, 0.00], [0.19, -0.08],
        [0.03, -0.15], [-0.12, -0.08], [-0.17, 0.05],
      ], mat.fur, 0.15);
      templeTuft.scale.x = sign;
      templeTuft.position.set(sign * 0.60, 0.76, 0.13);
      templeTuft.rotation.y = sign * -0.18;
      templeTuft.name = `TEMPLE_TUFT_${sign > 0 ? "L" : "R"}`;
      HEAD.add(templeTuft);

      const cheekTuft = shapeMesh(THREE, [
        [-0.16, 0.22], [0.07, 0.24], [0.17, 0.15], [0.07, 0.07], [0.22, 0.01],
        [0.08, -0.07], [0.20, -0.15], [0.05, -0.20], [0.11, -0.29], [-0.10, -0.24], [-0.18, -0.04],
      ], mat.fur, 0.17);
      cheekTuft.scale.x = sign;
      cheekTuft.position.set(sign * 0.59, 0.43, 0.13);
      cheekTuft.rotation.y = sign * -0.18;
      cheekTuft.name = `CHEEK_TUFT_${sign > 0 ? "L" : "R"}`;
      HEAD.add(cheekTuft);
    });

    addFaceChevron(1);
    addFaceChevron(-1);

    const maskPatch = shapeMesh(THREE, [
      [-0.58, 0.10], [-0.44, 0.23], [-0.24, 0.20], [-0.10, 0.30], [0, 0.20],
      [0.10, 0.30], [0.24, 0.20], [0.44, 0.23], [0.58, 0.10], [0.49, -0.08],
      [0.29, -0.19], [0.13, -0.14], [0, -0.05], [-0.13, -0.14], [-0.29, -0.19], [-0.49, -0.08],
    ], mat.mask, 0.030);
    maskPatch.position.set(0, 0.55, 0.605);
    maskPatch.name = "FACE_MASK";
    HEAD.add(maskPatch);

    const forehead = shapeMesh(THREE, [
      [-0.23, 0.08], [-0.16, 0.22], [0, 0.39], [0.16, 0.22], [0.23, 0.08], [0.12, -0.12], [0, 0.00], [-0.12, -0.12],
    ], mat.mask, 0.026);
    forehead.position.set(0, 0.78, 0.612);
    forehead.name = "FOREHEAD_MASK";
    HEAD.add(forehead);

    [1, -1].forEach((sign) => {
      const eye = shapeMesh(THREE, [
        [-0.17, -0.03], [-0.10, 0.09], [0.15, 0.13], [0.18, 0.04], [0.14, -0.08],
        [0.03, -0.13], [-0.11, -0.11],
      ], mat.white, 0.024);
      eye.scale.x = sign;
      eye.position.set(sign * 0.22, 0.59, 0.638);
      eye.name = `EYE_${sign > 0 ? "L" : "R"}`;
      HEAD.add(eye);

      const pupil = mesh(new THREE.IcosahedronGeometry(0.061, 2), mat.pupil, `PUPIL_${sign > 0 ? "L" : "R"}`);
      pupil.scale.set(0.74, 1.08, 0.30);
      pupil.position.set(sign * 0.195, 0.572, 0.672);
      HEAD.add(pupil);

      const glint = mesh(new THREE.SphereGeometry(0.015, 8, 5), mat.white, `EYE_GLINT_${sign > 0 ? "L" : "R"}`);
      glint.position.set(sign * 0.182, 0.603, 0.694);
      HEAD.add(glint);

      const brow = shapeMesh(THREE, [
        [-0.19, -0.04], [-0.11, 0.04], [0.16, 0.12], [0.18, 0.05], [-0.10, -0.08],
      ], mat.furShadow, 0.028);
      brow.scale.x = sign;
      brow.position.set(sign * 0.22, 0.715, 0.670);
      brow.name = `BROW_${sign > 0 ? "L" : "R"}`;
      HEAD.add(brow);
    });

    const muzzleGeo = new THREE.SphereGeometry(0.22, 14, 9);
    const muzzleL = mesh(muzzleGeo, mat.furLight, "MUZZLE_L");
    muzzleL.scale.set(1.00, 0.67, 0.72);
    muzzleL.position.set(0.145, 0.30, 0.625);
    HEAD.add(muzzleL);
    const muzzleR = mesh(muzzleGeo.clone(), mat.furLight, "MUZZLE_R");
    muzzleR.scale.set(1.00, 0.67, 0.72);
    muzzleR.position.set(-0.145, 0.30, 0.625);
    HEAD.add(muzzleR);

    const chin = mesh(new THREE.SphereGeometry(0.18, 12, 8), mat.furLight, "CHIN");
    chin.scale.set(1.22, 0.55, 0.60);
    chin.position.set(0, 0.17, 0.615);
    HEAD.add(chin);

    const nose = mesh(new THREE.IcosahedronGeometry(0.105, 2), mat.pupil, "NOSE");
    nose.scale.set(1.05, 0.78, 0.82);
    nose.position.set(0, 0.385, 0.805);
    HEAD.add(nose);

    addFacialTube("PHILTRUM", [[0, 0.35, 0.817], [0, 0.28, 0.826], [0, 0.22, 0.822]], mat.maskDark, 0.009);
    addFacialTube("MOUTH_L", [[0, 0.22, 0.822], [0.07, 0.18, 0.814], [0.16, 0.20, 0.798]], mat.maskDark, 0.010);
    addFacialTube("MOUTH_R", [[0, 0.22, 0.822], [-0.07, 0.18, 0.814], [-0.16, 0.20, 0.798]], mat.maskDark, 0.010);

    [1, -1].forEach((sign) => {
      addFacialTube(`WHISKER_${sign}_1`, [[sign * 0.22, 0.35, 0.798], [sign * 0.38, 0.39, 0.795], [sign * 0.57, 0.43, 0.770]], mat.white, 0.007);
      addFacialTube(`WHISKER_${sign}_2`, [[sign * 0.23, 0.31, 0.803], [sign * 0.40, 0.31, 0.800], [sign * 0.60, 0.30, 0.766]], mat.white, 0.007);
      addFacialTube(`WHISKER_${sign}_3`, [[sign * 0.22, 0.27, 0.798], [sign * 0.39, 0.23, 0.793], [sign * 0.57, 0.18, 0.764]], mat.white, 0.007);
    });

    addEar(1);
    addEar(-1);
    addCap();
  }

  function addFaceChevron(sign) {
    const points = [
      [0.03, 0.20], [0.31, 0.24], [0.52, 0.13], [0.42, 0.05], [0.56, -0.02],
      [0.40, -0.10], [0.52, -0.17], [0.25, -0.24], [0.05, -0.14], [-0.03, 0.02],
    ];
    const chevron = shapeMesh(THREE, points, mat.furLight, 0.028);
    chevron.scale.x = sign;
    chevron.position.set(0, 0.54, 0.583);
    chevron.name = `FACE_CHEVRON_${sign > 0 ? "L" : "R"}`;
    HEAD.add(chevron);
  }

  function addFacialTube(name, points, material, radius) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "catmullrom", 0.35);
    const tube = mesh(new THREE.TubeGeometry(curve, 12, radius, 5, false), material, name);
    HEAD.add(tube);
  }

  function addEar(sign) {
    const earGeo = extrudedPolygonGeometry(THREE, [[-0.19, -0.18], [-0.12, 0.11], [0, 0.27], [0.19, 0.13], [0.17, -0.18]], 0.15);
    const ear = mesh(earGeo, mat.furShadow, `EAR_${sign > 0 ? "L" : "R"}`);
    ear.position.set(sign * 0.57, 1.01, 0.02);
    ear.rotation.z = sign * -0.18;
    HEAD.add(ear);

    const innerGeo = extrudedPolygonGeometry(THREE, [[-0.11, -0.12], [-0.07, 0.07], [0, 0.18], [0.11, 0.08], [0.09, -0.12]], 0.020);
    const inner = mesh(innerGeo, mat.earInner, `EAR_INNER_${sign > 0 ? "L" : "R"}`);
    inner.position.set(sign * 0.57, 1.01, 0.105);
    inner.rotation.z = sign * -0.18;
    HEAD.add(inner);

    const earFlame = shapeMesh(THREE, [[-0.06, -0.08], [-0.03, 0.04], [0, 0.12], [0.055, 0.03], [0.02, -0.01], [0.065, -0.09]], mat.maskDark, 0.016);
    earFlame.position.set(sign * 0.57, 1.00, 0.128);
    earFlame.rotation.z = sign * -0.18;
    earFlame.name = `EAR_FLAME_${sign > 0 ? "L" : "R"}`;
    HEAD.add(earFlame);
  }

  function addCap() {
    const crown = mesh(latheBodyGeometry(THREE, [
      [0.00, 0.67], [0.12, 0.68], [0.34, 0.64], [0.54, 0.52], [0.68, 0.30], [0.72, 0.08],
    ], 20, 0.88), mat.cap, "CAP_CROWN");
    crown.position.set(0, 0.82, -0.01);
    HEAD.add(crown);

    const band = mesh(new THREE.CylinderGeometry(0.67, 0.69, 0.11, 20, 1, true), mat.capSoft, "CAP_BAND");
    band.scale.z = 0.88;
    band.position.set(0, 0.82, 0);
    HEAD.add(band);

    const billShape = new THREE.Shape();
    billShape.moveTo(-0.59, 0.04);
    billShape.lineTo(-0.52, -0.04);
    billShape.quadraticCurveTo(-0.28, -0.11, 0, -0.12);
    billShape.quadraticCurveTo(0.28, -0.11, 0.52, -0.04);
    billShape.lineTo(0.59, 0.04);
    billShape.lineTo(0.42, 0.09);
    billShape.quadraticCurveTo(0, 0.12, -0.42, 0.09);
    billShape.closePath();
    const billGeo = new THREE.ExtrudeGeometry(billShape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.010, bevelSegments: 2, curveSegments: 8 });
    billGeo.translate(0, 0, -0.21);
    const bill = mesh(billGeo, mat.cap, "CAP_BILL");
    bill.position.set(0, 0.77, 0.49);
    HEAD.add(bill);

    addFacialTube("CAP_CENTER_SEAM", [[0, 0.87, 0.600], [0, 1.10, 0.565], [0, 1.34, 0.405], [0, 1.49, 0.145]], mat.capSoft, 0.009);

    const button = mesh(new THREE.CylinderGeometry(0.038, 0.043, 0.030, 12), mat.cap, "CAP_BUTTON");
    button.position.set(0, 1.552, -0.01);
    HEAD.add(button);
  }

  function buildTail() {
    const segmentLengths = [0.36, 0.38, 0.39, 0.37, 0.33, 0.27];
    const radii = [[0.255, 0.245], [0.245, 0.225], [0.225, 0.202], [0.202, 0.174], [0.174, 0.132], [0.132, 0.075]];
    const tailMaterials = [mat.mask, mat.furLight, mat.mask, mat.furLight, mat.mask, mat.mask];
    let parent = HIPS;

    segmentLengths.forEach((length, index) => {
      const pivot = addJoint(parent, `TAIL_0${index + 1}`, 0, index === 0 ? -0.08 : -segmentLengths[index - 1] + 0.012, index === 0 ? -0.25 : 0);
      pivot.rotation.x = [0.74, 0.19, 0.18, 0.17, 0.16, 0.13][index];
      const segment = mesh(new THREE.CylinderGeometry(radii[index][1], radii[index][0], length + 0.026, 14, 2, false), tailMaterials[index], `TAIL_SEGMENT_${index + 1}`);
      segment.position.y = -length * 0.5;
      pivot.add(segment);
      joints[`TAIL_0${index + 1}`] = pivot;
      tail.push(pivot);
      parent = pivot;
    });

    const tip = mesh(new THREE.SphereGeometry(0.078, 12, 8), mat.mask, "TAIL_TIP");
    tip.scale.set(1, 1.25, 1);
    tip.position.y = -segmentLengths[segmentLengths.length - 1];
    parent.add(tip);
  }

  function joint(name) {
    const group = new THREE.Group();
    group.name = name;
    return group;
  }

  function addJoint(parent, name, x, y, z) {
    const group = joint(name);
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }
}

class SoftOrbitController {
  constructor(THREE, camera, element) {
    this.THREE = THREE;
    this.camera = camera;
    this.element = element;
    this.target = new THREE.Vector3();
    this.targetGoal = new THREE.Vector3();
    this.radius = 8;
    this.theta = 0.5;
    this.phi = 1.2;
    this.minRadius = 5.5;
    this.maxRadius = 18;
    this.pointers = new Map();
    this.lastPinch = 0;

    this.onPointerDown = (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.element.setPointerCapture?.(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.updatePinchBaseline();
    };
    this.onPointerMove = (event) => {
      const previous = this.pointers.get(event.pointerId);
      if (!previous) return;
      const current = { x: event.clientX, y: event.clientY };
      this.pointers.set(event.pointerId, current);
      if (this.pointers.size === 1) {
        this.theta -= (current.x - previous.x) * 0.006;
        this.phi = this.THREE.MathUtils.clamp(this.phi + (current.y - previous.y) * 0.005, 0.42, 1.48);
      } else if (this.pointers.size === 2) {
        const distance = this.pointerDistance();
        if (this.lastPinch > 0) this.radius = this.THREE.MathUtils.clamp(this.radius * (this.lastPinch / distance), this.minRadius, this.maxRadius);
        this.lastPinch = distance;
      }
    };
    this.onPointerEnd = (event) => {
      this.pointers.delete(event.pointerId);
      this.updatePinchBaseline();
    };
    this.onWheel = (event) => {
      event.preventDefault();
      this.radius = this.THREE.MathUtils.clamp(this.radius * Math.exp(event.deltaY * 0.001), this.minRadius, this.maxRadius);
    };

    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerup", this.onPointerEnd);
    element.addEventListener("pointercancel", this.onPointerEnd);
    element.addEventListener("wheel", this.onWheel, { passive: false });
  }

  pointerDistance() {
    const points = [...this.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  updatePinchBaseline() {
    this.lastPinch = this.pointers.size === 2 ? this.pointerDistance() : 0;
  }

  update(dt) {
    const targetBlend = dt >= 1 ? 1 : 1 - Math.exp(-dt * 7);
    this.target.lerp(this.targetGoal, targetBlend);
    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta)
    );
    this.camera.lookAt(this.target);
  }

  getPlanarAxes(forward, right) {
    forward.subVectors(this.target, this.camera.position);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
    forward.normalize();
    right.crossVectors(forward, new this.THREE.Vector3(0, 1, 0)).normalize();
  }

  destroy() {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerEnd);
    this.element.removeEventListener("pointercancel", this.onPointerEnd);
    this.element.removeEventListener("wheel", this.onWheel);
  }
}

function makeRestPose() {
  const pose = {};
  const names = [
    "HIPS", "SPINE", "CHEST", "NECK", "HEAD",
    "SHOULDER_L", "ELBOW_L", "WRIST_L", "SHOULDER_R", "ELBOW_R", "WRIST_R",
    "THIGH_L", "KNEE_L", "ANKLE_L", "FOOT_L", "THIGH_R", "KNEE_R", "ANKLE_R", "FOOT_R",
  ];
  names.forEach((name) => { pose[name] = { x: 0, y: 0, z: 0 }; });
  pose.SHOULDER_L.z = 0.25;
  pose.SHOULDER_R.z = -0.25;
  pose.SHOULDER_L.x = -0.10;
  pose.SHOULDER_R.x = -0.10;
  pose.ELBOW_L.x = -0.30;
  pose.ELBOW_R.x = -0.30;
  pose.ELBOW_L.z = -0.10;
  pose.ELBOW_R.z = 0.10;
  pose.WRIST_L.z = 0.04;
  pose.WRIST_R.z = -0.04;
  pose.THIGH_L.z = 0.16;
  pose.THIGH_R.z = -0.16;
  pose.KNEE_L.x = 0.12;
  pose.KNEE_R.x = 0.12;
  pose.ANKLE_L.x = -0.12;
  pose.ANKLE_R.x = -0.12;
  pose.ANKLE_L.z = -0.16;
  pose.ANKLE_R.z = 0.16;
  pose.FOOT_L.y = 0.13;
  pose.FOOT_R.y = -0.13;
  return pose;
}

function clonePose(source) {
  const result = {};
  Object.entries(source).forEach(([name, value]) => { result[name] = { ...value }; });
  return result;
}

function copyPose(target, source) {
  Object.keys(source).forEach((name) => {
    target[name].x = source[name].x;
    target[name].y = source[name].y;
    target[name].z = source[name].z;
  });
}

function blendPose(current, target, amount) {
  Object.keys(target).forEach((name) => {
    current[name].x += (target[name].x - current[name].x) * amount;
    current[name].y += (target[name].y - current[name].y) * amount;
    current[name].z += (target[name].z - current[name].z) * amount;
  });
}

function applyPoseImmediate(joints, pose) {
  Object.entries(pose).forEach(([name, rotation]) => {
    const object = joints[name];
    if (object) object.rotation.set(rotation.x, rotation.y, rotation.z);
  });
}

function smooth01(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function dampAngle(current, target, amount) {
  let delta = (target - current + Math.PI) % (Math.PI * 2) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * amount;
}

function mesh(geometry, material, name) {
  if (!TN0915_MESH_CLASS) throw new Error("Three.js mesh factory is not ready");
  const result = new TN0915_MESH_CLASS(geometry, material);
  result.name = name;
  return result;
}

function latheBodyGeometry(THREE, profile, segments, depthScale) {
  const points = profile.map(([y, radius]) => new THREE.Vector2(radius, y));
  const geometry = new THREE.LatheGeometry(points, segments);
  geometry.scale(1, 1, depthScale);
  geometry.computeVertexNormals();
  return geometry;
}

function taperedLimbGeometry(THREE, topRadius, bottomRadius, length, segments) {
  const geometry = new THREE.CylinderGeometry(bottomRadius, topRadius, length, segments, 2, false);
  geometry.computeVertexNormals();
  return geometry;
}

function taperedBoxGeometry(THREE, width, height, depth, bottomScale) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    if (position.getY(i) < 0) {
      position.setX(i, position.getX(i) * bottomScale);
      position.setZ(i, position.getZ(i) * bottomScale);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function roundedPrismGeometry(THREE, width, depth, height, radius) {
  const x = width / 2;
  const y = depth / 2;
  const r = Math.min(radius, x, y);
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 6 });
  geometry.translate(0, 0, -height / 2);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function extrudedPolygonGeometry(THREE, points, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function shapeMesh(THREE, points, material, depth) {
  return mesh(extrudedPolygonGeometry(THREE, points, depth), material, "FACE_SHAPE");
}
