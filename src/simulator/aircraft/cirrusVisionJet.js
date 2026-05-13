import * as THREE from 'three';

export const CirrusVisionJetConfig = {
  name: 'Cirrus SF50 Vision Jet',
  key: 'cirrusVisionJet',
  description: 'Single-engine personal jet. Emergency parachute system. Press P to deploy CAPS.',
  color: 0xffffff,

  mass: 1800,
  wingSpan: 11.7,
  wingArea: 13.5,
  maxThrust: 6850,
  maxSpeed: 185,
  stallSpeed: 38,
  stallAngle: 14,
  engineCount: 1,
  hasPropTorque: false,
  hasAfterburner: false,
  hasVTOL: false,
  isHelicopter: false,
  hasWeapons: false,

  rollRate: 1.4,
  pitchRate: 0.8,
  yawRate: 0.3,

  weapons: [],
  cockpitOffset: new THREE.Vector3(0, 1.0, 0.2),

  buildMesh(group) {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0xcc2200 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });

    // Sleek fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.7, 0.5, 8, 10);
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    group.add(fuse);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.7, 1.8, 10);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = -4.9;
    group.add(nose);

    // Low wing
    const wingGeo = new THREE.BoxGeometry(11.5, 0.1, 1.6);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.set(0, -0.2, 0.5);
    group.add(wing);

    // Winglets
    for (const side of [-1, 1]) {
      const wletGeo = new THREE.BoxGeometry(0.1, 0.7, 0.6);
      const wlet = new THREE.Mesh(wletGeo, accentMat);
      wlet.position.set(side * 5.85, 0.15, 0.5);
      group.add(wlet);
    }

    // T-tail horizontal
    const hStabGeo = new THREE.BoxGeometry(3.5, 0.1, 1.0);
    const hStab = new THREE.Mesh(hStabGeo, bodyMat);
    hStab.position.set(0, 1.4, 3.6);
    group.add(hStab);

    // Vertical stabilizer
    const vStabGeo = new THREE.BoxGeometry(0.1, 1.5, 1.4);
    const vStab = new THREE.Mesh(vStabGeo, bodyMat);
    vStab.position.set(0, 0.8, 3.3);
    group.add(vStab);

    // Rear-mounted engine (over fuselage, above tail)
    const engGeo = new THREE.CylinderGeometry(0.35, 0.32, 2.2, 10);
    engGeo.rotateX(Math.PI / 2);
    const eng = new THREE.Mesh(engGeo, darkMat);
    eng.position.set(0, 0.85, 2.8);
    group.add(eng);

    // Engine intake
    const intakeGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.3, 10);
    intakeGeo.rotateX(Math.PI / 2);
    const intake = new THREE.Mesh(intakeGeo, darkMat);
    intake.position.set(0, 0.85, 1.7);
    group.add(intake);

    // Cockpit canopy
    const canopyGeo = new THREE.SphereGeometry(0.75, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.4, -1.5);
    canopy.scale.set(1, 0.8, 1.6);
    group.add(canopy);

    // Red accent stripe
    const stripeGeo = new THREE.BoxGeometry(0.72, 0.12, 6);
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.set(0, 0, 0);
    group.add(stripe);

    // Retractable gear stubs
    for (const side of [-1, 1]) {
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7);
      const legMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(side * 1.2, -0.55, 0.5);
      group.add(leg);
      group.userData.gearLegs = group.userData.gearLegs || [];
      group.userData.gearLegs.push({ mesh: leg, _downY: -0.55, _upY: -0.1 });
    }
  },
};
