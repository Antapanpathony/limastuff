import * as THREE from 'three';

export const B52Config = {
  name: 'B-52 Stratofortress',
  key: 'b52',
  description: '8-engine strategic bomber. Carries Mk-82 bombs and AGM-86 cruise missiles. B=bomb bay.',
  color: 0x4a5040,

  mass: 83000,
  wingSpan: 56.4,
  wingArea: 371,
  maxThrust: 600000,  // 8x 75kN
  maxSpeed: 280,
  stallSpeed: 90,
  stallAngle: 10,
  engineCount: 8,
  hasPropTorque: false,
  hasAfterburner: false,
  hasVTOL: false,
  isHelicopter: false,
  hasWeapons: true,

  rollRate: 0.25,
  pitchRate: 0.2,
  yawRate: 0.15,

  weapons: [
    { type: 'bomb', name: 'Mk-82', ammo: 51, maxAmmo: 51 },
    { type: 'missile', name: 'AGM-86', ammo: 12, maxAmmo: 12 },
  ],

  cockpitOffset: new THREE.Vector3(0, 2.5, -12),

  buildMesh(group) {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a5040 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

    // Massive fuselage
    const fuseGeo = new THREE.CylinderGeometry(2.2, 1.8, 50, 10);
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    group.add(fuse);

    // Nose bubble
    const noseGeo = new THREE.SphereGeometry(2.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -25;
    group.add(nose);

    // Tail section
    const tailGeo = new THREE.ConeGeometry(1.8, 6, 10);
    tailGeo.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.z = 28;
    group.add(tail);

    // Huge swept wings (B-52 has ~56m wingspan)
    const wingGeo = new THREE.BoxGeometry(56, 0.3, 8);
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    wings.position.set(0, -1, 0);
    wings.rotation.z = -0.04; // slight anhedral
    group.add(wings);

    // 8 engines in 4 pods, 2 per pod, under wings
    const podPositions = [
      [-22, -14], [-15, -10], [10, -10], [17, -14]
    ]; // [x offset, z offset from pod]

    for (const [px, pz] of podPositions) {
      for (const side of [-1, 1]) {
        const bx = side * px;
        addEnginePod(group, bx, -3.5, pz, bodyMat, darkMat);
      }
    }

    // Tail vertical stabilizer (very tall)
    const vStabGeo = new THREE.BoxGeometry(0.4, 9, 6);
    const vStab = new THREE.Mesh(vStabGeo, bodyMat);
    vStab.position.set(0, 5, 22);
    group.add(vStab);

    // Horizontal stabilizer
    const hStabGeo = new THREE.BoxGeometry(18, 0.25, 4);
    const hStab = new THREE.Mesh(hStabGeo, bodyMat);
    hStab.position.set(0, 1, 22);
    group.add(hStab);

    // Bomb bay (underside of fuselage)
    const bayGeo = new THREE.BoxGeometry(4, 0.15, 12);
    const bayMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(0, -2.35, 0);
    group.add(bay);

    // Bomb bay doors (opening/closing)
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const doorGeo = new THREE.BoxGeometry(0.1, 1.8, 12);

    const doorL = new THREE.Mesh(doorGeo, doorMat);
    doorL.position.set(-1.0, -2.35, 0);
    group.add(doorL);

    const doorR = new THREE.Mesh(doorGeo, doorMat);
    doorR.position.set(1.0, -2.35, 0);
    group.add(doorR);

    group.userData.bombBayDoors = { left: doorL, right: doorR };

    // Tail gunner bubble
    const gunGeo = new THREE.SphereGeometry(0.6, 8, 6);
    const gun = new THREE.Mesh(gunGeo, darkMat);
    gun.position.set(0, 0.2, 27);
    group.add(gun);

    // Gun barrels
    for (const dy of [-0.1, 0.1]) {
      const barrelGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, chromeMat);
      barrel.position.set(0, dy, 28.5);
      group.add(barrel);
    }

    // AGM-86 missiles on wings (external load)
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        const missileGeo = new THREE.CylinderGeometry(0.15, 0.12, 3.5, 8);
        missileGeo.rotateX(Math.PI / 2);
        const missileMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const missile = new THREE.Mesh(missileGeo, missileMat);
        missile.position.set(side * (8 + i * 2), -2.8, -3 + i * 0.3);
        group.add(missile);
      }
    }

    // Cockpit windows (small, low profile)
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 4; i++) {
      const wGeo = new THREE.PlaneGeometry(0.8, 0.5);
      const w = new THREE.Mesh(wGeo, glassMat);
      w.position.set(0, 1.5 - i * 0.15, -20 + i * 1);
      group.add(w);
    }
    const wGeo = new THREE.BoxGeometry(4.5, 0.8, 0.1);
    const cockpitWin = new THREE.Mesh(wGeo, glassMat);
    cockpitWin.position.set(0, 2.0, -22);
    group.add(cockpitWin);

    // Quad landing gear bogies
    const gearMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const gx of [-1, 1]) {
      const bogieGeo = new THREE.BoxGeometry(1.5, 0.3, 2);
      const bogie = new THREE.Mesh(bogieGeo, gearMat);
      bogie.position.set(gx * 1.5, -5.5, 0);
      group.add(bogie);

      for (const wx of [-0.6, 0, 0.6]) {
        const wGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
        wGeo.rotateX(Math.PI / 2);
        const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const w = new THREE.Mesh(wGeo, wMat);
        w.position.set(gx * 1.5 + wx, -5.9, 0);
        group.add(w);
      }
    }
  },
};

function addEnginePod(group, x, y, z, bodyMat, darkMat) {
  // Pylon
  const pylonGeo = new THREE.BoxGeometry(0.3, 1.2, 0.4);
  const pylon = new THREE.Mesh(pylonGeo, bodyMat);
  pylon.position.set(x, y + 0.8, z);
  group.add(pylon);

  // Pod nacelle
  const nacGeo = new THREE.CylinderGeometry(0.6, 0.55, 3.5, 8);
  nacGeo.rotateX(Math.PI / 2);
  const nac = new THREE.Mesh(nacGeo, bodyMat);
  nac.position.set(x, y, z);
  group.add(nac);

  // Intake
  const intakeGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 8);
  intakeGeo.rotateX(Math.PI / 2);
  const intake = new THREE.Mesh(intakeGeo, darkMat);
  intake.position.set(x, y, z - 1.85);
  group.add(intake);
}
