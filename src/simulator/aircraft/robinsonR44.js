import * as THREE from 'three';
import { addRotorHead } from '../aircraft.js';

export const RobinsonR44Config = {
  name: 'Robinson R44 Raven',
  key: 'robinsonR44',
  description: 'Light piston helicopter. W/S = collective. Arrows/mouse = cyclic. A/D = tail rotor.',
  color: 0xff4400,

  mass: 621,
  wingSpan: 10.1,
  wingArea: 10,
  maxThrust: 9000,
  maxSpeed: 55,
  stallSpeed: 0,
  stallAngle: 90,
  engineCount: 1,
  hasPropTorque: false,
  hasAfterburner: false,
  hasVTOL: false,
  isHelicopter: true,
  hasWeapons: false,
  rotorDiameter: 10.1,

  rollRate: 1.2,
  pitchRate: 1.0,
  yawRate: 1.5,

  weapons: [],
  cockpitOffset: new THREE.Vector3(0, 0.9, 0.1),

  buildMesh(group) {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff4400 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });

    // Cabin (egg-shaped body)
    const cabinGeo = new THREE.SphereGeometry(1.1, 10, 8);
    cabinGeo.scale(1.0, 0.85, 1.5);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0, -0.5);
    group.add(cabin);

    // Bubble canopy (glass front)
    const canopyGeo = new THREE.SphereGeometry(1.05, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.rotation.x = Math.PI / 2;
    canopy.scale.set(1, 0.8, 0.8);
    canopy.position.set(0, 0.4, -1.3);
    group.add(canopy);

    // Tail boom (thin rod going back)
    const boomGeo = new THREE.CylinderGeometry(0.15, 0.08, 5.5, 8);
    boomGeo.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, bodyMat);
    boom.position.set(0, 0.2, 3.2);
    group.add(boom);

    // Tail fin
    const finGeo = new THREE.BoxGeometry(0.08, 0.9, 0.7);
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.position.set(0, 0.5, 5.5);
    group.add(fin);

    // Horizontal tail plane
    const hTailGeo = new THREE.BoxGeometry(1.5, 0.06, 0.5);
    const hTail = new THREE.Mesh(hTailGeo, bodyMat);
    hTail.position.set(0, 0.1, 5.5);
    group.add(hTail);

    // Skid gear (2 skids)
    for (const side of [-1, 1]) {
      const skidGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.5, 6);
      skidGeo.rotateX(Math.PI / 2);
      const skid = new THREE.Mesh(skidGeo, chromeMat);
      skid.position.set(side * 0.85, -1.2, 0.5);
      group.add(skid);

      // Skid cross tubes
      for (const fz of [-0.8, 0.8]) {
        const crossGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
        crossGeo.rotateZ(Math.PI / 2);
        const cross = new THREE.Mesh(crossGeo, chromeMat);
        cross.position.set(0, -0.85, fz);
        group.add(cross);
      }
    }

    // Engine (above cabin)
    const engGeo = new THREE.BoxGeometry(0.6, 0.5, 0.7);
    const eng = new THREE.Mesh(engGeo, darkMat);
    eng.position.set(0, 1.0, 0.2);
    group.add(eng);

    // Main rotor mast
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    const mast = new THREE.Mesh(mastGeo, chromeMat);
    mast.position.set(0, 1.45, 0.2);
    group.add(mast);

    // Main rotor head (2 blades)
    const rotor = addRotorHead(group, 0, 1.7, 0.2, 2, 4.8);
    group.userData.rotorHead = rotor;

    // Tail rotor
    const tailRotorGroup = new THREE.Group();
    tailRotorGroup.position.set(0.15, 0.3, 5.5);
    tailRotorGroup.rotation.y = Math.PI / 2;

    const trBladeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 2; i++) {
      const tbladeGeo = new THREE.BoxGeometry(1.2, 0.06, 0.2);
      const tblade = new THREE.Mesh(tbladeGeo, trBladeMat);
      tblade.rotation.z = i * Math.PI;
      tailRotorGroup.add(tblade);
    }
    group.add(tailRotorGroup);
    group.userData.tailRotor = tailRotorGroup;

    // Exhaust stack
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6);
    const exhaust = new THREE.Mesh(exhaustGeo, darkMat);
    exhaust.position.set(0.3, 1.15, -0.1);
    exhaust.rotation.z = 0.3;
    group.add(exhaust);
  },
};
