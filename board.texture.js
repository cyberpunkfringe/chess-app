// ============================================================
// board.texture.js — Board Layer + Edge Texture + Depth Shading
// ============================================================

const BoardTexture = (function () {

  let texWhite = null;
  let texBlack = null;
  let texEdge  = null;
  let depthTexture = null;

  let boardDepthIntensity = 1.0;

  // ------------------------------------------------------------
  // LOAD TEXTURES
  // ------------------------------------------------------------
  function init() {
    const loader = new THREE.TextureLoader();

    texWhite = loader.load(
      "chess-data/images/board.white.texture.jpg",
      () => console.log("[BoardTexture] Loaded board.white.texture.jpg")
    );

    texBlack = loader.load(
      "chess-data/images/board.black.texture.jpg",
      () => console.log("[BoardTexture] Loaded board.black.texture.jpg")
    );

    texEdge = loader.load(
      "chess-data/images/board.edge.texture.jpg",
      () => console.log("[BoardTexture] Loaded board.edge.texture.jpg")
    );

    texWhite.wrapS = texWhite.wrapT = THREE.RepeatWrapping;
    texBlack.wrapS = texBlack.wrapT = THREE.RepeatWrapping;
    texEdge.wrapS  = texEdge.wrapT  = THREE.RepeatWrapping;

    texWhite.anisotropy = 8;
    texBlack.anisotropy = 8;
    texEdge.anisotropy  = 8;

    depthTexture = createDepthTexture();

    // Inject textures into Board
    Board.setTextures(texWhite, texBlack, texEdge, depthTexture);
  }

  // ------------------------------------------------------------
  // CREATE DEPTH SHADING TEXTURE
  // ------------------------------------------------------------
  function createDepthTexture() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    const grd = ctx.createRadialGradient(
      size / 2, size / 2, 5,
      size / 2, size / 2, size / 2
    );

    grd.addColorStop(0.0, "rgba(0,0,0,0.35)");
    grd.addColorStop(0.6, "rgba(0,0,0,0.18)");
    grd.addColorStop(1.0, "rgba(0,0,0,0.00)");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.anisotropy = 4;

    return tex;
  }

  // ------------------------------------------------------------
  // APPLY ALL TEXTURES
  // ------------------------------------------------------------
  function applyAll() {
    Board.applyAllTextures();
  }

  // ------------------------------------------------------------
  // UPDATE TINT COLORS
  // ------------------------------------------------------------
  function updateTint(light, dark, edgeColor) {
    Board.updateColors(light, dark, edgeColor);
  }

  // ------------------------------------------------------------
  // UPDATE DEPTH INTENSITY
  // ------------------------------------------------------------
  function updateDepthIntensity(v) {
    boardDepthIntensity = v;
    Board.setDepthIntensity(v);
  }

  return {
    init,
    applyAll,
    updateTint,
    updateDepthIntensity
  };

})();
