import * as THREE from 'three';

// Weather states
export const WeatherState = {
  CLEAR: 'clear',
  OVERCAST: 'overcast',
  RAIN: 'rain',
  STORM: 'storm',
};

// Sky colors for different times of day
const SKY_COLORS = {
  night:    new THREE.Color(0x05070f),
  dawn:     new THREE.Color(0xff7733),
  day:      new THREE.Color(0x87ceeb),
  dusk:     new THREE.Color(0xff5522),
};

const AMBIENT_COLORS = {
  night: new THREE.Color(0x102030),
  dawn:  new THREE.Color(0xff9966),
  day:   new THREE.Color(0xffffff),
  dusk:  new THREE.Color(0xff8844),
};

// 1 real minute = 1 game hour → full cycle = 24 real minutes
const DAY_CYCLE_SECONDS = 24 * 60; // 24 min real time

function lerpColor(a, b, t) {
  return a.clone().lerp(b, t);
}

export class Environment {
  constructor(scene) {
    this._scene = scene;
    this._time = 0;        // seconds (0..DAY_CYCLE_SECONDS)
    this._timeOfDay = 0.4; // 0..1 fraction of day (0.4 = ~10am)
    this._weather = WeatherState.CLEAR;

    this._wind = new THREE.Vector3(2, 0, 1); // base wind
    this._windGust = new THREE.Vector3();
    this._turbulence = new THREE.Vector3();
    this._gustTimer = 0;

    this._setupLights();
    this._setupFog();
    this._setupStars();
    this._setupRain();

    this._updateSky();
  }

