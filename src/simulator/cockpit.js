import * as THREE from 'three';

const INSTRUMENT_RADIUS = 0.055;
const NEEDLE_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const GAUGE_BG_MAT = new THREE.MeshBasicMaterial({ color: 0x111111 });
const PANEL_MAT = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const FRAME_MAT = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
const GLASS_MAT = new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.15, side: THREE.DoubleSide });

function makeGauge(label) {
  const group = new THREE.Group();

  // Face
  const faceGeo = new THREE.CircleGeometry(INSTRUMENT_RADIUS, 20);
  const face = new THREE.Mesh(faceGeo, GAUGE_BG_MAT.clone());
  group.add(face);

  // Bezel
  const bezelGeo = new THREE.RingGeometry(INSTRUMENT_RADIUS, INSTRUMENT_RADIUS * 1.12, 20);
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.z = 0.001;
  group.add(bezel);

  // Needle
  const needleGeo = new THREE.PlaneGeometry(0.004, INSTRUMENT_RADIUS * 0.85);
  needleGeo.translate(0, INSTRUMENT_RADIUS * 0.4, 0);
  const needle = new THREE.Mesh(needleGeo, NEEDLE_MAT.clone());
  needle.position.z = 0.002;
  group.add(needle);

  // Tick marks
  for (let i = 0; i < 12; i++) {
    const tickGeo = new THREE.PlaneGeometry(0.003, 0.008);
    tickGeo.translate(0, INSTRUMENT_RADIUS * 0.88, 0);
    const tick = new THREE.Mesh(tickGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tick.rotation.z = (i / 12) * Math.PI * 2;
    tick.position.z = 0.001;
    group.add(tick);
  }

  group.userData.needle = needle;
  return group;
}

function makeAttitudeIndicator() {
  const group = new THREE.Group();
  const faceGeo = new THREE.CircleGeometry(INSTRUMENT_RADIUS, 24);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ color: 0x2255aa }));
  group.add(face);

  // Ground half (brown)
  const groundGeo = new THREE.CircleGeometry(INSTRUMENT_RADIUS, 24, Math.PI, Math.PI);
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x8b5e3c, side: THREE.DoubleSide });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.z = 0.001;
  group.add(ground);
  group.userData.ground = ground;

  // Horizon line
  const hLineGeo = new THREE.PlaneGeometry(INSTRUMENT_RADIUS * 1.8, 0.004);
  const hLine = new THREE.Mesh(hLineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  hLine.position.z = 0.002;
  group.add(hLine);
  group.userData.horizonLine = hLine;

  // Bezel
  const bezelGeo = new THREE.RingGeometry(INSTRUMENT_RADIUS, INSTRUMENT_RADIUS * 1.12, 24);
  const bezel = new THREE.Mesh(bezelGeo, new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide }));
  bezel.position.z = 0.003;
  group.add(bezel);

  // Aircraft symbol (fixed)
  const symGeo = new THREE.PlaneGeometry(INSTRUMENT_RADIUS * 1.0, 0.006);
  const symMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
  const sym = new THREE.Mesh(symGeo, symMat);
  sym.position.z = 0.004;
  group.add(sym);

  // Clipping mask (circle)
  const maskGeo = new THREE.RingGeometry(0, INSTRUMENT_RADIUS * 1.02, 24);
  const maskMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, opacity: 0, transparent: true });
  const mask = new THREE.Mesh(maskGeo, maskMat);
  mask.position.z = -0.001;
  group.add(mask);

  return group;
}

export class Cockpit {
  constructor(scene, camera, aircraftConfig) {
    this._scene = scene;
    this._camera = camera;
    this._config = aircraftConfig;
    this._root = new THREE.Group();
    this._visible = true;

    this._gauges = {};
    this._attitudeIndicator = null;
  }

