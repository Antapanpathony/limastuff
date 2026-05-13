import * as THREE from 'three';

const SPAWN_RADIUS = 4000;
const DESPAWN_RADIUS = 6000;
const MAX_TARGETS = 40;

// Simple target base class
class Target {
  constructor(position, health) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this._health = health;
    this._maxHealth = health;
    this._destroyed = false;
    this._smokeParticles = null;
  }

  takeDamage(amount) {
    if (this._destroyed) return;
    this._health -= amount;
    if (this._health <= 0) {
      this._health = 0;
      this._onDestroy();
    }
  }

  _onDestroy() {
    this._destroyed = true;
    // Replace mesh with rubble
    this.mesh.children.forEach(c => {
      c.material && (c.material.color = new THREE.Color(0x333322));
    });
    // Tilt it over
    this.mesh.rotation.z = (Math.random() - 0.5) * 0.8;
    this.mesh.rotation.x = (Math.random() - 0.5) * 0.4;
  }

  isDestroyed() { return this._destroyed; }

  update(dt, playerPos) {}
}

// ── Vehicle ─────────────────────────────────────────────────────────────────
class Vehicle extends Target {
  constructor(position, terrainHeight) {
    super(position, 100);
    this._speed = 2 + Math.random() * 3;
    this._angle = Math.random() * Math.PI * 2;
    this._turnRate = (Math.random() - 0.5) * 0.3;
    this._terrainHeight = terrainHeight;

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a6a2a });
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Body
    const bodyGeo = new THREE.BoxGeometry(2.5, 1.2, 5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    this.mesh.add(body);

    // Cab
    const cabGeo = new THREE.BoxGeometry(2.2, 1.0, 2.5);
    const cab = new THREE.Mesh(cabGeo, bodyMat);
    cab.position.set(0, 1.8, -0.5);
    this.mesh.add(cab);

    // Wheels
    for (const sx of [-1, 1]) {
      for (const sz of [-1.5, 0, 1.5]) {
        const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
        wGeo.rotateX(Math.PI / 2);
        const w = new THREE.Mesh(wGeo, tireMat);
        w.position.set(sx * 1.4, 0.5, sz);
        this.mesh.add(w);
      }
    }

    this.mesh.position.y = position.y;
  }

  update(dt, playerPos) {
    if (this._destroyed) return;
    this._angle += this._turnRate * dt;
    const dx = Math.sin(this._angle) * this._speed * dt;
    const dz = Math.cos(this._angle) * this._speed * dt;
    this.mesh.position.x += dx;
    this.mesh.position.z += dz;
    this.mesh.position.y = this._terrainHeight(this.mesh.position.x, this.mesh.position.z) + 0.5;
    this.mesh.rotation.y = this._angle;
  }
}