  _setupLights() {
    this._sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 5000;
    this._sunLight.shadow.camera.left = -2000;
    this._sunLight.shadow.camera.right = 2000;
    this._sunLight.shadow.camera.top = 2000;
    this._sunLight.shadow.camera.bottom = -2000;
    this._scene.add(this._sunLight);

    this._ambientLight = new THREE.AmbientLight(0x304050, 0.4);
    this._scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a6741, 0.3);
    this._scene.add(this._hemiLight);
  }

  _setupFog() {
    this._scene.fog = new THREE.FogExp2(0x87ceeb, 0.00003);
    this._fogDensity = 0.00003;
  }

  _setupStars() {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 40000;
      positions[i*3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3 + 1] = r * Math.abs(Math.sin(phi)); // upper hemisphere
      positions[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 60, sizeAttenuation: true });
    this._stars = new THREE.Points(geo, mat);
    this._scene.add(this._stars);
  }

  _setupRain() {
    const rainCount = 5000;
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i*3]     = (Math.random() - 0.5) * 600;
      positions[i*3 + 1] = Math.random() * 400 - 200;
      positions[i*3 + 2] = (Math.random() - 0.5) * 600;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 1.5,
      transparent: true,
      opacity: 0.5,
    });
    this._rain = new THREE.Points(geo, mat);
    this._rain.visible = false;
    this._scene.add(this._rain);
    this._rainPositions = positions;
  }

  update(dt) {
    this._time += dt;
    this._timeOfDay = (this._time % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS;

    this._updateSky();
    this._updateWind(dt);
    this._updateRain(dt);
  }

  _updateSky() {
    const tod = this._timeOfDay; // 0..1
    // 0=midnight, 0.25=6am, 0.5=noon, 0.75=6pm

    let skyColor, ambColor, sunIntensity;
    const sunAngle = tod * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(sunAngle);

    if (tod < 0.2 || tod > 0.85) {
      // night
      skyColor = SKY_COLORS.night.clone();
      ambColor = AMBIENT_COLORS.night.clone();
      sunIntensity = 0.0;
    } else if (tod < 0.27) {
      // dawn
      const t = (tod - 0.2) / 0.07;
      skyColor = lerpColor(SKY_COLORS.night, SKY_COLORS.dawn, t);
      ambColor = lerpColor(AMBIENT_COLORS.night, AMBIENT_COLORS.dawn, t);
      sunIntensity = t * 0.5;
    } else if (tod < 0.33) {
      const t = (tod - 0.27) / 0.06;
      skyColor = lerpColor(SKY_COLORS.dawn, SKY_COLORS.day, t);
      ambColor = lerpColor(AMBIENT_COLORS.dawn, AMBIENT_COLORS.day, t);
      sunIntensity = 0.5 + t * 0.5;
    } else if (tod < 0.72) {
      // day
      skyColor = SKY_COLORS.day.clone();
      ambColor = AMBIENT_COLORS.day.clone();
      sunIntensity = 1.0;
    } else if (tod < 0.78) {
      // dusk
      const t = (tod - 0.72) / 0.06;
      skyColor = lerpColor(SKY_COLORS.day, SKY_COLORS.dusk, t);
      ambColor = lerpColor(AMBIENT_COLORS.day, AMBIENT_COLORS.dusk, t);
      sunIntensity = 1.0 - t * 0.5;
    } else {
      // late dusk to night
      const t = (tod - 0.78) / 0.07;
      skyColor = lerpColor(SKY_COLORS.dusk, SKY_COLORS.night, t);
      ambColor = lerpColor(AMBIENT_COLORS.dusk, AMBIENT_COLORS.night, t);
      sunIntensity = 0.5 - t * 0.5;
    }

    // Weather overcast darkens sky
    if (this._weather === WeatherState.OVERCAST || this._weather === WeatherState.RAIN || this._weather === WeatherState.STORM) {
      const darkFactor = this._weather === WeatherState.STORM ? 0.3 : 0.6;
      skyColor.multiplyScalar(darkFactor);
      sunIntensity *= darkFactor;
    }

    this._scene.background = skyColor;
    if (this._scene.fog) this._scene.fog.color = skyColor;
    this._ambientLight.color = ambColor;
    this._sunLight.intensity = Math.max(0, sunIntensity);
    this._hemiLight.skyColor = skyColor;

    // Sun position (orbits overhead)
    const dist = 30000;
    this._sunLight.position.set(
      Math.cos(sunAngle) * dist,
      Math.sin(sunAngle) * dist,
      dist * 0.3
    );

    // Stars: visible at night
    this._stars.visible = (tod < 0.28 || tod > 0.78);
    this._stars.material.opacity = this._stars.visible ?
      Math.max(0, 1 - (Math.abs(tod - (tod < 0.5 ? 0 : 1)) * 8)) : 0;

    // Fog density by weather
    const fogBase = {
      [WeatherState.CLEAR]: 0.000015,
      [WeatherState.OVERCAST]: 0.00004,
      [WeatherState.RAIN]: 0.00008,
      [WeatherState.STORM]: 0.00015,
    }[this._weather] || 0.000015;

    if (this._scene.fog) {
      this._scene.fog.density = fogBase;
    }
  }

  _updateWind(dt) {
    // Gust timer
    this._gustTimer -= dt;
    if (this._gustTimer <= 0) {
      const gustStrength = this._weather === WeatherState.STORM ? 15 :
                           this._weather === WeatherState.RAIN ? 8 : 3;
      this._windGust.set(
        (Math.random() - 0.5) * gustStrength,
        0,
        (Math.random() - 0.5) * gustStrength
      );
      this._gustTimer = 3 + Math.random() * 5;
    }

    // Turbulence (frame-by-frame random perturbation)
    const turbStrength = this._weather === WeatherState.STORM ? 20 :
                         this._weather === WeatherState.RAIN ? 8 : 1;
    this._turbulence.set(
      (Math.random() - 0.5) * turbStrength,
      (Math.random() - 0.5) * turbStrength * 0.5,
      (Math.random() - 0.5) * turbStrength
    );
  }

  _updateRain(dt) {
    const isRaining = this._weather === WeatherState.RAIN || this._weather === WeatherState.STORM;
    this._rain.visible = isRaining;

    if (isRaining) {
      const pos = this._rainPositions;
      const speed = this._weather === WeatherState.STORM ? 80 : 40;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i*3 + 1] -= speed * dt;
        if (pos[i*3 + 1] < -200) pos[i*3 + 1] += 400;
      }
      this._rain.geometry.attributes.position.needsUpdate = true;
    }
  }

  getWind() {
    return this._wind.clone().add(this._windGust);
  }

  getTurbulence() {
    return this._turbulence.clone();
  }

  getWeather() {
    return this._weather;
  }

  setWeather(state) {
    this._weather = state;
  }

  getTimeOfDay() {
    return this._timeOfDay;
  }

  // For rain to follow camera
  setRainCenter(pos) {
    this._rain.position.copy(pos);
  }
}
