/*
 * TRASH NETWORK — procedural raccoon player v04
 * ------------------------------------------------
 * One-file Three.js character/game for Blogger.
 * Character geometry, materials, rig and animation are generated in code.
 * No FBX, GLB, textures, sprites or external character assets are used.
 *
 * Blogger page (HTML view):
 *   <div data-tn-raccoon-game='true'></div>
 *   <script defer='defer'
 *           data-target='[data-tn-raccoon-game]'
 *           src='https://YOUR-HOST/tn0915_v04.js'></script>
 *
 * Optional script attributes:
 *   data-auto='false'           disable automatic mount
 *   data-quality='low|high'     renderer quality (default: high)
 *   data-three-url='https://…'  override the pinned Three.js module URL
 */

(() => {
  'use strict';

  const BUILD = 'tn0915-v04.0.0';
  const LOCK = Symbol.for('trash-network.raccoon.app');
  const tag = document.currentScript;
  const tagData = tag ? { ...tag.dataset } : {};
  const previous = globalThis[LOCK];

  if (previous && previous.build === BUILD) {
    if (tagData.auto !== 'false') previous.autoMount?.();
    return;
  }
  if (previous && previous.build !== BUILD) {
    try { previous.api?.destroy?.(); } catch (_) {}
  }

  const CDN_URLS = [
    tagData.threeUrl || globalThis.TN_RACCOON_THREE_URL ||
      'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
    'https://unpkg.com/three@0.180.0/build/three.module.js'
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  const lifecycle = {
    build: BUILD,
    state: 'loading',
    instances: new Map(),
    modulePromise: null,
    api: null,
    ready: null,
    tag,
    tagData,
    autoMount: null
  };

  globalThis[LOCK] = lifecycle;

  const whenDOMReady = () => document.readyState === 'loading'
    ? new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
    : Promise.resolve();

  function importWithTimeout(url, timeoutMs = 15000) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(new Error(`Timeout loading ${url}`)), timeoutMs);
    });
    return Promise.race([import(url), timeout]).finally(() => globalThis.clearTimeout(timer));
  }

  async function loadThree() {
    if (lifecycle.modulePromise) return lifecycle.modulePromise;
    lifecycle.modulePromise = (async () => {
      let finalError;
      for (const url of CDN_URLS) {
        try {
          const mod = await importWithTimeout(url);
          if (!mod || !mod.WebGLRenderer || !mod.Bone || !mod.SkinnedMesh) {
            throw new Error('The loaded module is not a compatible Three.js build.');
          }
          return mod;
        } catch (error) {
          finalError = error;
        }
      }
      throw finalError || new Error('Three.js could not be loaded.');
    })();
    return lifecycle.modulePromise;
  }

  function findOrCreateHost() {
    const selector = tagData.target || '[data-tn-raccoon-game]';
    let host = null;
    try { host = document.querySelector(selector); } catch (_) { /* invalid custom selector */ }
    if (host) return host;

    const parent = tag?.parentElement;
    const isBodyPlacement = parent && !['HEAD', 'HTML'].includes(parent.tagName);
    if (!isBodyPlacement) return null;

    host = document.createElement('div');
    host.dataset.tnRaccoonGame = 'true';
    parent.insertBefore(host, tag);
    return host;
  }

  function showOuterFallback(host, message) {
    if (!host) return;
    const container = host.shadowRoot || host;
    container.textContent = '';
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    Object.assign(box.style, {
      boxSizing: 'border-box', minHeight: '320px', display: 'grid', placeItems: 'center',
      padding: '28px', background: '#e8e6e3', color: '#17171a', font: '600 15px/1.45 system-ui,sans-serif',
      textAlign: 'center', border: '1px solid rgba(0,0,0,.12)'
    });
    box.textContent = message;
    container.appendChild(box);
  }

  function createAPI(THREE) {
    class TrashRaccoonGame {
      constructor(host, options = {}) {
        if (!(host instanceof Element)) throw new TypeError('mount() requires a DOM element.');
        this.THREE = THREE;
        this.host = host;
        this.options = {
          quality: options.quality || tagData.quality || 'high',
          showroom: options.showroom !== false,
          touchControls: options.touchControls !== false,
          ...options
        };
        this.destroyed = false;
        this.pauseReasons = new Set();
        this.cleanups = [];
        this.keys = new Set();
        this.touchInput = new THREE.Vector2();
        this.input = new THREE.Vector2();
        this.clock = new THREE.Clock(false);
        this.fixedStep = 1 / 60;
        this.accumulator = 0;
        this.maxSubsteps = 5;
        this.raf = 0;
        this.focused = false;
        this.worldVelocity = new THREE.Vector3();
        this.moveDirection = new THREE.Vector3();
        this.actorYaw = 0;
        this.verticalVelocity = 0;
        this.grounded = true;
        this.jumpBuffer = 0;
        this.coyote = 0.1;
        this.action = null;
        this.actionTime = 0;
        this.nextPunchSide = 1;
        this.distancePhase = 0;
        this.elapsed = 0;
        this.blinkTimer = 2.2 + Math.random() * 1.4;
        this.blinkPhase = -1;
        this.cameraOrbit = { yaw: 0, pitch: 0.08, distance: 15.6 };
        this.cameraTarget = new THREE.Vector3(0, 4.15, 0);
        this.pointerOrbit = null;
        this.pointerJoystick = null;
        this.resourceSet = new Set();
        this._initDOM();
        this._initScene();
        this.character = this._createRaccoon();
        this.scene.add(this.character.actorRoot);
        this._initInput();
        this._initObservers();
        this._resize();
        this.resume('initial');
        this.host.dispatchEvent(new CustomEvent('tn-raccoon-ready', {
          detail: { game: this, build: BUILD }
        }));
      }

      _on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.cleanups.push(() => target.removeEventListener(type, handler, options));
      }

      _initDOM() {
        this.host.dataset.tnRaccoonMounted = BUILD;
        this.host.classList.add('tn-raccoon-host');
        this.host.tabIndex = this.host.tabIndex >= 0 ? this.host.tabIndex : 0;
        this.shadow = this.host.shadowRoot || this.host.attachShadow({ mode: 'open' });
        this.shadow.textContent = '';

        const style = document.createElement('style');
        style.textContent = `
          :host { display:block; position:relative; width:100%; height:100vh; height:100dvh;
                  min-height:480px; overflow:hidden; contain:layout paint style; background:#e8e6e3;
                  touch-action:none; outline:none; color:#17171a; }
          * { box-sizing:border-box; }
          .tn-stage { position:absolute; inset:0; overflow:hidden; background:#e8e6e3; }
          canvas { position:absolute; inset:0; width:100%; height:100%; display:block; outline:none; }
          .tn-vignette { position:absolute; inset:0; pointer-events:none;
            background:radial-gradient(circle at 50% 42%, transparent 42%, rgba(10,10,12,.08) 100%); }
          .tn-hud { position:absolute; z-index:3; top:max(16px,env(safe-area-inset-top)); left:max(18px,env(safe-area-inset-left));
                    user-select:none; pointer-events:none; font-family:Inter,Arial,sans-serif; text-transform:uppercase; }
          .tn-brand { font-size:12px; line-height:1; font-weight:900; letter-spacing:.24em; }
          .tn-state { margin-top:7px; font-size:10px; font-weight:750; letter-spacing:.14em; opacity:.54; }
          .tn-help { position:absolute; z-index:3; left:50%; bottom:max(15px,env(safe-area-inset-bottom));
                     transform:translateX(-50%); padding:9px 13px; border:1px solid rgba(0,0,0,.12);
                     border-radius:999px; background:rgba(245,244,241,.72); backdrop-filter:blur(9px);
                     color:#202024; font:700 10px/1.2 Inter,Arial,sans-serif; letter-spacing:.07em;
                     white-space:nowrap; user-select:none; pointer-events:none; }
          .tn-touch { position:absolute; z-index:5; inset:0; pointer-events:none; display:none; }
          .tn-stick { pointer-events:auto; position:absolute; left:max(22px,env(safe-area-inset-left));
                      bottom:max(28px,env(safe-area-inset-bottom)); width:116px; height:116px; border-radius:50%;
                      border:1px solid rgba(0,0,0,.20); background:rgba(245,244,241,.22); backdrop-filter:blur(5px); }
          .tn-knob { position:absolute; left:50%; top:50%; width:48px; height:48px; margin:-24px;
                     border-radius:50%; background:rgba(26,26,29,.80); box-shadow:0 4px 18px rgba(0,0,0,.18); }
          .tn-actions { pointer-events:none; position:absolute; right:max(18px,env(safe-area-inset-right));
                        bottom:max(27px,env(safe-area-inset-bottom)); width:154px; height:132px; }
          .tn-action { pointer-events:auto; position:absolute; display:grid; place-items:center; width:54px; height:54px;
                       border:1px solid rgba(0,0,0,.18); border-radius:50%; background:rgba(245,244,241,.74);
                       color:#17171a; font:900 10px/1 Inter,Arial,sans-serif; letter-spacing:.05em;
                       box-shadow:0 6px 22px rgba(0,0,0,.13); touch-action:none; }
          .tn-action:active { transform:scale(.92); background:#d72d2d; color:white; }
          .tn-jump { right:0; top:0; } .tn-punch { left:0; bottom:0; } .tn-kick { right:9px; bottom:0; }
          .tn-status { position:absolute; z-index:8; inset:0; display:none; place-items:center; padding:32px;
                       background:rgba(232,230,227,.94); color:#17171a; text-align:center;
                       font:700 15px/1.5 system-ui,sans-serif; }
          @media (pointer:coarse), (max-width:760px) {
            .tn-touch { display:block; }
            .tn-help { display:none; }
          }
          @media (prefers-reduced-motion:reduce) { .tn-vignette { display:none; } }
        `;

        this.stage = document.createElement('div');
        this.stage.className = 'tn-stage';
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('aria-label', 'Trash Network procedural raccoon game');
        this.canvas.tabIndex = 0;
        this.vignette = document.createElement('div');
        this.vignette.className = 'tn-vignette';

        this.hud = document.createElement('div');
        this.hud.className = 'tn-hud';
        this.hud.innerHTML = `<div class="tn-brand">Trash Network</div><div class="tn-state">Idle</div>`;
        this.stateLabel = this.hud.querySelector('.tn-state');

        this.help = document.createElement('div');
        this.help.className = 'tn-help';
        this.help.textContent = 'WASD / ARROWS · SPACE JUMP · P PUNCH · K KICK · SHIFT RUN · DRAG CAMERA';

        this.touchLayer = document.createElement('div');
        this.touchLayer.className = 'tn-touch';
        this.touchLayer.innerHTML = `
          <div class="tn-stick" role="application" aria-label="Movement joystick"><div class="tn-knob"></div></div>
          <div class="tn-actions">
            <button class="tn-action tn-jump" data-action="jump" aria-label="Jump">JUMP</button>
            <button class="tn-action tn-punch" data-action="punch" aria-label="Punch">PUNCH</button>
            <button class="tn-action tn-kick" data-action="kick" aria-label="Kick">KICK</button>
          </div>`;

        this.statusLayer = document.createElement('div');
        this.statusLayer.className = 'tn-status';
        this.statusLayer.setAttribute('role', 'status');

        this.stage.append(this.canvas, this.vignette, this.hud, this.help, this.touchLayer, this.statusLayer);
        this.shadow.append(style, this.stage);
      }

      _initScene() {
        const THREE = this.THREE;
        const context = this.canvas.getContext('webgl2', {
          antialias: this.options.quality !== 'low', alpha: false, depth: true,
          stencil: false, powerPreference: 'high-performance'
        });
        if (!context) throw new Error('WebGL 2 is not available on this device.');

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context, antialias: false });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.02;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0xe8e6e3, 1);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe8e6e3);
        this.scene.fog = new THREE.Fog(0xe8e6e3, 17, 28);
        this.camera = new THREE.PerspectiveCamera(31, 1, 0.05, 60);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x5f5b60, 2.15);
        this.scene.add(hemi);

        const key = new THREE.DirectionalLight(0xfff7ed, 4.2);
        key.position.set(5.5, 10.5, 8.5);
        key.castShadow = true;
        key.shadow.mapSize.set(
          this.options.quality === 'low' ? 1024 : 2048,
          this.options.quality === 'low' ? 1024 : 2048
        );
        key.shadow.camera.left = -8;
        key.shadow.camera.right = 8;
        key.shadow.camera.top = 10;
        key.shadow.camera.bottom = -3;
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 30;
        key.shadow.bias = -0.00035;
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0xb8c8dd, 1.35);
        fill.position.set(-7, 5, 5);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 1.9);
        rim.position.set(1, 7, -8);
        this.scene.add(rim);

        const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8d6d3, roughness: 0.94, metalness: 0 });
        const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.name = 'showroom_floor';
        this.scene.add(floor);

        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.34, 64), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.012;
        this.scene.add(ring);
      }

      _createRaccoon() {
        const THREE = this.THREE;
        const actorRoot = new THREE.Group();
        actorRoot.name = 'TN_Raccoon_ActorRoot';
        const motionRoot = new THREE.Group();
        motionRoot.name = 'TN_Raccoon_MotionRoot';
        const modelRoot = new THREE.Group();
        modelRoot.name = 'TN_Raccoon_ModelRoot';
        actorRoot.add(motionRoot);
        motionRoot.add(modelRoot);

        const materials = {
          fur: new THREE.MeshStandardMaterial({ color: 0x7d797d, roughness: 0.96, metalness: 0, flatShading: true }),
          furLight: new THREE.MeshStandardMaterial({ color: 0x969196, roughness: 0.96, metalness: 0, flatShading: true }),
          ivory: new THREE.MeshStandardMaterial({ color: 0xe4ded6, roughness: 0.9, metalness: 0, flatShading: true }),
          mask: new THREE.MeshStandardMaterial({ color: 0x222124, roughness: 0.88, metalness: 0, flatShading: true }),
          maskSoft: new THREE.MeshStandardMaterial({ color: 0x343237, roughness: 0.9, metalness: 0, flatShading: true }),
          cap: new THREE.MeshStandardMaterial({ color: 0x161619, roughness: 0.76, metalness: 0, flatShading: true }),
          capSeam: new THREE.MeshStandardMaterial({ color: 0x2c2b30, roughness: 0.82, metalness: 0 }),
          pants: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.84, metalness: 0, flatShading: true }),
          pantsFold: new THREE.MeshStandardMaterial({ color: 0x242328, roughness: 0.88, metalness: 0, flatShading: true }),
          shoe: new THREE.MeshStandardMaterial({ color: 0x19191c, roughness: 0.72, metalness: 0, flatShading: true }),
          sole: new THREE.MeshStandardMaterial({ color: 0xeeeae3, roughness: 0.72, metalness: 0, flatShading: true }),
          eye: new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.5, metalness: 0 }),
          pupil: new THREE.MeshPhysicalMaterial({ color: 0x101013, roughness: 0.22, metalness: 0, clearcoat: 0.6 }),
          iris: new THREE.MeshStandardMaterial({ color: 0x49474b, roughness: 0.35, metalness: 0 }),
          nose: new THREE.MeshPhysicalMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0, clearcoat: 0.75 }),
          mouth: new THREE.MeshStandardMaterial({ color: 0x18171a, roughness: 0.48, metalness: 0 }),
          metal: new THREE.MeshStandardMaterial({ color: 0xbfc1c0, roughness: 0.24, metalness: 0.7 }),
          tailDark: new THREE.MeshStandardMaterial({ color: 0x3b393d, roughness: 1, metalness: 0, flatShading: true }),
          tailLight: new THREE.MeshStandardMaterial({ color: 0xd8d1c9, roughness: 1, metalness: 0, flatShading: true }),
          whisker: new THREE.MeshStandardMaterial({ color: 0xf5efe8, roughness: 0.75, metalness: 0 })
        };
        materials.mask.side = THREE.DoubleSide;
        materials.maskSoft.side = THREE.DoubleSide;

        const bones = {};
        const bone = (name, parent, x = 0, y = 0, z = 0) => {
          const value = new THREE.Bone();
          value.name = name;
          value.position.set(x, y, z);
          parent.add(value);
          bones[name] = value;
          return value;
        };

        const pelvis = bone('pelvis', modelRoot, 0, 3.05, 0);
        const spine01 = bone('spine01', pelvis, 0, 0.82, 0);
        const chest = bone('chest', spine01, 0, 0.86, 0);
        const neck = bone('neck', chest, 0, 0.34, 0);
        const head = bone('head', neck, 0, 0.02, 0);
        const jaw = bone('jaw', head, 0, 0.55, 0.93);
        const capBone = bone('cap', head, 0, 0, 0);
        const earL = bone('ear_L', head, -1.12, 2.0, 0.02);
        const earR = bone('ear_R', head, 1.12, 2.0, 0.02);
        const eyeL = bone('eye_L', head, -0.48, 1.31, 0.99);
        const eyeR = bone('eye_R', head, 0.48, 1.31, 0.99);
        const pupilL = bone('pupil_L', eyeL, 0.055, -0.035, 0.205);
        const pupilR = bone('pupil_R', eyeR, -0.055, -0.035, 0.205);
        const browL = bone('brow_L', head, -0.13, 1.51, 1.18);
        const browR = bone('brow_R', head, 0.13, 1.51, 1.18);

        const clavicleL = bone('clavicle_L', chest, -0.22, 0.08, 0);
        const upperArmL = bone('upperArm_L', clavicleL, -0.66, 0.06, 0);
        const elbowL = bone('elbow_L', upperArmL, 0, -0.86, 0);
        const wristL = bone('wrist_L', elbowL, 0, -0.75, 0);
        const handL = bone('hand_L', wristL, 0, -0.05, 0);
        const clavicleR = bone('clavicle_R', chest, 0.22, 0.08, 0);
        const upperArmR = bone('upperArm_R', clavicleR, 0.66, 0.06, 0);
        const elbowR = bone('elbow_R', upperArmR, 0, -0.86, 0);
        const wristR = bone('wrist_R', elbowR, 0, -0.75, 0);
        const handR = bone('hand_R', wristR, 0, -0.05, 0);

        const hipL = bone('hip_L', pelvis, -0.55, 0, 0);
        const kneeL = bone('knee_L', hipL, 0, -1.05, 0);
        const ankleL = bone('ankle_L', kneeL, 0, -1.12, 0);
        const footL = bone('foot_L', ankleL, 0, -0.08, 0.08);
        const toeL = bone('toe_L', footL, 0, 0, 0.68);
        const hipR = bone('hip_R', pelvis, 0.55, 0, 0);
        const kneeR = bone('knee_R', hipR, 0, -1.05, 0);
        const ankleR = bone('ankle_R', kneeR, 0, -1.12, 0);
        const footR = bone('foot_R', ankleR, 0, -0.08, 0.08);
        const toeR = bone('toe_R', footR, 0, 0, 0.68);
        footL.rotation.y = -0.085;
        footR.rotation.y = 0.085;

        const tailBones = [];
        let tailParent = pelvis;
        for (let i = 0; i < 6; i++) {
          const tailBone = bone(`tail_${String(i).padStart(2, '0')}`, tailParent,
            i === 0 ? 0.28 : 0, i === 0 ? 0.04 : -0.52, i === 0 ? -0.72 : 0);
          tailBones.push(tailBone);
          tailParent = tailBone;
        }

        const fingerBones = { L: [], R: [] };
        for (const [side, handBone] of [['L', handL], ['R', handR]]) {
          for (let i = 0; i < 5; i++) {
            const x = (i - 2) * 0.105;
            const f = bone(`finger_${side}_${i + 1}`, handBone, x, -0.19 - Math.abs(i - 2) * 0.012, 0.13);
            f.rotation.x = -0.42;
            fingerBones[side].push(f);
          }
        }

        const sockets = {};
        const socket = (name, parent, x, y, z) => {
          const value = new THREE.Object3D();
          value.name = name;
          value.position.set(x, y, z);
          parent.add(value);
          sockets[name] = value;
          return value;
        };
        socket('handHit_L', handL, 0, -0.33, 0.27);
        socket('handHit_R', handR, 0, -0.33, 0.27);
        socket('footHit_L', toeL, 0, -0.28, 0.45);
        socket('footHit_R', toeR, 0, -0.28, 0.45);
        socket('cameraTarget', chest, 0, 0.7, 0);
        socket('shadowAnchor', pelvis, 0, -3.02, 0);

        const addMesh = (parent, geometry, material, name, position, scale, rotation) => {
          const object = new THREE.Mesh(geometry, material);
          object.name = name;
          if (position) object.position.set(...position);
          if (scale) object.scale.set(...scale);
          if (rotation) object.rotation.set(...rotation);
          object.castShadow = true;
          object.receiveShadow = true;
          parent.add(object);
          return object;
        };

        const makePanel = (points, depth = 0.045, bevel = 0.015) => {
          const shape = new THREE.Shape();
          shape.moveTo(points[0][0], points[0][1]);
          for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
          shape.closePath();
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth, bevelEnabled: bevel > 0, bevelSegments: bevel > 0 ? 1 : 0,
            bevelSize: bevel, bevelThickness: bevel * 0.75, curveSegments: 2
          });
          geometry.computeVertexNormals();
          return geometry;
        };

        const makeEllipsoidPatch = (points, rx, ry, rz, zPad = 0.018) => {
          const contour = points.map(([x, y]) => new THREE.Vector2(x, y));
          const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
          const positions = [];
          for (const triangle of triangles) {
            for (let i = 2; i >= 0; i--) {
              const point = contour[triangle[i]];
              const q = Math.max(0.002, 1 - (point.x * point.x) / (rx * rx) - (point.y * point.y) / (ry * ry));
              positions.push(point.x, point.y, rz * Math.sqrt(q) + zPad);
            }
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geometry.computeVertexNormals();
          return geometry;
        };

        const makeCurve = (points, radius, radialSegments = 4) => {
          const curve = points.length === 3
            ? new THREE.QuadraticBezierCurve3(...points.map((p) => new THREE.Vector3(...p)))
            : new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
          return new THREE.TubeGeometry(curve, 8, radius, radialSegments, false);
        };

        const makeBrimGeometry = () => {
          const cols = 10;
          const rows = 4;
          const positions = [];
          const indices = [];
          const thickness = 0.17;
          for (let layer = 0; layer < 2; layer++) {
            for (let j = 0; j <= rows; j++) {
              const v = j / rows;
              for (let i = 0; i <= cols; i++) {
                const u = i / cols * 2 - 1;
                const x = u * (1.05 + 0.22 * v - 0.08 * v * v);
                const z = 0.30 + 0.76 * v - 0.05 * u * u;
                const y = 0.11 - 0.105 * v + 0.055 * u * u - layer * thickness;
                positions.push(x, y, z);
              }
            }
          }
          const stride = cols + 1;
          const layerSize = stride * (rows + 1);
          for (let layer = 0; layer < 2; layer++) {
            for (let j = 0; j < rows; j++) {
              for (let i = 0; i < cols; i++) {
                const a = layer * layerSize + j * stride + i;
                const b = a + 1;
                const c = a + stride;
                const d = c + 1;
                if (layer === 0) indices.push(a, c, b, b, c, d);
                else indices.push(a, b, c, b, d, c);
              }
            }
          }
          const boundary = [];
          for (let i = 0; i <= cols; i++) boundary.push(i);
          for (let j = 1; j <= rows; j++) boundary.push(j * stride + cols);
          for (let i = cols - 1; i >= 0; i--) boundary.push(rows * stride + i);
          for (let j = rows - 1; j > 0; j--) boundary.push(j * stride);
          for (let i = 0; i < boundary.length; i++) {
            const a = boundary[i];
            const b = boundary[(i + 1) % boundary.length];
            indices.push(a, b, a + layerSize, b, b + layerSize, a + layerSize);
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geometry.setIndex(indices);
          geometry.computeVertexNormals();
          return geometry;
        };

        const createSkinnedLoft = (rings, radialSegments, skeletonBones, material, name, parent, position) => {
          const positions = [];
          const indices = [];
          const skinIndices = [];
          const skinWeights = [];
          const ringCount = rings.length;
          for (let r = 0; r < ringCount; r++) {
            const ring = rings[r];
            const u = r / (ringCount - 1);
            const skinFloat = u * (skeletonBones.length - 1);
            const a = Math.min(skeletonBones.length - 1, Math.floor(skinFloat));
            const b = Math.min(skeletonBones.length - 1, a + 1);
            const wb = skinFloat - a;
            for (let s = 0; s < radialSegments; s++) {
              const angle = s / radialSegments * Math.PI * 2 + (ring.twist || 0);
              positions.push(
                (ring.x || 0) + Math.cos(angle) * ring.rx,
                ring.y,
                (ring.z || 0) + Math.sin(angle) * ring.rz
              );
              skinIndices.push(a, b, 0, 0);
              skinWeights.push(1 - wb, wb, 0, 0);
            }
          }
          for (let r = 0; r < ringCount - 1; r++) {
            for (let s = 0; s < radialSegments; s++) {
              const next = (s + 1) % radialSegments;
              const a = r * radialSegments + s;
              const b = r * radialSegments + next;
              const c = (r + 1) * radialSegments + s;
              const d = (r + 1) * radialSegments + next;
              indices.push(a, c, b, b, c, d);
            }
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
          geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
          geometry.setIndex(indices);
          geometry.computeVertexNormals();
          const skinned = new THREE.SkinnedMesh(geometry, material);
          skinned.name = name;
          skinned.position.set(...position);
          skinned.castShadow = true;
          skinned.receiveShadow = true;
          parent.add(skinned);
          skinned.userData.pendingSkeleton = new THREE.Skeleton(skeletonBones);
          return skinned;
        };

        const torso = createSkinnedLoft([
          { y: 0.02, rx: 0.70, rz: 0.47 },
          { y: 0.34, rx: 0.74, rz: 0.49, twist: 0.03 },
          { y: 0.72, rx: 0.77, rz: 0.51 },
          { y: 1.08, rx: 0.82, rz: 0.54, twist: -0.03 },
          { y: 1.40, rx: 0.91, rz: 0.57 },
          { y: 1.67, rx: 0.84, rz: 0.54 },
          { y: 1.80, rx: 0.59, rz: 0.42 }
        ], 12, [pelvis, spine01, chest], materials.fur, 'body_skinned', modelRoot, [0, 3.05, 0]);

        const pantRings = [
          { y: 0.05, rx: 0.36, rz: 0.32 },
          { y: -0.28, rx: 0.43, rz: 0.35, twist: 0.04 },
          { y: -0.68, rx: 0.41, rz: 0.33 },
          { y: -1.02, rx: 0.36, rz: 0.30, twist: -0.04 },
          { y: -1.36, rx: 0.50, rz: 0.39 },
          { y: -1.72, rx: 0.56, rz: 0.42, twist: 0.05 },
          { y: -2.04, rx: 0.54, rz: 0.40 },
          { y: -2.18, rx: 0.43, rz: 0.34 }
        ];
        const pantsL = createSkinnedLoft(pantRings, 10, [hipL, kneeL, ankleL], materials.pants,
          'pants_leg_L_skinned', modelRoot, [-0.55, 3.05, 0]);
        const pantsR = createSkinnedLoft(pantRings.map((r) => ({ ...r, twist: -(r.twist || 0) })), 10,
          [hipR, kneeR, ankleR], materials.pants, 'pants_leg_R_skinned', modelRoot, [0.55, 3.05, 0]);

        const pantFoldGeometry = makePanel([
          [-0.30, 0.12], [0.29, 0.21], [0.13, -0.12], [-0.23, -0.20]
        ], 0.028, 0);
        addMesh(kneeL, pantFoldGeometry, materials.pantsFold, 'pants_fold_L_1', [0, -0.48, 0.405], [1, 1, 1], [0, 0, -0.12]);
        addMesh(kneeR, pantFoldGeometry, materials.pantsFold, 'pants_fold_R_1', [0, -0.48, 0.405], [-1, 1, 1], [0, 0, -0.12]);
        addMesh(kneeL, pantFoldGeometry, materials.pantsFold, 'pants_fold_L_2', [0.04, -0.84, 0.405], [0.82, 0.75, 1], [0, 0, 0.18]);
        addMesh(kneeR, pantFoldGeometry, materials.pantsFold, 'pants_fold_R_2', [-0.04, -0.84, 0.405], [-0.82, 0.75, 1], [0, 0, 0.18]);

        const makeTail = () => {
          const ringCount = 25;
          const radial = 10;
          const length = 2.86;
          const positions = [];
          const indices = [];
          const skinIndices = [];
          const skinWeights = [];
          const geometry = new THREE.BufferGeometry();
          const bandMaterials = [materials.tailDark, materials.tailDark, materials.tailLight,
            materials.tailDark, materials.tailLight, materials.tailDark, materials.tailDark];
          for (let r = 0; r < ringCount; r++) {
            const u = r / (ringCount - 1);
            const radius = 0.20 * (1 - u) + 0.065 * u + 0.36 * Math.pow(Math.sin(Math.PI * u), 0.72);
            const skinFloat = u * (tailBones.length - 1);
            const a = Math.min(tailBones.length - 1, Math.floor(skinFloat));
            const b = Math.min(tailBones.length - 1, a + 1);
            const wb = skinFloat - a;
            for (let s = 0; s < radial; s++) {
              const angle = s / radial * Math.PI * 2;
              positions.push(Math.cos(angle) * radius, -u * length, Math.sin(angle) * radius);
              skinIndices.push(a, b, 0, 0);
              skinWeights.push(1 - wb, wb, 0, 0);
            }
          }
          for (let r = 0; r < ringCount - 1; r++) {
            const start = indices.length;
            for (let s = 0; s < radial; s++) {
              const next = (s + 1) % radial;
              const a = r * radial + s;
              const b = r * radial + next;
              const c = (r + 1) * radial + s;
              const d = (r + 1) * radial + next;
              indices.push(a, c, b, b, c, d);
            }
            const uMid = (r + 0.5) / (ringCount - 1);
            const materialIndex = Math.min(bandMaterials.length - 1, Math.floor(uMid * bandMaterials.length));
            geometry.addGroup(start, radial * 6, materialIndex);
          }
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
          geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
          geometry.setIndex(indices);
          geometry.computeVertexNormals();
          const mesh = new THREE.SkinnedMesh(geometry, bandMaterials);
          mesh.name = 'tail_continuous_skinned';
          mesh.position.set(0.28, 3.09, -0.72);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          modelRoot.add(mesh);
          mesh.userData.pendingSkeleton = new THREE.Skeleton(tailBones);
          return mesh;
        };
        const tailMesh = makeTail();

        addMesh(pelvis, new THREE.SphereGeometry(1, 12, 8), materials.pants, 'pants_hips',
          [0, 0.04, 0], [0.91, 0.42, 0.58]);
        addMesh(pelvis, new THREE.CylinderGeometry(0.87, 0.91, 0.23, 12), materials.cap, 'belt',
          [0, 0.23, 0], [1, 1, 0.72]);

        const buckle = new THREE.Group();
        buckle.name = 'belt_buckle';
        buckle.position.set(0, 0.24, 0.68);
        pelvis.add(buckle);
        addMesh(buckle, new THREE.BoxGeometry(0.72, 0.12, 0.09), materials.metal, 'buckle_top', [0, 0.25, 0]);
        addMesh(buckle, new THREE.BoxGeometry(0.72, 0.12, 0.09), materials.metal, 'buckle_bottom', [0, -0.25, 0]);
        addMesh(buckle, new THREE.BoxGeometry(0.12, 0.50, 0.09), materials.metal, 'buckle_left', [-0.30, 0, 0]);
        addMesh(buckle, new THREE.BoxGeometry(0.12, 0.50, 0.09), materials.metal, 'buckle_right', [0.30, 0, 0]);

        for (const side of [-1, 1]) {
          const pocketCurve = makeCurve([
            [side * 0.72, 0.33, 0.58], [side * 0.56, 0.05, 0.66], [side * 0.34, -0.08, 0.61]
          ], 0.018, 3);
          addMesh(pelvis, pocketCurve, materials.pantsFold, `pocket_${side < 0 ? 'L' : 'R'}`);
        }

        const chestPatch = makePanel([
          [-0.18, 0.78], [-0.44, 0.65], [-0.34, 0.48], [-0.54, 0.34],
          [-0.39, 0.14], [-0.57, -0.03], [-0.42, -0.23], [-0.50, -0.47],
          [-0.31, -0.76], [0, -0.92], [0.31, -0.76], [0.50, -0.47],
          [0.42, -0.23], [0.57, -0.03], [0.39, 0.14], [0.54, 0.34],
          [0.34, 0.48], [0.44, 0.65], [0.18, 0.78], [0, 0.68]
        ], 0.055, 0.015);
        addMesh(chest, chestPatch, materials.ivory, 'chest_ivory_patch', [0, -0.66, 0.54], [1, 1, 1], [0.03, 0, 0]);

        const neckTuft = makePanel([
          [-0.48, 0.15], [-0.27, 0.02], [-0.17, -0.18], [0, -0.07],
          [0.17, -0.18], [0.27, 0.02], [0.48, 0.15], [0, 0.29]
        ], 0.05, 0.01);
        addMesh(neck, neckTuft, materials.furLight, 'neck_tuft', [0, 0.04, 0.44]);
        addMesh(neck, new THREE.CapsuleGeometry(0.38, 0.18, 3, 9), materials.fur,
          'neck_volume', [0, -0.13, -0.02], [1, 1, 0.92]);

        const makeArm = (side, upper, elbow, wrist, handBone) => {
          addMesh(upper, new THREE.CapsuleGeometry(0.205, 0.54, 3, 8), materials.fur,
            `upper_arm_${side}`, [0, -0.43, 0], [1, 1, 0.94]);
          addMesh(elbow, new THREE.CapsuleGeometry(0.205, 0.46, 3, 8), materials.fur,
            `lower_arm_fur_${side}`, [0, -0.36, 0], [0.96, 1, 0.92]);
          addMesh(elbow, new THREE.CapsuleGeometry(0.22, 0.23, 3, 8), materials.mask,
            `dark_forearm_${side}`, [0, -0.60, 0], [1.03, 1, 0.97]);
          const cuff = makePanel([
            [-0.27, 0.10], [-0.18, -0.02], [-0.08, 0.04], [0, -0.08],
            [0.08, 0.04], [0.18, -0.02], [0.27, 0.10], [0.27, 0.20], [-0.27, 0.20]
          ], 0.035, 0);
          addMesh(elbow, cuff, materials.fur, `forearm_tuft_${side}`, [0, -0.48, 0.23]);
          addMesh(handBone, new THREE.IcosahedronGeometry(0.39, 1), materials.mask,
            `fist_${side}`, [0, -0.27, 0.05], [0.95, 1.08, 0.88]);
          const sideKey = side === 'L' ? 'L' : 'R';
          fingerBones[sideKey].forEach((finger, index) => {
            addMesh(finger, new THREE.CapsuleGeometry(0.07, 0.13, 2, 6), materials.mask,
              `finger_${side}_${index + 1}`, [0, -0.08, 0], [1, 1, 0.9]);
          });
        };
        makeArm('L', upperArmL, elbowL, wristL, handL);
        makeArm('R', upperArmR, elbowR, wristR, handR);

        const makeFootprint = (length, backWidth, frontWidth, thickness) => {
          const shape = new THREE.Shape();
          const zBack = -length * 0.45;
          const zFront = length * 0.55;
          shape.moveTo(-backWidth / 2, zBack);
          shape.lineTo(backWidth / 2, zBack);
          shape.quadraticCurveTo(frontWidth * 0.53, -length * 0.12, frontWidth / 2, zFront * 0.72);
          shape.quadraticCurveTo(frontWidth * 0.42, zFront, 0, zFront);
          shape.quadraticCurveTo(-frontWidth * 0.42, zFront, -frontWidth / 2, zFront * 0.72);
          shape.quadraticCurveTo(-frontWidth * 0.53, -length * 0.12, -backWidth / 2, zBack);
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: thickness, bevelEnabled: true, bevelSegments: 1,
            bevelSize: 0.045, bevelThickness: 0.035, curveSegments: 5
          });
          geometry.rotateX(Math.PI / 2);
          geometry.computeVertexNormals();
          return geometry;
        };

        const soleGeometry = makeFootprint(1.48, 0.86, 1.22, 0.18);
        const makeShoe = (side, footBone, toeBone) => {
          addMesh(footBone, soleGeometry, materials.sole, `sole_${side}`, [0, -0.47, 0.31]);
          addMesh(footBone, soleGeometry, materials.shoe, `sole_stripe_${side}`, [0, -0.38, 0.31], [0.98, 0.72, 0.98]);
          addMesh(footBone, new THREE.SphereGeometry(1, 12, 7), materials.shoe, `shoe_upper_${side}`,
            [0, -0.22, 0.27], [0.54, 0.31, 0.72]);
          addMesh(toeBone, new THREE.SphereGeometry(1, 12, 7), materials.sole, `toe_cap_${side}`,
            [0, -0.25, 0.22], [0.53, 0.25, 0.47]);
          addMesh(footBone, new THREE.SphereGeometry(1, 10, 6), materials.shoe, `tongue_${side}`,
            [0, 0.03, 0.34], [0.31, 0.11, 0.44], [-0.34, 0, 0]);
          for (let i = 0; i < 3; i++) {
            const lace = new THREE.CapsuleGeometry(0.028, 0.43 - i * 0.04, 2, 5);
            addMesh(footBone, lace, materials.sole, `lace_${side}_${i + 1}`,
              [0, 0.11 + i * 0.04, 0.18 + i * 0.14], [1, 1, 0.95], [0, 0, Math.PI / 2]);
          }
          for (let i = 0; i < 3; i++) {
            addMesh(footBone, new THREE.BoxGeometry(0.64 - i * 0.08, 0.025, 0.14), materials.shoe,
              `tread_${side}_${i + 1}`, [0, -0.59, -0.13 + i * 0.36]);
          }
        };
        makeShoe('L', footL, toeL);
        makeShoe('R', footR, toeR);

        const headMesh = addMesh(head, new THREE.IcosahedronGeometry(1, 3), materials.fur, 'head_base',
          [0, 1.18, 0], [1.48, 1.24, 1.04]);
        headMesh.geometry.computeVertexNormals();

        const cheekOuterPoints = [
          [-0.31, 0.56], [0.14, 0.54], [0.53, 0.36], [0.35, 0.16],
          [0.68, -0.02], [0.39, -0.17], [0.67, -0.37], [0.19, -0.44],
          [-0.20, -0.28], [-0.42, 0.04]
        ];
        const cheekInnerPoints = [
          [-0.27, 0.43], [0.10, 0.42], [0.43, 0.28], [0.28, 0.10],
          [0.53, -0.04], [0.27, -0.15], [0.50, -0.30], [0.13, -0.34],
          [-0.16, -0.20], [-0.34, 0.03]
        ];
        for (const side of [-1, 1]) {
          const cheekGroup = new THREE.Group();
          cheekGroup.name = `cheek_${side < 0 ? 'L' : 'R'}`;
          cheekGroup.position.set(side * 0.73, 1.02, 0.86);
          cheekGroup.scale.x = side;
          head.add(cheekGroup);
          addMesh(cheekGroup, makePanel(cheekOuterPoints, 0.06, 0.012), materials.furLight, 'cheek_outer');
          addMesh(cheekGroup, makePanel(cheekInnerPoints, 0.065, 0.012), materials.ivory, 'cheek_ivory', [0, -0.01, 0.055]);
        }

        const leftMaskPoints = [
          [-1.03, 0.39], [-0.77, 0.60], [-0.37, 0.57], [-0.08, 0.33],
          [-0.13, -0.05], [-0.38, -0.37], [-0.80, -0.40], [-1.10, -0.19], [-0.92, 0.03]
        ];
        const rightMaskPoints = leftMaskPoints.map(([x, y]) => [-x, y]);
        addMesh(head, makeEllipsoidPatch(leftMaskPoints, 1.48, 1.24, 1.04, 0.035), materials.mask,
          'face_mask_L', [0, 1.18, 0.105]);
        addMesh(head, makeEllipsoidPatch(rightMaskPoints, 1.48, 1.24, 1.04, 0.035), materials.mask,
          'face_mask_R', [0, 1.18, 0.105]);

        const bridgePoints = [[-0.28, 0.50], [0, 0.72], [0.28, 0.50], [0.18, -0.14], [0, -0.32], [-0.18, -0.14]];
        addMesh(head, makeEllipsoidPatch(bridgePoints, 1.48, 1.24, 1.04, 0.052), materials.maskSoft,
          'mask_bridge', [0, 1.18, 0.115]);

        const eyeWhiteGeometry = new THREE.SphereGeometry(1, 14, 9);
        const eyeLMesh = addMesh(eyeL, eyeWhiteGeometry, materials.eye, 'eye_white_L', [0, -0.025, 0], [0.285, 0.385, 0.16]);
        const eyeRMesh = addMesh(eyeR, eyeWhiteGeometry, materials.eye, 'eye_white_R', [0, -0.025, 0], [0.285, 0.385, 0.16]);
        addMesh(pupilL, new THREE.SphereGeometry(1, 12, 8), materials.iris, 'iris_L', [0, 0, 0], [0.135, 0.18, 0.075]);
        addMesh(pupilR, new THREE.SphereGeometry(1, 12, 8), materials.iris, 'iris_R', [0, 0, 0], [0.135, 0.18, 0.075]);
        addMesh(pupilL, new THREE.SphereGeometry(1, 10, 7), materials.pupil, 'pupil_black_L', [0, 0, 0.055], [0.073, 0.105, 0.045]);
        addMesh(pupilR, new THREE.SphereGeometry(1, 10, 7), materials.pupil, 'pupil_black_R', [0, 0, 0.055], [0.073, 0.105, 0.045]);
        addMesh(pupilL, new THREE.SphereGeometry(1, 7, 5), materials.eye, 'eye_glint_L', [-0.032, 0.048, 0.093], [0.025, 0.033, 0.018]);
        addMesh(pupilR, new THREE.SphereGeometry(1, 7, 5), materials.eye, 'eye_glint_R', [-0.032, 0.048, 0.093], [0.025, 0.033, 0.018]);

        const lidGeometry = makePanel([
          [-0.34, 0.10], [0.34, 0.01], [0.31, -0.11], [-0.31, -0.035]
        ], 0.045, 0.006);
        addMesh(head, lidGeometry, materials.mask, 'upper_lid_L', [-0.48, 1.49, 1.205], [1, 1, 1], [0, 0, -0.14]);
        addMesh(head, lidGeometry, materials.mask, 'upper_lid_R', [0.48, 1.49, 1.205], [-1, 1, 1], [0, 0, -0.14]);

        const browGeometry = makePanel([
          [-0.78, 0.03], [-0.68, 0.28], [-0.18, 0.18], [0.10, 0.035],
          [-0.03, -0.10], [-0.49, -0.05]
        ], 0.075, 0.01);
        addMesh(browL, browGeometry, materials.ivory, 'brow_fur_L');
        const browRight = addMesh(browR, browGeometry, materials.ivory, 'brow_fur_R', [0, 0, 0], [-1, 1, 1]);
        browRight.material.side = THREE.DoubleSide;

        addMesh(head, new THREE.IcosahedronGeometry(1, 2), materials.furLight, 'muzzle_bridge',
          [0, 0.80, 1.02], [0.34, 0.31, 0.24]);
        addMesh(head, new THREE.IcosahedronGeometry(1, 2), materials.ivory, 'muzzle_pad_L',
          [-0.27, 0.62, 1.04], [0.43, 0.35, 0.30]);
        addMesh(head, new THREE.IcosahedronGeometry(1, 2), materials.ivory, 'muzzle_pad_R',
          [0.27, 0.62, 1.04], [0.43, 0.35, 0.30]);
        addMesh(jaw, new THREE.IcosahedronGeometry(1, 2), materials.ivory, 'chin',
          [0, -0.15, 0.14], [0.31, 0.20, 0.18]);
        addMesh(head, new THREE.IcosahedronGeometry(1, 2), materials.nose, 'nose',
          [0, 0.78, 1.34], [0.29, 0.21, 0.20]);
        addMesh(head, new THREE.SphereGeometry(1, 7, 5), materials.eye, 'nose_glint',
          [-0.09, 0.86, 1.50], [0.048, 0.028, 0.018]);
        addMesh(jaw, makeCurve([[0, 0.18, 0.35], [0, 0.03, 0.39], [0, -0.08, 0.34]], 0.018, 3),
          materials.mouth, 'mouth_center');
        addMesh(jaw, makeCurve([[0, -0.06, 0.34], [-0.16, -0.15, 0.33], [-0.34, -0.06, 0.27]], 0.018, 3),
          materials.mouth, 'mouth_L');
        addMesh(jaw, makeCurve([[0, -0.06, 0.34], [0.16, -0.15, 0.33], [0.34, -0.06, 0.27]], 0.018, 3),
          materials.mouth, 'mouth_R');

        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const y = 0.66 - i * 0.10;
            const points = side < 0
              ? [[-0.34, y, 1.25], [-0.76, y + 0.06 - i * 0.01, 1.34], [-1.26, y + 0.10 - i * 0.07, 1.24]]
              : [[0.34, y, 1.25], [0.76, y + 0.06 - i * 0.01, 1.34], [1.26, y + 0.10 - i * 0.07, 1.24]];
            addMesh(head, makeCurve(points, 0.012, 3), materials.whisker,
              `whisker_${side < 0 ? 'L' : 'R'}_${i + 1}`);
          }
        }

        const earOuter = makePanel([[-0.42, -0.35], [-0.28, 0.30], [0, 0.68], [0.36, -0.28], [0, -0.48]], 0.12, 0.015);
        const earInner = makePanel([[-0.27, -0.25], [-0.17, 0.20], [0, 0.46], [0.22, -0.20], [0, -0.34]], 0.07, 0.012);
        addMesh(earL, earOuter, materials.fur, 'ear_outer_L', [0, -0.04, 0], [0.84, 0.84, 0.84], [0.05, 0.10, -0.16]);
        addMesh(earL, earInner, materials.ivory, 'ear_inner_L', [0, -0.03, 0.13], [0.66, 0.66, 0.66], [0.05, 0.10, -0.16]);
        addMesh(earR, earOuter, materials.fur, 'ear_outer_R', [0, -0.04, 0], [-0.84, 0.84, 0.84], [0.05, -0.10, -0.16]);
        addMesh(earR, earInner, materials.ivory, 'ear_inner_R', [0, -0.03, 0.13], [-0.66, 0.66, 0.66], [0.05, -0.10, -0.16]);

        addMesh(capBone, new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.cap,
          'cap_crown', [0, 1.72, -0.04], [1.34, 1.10, 1.17]);
        addMesh(capBone, makeBrimGeometry(), materials.cap, 'cap_brim', [0, 1.58, 0.24]);
        addMesh(capBone, new THREE.CylinderGeometry(0.11, 0.12, 0.09, 10), materials.capSeam,
          'cap_button', [0, 2.86, -0.04]);
        for (const x of [-0.82, 0.82]) {
          addMesh(capBone, new THREE.TorusGeometry(0.31, 0.035, 4, 14), materials.capSeam,
            `ear_hole_rim_${x < 0 ? 'L' : 'R'}`, [x, 2.0, 0.05], [0.72, 1.12, 1], [0, 0, 0]);
        }
        const seamCurves = [
          [[0, 2.82, -0.03], [-0.72, 2.38, 0.48], [-1.08, 1.80, 0.20]],
          [[0, 2.82, -0.03], [0.72, 2.38, 0.48], [1.08, 1.80, 0.20]],
          [[0, 2.82, -0.05], [0, 2.35, 1.00], [0, 1.78, 1.20]]
        ];
        seamCurves.forEach((curve, i) => addMesh(capBone, makeCurve(curve, 0.013, 3), materials.capSeam, `cap_seam_${i + 1}`));
        addMesh(capBone, new THREE.BoxGeometry(0.76, 0.20, 0.06), materials.capSeam,
          'cap_rear_strap', [0, 1.73, -1.15]);
        addMesh(capBone, new THREE.BoxGeometry(0.14, 0.28, 0.09), materials.cap,
          'cap_rear_clasp', [0.35, 1.73, -1.18]);

        modelRoot.updateMatrixWorld(true);
        for (const skinned of [torso, pantsL, pantsR, tailMesh]) {
          skinned.bind(skinned.userData.pendingSkeleton);
          delete skinned.userData.pendingSkeleton;
        }

        const rest = {};
        Object.entries(bones).forEach(([name, value]) => {
          rest[name] = {
            position: value.position.clone(),
            quaternion: value.quaternion.clone(),
            scale: value.scale.clone()
          };
        });

        const allBones = Object.values(bones);
        const skeleton = new THREE.Skeleton(allBones);
        const pose = {};
        allBones.forEach((value) => { pose[value.name] = { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0 }; });

        return {
          actorRoot, motionRoot, modelRoot, bones, sockets, rest, pose, skeleton, materials,
          skins: { torso, pantsL, pantsR, tail: tailMesh },
          eyes: { left: eyeLMesh, right: eyeRMesh, leftBone: eyeL, rightBone: eyeR },
          pupils: { left: pupilL, right: pupilR },
          tailBones,
          tailSpring: tailBones.map(() => ({ angle: 0, velocity: 0 })),
          bindHeight: 7.98,
          state: 'IDLE'
        };
      }

      _initInput() {
        const movementCodes = new Set([
          'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
          'ShiftLeft', 'ShiftRight'
        ]);
        const actionCodes = new Set(['Space', 'KeyP', 'KeyK', 'KeyR']);
        const isEditable = (target) => target && (
          /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName) || target.isContentEditable
        );

        const focusGame = () => {
          this.focused = true;
          try { this.canvas.focus({ preventScroll: true }); } catch (_) { this.canvas.focus(); }
        };
        this._on(this.stage, 'pointerdown', focusGame, { passive: true });
        this._on(this.host, 'focusin', () => { this.focused = true; });
        this._on(this.host, 'focusout', () => {
          queueMicrotask(() => {
            if (!this.host.matches(':focus-within')) {
              this.focused = false;
              this.keys.clear();
            }
          });
        });

        this._on(globalThis, 'keydown', (event) => {
          if (!this.focused || isEditable(event.target)) return;
          if (!movementCodes.has(event.code) && !actionCodes.has(event.code)) return;
          event.preventDefault();
          if (movementCodes.has(event.code)) this.keys.add(event.code);
          if (event.repeat) return;
          if (event.code === 'Space') this._requestAction('jump');
          else if (event.code === 'KeyP') this._requestAction('punch');
          else if (event.code === 'KeyK') this._requestAction('kick');
          else if (event.code === 'KeyR') this._resetActor();
        }, { passive: false });

        this._on(globalThis, 'keyup', (event) => {
          if (movementCodes.has(event.code)) this.keys.delete(event.code);
        });
        this._on(globalThis, 'blur', () => this.keys.clear());

        const orbitStart = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          if (event.target.closest?.('.tn-stick,.tn-action')) return;
          this.pointerOrbit = {
            id: event.pointerId, x: event.clientX, y: event.clientY,
            yaw: this.cameraOrbit.yaw, pitch: this.cameraOrbit.pitch
          };
          this.canvas.setPointerCapture?.(event.pointerId);
        };
        const orbitMove = (event) => {
          if (!this.pointerOrbit || this.pointerOrbit.id !== event.pointerId) return;
          const dx = event.clientX - this.pointerOrbit.x;
          const dy = event.clientY - this.pointerOrbit.y;
          this.cameraOrbit.yaw = this.pointerOrbit.yaw - dx * 0.0062;
          this.cameraOrbit.pitch = THREE.MathUtils.clamp(this.pointerOrbit.pitch + dy * 0.0045, -0.18, 0.62);
        };
        const orbitEnd = (event) => {
          if (this.pointerOrbit?.id !== event.pointerId) return;
          this.pointerOrbit = null;
          try { this.canvas.releasePointerCapture?.(event.pointerId); } catch (_) {}
        };
        const THREE = this.THREE;
        this._on(this.canvas, 'pointerdown', orbitStart);
        this._on(this.canvas, 'pointermove', orbitMove);
        this._on(this.canvas, 'pointerup', orbitEnd);
        this._on(this.canvas, 'pointercancel', orbitEnd);
        this._on(this.canvas, 'wheel', (event) => {
          if (!this.focused) return;
          event.preventDefault();
          this.cameraOrbit.distance = THREE.MathUtils.clamp(
            this.cameraOrbit.distance + Math.sign(event.deltaY) * 0.7, 10.2, 20
          );
        }, { passive: false });

        const stick = this.touchLayer.querySelector('.tn-stick');
        const knob = this.touchLayer.querySelector('.tn-knob');
        const updateStick = (event) => {
          if (!this.pointerJoystick || this.pointerJoystick.id !== event.pointerId) return;
          const rect = stick.getBoundingClientRect();
          let dx = event.clientX - (rect.left + rect.width / 2);
          let dy = event.clientY - (rect.top + rect.height / 2);
          const max = rect.width * 0.34;
          const length = Math.hypot(dx, dy);
          if (length > max) { dx *= max / length; dy *= max / length; }
          knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.touchInput.set(dx / max, -dy / max);
        };
        const endStick = (event) => {
          if (this.pointerJoystick?.id !== event.pointerId) return;
          try { stick.releasePointerCapture?.(event.pointerId); } catch (_) {}
          this.pointerJoystick = null;
          this.touchInput.set(0, 0);
          knob.style.transform = 'translate(0,0)';
        };
        this._on(stick, 'pointerdown', (event) => {
          event.preventDefault();
          focusGame();
          this.pointerJoystick = { id: event.pointerId };
          stick.setPointerCapture?.(event.pointerId);
          updateStick(event);
        });
        this._on(stick, 'pointermove', updateStick);
        this._on(stick, 'pointerup', endStick);
        this._on(stick, 'pointercancel', endStick);
        this._on(stick, 'lostpointercapture', endStick);

        this.touchLayer.querySelectorAll('[data-action]').forEach((button) => {
          this._on(button, 'pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            focusGame();
            this._requestAction(button.dataset.action);
          });
        });

        this._on(this.canvas, 'webglcontextlost', (event) => {
          event.preventDefault();
          this.pause('context-lost');
          this._showStatus('WebGL context lost. Waiting for recovery…');
        });
        this._on(this.canvas, 'webglcontextrestored', () => {
          this._showStatus('');
          this.resume('context-lost');
        });
      }

      _initObservers() {
        this.resizeObserver = typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => this._resize()) : null;
        this.resizeObserver?.observe(this.host);
        if (!this.resizeObserver) this._on(globalThis, 'resize', () => this._resize());
        if (globalThis.visualViewport) this._on(globalThis.visualViewport, 'resize', () => this._resize());

        this.intersectionObserver = typeof IntersectionObserver !== 'undefined'
          ? new IntersectionObserver((entries) => {
              const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.01);
              if (visible) this.resume('offscreen');
              else this.pause('offscreen');
            }, { threshold: [0, 0.01] }) : null;
        this.intersectionObserver?.observe(this.host);

        this._on(document, 'visibilitychange', () => {
          this.keys.clear();
          if (document.hidden) this.pause('hidden');
          else this.resume('hidden');
        });
        this._on(globalThis, 'pagehide', (event) => {
          if (event.persisted) this.pause('bfcache');
          else this.pause('pagehide');
        });
        this._on(globalThis, 'pageshow', () => {
          this.resume('bfcache');
          this.resume('pagehide');
        });
      }

      _resize() {
        if (this.destroyed || !this.renderer) return;
        const rect = this.host.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        if (width < 2 || height < 2) return;
        const dprCap = this.options.quality === 'low' ? 1.15 : 1.75;
        const maxPixels = this.options.quality === 'low' ? 1_450_000 : 2_700_000;
        const dpr = Math.min(globalThis.devicePixelRatio || 1, dprCap, Math.sqrt(maxPixels / (width * height)));
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(Math.max(1, Math.floor(width * dpr)), Math.max(1, Math.floor(height * dpr)), false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      _requestAction(type) {
        if (type === 'jump') {
          this.jumpBuffer = 0.12;
          return;
        }
        if (this.action) return;
        if (type === 'punch') {
          this.action = { type: 'punch', side: this.nextPunchSide };
          this.nextPunchSide *= -1;
          this.actionTime = 0;
        } else if (type === 'kick') {
          this.action = { type: 'kick', side: 1 };
          this.actionTime = 0;
        }
      }

      _resetActor() {
        if (!this.character) return;
        this.character.actorRoot.position.set(0, 0, 0);
        this.character.motionRoot.position.set(0, 0, 0);
        this.worldVelocity.set(0, 0, 0);
        this.verticalVelocity = 0;
        this.actorYaw = 0;
        this.character.actorRoot.rotation.y = 0;
        this.action = null;
        this.actionTime = 0;
        this.grounded = true;
      }

      _fixedUpdate(dt) {
        const THREE = this.THREE;
        const character = this.character;
        if (!character) return;
        this.elapsed += dt;
        this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

        const keyX = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
          (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
        const keyY = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
          (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        this.input.set(keyX + this.touchInput.x, keyY + this.touchInput.y);
        if (this.input.lengthSq() > 1) this.input.normalize();

        const forward = new THREE.Vector3(-Math.sin(this.cameraOrbit.yaw), 0, -Math.cos(this.cameraOrbit.yaw));
        const right = new THREE.Vector3(Math.cos(this.cameraOrbit.yaw), 0, -Math.sin(this.cameraOrbit.yaw));
        this.moveDirection.copy(forward).multiplyScalar(this.input.y).addScaledVector(right, this.input.x);
        if (this.moveDirection.lengthSq() > 1) this.moveDirection.normalize();

        const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        const moveAmount = THREE.MathUtils.clamp(this.moveDirection.length(), 0, 1);
        const baseSpeed = running ? 3.9 : 2.35;
        let actionMovement = 1;
        if (this.action?.type === 'kick') actionMovement = 0.22;
        else if (this.action?.type === 'punch') actionMovement = 0.58;
        const desired = this.moveDirection.clone().multiplyScalar(baseSpeed * actionMovement);
        const accel = 1 - Math.exp(-(this.grounded ? 12 : 4.2) * dt);
        this.worldVelocity.lerp(desired, accel);
        if (moveAmount < 0.02) this.worldVelocity.multiplyScalar(Math.exp(-8.5 * dt));

        const beforeX = character.actorRoot.position.x;
        const beforeZ = character.actorRoot.position.z;
        character.actorRoot.position.x += this.worldVelocity.x * dt;
        character.actorRoot.position.z += this.worldVelocity.z * dt;
        const radial = Math.hypot(character.actorRoot.position.x, character.actorRoot.position.z);
        if (radial > 8.2) {
          character.actorRoot.position.x *= 8.2 / radial;
          character.actorRoot.position.z *= 8.2 / radial;
        }
        const travelled = Math.hypot(
          character.actorRoot.position.x - beforeX,
          character.actorRoot.position.z - beforeZ
        );
        const stride = running ? 2.45 : 1.75;
        this.distancePhase = (this.distancePhase + travelled / stride * Math.PI * 2) % (Math.PI * 2);

        if (this.moveDirection.lengthSq() > 0.01) {
          const targetYaw = Math.atan2(this.moveDirection.x, this.moveDirection.z);
          let delta = ((targetYaw - this.actorYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
          if (delta < -Math.PI) delta += Math.PI * 2;
          this.actorYaw += delta * (1 - Math.exp(-12 * dt));
          character.actorRoot.rotation.y = this.actorYaw;
        }

        if (this.grounded) this.coyote = 0.1;
        else this.coyote = Math.max(0, this.coyote - dt);
        if (this.jumpBuffer > 0 && this.coyote > 0) {
          this.verticalVelocity = 7.25;
          this.grounded = false;
          this.coyote = 0;
          this.jumpBuffer = 0;
        }
        if (!this.grounded) {
          this.verticalVelocity -= 18.5 * dt;
          character.motionRoot.position.y += this.verticalVelocity * dt;
          if (character.motionRoot.position.y <= 0) {
            character.motionRoot.position.y = 0;
            this.verticalVelocity = 0;
            this.grounded = true;
          }
        }

        if (this.action) {
          this.actionTime += dt;
          const duration = this.action.type === 'punch' ? 0.56 : 0.72;
          if (this.actionTime >= duration) {
            this.action = null;
            this.actionTime = 0;
          }
        }

        this._updatePose(dt, travelled, running, moveAmount);
      }

      _updatePose(dt, travelled, running, moveAmount) {
        const THREE = this.THREE;
        const c = this.character;
        const pose = c.pose;
        Object.values(pose).forEach((p) => { p.x = p.y = p.z = p.px = p.py = p.pz = 0; });
        const add = (name, x = 0, y = 0, z = 0, px = 0, py = 0, pz = 0) => {
          const p = pose[name];
          if (!p) return;
          p.x += x; p.y += y; p.z += z; p.px += px; p.py += py; p.pz += pz;
        };
        const smooth = (t) => t * t * (3 - 2 * t);
        const windowCurve = (t, a, b, cEnd) => {
          if (t <= a || t >= cEnd) return 0;
          if (t < b) return smooth((t - a) / (b - a));
          return 1 - smooth((t - b) / (cEnd - b));
        };

        const idle = this.elapsed * Math.PI * 2 / 3.2;
        add('upperArm_L', 0.015 * Math.sin(idle), 0, -0.14);
        add('upperArm_R', -0.015 * Math.sin(idle), 0, 0.14);
        add('elbow_L', 0.08, 0, -0.03);
        add('elbow_R', 0.08, 0, 0.03);
        add('chest', 0.026 * Math.sin(idle), 0.018 * Math.sin(idle * 0.5), 0);
        add('head', -0.018 * Math.sin(idle), -0.012 * Math.sin(idle * 0.5), 0);
        add('pelvis', 0, 0, 0, 0, 0.025 * (0.5 + 0.5 * Math.sin(idle)), 0);

        const currentSpeed = this.worldVelocity.length();
        const locomotionWeight = THREE.MathUtils.smoothstep(currentSpeed, 0.10, 0.55);
        if (locomotionWeight > 0.001 && this.grounded) {
          const phase = this.distancePhase;
          const swing = Math.sin(phase);
          const swingOpp = -swing;
          const amp = (running ? 0.70 : 0.45) * locomotionWeight;
          const armAmp = (running ? 0.64 : 0.38) * locomotionWeight;
          add('hip_L', swing * amp);
          add('hip_R', swingOpp * amp);
          add('knee_L', Math.max(0, -swing) * (running ? 1.05 : 0.72) * locomotionWeight);
          add('knee_R', Math.max(0, swing) * (running ? 1.05 : 0.72) * locomotionWeight);
          add('ankle_L', -0.13 * Math.sin(phase + 0.55) * locomotionWeight);
          add('ankle_R', -0.13 * Math.sin(phase + Math.PI + 0.55) * locomotionWeight);
          add('upperArm_L', swingOpp * armAmp);
          add('upperArm_R', swing * armAmp);
          add('elbow_L', Math.max(0, swing) * 0.25 * locomotionWeight);
          add('elbow_R', Math.max(0, -swing) * 0.25 * locomotionWeight);
          add('pelvis', 0, 0, Math.sin(phase * 2) * 0.055 * locomotionWeight,
            0, Math.abs(Math.sin(phase)) * (running ? 0.10 : 0.055) * locomotionWeight, 0);
          add('chest', running ? -0.12 : -0.035, 0, -Math.sin(phase) * 0.045 * locomotionWeight);
          add('head', running ? 0.05 : 0.015, 0, Math.sin(phase) * 0.028 * locomotionWeight);
        }

        if (!this.grounded) {
          const rising = this.verticalVelocity > 0;
          add('hip_L', -0.18);
          add('hip_R', -0.18);
          add('knee_L', rising ? 0.62 : 0.38);
          add('knee_R', rising ? 0.48 : 0.64);
          add('ankle_L', -0.20);
          add('ankle_R', -0.20);
          add('upperArm_L', 0.32, 0, -0.17);
          add('upperArm_R', 0.32, 0, 0.17);
          add('chest', rising ? -0.08 : 0.06);
          add('head', rising ? 0.04 : -0.04);
        }

        if (this.action?.type === 'punch') {
          const t = THREE.MathUtils.clamp(this.actionTime / 0.56, 0, 1);
          const wind = windowCurve(t, 0, 0.18, 0.35);
          const strike = windowCurve(t, 0.19, 0.42, 0.70);
          const side = this.action.side;
          const arm = side > 0 ? 'R' : 'L';
          const other = side > 0 ? 'L' : 'R';
          add(`upperArm_${arm}`, wind * 0.48 - strike * 1.55, side * strike * 0.10, side * 0.10);
          add(`elbow_${arm}`, wind * 1.35 - strike * 0.14);
          add(`wrist_${arm}`, -wind * 0.28 + strike * 0.12);
          add(`upperArm_${other}`, -0.62 * (wind + strike * 0.45), 0, side > 0 ? -0.12 : 0.12);
          add(`elbow_${other}`, 0.82 * (wind + strike * 0.4));
          add('chest', -0.08 * strike, side * -0.34 * strike, side * -0.04 * strike);
          add('head', 0, side * 0.10 * strike, side * 0.035 * strike);
          add('jaw', 0.05 * strike);
        } else if (this.action?.type === 'kick') {
          const t = THREE.MathUtils.clamp(this.actionTime / 0.72, 0, 1);
          const chamber = windowCurve(t, 0.05, 0.28, 0.55);
          const extend = windowCurve(t, 0.30, 0.46, 0.72);
          add('hip_R', -0.72 * chamber - 1.28 * extend, 0.12 * extend, 0.04 * extend);
          add('knee_R', 1.42 * chamber + 0.14 * extend);
          add('ankle_R', -0.26 * chamber + 0.16 * extend);
          add('pelvis', 0, -0.18 * extend, -0.08 * extend, -0.10, 0.05 * chamber, 0);
          add('hip_L', 0.09 * extend, 0, -0.07 * extend);
          add('chest', 0.15 * (chamber + extend), -0.20 * extend, 0.08 * extend);
          add('upperArm_L', 0.36 * (chamber + extend));
          add('upperArm_R', -0.35 * (chamber + extend));
        }

        add('tail_00', 0.56, 0, 0.14);
        add('tail_01', 0.10, 0, 0);
        add('tail_02', 0.11, 0, 0);
        add('tail_03', 0.14, 0, 0);
        add('tail_04', 0.17, 0, 0);
        add('tail_05', 0.20, 0, 0);
        const tailAmplitude = this.grounded ? THREE.MathUtils.lerp(0.08, running ? 0.30 : 0.20, locomotionWeight) : 0.24;
        c.tailSpring.forEach((spring, index) => {
          const target = tailAmplitude * (0.45 + index * 0.12) *
            Math.sin(this.distancePhase + Math.PI / 2 - index * 0.32 + this.elapsed * (locomotionWeight < 0.1 ? 1.15 : 0));
          const stiffness = 31 - index * 2;
          const damping = 8.2 - index * 0.35;
          spring.velocity += (stiffness * (target - spring.angle) - damping * spring.velocity) * dt;
          spring.angle += spring.velocity * dt;
          add(`tail_${String(index).padStart(2, '0')}`, 0, 0, spring.angle);
        });

        add('ear_L', 0, 0, -0.035 - 0.025 * Math.sin(this.elapsed * 1.7));
        add('ear_R', 0, 0, 0.035 + 0.025 * Math.sin(this.elapsed * 1.7 + 0.7));
        const lookX = THREE.MathUtils.clamp(this.input.x * 0.055 + Math.sin(this.elapsed * 0.47) * 0.012, -0.07, 0.07);
        const lookY = THREE.MathUtils.clamp(this.input.y * 0.025, -0.035, 0.035);
        add('pupil_L', 0, 0, 0, lookX, lookY, 0);
        add('pupil_R', 0, 0, 0, lookX, lookY, 0);

        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0 && this.blinkPhase < 0) this.blinkPhase = 0;
        let blinkScale = 1;
        if (this.blinkPhase >= 0) {
          this.blinkPhase += dt / 0.19;
          blinkScale = Math.max(0.08, 1 - Math.sin(Math.min(1, this.blinkPhase) * Math.PI) * 0.93);
          if (this.blinkPhase >= 1) {
            this.blinkPhase = -1;
            this.blinkTimer = 2.4 + Math.random() * 2.8;
          }
        }

        this._animEuler ||= new THREE.Euler(0, 0, 0, 'XYZ');
        this._animDeltaQuat ||= new THREE.Quaternion();
        this._animTargetQuat ||= new THREE.Quaternion();
        this._animTargetPos ||= new THREE.Vector3();
        this._animPositionOffset ||= new THREE.Vector3();
        const rotationAlpha = 1 - Math.exp(-18 * dt);
        const positionAlpha = 1 - Math.exp(-20 * dt);
        Object.entries(c.bones).forEach(([name, value]) => {
          const base = c.rest[name];
          const p = pose[name];
          this._animEuler.set(p.x, p.y, p.z);
          this._animDeltaQuat.setFromEuler(this._animEuler);
          this._animTargetQuat.copy(base.quaternion).multiply(this._animDeltaQuat);
          value.quaternion.slerp(this._animTargetQuat, rotationAlpha);
          this._animPositionOffset.set(p.px, p.py, p.pz);
          this._animTargetPos.copy(base.position).add(this._animPositionOffset);
          value.position.lerp(this._animTargetPos, positionAlpha);
        });
        c.bones.eye_L.scale.set(1, blinkScale, 1);
        c.bones.eye_R.scale.set(1, blinkScale, 1);

        const moving = currentSpeed > 0.16;
        c.state = !this.grounded ? 'AIRBORNE' : this.action ? this.action.type.toUpperCase() :
          moving ? (running ? 'RUN' : 'WALK') : 'IDLE';
        this.stateLabel.textContent = c.state;
      }

      _render(dt) {
        if (!this.character || !this.renderer) return;
        const THREE = this.THREE;
        const actor = this.character.actorRoot;
        const jumpY = this.character.motionRoot.position.y;
        this._desiredCameraTarget ||= new THREE.Vector3();
        this._desiredCameraTarget.set(actor.position.x, 4.15 + jumpY * 0.68, actor.position.z);
        this.cameraTarget.lerp(this._desiredCameraTarget, 1 - Math.exp(-5.5 * Math.min(dt, 0.05)));
        const horizontal = Math.cos(this.cameraOrbit.pitch) * this.cameraOrbit.distance;
        const y = Math.sin(this.cameraOrbit.pitch) * this.cameraOrbit.distance;
        this.camera.position.set(
          this.cameraTarget.x + Math.sin(this.cameraOrbit.yaw) * horizontal,
          this.cameraTarget.y + y,
          this.cameraTarget.z + Math.cos(this.cameraOrbit.yaw) * horizontal
        );
        this.camera.lookAt(this.cameraTarget);
        this.renderer.render(this.scene, this.camera);
      }

      _showStatus(message) {
        this.statusLayer.textContent = message || '';
        this.statusLayer.style.display = message ? 'grid' : 'none';
      }

      pause(reason = 'manual') {
        this.pauseReasons.add(reason);
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.clock.stop();
      }

      resume(reason = 'manual') {
        this.pauseReasons.delete(reason);
        this.pauseReasons.delete('initial');
        if (this.destroyed || this.pauseReasons.size || this.raf) return;
        this.clock.start();
        const loop = () => {
          if (this.destroyed || this.pauseReasons.size) { this.raf = 0; return; }
          this.raf = requestAnimationFrame(loop);
          const dt = Math.min(this.clock.getDelta(), 0.1);
          this.accumulator = Math.min(this.accumulator + dt, this.fixedStep * this.maxSubsteps);
          let steps = 0;
          while (this.accumulator >= this.fixedStep && steps < this.maxSubsteps) {
            this._fixedUpdate(this.fixedStep);
            this.accumulator -= this.fixedStep;
            steps++;
          }
          this._render(dt);
        };
        this.raf = requestAnimationFrame(loop);
      }

      destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.pause('destroyed');
        this.cleanups.splice(0).forEach((fn) => { try { fn(); } catch (_) {} });
        this.resizeObserver?.disconnect();
        this.intersectionObserver?.disconnect();
        const geometries = new Set();
        const materials = new Set();
        this.scene?.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
          if (Array.isArray(object.material)) object.material.forEach((m) => materials.add(m));
          else if (object.material) materials.add(object.material);
        });
        geometries.forEach((geometry) => geometry.dispose?.());
        materials.forEach((material) => material.dispose?.());
        this.renderer?.renderLists?.dispose?.();
        this.renderer?.dispose?.();
        this.renderer?.forceContextLoss?.();
        this.shadow.textContent = '';
        delete this.host.dataset.tnRaccoonMounted;
        lifecycle.instances.delete(this.host);
      }
    }

    const api = {
      build: BUILD,
      THREE_REVISION: THREE.REVISION,
      instances: lifecycle.instances,
      mount(host, options = {}) {
        if (typeof host === 'string') host = document.querySelector(host);
        if (!host) host = findOrCreateHost();
        if (!host) return null;
        const existing = lifecycle.instances.get(host);
        if (existing && !existing.destroyed) return existing;
        try {
          const game = new TrashRaccoonGame(host, options);
          lifecycle.instances.set(host, game);
          return game;
        } catch (error) {
          showOuterFallback(host, `Trash Network could not start: ${error.message}`);
          host.dispatchEvent(new CustomEvent('tn-raccoon-error', { detail: { error } }));
          throw error;
        }
      },
      pause() { lifecycle.instances.forEach((game) => game.pause('api')); },
      resume() { lifecycle.instances.forEach((game) => game.resume('api')); },
      destroy() { lifecycle.instances.forEach((game) => game.destroy()); },
      TrashRaccoonGame
    };
    api.ready = Promise.resolve(api);
    return api;
  }

  lifecycle.autoMount = async () => {
    await whenDOMReady();
    const host = findOrCreateHost();
    if (!host) return null;
    try {
      const api = lifecycle.api || await lifecycle.ready;
      return api.mount(host, { quality: tagData.quality || 'high' });
    } catch (error) {
      showOuterFallback(host, 'Não foi possível carregar o personagem 3D. Verifica WebGL 2, CORS e a política CSP da página.');
      console.error('[Trash Network raccoon]', error);
      return null;
    }
  };

  lifecycle.ready = loadThree().then((THREE) => {
    lifecycle.api = createAPI(THREE);
    lifecycle.state = 'ready';
    globalThis.TrashNetworkRaccoon = lifecycle.api;
    return lifecycle.api;
  }).catch((error) => {
    lifecycle.state = 'error';
    throw error;
  });

  globalThis.TrashNetworkRaccoonReady = lifecycle.ready;
  lifecycle.ready.catch(() => {});
  if (tagData.auto !== 'false') lifecycle.autoMount();
})();
