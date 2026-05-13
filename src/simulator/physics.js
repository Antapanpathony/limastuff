import * as THREE from 'three';

// Standard atmosphere density (kg/m³) at altitude (meters)
function airDensity(altitude) {
  const rho0 = 1.225; // sea level
  const H = 8500;     // scale height
  return rho0 * Math.exp(-altitude / H);
}

// Clamp helper
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class AircraftPhysics {
  constructor() {
    this.position = new THREE.Vector3(0, 500, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3(0, 0, 0);

    this.throttle = 0;
    this.flaps = 0;       // 0-3 notches
    this.gearDown = true;
    this.onGround = false;
    this.groundHeight = 0;

    // Helicopter specific
    this.collective = 0;  // 0-1
    this.cyclicPitch = 0;
    this.cyclicRoll = 0;
    this.tailRotor = 0;

    // Computed
    this.airspeed = 0;
    this.alpha = 0;        // angle of attack (rad)
    this.gForce = 1.0;
    this.verticalSpeed = 0;
    this.altitude = 500;
    this.heading = 0;

    // Afterburner
    this.afterburner = false;
    this.vtolMode = false;

    // VTOL nozzle angle (degrees, 0=forward, 90=down)
    this.nozzleAngle = 0;

    this._prevAltitude = 500;
  }

  update(dt, config, weather, terrainHeight) {
    if (!config) return;

    this._prevAltitude = this.position.y;
    this.groundHeight = terrainHeight;
    this.altitude = this.position.y;

    if (config.isHelicopter) {
      this._updateHelicopter(dt, config, weather, terrainHeight);
    } else {
      this._updateFixedWing(dt, config, weather, terrainHeight);
    }

    // Update derived values
    this.airspeed = this.velocity.length();
    this.verticalSpeed = (this.position.y - this._prevAltitude) / dt;
    this.heading = THREE.MathUtils.radToDeg(this.rotation.y);
    if (this.heading < 0) this.heading += 360;
  }

  _updateFixedWing(dt, config, weather, terrainHeight) {
    const gravity = new THREE.Vector3(0, -9.81 * config.mass, 0);

    // Aircraft orientation vectors
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(this.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);

    // Wind effect
    const wind = weather ? weather.getWind() : new THREE.Vector3();
    const turbulence = weather ? weather.getTurbulence() : new THREE.Vector3();
    const relativeVelocity = this.velocity.clone().sub(wind);

    const speed = relativeVelocity.length();
    const speedSq = speed * speed;

    // Angle of attack: angle between velocity vector and aircraft forward in pitch plane
    const velNorm = speed > 0.1 ? relativeVelocity.clone().normalize() : forward.clone();
    this.alpha = Math.asin(clamp(velNorm.dot(up) * -1, -1, 1)); // negative because up is opposite to alpha convention

    // Air density
    const rho = airDensity(this.position.y);

    // Dynamic pressure
    const q = 0.5 * rho * speedSq;

    // Flap CL/CD increments
    const flapAngle = this.flaps * 10; // degrees per notch
    const flapCL = flapAngle * 0.02;
    const flapCD = flapAngle * 0.002;

    // Lift coefficient (linear with alpha, stall)
    const stallAngle = config.stallAngle * Math.PI / 180;
    const CLalpha = 5.7; // lift slope per radian
    let CL = CLalpha * this.alpha + flapCL;

    // Stall
    if (Math.abs(this.alpha) > stallAngle) {
      const excess = Math.abs(this.alpha) - stallAngle;
      CL *= Math.max(0, 1 - excess * 3);
    }

    // Drag coefficient
    const CD0 = 0.025;
    const k = 0.04; // induced drag factor
    let CD = CD0 + k * CL * CL + flapCD;
    if (this.gearDown) CD += 0.015;

    // Ground effect: increase lift when close to ground
    const agl = this.position.y - terrainHeight;
    let groundEffectFactor = 1.0;
    if (agl < config.wingSpan) {
      groundEffectFactor = 1 + 0.5 * (1 - agl / config.wingSpan);
    }

    // Lift and drag forces
    const liftMag = q * config.wingArea * CL * groundEffectFactor;
    const dragMag = q * config.wingArea * CD;

    // Thrust
    let thrustMag = config.maxThrust * this.throttle;
    if (this.afterburner && config.hasAfterburner) {
      thrustMag *= 2.5;
    }

    // VTOL: split thrust between forward and downward
    let forwardThrust = thrustMag;
    let verticalThrust = 0;
    if (this.vtolMode && config.hasVTOL) {
      const angle = this.nozzleAngle * Math.PI / 180;
      forwardThrust = thrustMag * Math.cos(angle);
      verticalThrust = thrustMag * Math.sin(angle);
    }

    // Force vectors in world space
    const liftForce = up.clone().multiplyScalar(liftMag);
    const dragForce = relativeVelocity.clone().normalize().multiplyScalar(-dragMag);
    const thrustForce = forward.clone().multiplyScalar(forwardThrust);
    const vtolForce = new THREE.Vector3(0, verticalThrust, 0);

    // Propeller torque (single-engine props only)
    let propTorque = new THREE.Vector3();
    if (config.hasPropTorque && config.engineCount === 1) {
      const torqueMag = thrustMag * 0.05;
      propTorque.set(0, 0, -torqueMag / config.mass); // roll left tendency
    }

    // Total force
    const totalForce = new THREE.Vector3()
      .add(gravity)
      .add(liftForce)
      .add(dragForce)
      .add(thrustForce)
      .add(vtolForce)
      .add(turbulence.clone().multiplyScalar(config.mass * 0.1));

    // Acceleration
    const acceleration = totalForce.divideScalar(config.mass);

    // Update velocity
    this.velocity.addScaledVector(acceleration, dt);

    // Update position
    this.position.addScaledVector(this.velocity, dt);

    // G-force
    const netUpAccel = acceleration.dot(up);
    this.gForce = (netUpAccel + 9.81) / 9.81;

    // --- Angular dynamics ---
    // Control inputs → angular acceleration
    const axes = this._currentAxes || { pitch: 0, roll: 0, yaw: 0 };
    const rollRate = config.rollRate || 1.5;
    const pitchRate = config.pitchRate || 0.8;
    const yawRate = config.yawRate || 0.3;

    // Desired angular velocity (rad/s)
    const targetAngVel = new THREE.Vector3(
      axes.pitch * pitchRate,
      -axes.yaw * yawRate,
      -axes.roll * rollRate
    );

    // Angular velocity in body frame tracks toward target
    const angDamp = 3.0;
    this.angularVelocity.lerp(targetAngVel, dt * angDamp);
    this.angularVelocity.add(propTorque.multiplyScalar(dt));

    // Apply angular velocity to rotation
    this.rotation.x += this.angularVelocity.x * dt;
    this.rotation.y += this.angularVelocity.y * dt;
    this.rotation.z += this.angularVelocity.z * dt;

    // Natural stability: bank → yaw (coordinated turn)
    const bankAngle = this.rotation.z;
    this.rotation.y -= Math.sin(bankAngle) * 0.3 * dt;

    // Natural pitch stability: tend to level pitch
    this.rotation.x *= 0.999;

    // Clamp pitch
    this.rotation.x = clamp(this.rotation.x, -Math.PI / 2.5, Math.PI / 2.5);

    // Ground collision
    const minAlt = terrainHeight + (this.gearDown ? 1.5 : 0.5);
    if (this.position.y < minAlt) {
      this.position.y = minAlt;
      this.onGround = true;

      // Ground friction and bounce prevention
      if (this.velocity.y < 0) {
        // Hard landing detection
        const impact = Math.abs(this.velocity.y);
        this.velocity.y = 0;

        // Ground friction
        const friction = 0.97;
        this.velocity.x *= friction;
        this.velocity.z *= friction;
      }

      // Level the aircraft on ground
      this.rotation.x *= 0.9;
      this.rotation.z *= 0.9;
      this.angularVelocity.set(0, 0, 0);
    } else {
      this.onGround = false;
    }
  }

  _updateHelicopter(dt, config, weather, terrainHeight) {
    const gravity = new THREE.Vector3(0, -9.81 * config.mass, 0);

    const up = new THREE.Vector3(0, 1, 0).applyEuler(this.rotation);
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);

    // Wind
    const wind = weather ? weather.getWind() : new THREE.Vector3();
    const turbulence = weather ? weather.getTurbulence() : new THREE.Vector3();

    // Rotor thrust: collective × maxThrust upward in rotor plane
    const rho = airDensity(this.position.y);
    const rhoFactor = rho / 1.225;
    const collectiveMag = this._currentAxes ? this._currentAxes.throttle : 0;

    // Translational lift bonus
    const horizSpeed = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).length();
    const translLift = Math.min(1.2, 1 + horizSpeed / 30);

    // Ground effect
    const agl = this.position.y - terrainHeight;
    const rotorDiam = config.rotorDiameter || 10;
    const groundEffect = agl < rotorDiam ? (1 + 0.3 * (1 - agl / rotorDiam)) : 1;

    const rotorThrust = collectiveMag * config.maxThrust * rhoFactor * translLift * groundEffect;
    const thrustForce = up.clone().multiplyScalar(rotorThrust);

    // Cyclic: tilt thrust vector
    const axes = this._currentAxes || { pitch: 0, roll: 0, yaw: 0, throttle: 0 };
    const cyclicForce = forward.clone().multiplyScalar(-axes.pitch * rotorThrust * 0.3)
      .addScaledVector(right, axes.roll * rotorThrust * 0.3);

    // Tail rotor (anti-torque + yaw)
    // Torque reaction from main rotor
    const torqueReaction = config.mass * 9.81 * 0.01; // reaction torque
    const tailRotorYaw = axes.yaw * 2.0 - torqueReaction / (config.mass);

    // Total force
    const totalForce = new THREE.Vector3()
      .add(gravity)
      .add(thrustForce)
      .add(cyclicForce)
      .add(turbulence.clone().multiplyScalar(config.mass * 0.1));

    const acceleration = totalForce.divideScalar(config.mass);
    this.velocity.addScaledVector(acceleration, dt);

    // Aerodynamic drag on helicopter
    const dragFactor = 0.5 * rho * 5.0; // approximate drag area
    const drag = this.velocity.clone().multiplyScalar(-dragFactor * dt);
    this.velocity.add(drag);

    this.position.addScaledVector(this.velocity, dt);

    // Angular control
    const targetPitch = axes.pitch * 0.4;
    const targetRoll = axes.roll * 0.4;

    this.rotation.x += (targetPitch - this.rotation.x) * dt * 3;
    this.rotation.z += (targetRoll - this.rotation.z) * dt * 3;
    this.rotation.y += tailRotorYaw * dt;

    // Ground collision
    const minAlt = terrainHeight + 2;
    if (this.position.y < minAlt) {
      this.position.y = minAlt;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.velocity.x *= 0.95;
      this.velocity.z *= 0.95;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.airspeed = this.velocity.length();
    this.gForce = 1.0 + (acceleration.y + 9.81) / 9.81;
  }

  setAxes(axes) {
    this._currentAxes = axes;
  }

  reset(position, heading) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, heading || 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.throttle = 0;
    this.flaps = 0;
    this.gearDown = true;
    this.onGround = false;
    this.afterburner = false;
    this.vtolMode = false;
    this.nozzleAngle = 0;
  }
}
