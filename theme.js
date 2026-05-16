// ============================================================
// AUTO-LOADER — loads chess-data/chess.json BEFORE Theme runs
// ============================================================

(function () {

  fetch("chess-data/chess.json", { cache: "no-store" })
    .then(res => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(json => {
      window.themeData = json;
      console.log("[load.chess] Loaded JSON chess-data/chess.json");
    })
    .catch(err => {
      console.warn("[load.chess] No valid chess-data/chess.json found", err);
      window.themeData = null;
    });

})();

// ============================================================
// theme.js — Sidebar Theme Manager (Auto Load / Save / Apply)
// ============================================================

const Theme = (function () {

// ------------------------------------------------------------
//  FULL THEME STATE (BUILT-IN DEFAULT)
// ------------------------------------------------------------
const state = {
  boardLight: "#f0f0f0",
  boardDark:  "#111111",
  boardEdge:  "#333333",

  boardDepthIntensity: 1.0,

  pieceWhite: "#ffffff",
  pieceBlack: "#000000",

  pieceWhiteDepth: 1.0,
  pieceBlackDepth: 1.0,

  labelWhite: "#ffffff",
  labelBlack: "#ff6666",
  labelSize: 28,

  worldBg: "#111111",
  worldFX: "none",

  hoverColor: "#44aa44",
  hoverIntensity: 1.0,

  dirColor: "#ffffff",
  dirIntensity: 1,

  hemiSky: "#ffffff",
  hemiGround: "#222222",
  hemiIntensity: 0.6,

  fontStyle: "Arial",
  glowIntensity: 1.0,

  // HDR SETTINGS
  hdrEnabled: false,
  hdrExposure: 1.0,
  hdrIntensity: 1.0,

  // CAMERA
  cameraX: 0,
  cameraY: 0,
  cameraZ: 0,

  cameraTargetX: 0,
  cameraTargetY: 0,
  cameraTargetZ: 0
};

const DEFAULT_THEME = JSON.parse(JSON.stringify(state));


// ------------------------------------------------------------
//  MERGE THEME — ensures saved theme is complete
// ------------------------------------------------------------
function mergeTheme(base, loaded) {
  const result = { ...base };
  for (const key in loaded) {
    if (loaded[key] !== undefined && loaded[key] !== null) {
      result[key] = loaded[key];
    }
  }
  return result;
}


// ------------------------------------------------------------
//  INIT — Bind UI + Auto Load + Load Theme UI
// ------------------------------------------------------------
function init() {

  // Bind all theme inputs
  [
    "boardLight","boardDark","boardEdge",
    "boardDepthIntensity",
    "pieceWhite","pieceBlack",
    "pieceWhiteDepth","pieceBlackDepth",
    "labelWhite","labelBlack","labelSize",
    "worldBg","hoverColor","hoverIntensity",
    "dirColor","dirIntensity",
    "hemiSky","hemiGround","hemiIntensity",
    "fontStyle","glowIntensity"
  ].forEach(bind);

  // World FX dropdown
  const fx = document.getElementById("worldFX");
  if (fx) fx.oninput = e => apply("worldFX", e.target.value);

  // ⭐ Delay HDR binding until DOM is ready
  requestAnimationFrame(bindHDRControls);

  // Save theme
  const saveBtn = document.getElementById("saveTheme");
  if (saveBtn) saveBtn.onclick = saveJSON;

  // Load theme overlay
  setupLoadThemeUI();

  // Auto-load chess.json or default
  autoLoad();

  // Theme panel toggle
  setupThemeToggle();

  // ⭐ RESTORE LAST LOADED THEME FROM MEMORY (SAFE POINT)
  const savedTheme = localStorage.getItem("lastLoadedTheme");
  if (savedTheme) {
    try {
      const loaded = JSON.parse(savedTheme);
      const merged = mergeTheme(DEFAULT_THEME, loaded);

      console.log("[Theme] Restoring last loaded theme from memory");
      applyTheme(merged);

    } catch (e) {
      console.warn("[Theme] Failed to parse saved theme", e);
    }
  }
}


// ------------------------------------------------------------
//  BIND HDR CONTROLS
// ------------------------------------------------------------
function bindHDRControls() {

  const hdrEnabledEl = document.getElementById("hdrEnabled");
  const hdrSettings = document.getElementById("hdrSettings");
  const hdrExposureEl = document.getElementById("hdrExposure");
  const hdrIntensityEl = document.getElementById("hdrIntensity");

  if (!hdrEnabledEl || !hdrSettings || !hdrExposureEl || !hdrIntensityEl) {
    console.warn("[Theme] HDR controls not found yet, retrying...");
    return requestAnimationFrame(bindHDRControls);
  }

  hdrEnabledEl.onchange = e => {
    const enabled = e.target.checked;
    state.hdrEnabled = enabled;

    hdrSettings.style.display = enabled ? "block" : "none";

    if (typeof setHDREnabled === "function")
      setHDREnabled(enabled);
  };

  hdrExposureEl.oninput = e => {
    const v = parseFloat(e.target.value);
    state.hdrExposure = v;

    if (typeof setHDRExposure === "function")
      setHDRExposure(v);
  };

  hdrIntensityEl.oninput = e => {
    const v = parseFloat(e.target.value);
    state.hdrIntensity = v;

    if (typeof setHDRIntensity === "function")
      setHDRIntensity(v);
  };

  console.log("[Theme] HDR controls bound");
}


// ------------------------------------------------------------
//  THEME PANEL TOGGLE
// ------------------------------------------------------------
function setupThemeToggle() {
  const btn = document.getElementById("themeBtn");
  const panel = document.getElementById("themePanel");

  if (!btn || !panel) return;

  btn.onclick = () => {
    panel.classList.toggle("visible");
  };
}


// ------------------------------------------------------------
//  BIND INPUT ELEMENT
// ------------------------------------------------------------
function bind(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.oninput = e => apply(id, e.target.value);
}


// ------------------------------------------------------------
//  SAFE CHECKS
// ------------------------------------------------------------
function hasRenderer() {
  return typeof renderer !== "undefined" &&
         renderer &&
         typeof renderer.getContext === "function";
}

function hasCamera() {
  return typeof camera !== "undefined" && camera;
}

function hasBoard() {
  return typeof Board !== "undefined" && Board;
}

function hasPieces() {
  return typeof Pieces !== "undefined" && Pieces;
}

function hasPiecesTexture() {
  return typeof PiecesTexture !== "undefined" &&
         PiecesTexture &&
         typeof PiecesTexture.updateDepthIntensity === "function";
}


// ------------------------------------------------------------
//  APPLY A SINGLE THEME VALUE
// ------------------------------------------------------------
function apply(key, value) {
  state[key] = value;

  // WORLD
  if (key === "worldBg" && typeof updateWorldColor === "function")
    updateWorldColor(value);

  if (key === "worldFX" && typeof setWorldFX === "function")
    setWorldFX(value);

  // BOARD COLORS / DEPTH
  if ((key === "boardLight" || key === "boardDark" || key === "boardEdge") &&
      hasBoard() && hasRenderer()) {
    Board.updateColors(state.boardLight, state.boardDark, state.boardEdge);
  }

  if (key === "boardDepthIntensity" &&
      hasBoard() && hasRenderer() &&
      typeof Board.setDepthIntensity === "function") {
    Board.setDepthIntensity(parseFloat(value));
  }

  // PIECE COLORS
  if ((key === "pieceWhite" || key === "pieceBlack") &&
      hasPieces() && hasRenderer()) {
    Pieces.updatePieceColors(state.pieceWhite, state.pieceBlack);
  }

  // PIECE DEPTH (TEXTURE)
  if ((key === "pieceWhiteDepth" || key === "pieceBlackDepth") &&
      hasPiecesTexture() && hasRenderer()) {
    PiecesTexture.updateDepthIntensity(
      parseFloat(state.pieceWhiteDepth),
      parseFloat(state.pieceBlackDepth)
    );
  }

  // LABEL COLORS / SIZE
  if ((key === "labelWhite" || key === "labelBlack") &&
      hasPieces() && hasRenderer()) {
    Pieces.updateLabelColors(state.labelWhite, state.labelBlack);
  }

  if (key === "labelSize" &&
      hasPieces() && hasRenderer()) {
    Pieces.updateLabelSize(parseFloat(value));
  }

  // HOVER COLOR
  if (key === "hoverColor" &&
      hasBoard() && hasRenderer() &&
      typeof Board.updateHoverColor === "function") {
    Board.updateHoverColor(value);
  }

  // ⭐ HOVER INTENSITY
  if (key === "hoverIntensity" &&
      hasBoard() && hasRenderer() &&
      typeof Board.updateHoverIntensity === "function") {
    Board.updateHoverIntensity(parseFloat(value));
  }

  // LIGHTING
  if (key === "dirColor" && typeof updateDirColor === "function")
    updateDirColor(value);

  if (key === "dirIntensity" && typeof updateDirIntensity === "function")
    updateDirIntensity(parseFloat(value));

  if (key === "hemiSky" && typeof updateHemiSky === "function")
    updateHemiSky(value);

  if (key === "hemiGround" && typeof updateHemiGround === "function")
    updateHemiGround(value);

  if (key === "hemiIntensity" && typeof updateHemiIntensity === "function")
    updateHemiIntensity(parseFloat(value));

  // FONT / GLOW
  if (key === "fontStyle" &&
      hasPieces() && hasRenderer()) {
    Pieces.updateFontStyle(value);
  }

  if (key === "glowIntensity" &&
      hasPieces() && hasRenderer()) {
    Pieces.updateGlowIntensity(parseFloat(value));
  }

  // CAMERA
  if ((key === "cameraX" || key === "cameraY" || key === "cameraZ") &&
      hasCamera()) {
    camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
  }

  if ((key === "cameraTargetX" || key === "cameraTargetY" || key === "cameraTargetZ") &&
      hasCamera() && typeof THREE !== "undefined") {
    const t = new THREE.Vector3(
      state.cameraTargetX,
      state.cameraTargetY,
      state.cameraTargetZ
    );
    camera.lookAt(t);
  }
}


// ------------------------------------------------------------
//  SAVE THEME.JSON
// ------------------------------------------------------------
function saveJSON() {

  if (!hasCamera()) {
    console.warn("[Theme] saveJSON skipped: camera not ready");
    return;
  }

  // Save camera position
  state.cameraX = camera.position.x;
  state.cameraY = camera.position.y;
  state.cameraZ = camera.position.z;

  // Save camera target
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const target = dir.multiplyScalar(1000).add(camera.position);

  state.cameraTargetX = target.x;
  state.cameraTargetY = target.y;
  state.cameraTargetZ = target.z;

  // ⭐ Save HDR settings
  const hdrEnabledEl = document.getElementById("hdrEnabled");
  const hdrExposureEl = document.getElementById("hdrExposure");
  const hdrIntensityEl = document.getElementById("hdrIntensity");

  state.hdrEnabled = hdrEnabledEl ? hdrEnabledEl.checked : false;
  state.hdrExposure = hdrExposureEl ? parseFloat(hdrExposureEl.value) : 1.0;
  state.hdrIntensity = hdrIntensityEl ? parseFloat(hdrIntensityEl.value) : 1.0;

  // ⭐ Save hover intensity
  const hoverIntensityEl = document.getElementById("hoverIntensity");
  if (hoverIntensityEl)
    state.hoverIntensity = parseFloat(hoverIntensityEl.value);

  const json = JSON.stringify(state, null, 2);

  const blob = new Blob([json], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chess.json";
  a.click();
}


// ------------------------------------------------------------
//  LOAD THEME LIST
// ------------------------------------------------------------
async function loadThemeList() {
  try {
    const res = await fetch("chess-data/chess.theme.json");
    return await res.json();
  } catch {
    console.warn("[Theme] No chess.theme.json found");
    return [];
  }
}


// ------------------------------------------------------------
//  LOAD A THEME FILE
// ------------------------------------------------------------
async function loadThemeFile(filename) {
  try {
    const res = await fetch("chess-data/themes/" + filename);
    const json = await res.json();
    console.log("[Theme] Loaded JSON theme:", filename);
    return json;
  } catch (err) {
    console.error("[Theme] Failed to load JSON theme:", filename, err);
    return null;
  }
}


// ------------------------------------------------------------
//  APPLY THEME DATA
// ------------------------------------------------------------
function applyTheme(data) {
  if (!data) return;

  Object.keys(state).forEach(key => {
    if (data[key] !== undefined) {
      state[key] = data[key];

      const el = document.getElementById(key);
      if (el) el.value = data[key];

      apply(key, data[key]);
    }
  });

  // ⭐ Apply HDR settings
  const hdrEnabledEl = document.getElementById("hdrEnabled");
  const hdrSettings = document.getElementById("hdrSettings");

  if (hdrEnabledEl) {
    hdrEnabledEl.checked = !!data.hdrEnabled;
    hdrSettings.style.display = data.hdrEnabled ? "block" : "none";

    if (typeof setHDREnabled === "function")
      setHDREnabled(data.hdrEnabled);
  }

  if (data.hdrExposure !== undefined) {
    const hdrExposureEl = document.getElementById("hdrExposure");
    hdrExposureEl.value = data.hdrExposure;

    if (typeof setHDRExposure === "function")
      setHDRExposure(parseFloat(data.hdrExposure));
  }

  if (data.hdrIntensity !== undefined) {
    const hdrIntensityEl = document.getElementById("hdrIntensity");
    hdrIntensityEl.value = data.hdrIntensity;

    if (typeof setHDRIntensity === "function")
      setHDRIntensity(parseFloat(data.hdrIntensity));
  }

  // ⭐ Apply hover intensity
  if (data.hoverIntensity !== undefined) {
    const hi = document.getElementById("hoverIntensity");
    if (hi) hi.value = data.hoverIntensity;

    if (typeof Board.updateHoverIntensity === "function")
      Board.updateHoverIntensity(parseFloat(data.hoverIntensity));
  }

  console.log("[Theme] JSON theme applied (preview only)");
}


// ------------------------------------------------------------
//  AUTO LOAD
// ------------------------------------------------------------
function autoLoad() {

  // ⭐ If a theme was restored from memory, DO NOT override it
  if (localStorage.getItem("lastLoadedTheme")) {
    console.log("[Theme] Memory theme active, skipping chess.json");
    return;
  }

  if (window.themeData) {
    console.log("[Theme] Loaded from chess.json");
    applyTheme(window.themeData);
    return;
  }

  console.log("[Theme] Using built-in default theme");
  applyTheme(DEFAULT_THEME);
}


// ------------------------------------------------------------
//  LOAD THEME UI
// ------------------------------------------------------------
function setupLoadThemeUI() {

  const loadBtn = document.getElementById("loadThemeBtn");
  const overlay = document.getElementById("themeLoaderOverlay");
  const listBox = document.getElementById("themeListBox");
  const applyBtn = document.getElementById("applyThemeBtn");
  const closeBtn = document.getElementById("closeThemeOverlay");

  if (!loadBtn) return;

  loadBtn.onclick = async () => {
    const list = await loadThemeList();
    listBox.innerHTML = "";

    list.forEach(name => {
      const opt = document.createElement("option");
      opt.textContent = name;
      listBox.appendChild(opt);
    });

    overlay.classList.remove("hidden");
  };

  closeBtn.onclick = () => overlay.classList.add("hidden");

  applyBtn.onclick = async () => {
    const name = listBox.value;
    if (!name) return;

    const data = await loadThemeFile(name);
    applyTheme(data);

    // ⭐ Save theme to memory
    const merged = mergeTheme(DEFAULT_THEME, data);
    localStorage.setItem("lastLoadedTheme", JSON.stringify(merged));
    console.log("[Theme] Saved last loaded theme to memory");

    overlay.classList.add("hidden");
  };
}


// ------------------------------------------------------------
//  PUBLIC API
// ------------------------------------------------------------
return {
  init,
  apply,
  loadThemeList,
  loadThemeFile,
  applyTheme
};

})();
