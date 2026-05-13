// HTML overlay HUD

const STALL_COLOR = '#ff2200';
const WARN_COLOR = '#ffaa00';
const GREEN = '#00ff88';
const WHITE = '#ffffff';
const DIM = '#aaaaaa';

function el(tag, styles = {}, html = '') {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  if (html) e.innerHTML = html;
  return e;
}

function styled(tag, css, html = '') {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (html) e.innerHTML = html;
  return e;
}

export class HUD {
  constructor(container) {
    this._container = container;
    this._nightVision = false;
    this._messages = [];
    this._aircraftConfig = null;
    this._stallWarning = false;
    this._frameCount = 0;

    this._build();
  }

  _build() {
    const c = this._container;

    // Main HUD wrapper
    this._hud = styled('div', `
      position:absolute; inset:0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: ${GREEN};
      pointer-events: none;
      user-select: none;
    `);
    c.appendChild(this._hud);

    // ── Top bar: compass strip ────────────────────────────────
    this._compassBar = styled('div', `
      position:absolute; top:0; left:50%; transform:translateX(-50%);
      width:400px; height:30px;
      background:rgba(0,0,0,0.4);
      border-bottom: 1px solid ${GREEN};
      display:flex; align-items:center; justify-content:center;
      letter-spacing:4px; font-size:12px;
    `);
    this._hud.appendChild(this._compassBar);

    this._compassText = document.createElement('span');
    this._compassBar.appendChild(this._compassText);

    this._headingIndicator = styled('div', `
      position:absolute; bottom:0; left:50%; transform:translateX(-50%);
      width:2px; height:6px; background:${GREEN};
    `);
    this._compassBar.appendChild(this._headingIndicator);

    // ── Bottom left: flight data ──────────────────────────────
    this._flightData = styled('div', `
      position:absolute; bottom:80px; left:20px;
      background:rgba(0,0,0,0.45);
      border: 1px solid rgba(0,255,136,0.4);
      padding:8px 12px; border-radius:4px;
      line-height:1.8;
    `);
    this._hud.appendChild(this._flightData);

    // ── Bottom right: weapon status ───────────────────────────
    this._weaponPanel = styled('div', `
      position:absolute; bottom:80px; right:20px;
      background:rgba(0,0,0,0.45);
      border: 1px solid rgba(0,255,136,0.4);
      padding:8px 12px; border-radius:4px;
      line-height:1.8; display:none;
    `);
    this._hud.appendChild(this._weaponPanel);

    // ── Center: horizon + reticle ─────────────────────────────
    this._centerOverlay = styled('div', `
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
    `);
    this._hud.appendChild(this._centerOverlay);

    // SVG horizon line
    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._svg.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none;';
    this._hud.appendChild(this._svg);

    // Horizon line (SVG)
    this._horizonLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this._horizonLine.setAttribute('stroke', '#00ff88');
    this._horizonLine.setAttribute('stroke-width', '1');
    this._horizonLine.setAttribute('opacity', '0.6');
    this._svg.appendChild(this._horizonLine);

    // Bank indicator (triangle)
    this._bankIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    this._bankIndicator.setAttribute('fill', '#00ff88');
    this._bankIndicator.setAttribute('opacity', '0.8');
    this._svg.appendChild(this._bankIndicator);

    // Pitch ladder (lines)
    this._pitchLines = [];
    for (let i = 0; i < 6; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', '#00ff88');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('opacity', '0.5');
      this._svg.appendChild(line);
      this._pitchLines.push(line);
    }

    // Crosshair reticle (center)
    this._reticle = styled('div', `
      width:40px; height:40px;
      border: 1px solid rgba(0,255,136,0.7);
      border-radius:50%;
      position:relative;
    `);
    const reticleDot = styled('div', `
      position:absolute; top:50%; left:50%;
      width:4px; height:4px;
      border-radius:50%;
      background:${GREEN};
      transform:translate(-50%,-50%);
    `);
    this._reticle.appendChild(reticleDot);
    this._centerOverlay.appendChild(this._reticle);

    // ── Top right: environment ────────────────────────────────
    this._envPanel = styled('div', `
      position:absolute; top:40px; right:20px;
      background:rgba(0,0,0,0.4);
      border:1px solid rgba(0,255,136,0.3);
      padding:6px 10px; border-radius:4px;
      line-height:1.7; font-size:12px;
    `);
    this._hud.appendChild(this._envPanel);

    // ── Stall warning ─────────────────────────────────────────
    this._stallWarningEl = styled('div', `
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      font-size:28px; font-weight:bold;
      color:${STALL_COLOR};
      display:none;
      text-shadow: 0 0 10px ${STALL_COLOR};
      letter-spacing:4px;
    `, 'STALL');
    this._hud.appendChild(this._stallWarningEl);

    // ── Gear/Flap indicators ──────────────────────────────────
    this._gearFlapEl = styled('div', `
      position:absolute; bottom:20px; left:50%;
      transform:translateX(-50%);
      display:flex; gap:20px;
      background:rgba(0,0,0,0.4);
      padding:4px 12px; border-radius:4px;
      font-size:12px;
    `);
    this._hud.appendChild(this._gearFlapEl);

    // ── Message overlay ───────────────────────────────────────
    this._messageEl = styled('div', `
      position:absolute; top:100px; left:50%;
      transform:translateX(-50%);
      font-size:16px; color:${WHITE};
      background:rgba(0,0,0,0.5);
      padding:6px 18px; border-radius:4px;
      display:none;
    `);
    this._hud.appendChild(this._messageEl);

    // ── Night Vision overlay ──────────────────────────────────
    this._nvgOverlay = styled('div', `
      position:absolute; inset:0;
      background:rgba(0,80,0,0.25);
      pointer-events:none;
      display:none;
    `);
    c.appendChild(this._nvgOverlay);

    // ── Locked target reticle ─────────────────────────────────
    this._targetReticle = styled('div', `
      position:absolute;
      width:50px; height:50px;
      border:2px solid #ff4400;
      pointer-events:none;
      display:none;
      transform:translate(-50%,-50%);
    `);
    this._hud.appendChild(this._targetReticle);

    // Corner brackets for target reticle
    for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const br = styled('div', `
        position:absolute;
        width:10px; height:10px;
        border-color:#ff4400;
        border-style:solid;
        border-width:${dy>0?'0 0 2px 0':'2px 0 0 0'};
        ${dx>0 ? 'right:0' : 'left:0'};
        ${dy>0 ? 'bottom:0' : 'top:0'};
      `);
      this._targetReticle.appendChild(br);
    }

