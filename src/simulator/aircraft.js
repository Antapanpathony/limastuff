import * as THREE from 'three';

// Base Aircraft class - builds mesh from THREE primitives
export class Aircraft {
  constructor(config) {
    this.config = config;
    this.mesh = new THREE.Group();
    this.mesh.name = config.name;
    this._propeller = null;
    this._rotorHead = null;
    this._tailRotor = null;
    this._gearMeshes = [];
    this._flapMeshes = [];
    this._afterburnerGlow = null;
    this._engineGlows = [];
    this._bombBayDoors = null;
    this._nozzle = null;
  }

  createMesh() {
    // Delegate to config's builder
    if (this.config.buildMesh) {
      this.config.buildMesh(this.mesh);
    } else {
      this._buildDefaultMesh();
    }
    // Collect animated parts from userData
    if (this.mesh.userData.propeller) this._propeller = this.mesh.userData.propeller;
    if (this.mesh.userData.rotorHead) this._rotorHead = this.mesh.userData.rotorHead;
    if (this.mesh.userData.tailRotor) this._tailRotor = this.mesh.userData.tailRotor;
    if (this.mesh.userData.afterburnerGlow) this._afterburnerGlow = this.mesh.userData.afterburnerGlow;
    if (this.mesh.userData.nozzle) this._nozzle = this.mesh.userData.nozzle;
    if (this.mesh.userData.bombBayDoors) this._bombBayDoors = this.mesh.userData.bombBayDoors;
    return this.mesh;
  }

  _buildDefaultMesh() {
    // Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.8, 0.6, 7, 8);
    fuseGeo.rotateX(Math.PI / 2);
    const fuseMat = new THREE.MeshLambertMaterial({ color: this.config.color || 0xcccccc });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    this.mesh.add(fuse);

    // Wings
    const wingGeo = new THREE.BoxGeometry(this.config.wingSpan || 10, 0.15, 2.5);
    const wingMat = new THREE.MeshLambertMaterial({ color: this.config.color || 0xcccccc });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0, 0.5);
    this.mesh.add(wings);

    // Tail horizontal stabilizer
    const hStabGeo = new THREE.BoxGeometry(4, 0.12, 1.2);
    const hStab = new THREE.Mesh(hStabGeo, wingMat);
    hStab.position.set(0, 0.2, 3.2);
    this.mesh.add(hStab);

    // Tail vertical stabilizer
    const vStabGeo = new THREE.BoxGeometry(0.12, 1.5, 1.4);
    const vStab = new THREE.Mesh(vStabGeo, wingMat);
    vStab.position.set(0, 0.8, 3);
    this.mesh.add(vStab);
  }

  updateMeshAnimations(physics, dt) {
    // Propeller spin
    if (this._propeller) {
      this._propeller.rotation.z += physics.throttle * 25 * dt;
    }
    // Rotor spin
    if (this._rotorHead) {
      this._rotorHead.rotation.y += physics.throttle * 30 * dt;
    }
    if (this._tailRotor) {
      this._tailRotor.rotation.z += physics.throttle * 30 * dt;
    }
    // Gear animation
    for (const gear of this._gearMeshes) {
      const targetY = physics.gearDown ? gear._downY : gear._upY;
      gear.position.y += (targetY - gear.position.y) * dt * 4;
    }
    // Afterburner glow
    if (this._afterburnerGlow) {
      this._afterburnerGlow.visible = physics.afterburner || false;
      if (physics.afterburner) {
        const s = 0.8 + Math.random() * 0.4;
        this._afterburnerGlow.scale.set(s, s, 1 + Math.random() * 0.5);
      }
    }
    // VTOL nozzle
    if (this._nozzle) {
      const target = (physics.vtolMode ? Math.PI / 2 : 0);
      this._nozzle.rotation.x += (target - this._nozzle.rotation.x) * dt * 3;
    }
  }

  setBombBayAngle(angle) {
    if (this._bombBayDoors) {
      this._bombBayDoors.left.rotation.z = angle;
      this._bombBayDoors.right.rotation.z = -angle;
    }
  }

  getSpeed() {
    // Handled by physics
    return 0;
  }
}

// ── Utility builders shared across aircraft ──────────────────────────────────
export function addGear(group, x, y, z, downY, upY) {
  const gearGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 6);
  const gearMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const gear = new THREE.Mesh(gearGeo, gearMat);
  gear.position.set(x, y, z);
  gear._downY = downY;
  gear._upY = upY;
  group.add(gear);
  return gear;
}

export function addEngine(group, x, y, z, color = 0x222222, radius = 0.4, length = 1.5) {
  const geo = new THREE.CylinderGeometry(radius, radius * 0.9, length, 8);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function addPropeller(group, x, y, z) {
  const propGroup = new THREE.Group();
  propGroup.position.set(x, y, z);

  const bladeGeo = new THREE.BoxGeometry(0.15, 2.0, 0.08);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.z = (i * Math.PI);
    propGroup.add(blade);
  }

  const hubGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const hub = new THREE.Mesh(hubGeo, bladeMat);
  propGroup.add(hub);

  group.add(propGroup);
  return propGroup;
}

export function addRotorHead(group, x, y, z, bladeCount = 2, bladeLength = 5) {
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(x, y, z);

  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  for (let i = 0; i < bladeCount; i++) {
    const bladeGeo = new THREE.BoxGeometry(bladeLength, 0.08, 0.4);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.y = (i / bladeCount) * Math.PI * 2;
    blade.position.x = bladeLength / 2;
    rotorGroup.add(blade);
  }

  group.add(rotorGroup);
  return rotorGroup;
}

export function addAfterburnerGlow(group, x, y, z) {
  const geo = new THREE.ConeGeometry(0.3, 2.5, 8);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(geo, mat);
  glow.position.set(x, y, z);
  glow.visible = false;
  group.add(glow);
  return glow;
}
