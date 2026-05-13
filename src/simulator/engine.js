import * as THREE from 'three';
import { InputManager } from './input.js';
import { AircraftPhysics } from './physics.js';
import { TerrainManager } from './terrain.js';
import { Environment } from './environment.js';
import { Aircraft } from './aircraft.js';
import { WeaponSystem, setTerrainHeightFn } from './weapons.js';
import { TargetManager } from './targets.js';
import { Cockpit } from './cockpit.js';
import { HUD } from './hud.js';

// Aircraft configs
import { Cessna172Config } from './aircraft/cessna172.js';
import { CirrusVisionJetConfig } from './aircraft/cirrusVisionJet.js';
import { GulfstreamG650Config } from './aircraft/gulfstreamG650.js';
import { B52Config } from './aircraft/b52.js';
import { RobinsonR44Config } from './aircraft/robinsonR44.js';
import { F35Config } from './aircraft/f35.js';
import { AH64Config } from './aircraft/ah64.js';

const AIRCRAFT_CONFIGS = {
  cessna172: Cessna172Config,
  cirrusVisionJet: CirrusVisionJetConfig,
  gulfstreamG650: GulfstreamG650Config,
  b52: B52Config,
  robinsonR44: RobinsonR44Config,
  f35: F35Config,
  ah64: AH64Config,
};

const AIRCRAFT_KEYS = Object.keys(AIRCRAFT_CONFIGS);

const FIXED_DT = 1 / 60;
const MAX_DT = 0.1;
const MAX_PHYSICS_STEPS = 3;

export class SimEngine {
  constructor(canvas, hudContainer, initialAircraft = 'cessna172') {
    this._canvas = canvas;
    this._hudContainer = hudContainer;
    this._running = false;
    this._accumulator = 0;
    this._lastTime = 0;
    this._rafId = null;
    this._frameCount = 0;

    this._currentAircraftKey = initialAircraft;
    this._viewMode = 'cockpit'; // 'cockpit' | 'external'

    // Parachute state (Cirrus)
    this._parachuteDeployed = false;

    // B52 bomb bay
    this._bombBayOpen = false;
    this._bombBayAngle = 0;

    this._setupRenderer();
    this._setupScene();
    this._setupSystems();
    this._spawnAircraft(initialAircraft);
  }

  _setupRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;

