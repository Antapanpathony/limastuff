import * as THREE from 'three';
import { addRotorHead } from '../aircraft.js';

export const AH64Config = {
  name: 'AH-64D Apache',
  key: 'ah64',
  description: 'Attack helicopter. T=lock target. N=night vision. Weapons: 30mm chain gun, Hydra rockets, Hellfire.',
  color: 0x3a4a2a,

  mass: 5165,
  wingSpan: 14.63,
  wingArea: 14,
  maxThrust: 130000,
  maxSpeed: 90,
  stallSpeed: 0,
  stallAngle: 90,
  engineCount: 2,
  hasPropTorque: false,
  hasAfterburner: false,
  hasVTOL: false,
  isHelicopter: true,
  hasWeapons: true,
  rotorDiameter: 14.6,

  rollRate: 1.5,
  pitchRate: 1.2,
  yawRate: 2.0,

  weapons: [
    { type: 'gun', name: 'M230 30mm', ammo: 1200, maxAmmo: 1200, rof: 10 },
    { type: 'rocket', name: 'Hydra 70', ammo: 38, maxAmmo: 38 },
    { type: 'missile', name: 'AGM-114 Hellfire', ammo: 16, maxAmmo: 16 },
  ],

  cockpitOffset: new THREE.Vector3(0, 1.0, -1.5),

  buildMesh(group) {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a2010 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0x666655 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x334433, transparent: true, opacity: 0.5 });
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Fuselage
    const fuseGeo = new THREE.BoxGeometry(1.5, 1.3, 5.5);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    fuse.position.set(0, 0, -0.5);
    group.add(fuse);

    // Nose (sensor turret - TADS)
    const tadsGeo = new THREE.SphereGeometry(0.55, 10, 8);
    tadsGeo.scale(1, 0.8, 1.1);
    const tads = new THREE.Mesh(tadsGeo, darkMat);
    tads.position.set(0, -0.2, -3.5);
    group.add(tads);

    // Tandem cockpit (stepped)
    // Rear (pilot) cockpit
    const rearCockpitGeo = new THREE.BoxGeometry(1.2, 0.9, 1.6);
    const rearCockpit = new THREE.Mesh(rearCockpitGeo, bodyMat);
    rearCockpit.position.set(0, 0.8, -0.8);
    group.add(rearCockpit);

    // Front (CPG) cockpit lower
    const frontCockpitGeo = new THREE.BoxGeometry(1.1, 0.75, 1.4);
    const frontCockpit = new THREE.Mesh(frontCockpitGeo, bodyMat);
    frontCockpit.position.set(0, 0.55, -2.2);
    group.add(frontCockpit);

    // Canopy glass
    const rCanopyGeo = new THREE.BoxGeometry(1.0, 0.7, 1.4);
    const rCanopy = new THREE.Mesh(rCanopyGeo, glassMat);
    rCanopy.position.set(0, 1.2, -0.8);
    group.add(rCanopy);

    const fCanopyGeo = new THREE.BoxGeometry(0.9, 0.6, 1.2);
    const fCanopy = new THREE.Mesh(fCanopyGeo, glassMat);
    fCanopy.position.set(0, 0.95, -2.2);
    group.add(fCanopy);

    // Tail boom
    const boomGeo = new THREE.CylinderGeometry(0.3, 0.15, 6, 8);
    boomGeo.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, bodyMat);
    boom.position.set(0, 0.2, 3.5);
    group.add(boom);

    // Tail fin
    const finGeo = new THREE.BoxGeometry(0.08, 1.5, 1.2);
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.position.set(0, 1.0, 6.2);
    group.add(fin);

    // Horizontal tail
    const hTailGeo = new THREE.BoxGeometry(3.5, 0.08, 0.8);
    const hTail = new THREE.Mesh(hTailGeo, bodyMat);
    hTail.position.set(0, 0.1, 6.0);
    group.add(hTail);

    // Main rotor mast
    const mastGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const mast = new THREE.Mesh(mastGeo, chromeMat);
    mast.position.set(0, 1.7, 0);
    group.add(mast);

    // Main rotor (4 blades)
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 2.1, 0);
    const rBladeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 4; i++) {
      const bladeGeo = new THREE.BoxGeometry(7.0, 0.07, 0.45);
      const blade = new THREE.Mesh(bladeGeo, rBladeMat);
      blade.rotation.y = (i / 4) * Math.PI * 2;
      blade.position.x = 3.5;
      rotorGroup.add(blade);
    }
    group.add(rotorGroup);
    group.userData.rotorHead = rotorGroup;

    // Tail rotor
    const tRotorGroup = new THREE.Group();
    tRotorGroup.position.set(0.2, 0.6, 6.5);
    tRotorGroup.rotation.y = Math.PI / 2;
    const tRBladeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 4; i++) {
      const tbladeGeo = new THREE.BoxGeometry(0.9, 0.06, 0.2);
      const tblade = new THREE.Mesh(tbladeGeo, tRBladeMat);
      tblade.rotation.z = (i / 4) * Math.PI * 2;
      tRotorGroup.add(tblade);
    }
    group.add(tRotorGroup);
    group.userData.tailRotor = tRotorGroup;

    // Stub wings (weapons pylons)
    const stubGeo = new THREE.BoxGeometry(5, 0.12, 0.9);
    const stub = new THREE.Mesh(stubGeo, bodyMat);
    stub.position.set(0, 0, 0.2);
    group.add(stub);

    // Hellfire missile racks (4 missiles per side, 2 sides)
    for (const side of [-1, 1]) {
      // Hellfire rack
      const rackGeo = new THREE.BoxGeometry(0.15, 0.6, 1.5);
      const rack = new THREE.Mesh(rackGeo, darkMat);
      rack.position.set(side * 2.2, -0.15, 0.2);
      group.add(rack);

      for (let i = 0; i < 4; i++) {
        const hellGeo = new THREE.CylinderGeometry(0.08, 0.07, 1.6, 6);
        hellGeo.rotateX(Math.PI / 2);
        const hellMat = new THREE.MeshLambertMaterial({ color: 0x888877 });
        const hell = new THREE.Mesh(hellGeo, hellMat);
        hell.position.set(side * 2.2 + (i % 2 === 0 ? -0.15 : 0.15), -0.3 + Math.floor(i/2) * 0.3, 0.2);
        group.add(hell);
      }

      // Hydra 70 rocket pod
      const podGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.8, 8);
      podGeo.rotateX(Math.PI / 2);
      const podMat = new THREE.MeshLambertMaterial({ color: 0x666655 });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(side * 1.2, -0.12, 0.2);
      group.add(pod);
    }

    // M230 30mm chain gun (under nose, chin-mounted)
    const gunBarrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6);
    gunBarrelGeo.rotateX(Math.PI / 2);
    const gunBarrel = new THREE.Mesh(gunBarrelGeo, gunMat);
    gunBarrel.position.set(0, -0.85, -2.5);
    group.add(gunBarrel);

    const gunBodyGeo = new THREE.BoxGeometry(0.3, 0.35, 0.8);
    const gunBody = new THREE.Mesh(gunBodyGeo, gunMat);
    gunBody.position.set(0, -0.85, -1.8);
    group.add(gunBody);

    // Dual engines (above mid-fuselage)
    for (const side of [-1, 1]) {
      const engGeo = new THREE.BoxGeometry(0.45, 0.45, 1.2);
      const eng = new THREE.Mesh(engGeo, darkMat);
      eng.position.set(side * 0.65, 1.0, 0.3);
      group.add(eng);

      // Exhaust suppressor
      const exGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6);
      exGeo.rotateZ(Math.PI / 2);
      const ex = new THREE.Mesh(exGeo, darkMat);
      ex.position.set(side * 0.65, 1.05, 0.95);
      group.add(ex);
    }

    // Fixed wheeled gear (tailwheel type for Apache)
    const gearMat = new THREE.MeshLambertMaterial({ color: 0x333322 });
    for (const side of [-1, 1]) {
      for (const fwd of [-1, 1]) {
        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0);
        const leg = new THREE.Mesh(legGeo, gearMat);
        leg.position.set(side * 1.2, -1.15, fwd * 0.8);
        group.add(leg);

        const wGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 10);
        wGeo.rotateX(Math.PI / 2);
        const w = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
        w.position.set(side * 1.2, -1.65, fwd * 0.8);
        group.add(w);
      }
    }

    // Tail wheel
    const tWGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const tW = new THREE.Mesh(tWGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
    tW.position.set(0, -0.5, 6.3);
    group.add(tW);
  },
};
