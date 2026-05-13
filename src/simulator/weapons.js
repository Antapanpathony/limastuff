import * as THREE from 'three';

const FIRE_COOLDOWNS = {
  gun: 0.05,      // 20 rps
  rocket: 0.3,
  missile: 1.5,
  bomb: 0.5,
};

function createExplosion(scene, position, radius = 8) {
  const group = new THREE.Group();
  group.position.copy(position);

  // Flash sphere
  const flashGeo = new THREE.SphereGeometry(radius, 8, 8);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  group.add(flash);

  // Smoke sphere
  const smokeGeo = new THREE.SphereGeometry(radius * 0.7, 8, 8);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0x444444,
    transparent: true,
    opacity: 0.8,
  });
  const smoke = new THREE.Mesh(smokeGeo, smokeMat);
  group.add(smoke);

  // Sparks (point cloud)
  const sparkCount = 40;
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkVels = [];
  for (let i = 0; i < sparkCount; i++) {
    sparkPositions[i*3] = 0;
    sparkPositions[i*3+1] = 0;
    sparkPositions[i*3+2] = 0;
    sparkVels.push(new THREE.Vector3(
      (Math.random()-0.5) * 20,
      Math.random() * 15,
      (Math.random()-0.5) * 20
    ));
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkPositions, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 1.5, blending: THREE.AdditiveBlending });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparks);

  scene.add(group);

  let age = 0;
  const lifetime = 2.5;

  return {
    update(dt) {
      age += dt;
      const t = age / lifetime;

      // Expand flash
      const s = 1 + t * 2;
      flash.scale.setScalar(s);
      flashMat.opacity = Math.max(0, 1 - t * 2);

      // Expand smoke
      smoke.scale.setScalar(1 + t * 3);
      smokeMat.opacity = Math.max(0, 0.8 - t);

      // Animate sparks
      const sp = sparks.geometry.attributes.position;
      for (let i = 0; i < sparkCount; i++) {
        sparkVels[i].y -= 9.81 * dt;
        sp.setXYZ(i,
          sp.getX(i) + sparkVels[i].x * dt,
          sp.getY(i) + sparkVels[i].y * dt,
          sp.getZ(i) + sparkVels[i].z * dt
        );
      }
      sp.needsUpdate = true;
      sparkMat.opacity = Math.max(0, 1 - t);

      return age >= lifetime;
    },
    dispose() {
      scene.remove(group);
      flashGeo.dispose();
      smokeGeo.dispose();
      sparkGeo.dispose();
    }
  };
}

