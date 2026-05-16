// ============================================================
//  world.js — Dynamic World Background + FX (Stars / Clouds)
//  (HDR only applied when enabled via Theme Panel)
// ============================================================

let worldBackgroundMesh = null;
let currentFX = "none";

// HDR state
let hdrEnabled = false;
let hdrTexture = null;
let hdrExposure = 1.0;
let hdrIntensity = 1.0;

// Global references (used by app.js + theme.js)
let renderer = null;
let scene = null;
let camera = null;
let rig = null;

function createWorld() {
  const canvas = document.getElementById("scene");

  // ------------------------------------------------------------
  // ORIGINAL RENDERER (no HDR by default)
  // ------------------------------------------------------------
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  // ------------------------------------------------------------
  // ORIGINAL SCENE
  // ------------------------------------------------------------
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // ------------------------------------------------------------
  // CAMERA + RIG
  // ------------------------------------------------------------
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );

  rig = new THREE.Object3D();
  rig.position.set(0, 120, 260);
  scene.add(rig);
  rig.add(camera);

  // ------------------------------------------------------------
  // BACKGROUND FX SPHERE (always visible)
  // ------------------------------------------------------------
  const geo = new THREE.SphereGeometry(2000, 64, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1
  });

  worldBackgroundMesh = new THREE.Mesh(geo, mat);
  scene.add(worldBackgroundMesh);

  // ------------------------------------------------------------
  // LOAD HDR (but DO NOT APPLY until checkbox is ON)
  // ------------------------------------------------------------
  const rgbe = new THREE.RGBELoader();
  rgbe.setDataType(THREE.UnsignedByteType);

  rgbe.load("chess-data/hdr/chess.hdr", (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    hdrTexture = hdr;

    if (hdrEnabled) {
      scene.environment = hdrTexture;
      scene.background = hdrTexture;
    }
  });

  return { renderer, scene, camera, rig };
}

// ============================================================
// UPDATE WORLD COLOR (original behavior)
// ============================================================
function updateWorldColor(color) {
  if (!worldBackgroundMesh) return;
  worldBackgroundMesh.material.color.set(color);
}

// ============================================================
// WORLD FX (always active, even with HDR)
// ============================================================
function setWorldFX(type) {
  currentFX = type;

  if (!worldBackgroundMesh) return;

  const mat = worldBackgroundMesh.material;

  if (type === "none") {
    mat.map = null;
    mat.needsUpdate = true;
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // STARS
  if (type === "stars") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const s = Math.random() * 2;
      ctx.fillStyle = "white";
      ctx.fillRect(x, y, s, s);
    }
  }

  // CLOUDS
  if (type === "clouds") {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 200 + Math.random() * 300;

      const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.25)");
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // NEBULA
  if (type === "nebula") {
    ctx.fillStyle = "#000010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 300 + Math.random() * 500;

      const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      grad.addColorStop(0, "rgba(120,0,255,0.6)");
      grad.addColorStop(0.5, "rgba(0,150,255,0.4)");
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;

  mat.map = tex;
  mat.needsUpdate = true;
}

// ============================================================
// HDR CONTROL API (called by theme.js)
// ============================================================

function setHDREnabled(enabled) {
  hdrEnabled = enabled;

  if (!enabled) {
    scene.environment = null;
    scene.background = new THREE.Color(0x111111);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    return;
  }

  // Enable HDR
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = hdrExposure * hdrIntensity;

  if (hdrTexture) {
    scene.environment = hdrTexture;
    scene.background = hdrTexture;
  }
}

function setHDRExposure(v) {
  hdrExposure = v;
  if (hdrEnabled) renderer.toneMappingExposure = hdrExposure * hdrIntensity;
}

function setHDRIntensity(v) {
  hdrIntensity = v;

  if (!hdrEnabled) return;

  // Real intensity scaling
  renderer.toneMappingExposure = hdrExposure * hdrIntensity;
}
