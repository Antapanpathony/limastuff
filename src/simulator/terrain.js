import * as THREE from 'three';

// ── Compact 2D Simplex Noise ──────────────────────────────────────────────
const _grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];
const _perm = new Uint8Array(512);
const _p = new Uint8Array(256);
for (let i = 0; i < 256; i++) _p[i] = i;
// deterministic shuffle
for (let i = 255; i > 0; i--) {
  const j = Math.floor((Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * (i + 1));
  [_p[i], _p[j]] = [_p[j], _p[i]];
}
for (let i = 0; i < 512; i++) _perm[i] = _p[i & 255];

function dot2(g, x, y) { return g[0]*x + g[1]*y; }

function simplex2(xin, yin) {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t, Y0 = j - t;
  const x0 = xin - X0, y0 = yin - Y0;
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
  const ii = i & 255, jj = j & 255;
  const gi0 = _perm[ii + _perm[jj]] % 12;
  const gi1 = _perm[ii + i1 + _perm[jj + j1]] % 12;
  const gi2 = _perm[ii + 1 + _perm[jj + 1]] % 12;
  let t0 = 0.5 - x0*x0 - y0*y0;
  const n0 = t0 < 0 ? 0 : (t0 *= t0, t0*t0*dot2(_grad3[gi0], x0, y0));
  let t1 = 0.5 - x1*x1 - y1*y1;
  const n1 = t1 < 0 ? 0 : (t1 *= t1, t1*t1*dot2(_grad3[gi1], x1, y1));
  let t2 = 0.5 - x2*x2 - y2*y2;
  const n2 = t2 < 0 ? 0 : (t2 *= t2, t2*t2*dot2(_grad3[gi2], x2, y2));
  return 70 * (n0 + n1 + n2);
}

function octaveNoise(x, z, octaves, persistence, lacunarity, scale) {
  let value = 0, amp = 1, freq = 1, max = 0;
  for (let o = 0; o < octaves; o++) {
    value += simplex2(x * freq / scale, z * freq / scale) * amp;
    max += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return value / max;
}

// ── Height function ─────────────────────────────────────────────────────────
const SEA_LEVEL = 0;
const MOUNTAIN_HEIGHT = 2400;
const PLAIN_HEIGHT = 80;

function terrainHeight(wx, wz) {
  // Coastal band: smooth to sea near large X
  const coastDist = wx / 8000; // coast runs along X axis
  const coastFactor = Math.max(0, Math.min(1, (coastDist + 1) * 0.5));

  // Mountain zone: some distance in
  const mountainZone = simplex2(wx / 12000, wz / 12000);

  // Base terrain
  const base = octaveNoise(wx, wz, 6, 0.5, 2.0, 3000) * 0.5 + 0.5; // 0..1

  let h;
  if (mountainZone > 0.3) {
    // Mountainous
    h = base * MOUNTAIN_HEIGHT * (mountainZone - 0.3) * 2;
  } else {
    // Plains
    h = base * PLAIN_HEIGHT + 10;
  }

  // Apply coast factor (sea side dips below sea level)
  h = h * coastFactor - (1 - coastFactor) * 50;
  h = Math.max(SEA_LEVEL, h);

  return h;
}

// ── Chunk ───────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 2000;
const CHUNK_SEGS_HIGH = 64;
const CHUNK_SEGS_LOW = 16;
const RENDER_DIST = 2; // ±2 chunks (5x5 grid)

// Color helpers
const colLow = new THREE.Color(0x4a7c3f);    // green
const colMid = new THREE.Color(0x8b6347);    // brown
const colHigh = new THREE.Color(0xdde8ee);   // snow/white
const colSea = new THREE.Color(0x4080c0);    // water blue
const colSand = new THREE.Color(0xd4b483);   // sand

function heightColor(h) {
  if (h <= 0.5) return colSea.clone();
  if (h < 5) return colSand.clone();
  if (h < 200) return colLow.clone().lerp(colMid, (h - 5) / 195);
  if (h < 1200) return colMid.clone().lerp(colHigh, (h - 200) / 1000);
  return colHigh.clone();
}

function buildChunkMesh(cx, cz, segs) {
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const positions = geo.attributes.position;
  const colors = [];

  for (let i = 0; i < positions.count; i++) {
    const wx = positions.getX(i) + cx;
    const wz = positions.getZ(i) + cz;
    const h = terrainHeight(wx, wz);
    positions.setY(i, h);
    const c = heightColor(h);
    colors.push(c.r, c.g, c.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// ── Landing Strips ──────────────────────────────────────────────────────────
const STRIP_POSITIONS = [
  { x: 2000, z: 1500 },
  { x: -5000, z: 3000 },
  { x: 8000, z: -4000 },
  { x: -2000, z: -8000 },
];

function buildLandingStrip(wx, wz) {
  const group = new THREE.Group();
  const h = terrainHeight(wx, wz);

  // Runway body
  const runwayGeo = new THREE.PlaneGeometry(30, 800);
  runwayGeo.rotateX(-Math.PI / 2);
  const runwayMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const runway = new THREE.Mesh(runwayGeo, runwayMat);
  runway.position.set(wx, h + 0.2, wz);
  runway.receiveShadow = true;
  group.add(runway);

  // Centerline markings
  for (let i = -350; i < 350; i += 40) {
    const markGeo = new THREE.PlaneGeometry(2, 15);
    markGeo.rotateX(-Math.PI / 2);
    const markMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mark = new THREE.Mesh(markGeo, markMat);
    mark.position.set(wx, h + 0.3, wz + i);
    group.add(mark);
  }

  return { mesh: group, center: new THREE.Vector3(wx, h, wz), heading: 0 };
}

// ── TerrainManager ──────────────────────────────────────────────────────────
export class TerrainManager {
  constructor(scene) {
    this._scene = scene;
    this._chunks = new Map();
    this._strips = [];
    this._waterMesh = null;

    // Build landing strips
    for (const pos of STRIP_POSITIONS) {
      const strip = buildLandingStrip(pos.x, pos.z);
      this._strips.push(strip);
      scene.add(strip.mesh);
    }

    // Water plane
    const waterGeo = new THREE.PlaneGeometry(200000, 200000, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x336699, transparent: true, opacity: 0.85 });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.position.set(0, -0.5, 0);
    scene.add(this._waterMesh);

    // Initial build around origin
    this._buildChunksAround(0, 0);
  }

  _chunkKey(cx, cz) { return `${cx},${cz}`; }

  _buildChunksAround(px, pz) {
    const cx0 = Math.floor(px / CHUNK_SIZE);
    const cz0 = Math.floor(pz / CHUNK_SIZE);

    const needed = new Set();
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) {
        const cx = cx0 + dx;
        const cz = cz0 + dz;
        const key = this._chunkKey(cx, cz);
        needed.add(key);

        if (!this._chunks.has(key)) {
          const dist = Math.max(Math.abs(dx), Math.abs(dz));
          const segs = dist <= 1 ? CHUNK_SEGS_HIGH : CHUNK_SEGS_LOW;
          const wx = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
          const wz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
          const mesh = buildChunkMesh(wx, wz, segs);
          mesh.position.set(wx, 0, wz);
          this._scene.add(mesh);
          this._chunks.set(key, { mesh, cx, cz });
        }
      }
    }

    // Remove far chunks
    for (const [key, chunk] of this._chunks) {
      if (!needed.has(key)) {
        this._scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        this._chunks.delete(key);
      }
    }
  }

  update(playerPos) {
    this._buildChunksAround(playerPos.x, playerPos.z);
  }

  getHeightAt(wx, wz) {
    return terrainHeight(wx, wz);
  }

  getLandingStrips() {
    return this._strips;
  }
}
