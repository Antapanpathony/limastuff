import * as THREE from 'three';
import { addAfterburnerGlow } from '../aircraft.js';

export const F35Config = {
  name: 'F-35B Lightning II',
  key: 'f35',
  description: 'Supersonic stealth fighter. Shift+W = afterburner. V = VTOL mode. Weapons: gun, AMRAAM, GBU-12.',
  color: 0x556677,

  mass: 13290,
  wingSpan: 10.7,
  wingArea: 42.7,
  maxThrust: 191000,  // F135 with afterburner
  maxSpeed: 560,
  stallSpeed: 55,
  stallAngle: 18,
  engineCount: 1,
  hasPropTorque: false,
  hasAfterburner: true,
  hasVTOL: true,
  isHelicopter: false,
  hasWeapons: true,

  rollRate: 2.5,
  pitchRate: 1.8,
  yawRate: 0.6,

  weapons: [
    { type: 'gun', name: 'GAU-22/A 25mm', ammo: 182, maxAmmo: 182, rof: 20 },
    { type: 'missile', name: 'AIM-120 AMRAAM', ammo: 4, maxAmmo: 4 },
    { type: 'bomb', name: 'GBU-12 Paveway', ammo: 2, maxAmmo: 2 },
  ],

  cockpitOffset: new THREE.Vector3(0, 1.2, -1.5),

  buildMesh(group) {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x556677 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x222233 });
    const nozzleMat = new THREE.MeshLambertMaterial({ color: 0x666677 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x4488aa, transparent: true, opacity: 0.5 });

    // Faceted fuselage (stealth shaping)
    const fuseGeo = new THREE.BoxGeometry(1.6, 1.0, 14);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    group.add(fuse);

    // Nose (tapered, faceted)
    const noseGeo = new THREE.ConeGeometry(0.8, 4.5, 4);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.rotateY(Math.PI / 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = -9.25;
    group.add(nose);

    // Delta wings with cranked leading edge
    const wingGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      // Left wing
      -0.8, -0.1, 0,    // fuselage left
      -5.2, -0.1, 2,    // tip rear
      -5.2, -0.1, -2,   // tip front
      -0.8, -0.1, -5,   // root front
    ]);
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    wingGeo.setIndex([0,1,2, 0,2,3]);
    wingGeo.computeVertexNormals();

    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(wingGeo, bodyMat);
      if (side === 1) w.scale.x = -1;
      group.add(w);
    }

    // Horizontal stabilizers (all-moving)
    const hStabGeo = new THREE.BoxGeometry(4, 0.08, 2.0);
    const hStab = new THREE.Mesh(hStabGeo, bodyMat);
    hStab.position.set(0, 0, 5.5);
    group.add(hStab);

    // Vertical stabilizer (canted slightly)
    const vStabGeo = new THREE.BoxGeometry(0.1, 2.5, 2.5);
    const vStab = new THREE.Mesh(vStabGeo, bodyMat);
    vStab.position.set(0, 1.5, 4.5);
    vStab.rotation.z = 0.15;
    group.add(vStab);

    // DSI intake (divertless supersonic inlet)
    const intakeGeo = new THREE.BoxGeometry(0.9, 0.6, 3.0);
    const intake = new THREE.Mesh(intakeGeo, darkMat);
    intake.position.set(0, -0.4, -3);
    group.add(intake);

    // Engine exhaust nozzle (vectorable for VTOL)
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(0, 0, 7.5);

    const nozGeo = new THREE.CylinderGeometry(0.55, 0.5, 2.5, 10);
    nozGeo.rotateX(Math.PI / 2);
    const noz = new THREE.Mesh(nozGeo, nozzleMat);
    nozzleGroup.add(noz);

    // Afterburner glow inside nozzle
    const abGlowGeo = new THREE.CylinderGeometry(0.4, 0.6, 3.5, 8);
    abGlowGeo.rotateX(Math.PI / 2);
    const abGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const abGlow = new THREE.Mesh(abGlowGeo, abGlowMat);
    abGlow.position.z = 2;
    abGlow.visible = false;
    nozzleGroup.add(abGlow);
    group.userData.afterburnerGlow = abGlow;

    group.add(nozzleGroup);
    group.userData.nozzle = nozzleGroup;

    // Lift fan door (VTOL - B variant feature)
    const fanDoorGeo = new THREE.BoxGeometry(0.9, 0.08, 0.9);
    const fanDoor = new THREE.Mesh(fanDoorGeo, bodyMat);
    fanDoor.position.set(0, 0.5, -1);
    group.add(fanDoor);

    // Canopy
    const canopyGeo = new THREE.BoxGeometry(0.9, 0.6, 2.5);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.65, -1.5);
    group.add(canopy);

    // Internal weapon bay (just a recess)
    const bayGeo = new THREE.BoxGeometry(0.8, 0.1, 4);
    const bayMat = new THREE.MeshLambertMaterial({ color: 0x111122 });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(0, -0.5, 0);
    group.add(bay);

    // Landing gear
    const gearMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    for (const side of [-1, 1]) {
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
      const leg = new THREE.Mesh(legGeo, gearMat);
      leg.position.set(side * 1.8, -1.3, 0.5);
      group.add(leg);
      const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10);
      wGeo.rotateX(Math.PI / 2);
      const w = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
      w.position.set(side * 1.8, -2.2, 0.5);
      group.add(w);
    }

    // Nose gear
    const nLegGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.5);
    const nLegMesh = new THREE.Mesh(nLegGeo, gearMat);
    nLegMesh.position.set(0, -1.2, -4.5);
    group.add(nLegMesh);
  },
};