    // Instructions (shown briefly at start)
    this._instructions = styled('div', `
      position:absolute; bottom:20px; right:20px;
      background:rgba(0,0,0,0.6);
      border:1px solid rgba(255,255,255,0.2);
      padding:8px 14px; border-radius:4px;
      font-size:11px; color:#888;
      line-height:1.7;
    `, `
      WASD: Throttle/Rudder<br>
      Arrows: Pitch/Roll<br>
      G: Gear | F/C: Flaps<br>
      Tab: Cycle weapon | Space: Fire<br>
      T: Lock target | V: View<br>
      1-7: Switch aircraft
    `);
    this._hud.appendChild(this._instructions);
    setTimeout(() => { this._instructions.style.display = 'none'; }, 10000);
  }

  setAircraft(config) {
    this._aircraftConfig = config;
    const hasWeapons = config && config.hasWeapons;
    this._weaponPanel.style.display = hasWeapons ? 'block' : 'none';
  }

  update(physics, weaponSystem, environment) {
    this._frameCount++;

    const kts = (physics.airspeed * 1.944).toFixed(0);
    const mph = (physics.airspeed * 2.237).toFixed(0);
    const altFt = (physics.altitude * 3.281).toFixed(0);
    const vsFpm = (physics.verticalSpeed * 196.8).toFixed(0);
    const hdg = physics.heading.toFixed(0).padStart(3, '0');
    const gForce = (physics.gForce || 1).toFixed(1);

    // Stall detection
    const config = this._aircraftConfig;
    const stallSpeed = config ? (config.stallSpeed * 1.944) : 40;
    const isStalling = parseFloat(kts) < stallSpeed + 5 && physics.altitude > (physics.groundHeight + 10);
    this._stallWarning = isStalling;

    // ── Flight data panel ─────────────────────────────────────
    const vsColor = parseFloat(vsFpm) > 0 ? '#00ff88' : '#ff4400';
    const altColor = parseFloat(altFt) < 200 ? '#ffaa00' : '#00ff88';
    this._flightData.innerHTML = `
      <div style="color:#aaa;margin-bottom:4px;font-size:11px">${config ? config.name : ''}</div>
      <div>IAS: <b>${kts}</b> kts / ${mph} mph</div>
      <div>ALT: <b style="color:${altColor}">${altFt}</b> ft</div>
      <div>HDG: <b>${hdg}°</b></div>
      <div>VS: <b style="color:${vsColor}">${vsFpm > 0 ? '+' : ''}${vsFpm}</b> fpm</div>
      <div>G: <b>${gForce}</b>g</div>
      <div style="color:${physics.gearDown ? '#ffaa00' : '#00ff88'}">
        GEAR: ${physics.gearDown ? '▼ DOWN' : '▲ UP'}
      </div>
      <div>FLAPS: ${['0','10','20','30'][physics.flaps || 0]}°</div>
      ${physics.afterburner ? '<div style="color:#ff4400">⚡ AFTERBURNER</div>' : ''}
      ${physics.vtolMode ? '<div style="color:#ffaa00">⬆ VTOL MODE</div>' : ''}
    `;

    // ── Weapon panel ──────────────────────────────────────────
    if (weaponSystem) {
      const sel = weaponSystem.getSelectedWeapon();
      const all = weaponSystem.getAllWeapons();
      let wHtml = '<div style="color:#aaa;font-size:11px;margin-bottom:4px">WEAPONS</div>';
      if (all.length > 0) {
        all.forEach((w, i) => {
          const active = sel && w.name === sel.name;
          const ammoColor = w.ammo === 0 ? '#ff2200' : (w.ammo < w.maxAmmo * 0.25 ? '#ffaa00' : '#00ff88');
          wHtml += `<div style="color:${active ? WHITE : DIM}">
            ${active ? '► ' : '  '}${w.name}: <b style="color:${ammoColor}">${w.ammo}</b>/${w.maxAmmo}
          </div>`;
        });
      } else {
        wHtml += '<div style="color:#555">No weapons</div>';
      }
      if (weaponSystem.isRearming()) {
        wHtml += `<div style="color:#ffaa00">♻ REARMING...</div>`;
      }
      this._weaponPanel.innerHTML = wHtml;
    }

    // ── Compass ───────────────────────────────────────────────
    const headingDeg = physics.heading;
    const COMPASS = ['N','NE','E','SE','S','SW','W','NW','N'];
    const compassText = this._getCompassStrip(headingDeg);
    this._compassText.textContent = compassText;

    // ── SVG horizon line ──────────────────────────────────────
    this._updateHorizon(physics);

    // ── Stall warning ─────────────────────────────────────────
    if (isStalling && this._frameCount % 30 < 15) {
      this._stallWarningEl.style.display = 'block';
    } else {
      this._stallWarningEl.style.display = 'none';
    }

    // ── Environment panel ─────────────────────────────────────
    if (environment) {
      const wind = environment.getWind();
      const windSpeed = wind.length().toFixed(0);
      const windDir = THREE_MathUtils_radToDeg(Math.atan2(wind.x, wind.z)).toFixed(0);
      const weather = environment.getWeather();
      const tod = environment.getTimeOfDay ? environment.getTimeOfDay() : 0;
      const hour = Math.floor(tod * 24).toString().padStart(2, '0');
      const min = Math.floor((tod * 24 * 60) % 60).toString().padStart(2, '0');
      this._envPanel.innerHTML = `
        <div>🕐 ${hour}:${min}</div>
        <div>WX: ${weather.toUpperCase()}</div>
        <div>WIND: ${windSpeed}kts ${windDir}°</div>
      `;
    }

    // ── Gear/flap strip ───────────────────────────────────────
    const flapAngles = ['0°', '10°', '20°', '30°'];
    const gearColor = physics.gearDown ? '#ffaa00' : '#00ff88';
    this._gearFlapEl.innerHTML = `
      <span style="color:${gearColor}">GEAR: ${physics.gearDown ? 'DN' : 'UP'}</span>
      <span>|</span>
      <span>FLAPS: ${flapAngles[physics.flaps || 0]}</span>
      ${physics.onGround ? '<span style="color:#ffaa00">| ON GROUND</span>' : ''}
    `;

    // ── Locked target reticle (projected to screen) ───────────
    // (Simplified: just show/hide based on lock status)
    if (weaponSystem && weaponSystem.getLockedTarget()) {
      this._targetReticle.style.display = 'block';
      // We can't easily project 3D to 2D without camera ref,
      // so just center it for now
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      this._targetReticle.style.left = (vw / 2) + 'px';
      this._targetReticle.style.top = (vh / 2 - 60) + 'px';
    } else {
      this._targetReticle.style.display = 'none';
    }

    // Message fade
    this._updateMessages();
  }

  _getCompassStrip(hdg) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    let str = '';
    for (let d = -4; d <= 4; d++) {
      const deg = ((hdg + d * 10) % 360 + 360) % 360;
      const idx = Math.round(deg / 22.5) % 16;
      if (d === 0) {
        str += `|${Math.round(deg).toString().padStart(3,'0')}°|`;
      } else {
        str += ` ${Math.round(deg).toString().padStart(3,' ')} `;
      }
    }
    return str;
  }

  _updateHorizon(physics) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;

    const pitchOffset = -physics.rotation.x * 200; // pixels per radian
    const rollRad = physics.rotation.z;

    // Horizon line: rotated, offset by pitch
    const len = 200;
    const dx = Math.cos(rollRad) * len;
    const dy = -Math.sin(rollRad) * len;
    const ox = -Math.sin(rollRad) * pitchOffset;
    const oy = -Math.cos(rollRad) * pitchOffset;

    this._horizonLine.setAttribute('x1', cx - dx + ox);
    this._horizonLine.setAttribute('y1', cy - dy + oy);
    this._horizonLine.setAttribute('x2', cx + dx + ox);
    this._horizonLine.setAttribute('y2', cy + dy + oy);

    // Bank indicator triangle above center
    const bx = cx;
    const by = cy - 120;
    const tSize = 8;
    const tr = -rollRad;
    const pts = [
      [bx + Math.cos(tr) * tSize, by + Math.sin(tr) * tSize],
      [bx + Math.cos(tr + 2.2) * tSize * 1.5, by + Math.sin(tr + 2.2) * tSize * 1.5],
      [bx + Math.cos(tr - 2.2) * tSize * 1.5, by + Math.sin(tr - 2.2) * tSize * 1.5],
    ];
    this._bankIndicator.setAttribute('points', pts.map(p => p.join(',')).join(' '));

    // Pitch ladder
    const pitchIncrements = [-20, -10, 0, 10, 20, 30];
    for (let i = 0; i < this._pitchLines.length; i++) {
      const deg = pitchIncrements[i];
      if (deg === 0) {
        this._pitchLines[i].style.display = 'none';
        continue;
      }
      this._pitchLines[i].style.display = '';
      const pOff = pitchOffset + deg * (200 / 90);
      const pox = -Math.sin(rollRad) * pOff;
      const poy = -Math.cos(rollRad) * pOff;
      const pLen = 60;
      const pdx = Math.cos(rollRad) * pLen;
      const pdy = -Math.sin(rollRad) * pLen;
      this._pitchLines[i].setAttribute('x1', cx - pdx + pox);
      this._pitchLines[i].setAttribute('y1', cy - pdy + poy);
      this._pitchLines[i].setAttribute('x2', cx + pdx + pox);
      this._pitchLines[i].setAttribute('y2', cy + pdy + poy);
    }
  }

  _updateMessages() {
    const now = Date.now();
    this._messages = this._messages.filter(m => m.expires > now);
    if (this._messages.length > 0) {
      const msg = this._messages[this._messages.length - 1];
      this._messageEl.style.display = 'block';
      this._messageEl.textContent = msg.text;
    } else {
      this._messageEl.style.display = 'none';
    }
  }

  showMessage(text, duration = 2000) {
    this._messages.push({ text, expires: Date.now() + duration });
    this._messageEl.style.display = 'block';
    this._messageEl.textContent = text;
  }

  toggleNightVision() {
    this._nightVision = !this._nightVision;
    this._nvgOverlay.style.display = this._nightVision ? 'block' : 'none';
    this.showMessage(this._nightVision ? 'NVG ON' : 'NVG OFF', 1500);
  }

  dispose() {
    if (this._hud && this._hud.parentNode) {
      this._hud.parentNode.removeChild(this._hud);
    }
    if (this._nvgOverlay && this._nvgOverlay.parentNode) {
      this._nvgOverlay.parentNode.removeChild(this._nvgOverlay);
    }
  }
}

// Minimal radToDeg without THREE import
function THREE_MathUtils_radToDeg(r) {
  return r * (180 / Math.PI);
}
