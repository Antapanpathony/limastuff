import * as THREE from 'three';
import { addGear, addPropeller } from '../aircraft.js';

export const Cessna172Config = {
  name: 'Cessna 172 Skyhawk',
  key: 'cessna172',
  description: 'Classic general aviation trainer. Docile handling, slow and forgiving.',
  color: 0xe8e8e8,

  // Physics
  mass: 757,
  wingSpan: 11,
  wingArea: 16.2,
  maxThrust: 2300,
  maxSpeed: 74,
  stallSpeed: 24,
  stallAngle: 16,
  engineCount: 1,
  hasPropTorque: true,
  hasAfterburner: false,
  hasVTOL: false,
  isHelicopter: false,
  hasWeapons: false,

  // Handling
  rollRate: 0.9,
  pitchRate: 0.5,
  yawRate: 0.25,

  // Weapons (none)
  weapons: [],

  // Cockpit offset: pilot eye position relative to aircraft center
  cockpitOffset: new THREE.Vector3(0, 1.1, 0.4),

  buildMesh(group) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8e8ff });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // Fuselage - tapered box
    const fuseGeo = new THREE.BoxGeometry(1.1, 1.1, 7.5);
    const fuse = new THREE.Mesh(fuseGeo, mat);
    fuse.position.set(0, 0, 0);
    group.add(fuse);

    // Nose cone
    const noseGeo = new THREE.ConeGeometry(0.55, 1.2, 8);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, mat);
    nose.position.set(0, 0, -4.35);
    group.add(nose);

    // Blue stripe along fuselage
    const stripeGeo = new THREE.BoxGeometry(1.12, 0.25, 7.5);
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.set(0, 0.1, 0);
    group.add(stripe);

    // High wing
    const wingGeo = new THREE.BoxGeometry(10.7, 0.12, 1.8);
    const wing = new THREE.Mesh(wingGeo, mat);
    wing.position.set(0, 0.6, 0.3);
    group.add(wing);

    // Wing struts
    for (const side of [-1, 1]) {
      const strutGeo = new THREE.BoxGeometry(0.06, 1.0, 1.5);
      const strut = new THREE.Mesh(strutGeo, darkMat);
      strut.position.set(side * 2.5, 0.1, 0.2);
      group.add(strut);
    }

    // Horizontal stabilizer
    const hStabGeo = new THREE.BoxGeometry(3.4, 0.1, 1.1);
    const hStab = new THREE.Mesh(hStabGeo, mat);
    hStab.position.set(0, 0.05, 3.4);
    group.add(hStab);

    // Vertical stabilizer
    const vStabGeo = new THREE.BoxGeometry(0.1, 1.3, 1.2);
    const vStab = new THREE.Mesh(vStabGeo, accentMat);
    vStab.position.set(0, 0.75, 3.2);
    group.add(vStab);

    // Cockpit windows (transparent)
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88aabb, transparent: true, opacity: 0.5 });
    const windshieldGeo = new THREE.BoxGeometry(0.9, 0.7, 0.12);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 0.5, -1.5);
    windshield.rotation.x = -0.2;
    group.add(windshield);

    // Landing gear (fixed on Cessna)
    const gearMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const side of [-1, 1]) {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0);
      const leg = new THREE.Mesh(legGeo, gearMat);
      leg.position.set(side * 1.5, -0.85, -0.5);
      group.add(leg);

      const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12);
      wheelGeo.rotateX(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(side * 1.5, -1.3, -0.5);
      group.add(wheel);
    }
    // Tail wheel
    const tailWheelGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const tailWheel = new THREE.Mesh(tailWheelGeo, darkMat);
    tailWheel.position.set(0, -0.7, 3.5);
    group.add(tailWheel);

    // Propeller
    const prop = addPropeller(group, 0, 0, -4.9);
    group._propeller = prop;
    group.userData.propeller = prop;
  },
};