class Projectile {
  constructor(type, position, direction, speed, damage, scene) {
    this.type = type;
    this.position = position.clone();
    this.velocity = direction.clone().multiplyScalar(speed);
    this.damage = damage;
    this.scene = scene;
    this.alive = true;
    this.age = 0;
    this.maxAge = type === 'bomb' ? 30 : (type === 'missile' ? 20 : 5);
    this.target = null; // for homing missiles
    this.exploded = false;

    // Create mesh
    let geo, mat;
    if (type === 'gun') {
      geo = new THREE.SphereGeometry(0.1, 4, 4);
      mat = new THREE.MeshBasicMaterial({ color: 0xffff00, blending: THREE.AdditiveBlending });
    } else if (type === 'missile') {
      geo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6);
      geo.rotateX(Math.PI / 2);
      mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    } else if (type === 'bomb') {
      geo = new THREE.SphereGeometry(0.4, 6, 6);
      mat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    } else if (type === 'rocket') {
      geo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
      geo.rotateX(Math.PI / 2);
      mat = new THREE.MeshLambertMaterial({ color: 0x777755 });
    }
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    // Missile exhaust trail
    if (type === 'missile' || type === 'rocket') {
      const trailGeo = new THREE.BufferGeometry();
      const trailPos = new Float32Array(30 * 3);
      trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailPos, 3));
      this._trailMat = new THREE.PointsMaterial({
        color: 0xff8800,
        size: 0.8,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      this._trail = new THREE.Points(trailGeo, this._trailMat);
      this._trailPositions = trailPos;
      this._trailIdx = 0;
      scene.add(this._trail);
    }
  }

  update(dt, terrainHeight, targets) {
    if (!this.alive) return;
    this.age += dt;

    if (this.age > this.maxAge) {
      this._destroy();
      return;
    }

    // Homing: missiles track target
    if (this.type === 'missile' && this.target && !this.target.isDestroyed()) {
      const toTarget = this.target.mesh.position.clone().sub(this.position).normalize();
      const speed = this.velocity.length();
      this.velocity.lerp(toTarget.multiplyScalar(speed), dt * 2);
      this.velocity.normalize().multiplyScalar(speed);
    }

    // Gravity for bombs
    if (this.type === 'bomb') {
      this.velocity.y -= 9.81 * dt;
    }

    // Update position
    this.position.addScaledVector(this.velocity, dt);
    this.mesh.position.copy(this.position);

    // Aim mesh along velocity
    if (this.velocity.length() > 0.1) {
      this.mesh.lookAt(this.position.clone().add(this.velocity));
    }

    // Trail update
    if (this._trailPositions) {
      const i = this._trailIdx % 10;
      this._trailPositions[i*3] = this.position.x + (Math.random()-0.5)*0.5;
      this._trailPositions[i*3+1] = this.position.y + (Math.random()-0.5)*0.5;
      this._trailPositions[i*3+2] = this.position.z + (Math.random()-0.5)*0.5;
      this._trail.geometry.attributes.position.needsUpdate = true;
      this._trailIdx++;
    }

    // Check terrain collision
    const tH = terrainHeight(this.position.x, this.position.z);
    if (this.position.y <= tH + 1) {
      this._explode(targets);
      return;
    }

    // Check target hits
    for (const t of targets) {
      if (t.isDestroyed()) continue;
      const dist = this.position.distanceTo(t.mesh.position);
      const hitRadius = this.type === 'gun' ? 2 : (this.type === 'bomb' ? 15 : 8);
      if (dist < hitRadius) {
        t.takeDamage(this.damage);
        this._explode(targets);
        return;
      }
    }
  }

  _explode(targets) {
    if (this.exploded) return;
    this.exploded = true;
    const radius = this.type === 'bomb' ? 40 : (this.type === 'missile' ? 20 : 5);
    createExplosion(this.scene, this.position, radius);

    // Splash damage
    const splashRadius = radius * 2;
    for (const t of targets) {
      if (t.isDestroyed()) continue;
      const dist = t.mesh.position.distanceTo(this.position);
      if (dist < splashRadius) {
        const dmgFactor = 1 - dist / splashRadius;
        t.takeDamage(this.damage * dmgFactor * 0.5);
      }
    }

    this._destroy();
  }

  _destroy() {
    this.alive = false;
    this.scene.remove(this.mesh);
    if (this._trail) {
      this.scene.remove(this._trail);
      this._trail.geometry.dispose();
    }
  }
}

// Shim for terrainHeight access (set by WeaponSystem)
let _terrainGetHeight = (x, z) => 0;

export class WeaponSystem {
  constructor(aircraft, scene, targetManager) {
    this._aircraft = aircraft;
    this._scene = scene;
    this._targetManager = targetManager;

    // Clone weapon loadout from config
    this._weapons = (aircraft.config.weapons || []).map(w => ({ ...w }));
    this._selectedIdx = 0;
    this._cooldowns = {};
    this._projectiles = [];
    this._explosions = [];
    this._lockedTarget = null;
    this._rearming = false;
    this._rearmTimer = 0;
    this._gunCooldown = 0;

    // Set terrain callback
    if (targetManager && targetManager._terrainHeight) {
      _terrainGetHeight = targetManager._terrainHeight;
    }
  }