    this._handleResize = () => {
      const w = this._canvas.clientWidth;
      const h = this._canvas.clientHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
    };
    window.addEventListener('resize', this._handleResize);
  }

  _setupScene() {
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(
      75,
      this._canvas.clientWidth / this._canvas.clientHeight,
      0.5,
      80000
    );
    this._camera.position.set(0, 500, 0);
  }

  _setupSystems() {
    this._input = new InputManager();
    this._input.requestPointerLock(this._canvas);

    this._physics = new AircraftPhysics();

    this._terrain = new TerrainManager(this._scene);
    this._environment = new Environment(this._scene);

    this._targetManager = new TargetManager(this._scene);
    // Wire up terrain height to targets and weapons
    this._targetManager.setTerrainHeight((x, z) => this._terrain.getHeightAt(x, z));
    setTerrainHeightFn((x, z) => this._terrain.getHeightAt(x, z));
    this._hud = new HUD(this._hudContainer);
  }

  _spawnAircraft(key) {
    // Remove old aircraft mesh
    if (this._aircraft) {
      this._scene.remove(this._aircraft.mesh);
    }
    if (this._cockpit) {
      this._cockpit.dispose(this._scene);
    }
    if (this._weaponSystem) {
      this._weaponSystem.dispose();
    }

    const config = AIRCRAFT_CONFIGS[key];
    if (!config) return;

    this._currentAircraftKey = key;
    const pos = this._physics.position.clone();
    const heading = this._physics.rotation.y;

    // Reset physics with safe altitude
    const terrainH = this._terrain.getHeightAt(pos.x, pos.z);
    const safeAlt = Math.max(terrainH + 300, 500);
    this._physics.reset(new THREE.Vector3(pos.x, safeAlt, pos.z), heading);

    // Create aircraft
    this._aircraft = new Aircraft(config);
    this._aircraft.createMesh();
    this._scene.add(this._aircraft.mesh);

    // Weapons
    this._weaponSystem = new WeaponSystem(this._aircraft, this._scene, this._targetManager);

    // Cockpit
    this._cockpit = new Cockpit(this._scene, this._camera, config);
    this._cockpit.build();

    // HUD: let it know about the aircraft
    this._hud.setAircraft(config);
  }

  start() {
    this._running = true;
    this._lastTime = performance.now();
    this._loop();
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._handleResize);
    if (this._cockpit) this._cockpit.dispose(this._scene);
    this._hud.dispose();
  }

  _loop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame((t) => this._loop(t));

    const now = performance.now();
    let rawDt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    rawDt = Math.min(rawDt, MAX_DT);

    // Input update
    this._input.update();
    this._handleSpecialKeys();

    // Fixed timestep physics
    this._accumulator += rawDt;
    let steps = 0;
    while (this._accumulator >= FIXED_DT && steps < MAX_PHYSICS_STEPS) {
      this._physicsStep(FIXED_DT);
      this._accumulator -= FIXED_DT;
      steps++;
    }

    // Update systems
    this._terrain.update(this._physics.position);
    this._environment.update(rawDt);
    this._targetManager.update(rawDt, this._physics.position);
    this._weaponSystem.update(rawDt, this._physics.position);

    // Update camera
    this._updateCamera();

    // Update aircraft mesh
    this._aircraft.mesh.position.copy(this._physics.position);
    this._aircraft.mesh.rotation.copy(this._physics.rotation);
    this._aircraft.updateMeshAnimations(this._physics, rawDt);

    // Bomb bay door animation
    if (this._currentAircraftKey === 'b52') {
      const targetAngle = this._bombBayOpen ? Math.PI / 2 : 0;
      this._bombBayAngle += (targetAngle - this._bombBayAngle) * rawDt * 2;
      this._aircraft.setBombBayAngle && this._aircraft.setBombBayAngle(this._bombBayAngle);
    }

    // Cockpit update (30Hz)
    if (this._frameCount % 2 === 0) {
      this._cockpit.update(this._physics);
    }

    // HUD update
    this._hud.update(this._physics, this._weaponSystem, this._environment);

    // Render
    this._renderer.render(this._scene, this._camera);
    this._frameCount++;
  }

  _physicsStep(dt) {
    const axes = this._input.getAxes();
    this._physics.setAxes(axes);

    const terrainH = this._terrain.getHeightAt(
      this._physics.position.x,
      this._physics.position.z
    );
    const config = AIRCRAFT_CONFIGS[this._currentAircraftKey];

    this._physics.update(dt, config, this._environment, terrainH);

    // Weapon firing
    if (this._input.isPressed('Space')) {
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(this._physics.rotation);
      this._weaponSystem.fire(
        this._physics.position.clone(),
        forward,
        this._targetManager.getTargets()
      );
    }
  }

  _handleSpecialKeys() {
    const input = this._input;

    // Aircraft switch (keys 1-7)
    const numKeys = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7'];
    for (let i = 0; i < numKeys.length; i++) {
      if (input.wasJustPressed(numKeys[i])) {
        const key = AIRCRAFT_KEYS[i];
        if (key && key !== this._currentAircraftKey) {
          this._spawnAircraft(key);
        }
      }
    }

    // Gear toggle
    if (input.wasJustPressed('KeyG')) {
      this._physics.gearDown = !this._physics.gearDown;
    }

    // Flaps
    if (input.wasJustPressed('KeyF')) {
      this._physics.flaps = Math.min(3, this._physics.flaps + 1);
    }
    if (input.wasJustPressed('KeyC')) {
      this._physics.flaps = Math.max(0, this._physics.flaps - 1);
    }

    // View toggle
    if (input.wasJustPressed('KeyV')) {
      this._viewMode = this._viewMode === 'cockpit' ? 'external' : 'cockpit';
      this._cockpit.setVisible(this._viewMode === 'cockpit');
    }

    // Weapon cycle
    if (input.wasJustPressed('Tab')) {
      this._weaponSystem.cycleWeapon();
    }

    // Rearm
    if (input.wasJustPressed('KeyR')) {
      const strips = this._terrain.getLandingStrips();
      for (const strip of strips) {
        if (this._physics.position.distanceTo(strip.center) < 500) {
          this._weaponSystem.rearm();
          this._hud.showMessage('REARMING...', 3000);
          break;
        }
      }
    }

    // Afterburner (F-35)
    if (this._currentAircraftKey === 'f35') {
      this._physics.afterburner = input.isPressed('ShiftLeft') && input.isPressed('KeyW');
    }

    // VTOL mode (F-35)
    if (this._currentAircraftKey === 'f35' && input.wasJustPressed('KeyV')) {
      this._physics.vtolMode = !this._physics.vtolMode;
      if (this._physics.vtolMode) {
        this._physics.nozzleAngle = 90;
      } else {
        this._physics.nozzleAngle = 0;
      }
    }

    // Parachute (Cirrus)
    if (this._currentAircraftKey === 'cirrusVisionJet' && input.wasJustPressed('KeyP')) {
      this._parachuteDeployed = true;
      this._hud.showMessage('PARACHUTE DEPLOYED', 5000);
      this._physics.velocity.y = Math.max(this._physics.velocity.y, -5);
    }

    // Bomb bay door (B52)
    if (this._currentAircraftKey === 'b52' && input.wasJustPressed('KeyB')) {
      this._bombBayOpen = !this._bombBayOpen;
      this._hud.showMessage(this._bombBayOpen ? 'BOMB BAY OPEN' : 'BOMB BAY CLOSED', 2000);
    }

    // Target lock (AH-64)
    if (input.wasJustPressed('KeyT')) {
      const locked = this._weaponSystem.lockNearestTarget(
        this._physics.position,
        new THREE.Vector3(0, 0, -1).applyEuler(this._physics.rotation)
      );
      if (locked) this._hud.showMessage('TARGET LOCKED', 2000);
    }

    // Night vision (AH-64)
    if (this._currentAircraftKey === 'ah64' && input.wasJustPressed('KeyN')) {
      this._hud.toggleNightVision();
    }
  }

  _updateCamera() {
    const pos = this._physics.position;
    const rot = this._physics.rotation;

    if (this._viewMode === 'cockpit') {
      const config = AIRCRAFT_CONFIGS[this._currentAircraftKey];
      const offset = config.cockpitOffset || new THREE.Vector3(0, 1.2, 0.5);

      // Position camera at cockpit offset
      const localOffset = offset.clone().applyEuler(rot);
      this._camera.position.copy(pos).add(localOffset);
      this._camera.rotation.copy(rot);
      this._camera.updateMatrixWorld();

      // Cockpit mesh follows camera
      this._cockpit.setTransform(this._camera.position, this._camera.rotation);
    } else {
      // External: behind and above
      const behindDist = 30;
      const aboveDist = 8;
      const backward = new THREE.Vector3(0, 0, 1).applyEuler(rot);
      const up = new THREE.Vector3(0, 1, 0);
      const extPos = pos.clone()
        .addScaledVector(backward, behindDist)
        .addScaledVector(up, aboveDist);
      this._camera.position.lerp(extPos, 0.1);
      this._camera.lookAt(pos);
    }
  }

  getScene() { return this._scene; }
  getCamera() { return this._camera; }
}
