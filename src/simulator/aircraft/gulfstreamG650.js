import * as THREE from 'three';

export const GulfstreamG650Config = {
  name: 'Gulfstream G650',
  key: 'gulfstreamG650',
  description: 'Ultra-long range heavy business jet. Twin Rolls-Royce BR725 engines. Mach 0.925.',
  color: 0xf0f0f0,

  mass: 22000,
  wingSpan: 30.4,
  wingArea: 105,
  maxThrust: 142000,  // 2x 71kN
  maxSpeed: 270,
  stallSpeed: 65,
  stallAngle: 13,
  engineCount: 2,
  hasPropTorque: false,
  hasAfterburner: false,
  hasVTOL: false,
  isHelicopter: false,
  hasWeapons: false,

  rollRate: 0.5,
  pitchRate: 0.35,
  yawRate: 0.2,

  weapons: [],
  cockpitOffset: new THREE.Vector3(0, 2.2, -3.0),

  buildMesh(group) {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x1a3a6e });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });

    // Long fuselage
    const fuseGeo = new THREE.CylinderGeometry(1.4, 1.2, 30, 12);
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    group.add(fuse);

    // Nose (pointed)
    const noseGeo = new THREE.ConeGeometry(1.4, 4, 12);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = -17;
    group.add(nose);

    // Tail cone
    const tailGeo = new THREE.ConeGeometry(1.2, 3, 12);
    tailGeo.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.z = 16.5;
    group.add(tail);

    // Swept wings
    const wingL = buildSweptWing(group, -1, bodyMat);
    const wingR = buildSweptWing(group, 1, bodyMat);

    // Horizontal stabilizer
    const hStabGeo = new THREE.BoxGeometry(12, 0.15, 3.5);
    const hStab = new THREE.Mesh(hStabGeo, bodyMat);
    hStab.position.set(0, 0.3, 12.5);
    group.add(hStab);

    // Vertical stabilizer (tall)
    const vStabGeo = new THREE.BoxGeometry(0.15, 5, 4);
    const vStab = new THREE.Mesh(vStabGeo, bodyMat);
    vStab.position.set(0, 3.2, 12);
    group.add(vStab);

    // Accent stripe (dark blue cheatline)
    const cheatGeo = new THREE.BoxGeometry(1.42, 0.35, 28);
    const cheat = new THREE.Mesh(cheatGeo, accentMat);
    cheat.position.set(0, 0.4, 0);
    group.add(cheat);

    // Twin rear-mounted engines (on tail)
    for (const side of [-1, 1]) {
      const engGeo = new THREE.CylinderGeometry(0.7, 0.65, 4.5, 10);
      engGeo.rotateX(Math.PI / 2);
      const eng = new THREE.Mesh(engGeo, darkMat);
      eng.position.set(side * 2.2, 0.4, 10);
      group.add(eng);

      // Engine intake
      const intakeGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.4, 10);
      intakeGeo.rotateX(Math.PI / 2);
      const intake = new THREE.Mesh(intakeGeo, darkMat);
      intake.position.set(side * 2.2, 0.4, 7.7);
      group.add(intake);

      // Engine exhaust glow
      const exhaustGeo = new THREE.CylinderGeometry(0.55, 0.4, 0.3, 10);
      exhaustGeo.rotateX(Math.PI / 2);
      const exhaustMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
      exhaust.position.set(side * 2.2, 0.4, 12.3);
      group.add(exhaust);
    }

    // Cockpit windows
    for (let i = 0; i < 3; i++) {
      const winGeo = new THREE.PlaneGeometry(0.6, 0.45);
      const win = new THREE.Mesh(winGeo, glassMat);
      win.position.set(1.41, 0.6 + i * 0.01, -10 + i * 0.8);
      win.rotation.y = Math.PI / 2;
      group.add(win);
      const win2 = win.clone();
      win2.position.x = -1.41;
      win2.rotation.y = -Math.PI / 2;
      group.add(win2);
    }

    // Landing gear
    const gearMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    for (const side of [-1, 1]) {
      const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5);
      const leg = new THREE.Mesh(legGeo, gearMat);
      leg.position.set(side * 4, -1.9, 0);
      group.add(leg);

      for (const fw of [-0.5, 0.5]) {
        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12);
        wheelGeo.rotateX(Math.PI / 2);
        const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const wheel = new THREE.Mesh(wheelGeo, wMat);
        wheel.position.set(side * 4, -3.2, fw);
        group.add(wheel);
      }
    }

    // Nose gear
    const nLegGeo = new THREE.CylinderGeometry(0.08, 0.08, 2);
    const nLeg = new THREE.Mesh(nLegGeo, gearMat);
    nLeg.position.set(0, -1.9, -8);
    group.add(nLeg);
    const nWheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 12);
    nWheelGeo.rotateX(Math.PI / 2);
    const nWheel = new THREE.Mesh(nWheelGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
    nWheel.position.set(0, -2.9, -8);
    group.add(nWheel);
  },
};

function buildSweptWing(group, side, mat) {
  // Swept wing shape using a custom geometry
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(side * 15, side * 4); // leading edge sweep
  shape.lineTo(side * 15, side * 4 + 2.5);
  shape.lineTo(0, 3.5);
  shape.closePath();

  const extrudeSettings = { depth: 0.12, bevelEnabled: false };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.06, 0);
  group.add(mesh);
  return mesh;
}