  build() {
    const root = this._root;

    // Dashboard panel (in front of camera)
    const dashGeo = new THREE.BoxGeometry(0.75, 0.35, 0.04);
    const dash = new THREE.Mesh(dashGeo, PANEL_MAT);
    dash.position.set(0, -0.18, -0.6);
    root.add(dash);

    // Dashboard top edge bevel
    const topGeo = new THREE.BoxGeometry(0.76, 0.02, 0.06);
    const top = new THREE.Mesh(topGeo, FRAME_MAT);
    top.position.set(0, -0.005, -0.58);
    root.add(top);

    // Windshield frame (4 strips)
    const frameColor = 0x1a1a1a;
    const frameMat = new THREE.MeshLambertMaterial({ color: frameColor });

    // Top frame
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.015), frameMat);
    topFrame.position.set(0, 0.12, -0.65);
    root.add(topFrame);

    // Side frames
    for (const sx of [-1, 1]) {
      const sf = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.3, 0.015), frameMat);
      sf.position.set(sx * 0.45, -0.02, -0.65);
      root.add(sf);
    }

    // Center divider
    const cDiv = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.28, 0.015), frameMat);
    cDiv.position.set(0, -0.02, -0.65);
    root.add(cDiv);

    // Glare shield
    const gsGeo = new THREE.BoxGeometry(0.75, 0.04, 0.1);
    const gs = new THREE.Mesh(gsGeo, FRAME_MAT);
    gs.position.set(0, -0.015, -0.62);
    root.add(gs);

    // Control column/stick (center)
    const stickGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.18, 8);
    const stick = new THREE.Mesh(stickGeo, PANEL_MAT);
    stick.position.set(0, -0.35, -0.45);
    stick.rotation.x = -0.3;
    root.add(stick);

    const knobGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const knob = new THREE.Mesh(knobGeo, FRAME_MAT);
    knob.position.set(0, -0.25, -0.47);
    root.add(knob);

    // Side panels
    for (const sx of [-1, 1]) {
      const spGeo = new THREE.BoxGeometry(0.12, 0.3, 0.04);
      const sp = new THREE.Mesh(spGeo, PANEL_MAT);
      sp.position.set(sx * 0.45, -0.18, -0.55);
      sp.rotation.y = sx * 0.3;
      root.add(sp);
    }

    // Build 6-pack instruments on dashboard
    this._buildInstruments(root);

    // Add cockpit group to scene (not to camera)
    this._scene.add(root);
  }

  _buildInstruments(root) {
    const isHeli = this._config.isHelicopter;

    // 6-pack layout positions (relative to dashboard center)
    const layout = [
      { key: 'asi',     x: -0.22, y: -0.19 },  // Airspeed
      { key: 'ai',      x:  0.00, y: -0.19 },  // Attitude
      { key: 'alt',     x:  0.22, y: -0.19 },  // Altimeter
      { key: 'tc',      x: -0.22, y: -0.28 },  // Turn coordinator
      { key: 'hsi',     x:  0.00, y: -0.28 },  // Heading
      { key: 'vsi',     x:  0.22, y: -0.28 },  // VSI
    ];

    for (const item of layout) {
      let gauge;
      if (item.key === 'ai') {
        gauge = makeAttitudeIndicator();
        this._attitudeIndicator = gauge;
      } else {
        gauge = makeGauge(item.key);
        this._gauges[item.key] = gauge;
      }
      gauge.position.set(item.x, item.y, -0.57);
      gauge.rotation.x = 0.25;
      root.add(gauge);
    }

    // RPM gauge (far right)
    const rpm = makeGauge('rpm');
    rpm.position.set(0.36, -0.21, -0.57);
    rpm.rotation.x = 0.25;
    this._gauges.rpm = rpm;
    root.add(rpm);

    if (isHeli) {
      // Torque gauge
      const torq = makeGauge('torq');
      torq.position.set(0.36, -0.28, -0.57);
      torq.rotation.x = 0.25;
      this._gauges.torq = torq;
      root.add(torq);
    }

    // Throttle quadrant
    const tqGeo = new THREE.BoxGeometry(0.08, 0.02, 0.14);
    const tq = new THREE.Mesh(tqGeo, PANEL_MAT);
    tq.position.set(-0.35, -0.3, -0.5);
    root.add(tq);

    const tLeverGeo = new THREE.BoxGeometry(0.015, 0.1, 0.015);
    const tLever = new THREE.Mesh(tLeverGeo, FRAME_MAT);
    tLever.position.set(-0.35, -0.25, -0.48);
    this._throttleLever = tLever;
    root.add(tLever);
  }

  update(physics) {
    if (!this._visible) return;

    const kts = physics.airspeed * 1.944;    // m/s to knots
    const alt = physics.altitude * 3.281;     // m to ft
    const vs = physics.verticalSpeed * 196.8; // m/s to fpm
    const hdg = physics.heading;

    // ASI: 0-250 knots mapped to full rotation
    if (this._gauges.asi) {
      const fraction = Math.min(1, kts / 250);
      this._gauges.asi.userData.needle.rotation.z = -fraction * Math.PI * 2 + Math.PI * 0.5;
    }

    // Altimeter: 1000ft needle
    if (this._gauges.alt) {
      const fraction = (alt % 1000) / 1000;
      this._gauges.alt.userData.needle.rotation.z = -fraction * Math.PI * 2 + Math.PI * 0.5;
    }

    // VSI: -2000 to +2000 fpm
    if (this._gauges.vsi) {
      const fraction = (vs + 2000) / 4000;
      this._gauges.vsi.userData.needle.rotation.z = -(fraction * Math.PI * 1.5 - Math.PI * 0.75) + Math.PI * 0.5;
    }

    // Heading indicator
    if (this._gauges.hsi) {
      this._gauges.hsi.userData.needle.rotation.z = -THREE.MathUtils.degToRad(hdg);
    }

    // Turn coordinator
    if (this._gauges.tc) {
      this._gauges.tc.userData.needle.rotation.z = -physics.rotation.z * 2;
    }

    // RPM / N1
    if (this._gauges.rpm) {
      this._gauges.rpm.userData.needle.rotation.z = -(physics.throttle) * Math.PI * 1.5 + Math.PI * 0.5;
    }

    // Attitude indicator: rotate ground/horizon based on pitch & roll
    if (this._attitudeIndicator) {
      const ai = this._attitudeIndicator;
      const pitchOffset = physics.rotation.x * INSTRUMENT_RADIUS * 3;
      ai.userData.ground.position.y = pitchOffset;
      ai.userData.horizonLine.position.y = pitchOffset;
      ai.rotation.z = -physics.rotation.z;
    }

    // Throttle lever
    if (this._throttleLever) {
      this._throttleLever.position.z = -0.48 + physics.throttle * 0.1;
    }
  }

  setTransform(position, rotation) {
    if (!this._visible) return;
    this._root.position.copy(position);
    this._root.rotation.copy(rotation);
  }

  setVisible(v) {
    this._visible = v;
    this._root.visible = v;
  }

  dispose(scene) {
    scene.remove(this._root);
  }
}