  update(dt, playerPos) {
    // Update cooldowns
    this._gunCooldown = Math.max(0, this._gunCooldown - dt);
    for (const k of Object.keys(this._cooldowns)) {
      this._cooldowns[k] = Math.max(0, this._cooldowns[k] - dt);
    }

    // Update projectiles
    const targets = this._targetManager ? this._targetManager.getTargets() : [];
    const dead = [];
    for (const p of this._projectiles) {
      p.update(dt, _terrainGetHeight, targets);
      if (!p.alive) dead.push(p);
    }
    this._projectiles = this._projectiles.filter(p => p.alive);

    // Update explosions
    const deadExp = [];
    for (const e of this._explosions) {
      const done = e.update(dt);
      if (done) { e.dispose(); deadExp.push(e); }
    }
    this._explosions = this._explosions.filter(e => !deadExp.includes(e));

    // Rearm
    if (this._rearming) {
      this._rearmTimer -= dt;
      if (this._rearmTimer <= 0) {
        this._rearming = false;
        for (const w of this._weapons) w.ammo = w.maxAmmo;
      }
    }
  }

  fire(position, direction, targets) {
    if (this._weapons.length === 0) return;
    const weapon = this._weapons[this._selectedIdx];
    if (!weapon) return;

    const cooldownKey = weapon.type + this._selectedIdx;
    if (this._cooldowns[cooldownKey] > 0) return;
    if (weapon.ammo <= 0) return;

    weapon.ammo--;
    this._cooldowns[cooldownKey] = FIRE_COOLDOWNS[weapon.type] || 0.5;

    // Muzzle offset (slightly in front of aircraft)
    const spawnPos = position.clone().addScaledVector(direction, 8);

    if (weapon.type === 'gun') {
      // Raycast-style: just spawn a fast projectile
      const p = new Projectile('gun', spawnPos, direction, 600, 25, this._scene);
      this._projectiles.push(p);
    } else if (weapon.type === 'missile') {
      const p = new Projectile('missile', spawnPos, direction, 300, 200, this._scene);
      if (this._lockedTarget && !this._lockedTarget.isDestroyed()) {
        p.target = this._lockedTarget;
      }
      this._projectiles.push(p);
    } else if (weapon.type === 'bomb') {
      const p = new Projectile('bomb', spawnPos, direction.clone().multiplyScalar(50), 50, 500, this._scene);
      this._projectiles.push(p);
    } else if (weapon.type === 'rocket') {
      const p = new Projectile('rocket', spawnPos, direction, 200, 80, this._scene);
      this._projectiles.push(p);
    }
  }

  cycleWeapon() {
    if (this._weapons.length === 0) return;
    this._selectedIdx = (this._selectedIdx + 1) % this._weapons.length;
  }

  lockNearestTarget(position, forward) {
    const targets = this._targetManager ? this._targetManager.getTargets() : [];
    let best = null;
    let bestScore = Infinity;

    for (const t of targets) {
      if (t.isDestroyed()) continue;
      const dist = position.distanceTo(t.mesh.position);
      if (dist > 3000) continue;
      const toT = t.mesh.position.clone().sub(position).normalize();
      const dot = forward.dot(toT);
      if (dot < 0.5) continue; // not in front
      const score = dist * (1 - dot);
      if (score < bestScore) { bestScore = score; best = t; }
    }

    this._lockedTarget = best;
    return !!best;
  }

  rearm() {
    this._rearming = true;
    this._rearmTimer = 3;
  }

  getSelectedWeapon() {
    return this._weapons[this._selectedIdx] || null;
  }

  getAllWeapons() {
    return this._weapons;
  }

  getLockedTarget() {
    return this._lockedTarget;
  }

  isRearming() {
    return this._rearming;
  }

  dispose() {
    for (const p of this._projectiles) p._destroy();
    for (const e of this._explosions) e.dispose();
    this._projectiles = [];
    this._explosions = [];
  }
}

// Export terrain setter so engine can hook it
export function setTerrainHeightFn(fn) {
  _terrainGetHeight = fn;
}
