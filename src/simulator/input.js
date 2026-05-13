// Input Manager - Keyboard, Mouse, Gamepad
export class InputManager {
  constructor() {
    this._keys = {};
    this._prevKeys = {};
    this._justPressed = {};
    this._mouseX = 0;
    this._mouseY = 0;
    this._mouseDX = 0;
    this._mouseDY = 0;
    this._pointerLocked = false;
    this._gamepad = null;

    this._axes = {
      pitch: 0,     // -1 to 1 (nose down to nose up)
      roll: 0,      // -1 to 1 (left to right)
      yaw: 0,       // -1 to 1 (left to right rudder)
      throttle: 0,  // 0 to 1
      collective: 0, // helicopter
    };

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.code;
      if (!this._keys[key]) {
        this._justPressed[key] = true;
      }
      this._keys[key] = true;
      // Prevent default for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this._keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this._pointerLocked) {
        this._mouseDX += e.movementX;
        this._mouseDY += e.movementY;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = !!document.pointerLockElement;
    });

    window.addEventListener('gamepadconnected', (e) => {
      this._gamepad = e.gamepad;
    });

    window.addEventListener('gamepaddisconnected', () => {
      this._gamepad = null;
    });
  }

  requestPointerLock(canvas) {
    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });
  }

  update() {
    // Update axes from keyboard
    let pitch = 0;
    let roll = 0;
    let yaw = 0;

    if (this._keys['ArrowUp']) pitch += 1;
    if (this._keys['ArrowDown']) pitch -= 1;
    if (this._keys['ArrowLeft']) roll -= 1;
    if (this._keys['ArrowRight']) roll += 1;
    if (this._keys['KeyA']) yaw -= 1;
    if (this._keys['KeyD']) yaw += 1;

    // Mouse input for fine control (when pointer locked)
    if (this._pointerLocked) {
      const mouseSensitivity = 0.002;
      pitch -= this._mouseDY * mouseSensitivity;
      roll += this._mouseDX * mouseSensitivity;
    }

    // Clamp
    this._axes.pitch = Math.max(-1, Math.min(1, pitch));
    this._axes.roll = Math.max(-1, Math.min(1, roll));
    this._axes.yaw = Math.max(-1, Math.min(1, yaw));

    // Throttle: W/S
    if (this._keys['KeyW']) {
      this._axes.throttle = Math.min(1, this._axes.throttle + 0.005);
    }
    if (this._keys['KeyS']) {
      this._axes.throttle = Math.max(0, this._axes.throttle - 0.005);
    }

    // Gamepad support
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;
      // Standard gamepad mapping
      if (gp.axes.length >= 4) {
        const deadzone = 0.1;
        const applyDeadzone = (v) => Math.abs(v) < deadzone ? 0 : v;
        this._axes.roll += applyDeadzone(gp.axes[0]);
        this._axes.pitch -= applyDeadzone(gp.axes[1]);
        this._axes.yaw += applyDeadzone(gp.axes[2]);
        // Right trigger for throttle
        if (gp.buttons.length > 7) {
          this._axes.throttle = gp.buttons[7].value;
        }
      }
      break;
    }

    // Reset mouse delta after consuming
    this._mouseDX = 0;
    this._mouseDY = 0;

    // Clear justPressed (consumed in wasJustPressed)
    this._prevKeys = { ...this._keys };
  }

  getAxes() {
    return { ...this._axes };
  }

  isPressed(code) {
    return !!this._keys[code];
  }

  wasJustPressed(code) {
    const result = !!this._justPressed[code];
    if (result) this._justPressed[code] = false;
    return result;
  }

  setThrottle(v) {
    this._axes.throttle = Math.max(0, Math.min(1, v));
  }
}