// ── AA Gun ───────────────────────────────────────────────────────────────────
class AAGun extends Target {
  constructor(position) {
    super(position, 200);
    this._fireTimer = 0;
    this._fireInterval = 3 + Math.random() * 2;
    this._projectiles = [];
    this._active = false;
    this._range = 2000;

    const baseMat = new THREE.MeshLambertMaterial({ color: 0x556633 });
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x333322 });

    // Base platform
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.8, 8);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.4;
    this.mesh.add(base);

    // Rotating gun mount
    this._turret = new THREE.Group();
    this._turret.position.y = 0.8;
    this.mesh.add(this._turret);

    // Gun barrel (twin)
    for (const dx of [-0.25, 0.25]) {
      const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 6);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, gunMat);
      barrel.position.set(dx, 0, -1.5);
      this._turret.add(barrel);
    }

    const mountGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const mount = new THREE.Mesh(mountGeo, baseMat);
    this._turret.add(mount);
  }

  update(dt, playerPos) {
    if (this._destroyed) return;

    const dist = this.mesh.position.distanceTo(playerPos);
    this._active = dist < this._range;

    if (this._active) {
      // Rotate toward player
      const toPlayer = playerPos.clone().sub(this.mesh.position);
      const angle = Math.atan2(toPlayer.x, toPlayer.z);
      this._turret.rotation.y += (angle - this._turret.rotation.y) * dt * 2;

      // Elevate gun barrel based on player altitude
      const horizDist = new THREE.Vector2(toPlayer.x, toPlayer.z).length();
      const elev = Math.atan2(toPlayer.y, horizDist);
      this._turret.rotation.x = -elev;

      // Fire
      this._fireTimer -= dt;
      if (this._fireTimer <= 0) {
        this._fireTimer = this._fireInterval;
        this._fireAtPlayer(playerPos);
      }
    }

    // Update own projectiles (AA shells)
    const dead = [];
    for (const p of this._projectiles) {
      p.vel.y -= 9.81 * dt * 0.5;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.age += dt;
      if (p.age > 5 || p.mesh.position.distanceTo(playerPos) < 5) {
        // near miss
        dead.push(p);
      }
    }
    for (const p of dead) {
      p.mesh.parent && p.mesh.parent.remove(p.mesh);
      this._projectiles = this._projectiles.filter(x => x !== p);
    }
  }

  _fireAtPlayer(playerPos) {
    const dir = playerPos.clone().sub(this.mesh.position).normalize();
    dir.x += (Math.random() - 0.5) * 0.1;
    dir.y += (Math.random() - 0.5) * 0.1;
    dir.z += (Math.random() - 0.5) * 0.1;

    const geo = new THREE.SphereGeometry(0.2, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const pMesh = new THREE.Mesh(geo, mat);
    pMesh.position.copy(this.mesh.position).addScaledVector(dir, 5);
    this.mesh.parent && this.mesh.parent.add(pMesh);

    this._projectiles.push({ mesh: pMesh, vel: dir.multiplyScalar(120), age: 0 });
  }
}

// ── Building ─────────────────────────────────────────────────────────────────
class Building extends Target {
  constructor(position, h) {
    super(position, 300);

    const w = 5 + Math.random() * 15;
    const d = 5 + Math.random() * 15;
    const height = h || (10 + Math.random() * 40);

    const colors = [0x8a7a6a, 0x9a8a7a, 0x6a7a8a, 0x7a8a6a];
    const mat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });

    const geo = new THREE.BoxGeometry(w, height, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    this.mesh.add(mesh);

    // Roof details
    const roofGeo = new THREE.BoxGeometry(w * 0.8, 1, d * 0.8);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + 0.5;
    this.mesh.add(roof);
  }
}

// ── TargetManager ─────────────────────────────────────────────────────────────
export class TargetManager {
  constructor(scene) {
    this._scene = scene;
    this._targets = [];
    this._spawnTimer = 0;
    this._spawnInterval = 2;

    // Store terrain height function (set by engine after terrain is created)
    this._terrainHeight = (x, z) => 0;
  }

  setTerrainHeight(fn) {
    this._terrainHeight = fn;
  }

  _spawnNear(playerPos) {
    if (this._targets.length >= MAX_TARGETS) return;

    const angle = Math.random() * Math.PI * 2;
    const dist = 800 + Math.random() * (SPAWN_RADIUS - 800);
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const y = this._terrainHeight(x, z);

    if (y <= 0.5) return; // don't spawn in water

    const roll = Math.random();
    let target;
    const pos = new THREE.Vector3(x, y, z);

    if (roll < 0.4) {
      target = new Vehicle(pos, this._terrainHeight);
    } else if (roll < 0.6) {
      target = new AAGun(pos);
    } else {
      target = new Building(pos);
    }

    target.mesh.position.set(x, y, z);
    this._scene.add(target.mesh);
    this._targets.push(target);
  }

  update(dt, playerPos) {
    // Spawn new targets
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = this._spawnInterval;
      this._spawnNear(playerPos);
    }

    // Update targets, despawn far ones
    const toRemove = [];
    for (const t of this._targets) {
      const dist = t.mesh.position.distanceTo(playerPos);
      if (dist > DESPAWN_RADIUS) {
        toRemove.push(t);
        continue;
      }
      t.update(dt, playerPos);
    }

    for (const t of toRemove) {
      this._scene.remove(t.mesh);
      this._targets = this._targets.filter(x => x !== t);
    }
  }

  getTargets() {
    return this._targets;
  }

  getAAGuns() {
    return this._targets.filter(t => t instanceof AAGun);
  }
}
