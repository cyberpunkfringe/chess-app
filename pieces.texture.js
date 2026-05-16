// ============================================================
// pieces.texture.js — White/Black Texture + Tint + Depth Shading
// ============================================================

const PiecesTexture = (function () {

  let texWhite = null;
  let texBlack = null;
  let depthTexture = null;

  // Theme-driven depth shading intensity
  let depthWhite = 0.35;
  let depthBlack = 0.35;

  // ------------------------------------------------------------
  // LOAD TEXTURES (with proper tiling + filtering)
  // ------------------------------------------------------------
  function init() {
    const loader = new THREE.TextureLoader();

    texWhite = loader.load(
      "chess-data/images/pieces.white.texture.jpg",
      t => setupPieceTexture(t, "white")
    );

    texBlack = loader.load(
      "chess-data/images/pieces.black.texture.jpg",
      t => setupPieceTexture(t, "black")
    );

    depthTexture = createDepthTexture();
  }

  // ------------------------------------------------------------
  // TEXTURE SETUP — prevents stretching + blur
  // ------------------------------------------------------------
  function setupPieceTexture(tex, label) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

    // ⭐ Tiling: subtle repeat for realism
    tex.repeat.set(2, 2);

    // ⭐ High-quality filtering
    tex.anisotropy = 16;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.LinearFilter;

    tex.needsUpdate = true;

    console.log(`[PiecesTexture] ${label} texture ready`);
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

    grd.addColorStop(0.0, "rgba(0,0,0,1.0)");
    grd.addColorStop(0.6, "rgba(0,0,0,0.5)");
    grd.addColorStop(1.0, "rgba(0,0,0,0.0)");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.anisotropy = 4;

    return tex;
  }

  // ------------------------------------------------------------
  // APPLY TEXTURE + DEPTH SHADING TO ALL PIECES
  // ------------------------------------------------------------
  function applyAll() {
    for (const piece of Pieces.list) {
      applyTexture(piece);
      addDepthShading(piece);
    }
    console.log("[PiecesTexture] Applied textures + depth shading");
  }

  // ------------------------------------------------------------
  // APPLY TEXTURE BASED ON PIECE COLOR
  // ------------------------------------------------------------
  function applyTexture(piece) {
    const isWhite = piece.userData.color === "white";
    const tex = isWhite ? texWhite : texBlack;

    piece.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.map = tex;
        child.material.needsUpdate = true;
      }
    });
  }

  // ------------------------------------------------------------
  // ADD DEPTH SHADING
  // ------------------------------------------------------------
  function addDepthShading(piece) {
    if (piece.userData.depthShading) return;

    const geo = new THREE.PlaneGeometry(22, 22);
    const mat = new THREE.MeshBasicMaterial({
      map: depthTexture,
      transparent: true,
      depthWrite: false
    });

    const ds = new THREE.Mesh(geo, mat);
    ds.rotation.x = -Math.PI / 2;
    ds.position.y = 0.05;

    piece.add(ds);
    piece.userData.depthShading = ds;
  }

  // ------------------------------------------------------------
  // UPDATE TINT COLOR (sidebar theme)
  // ------------------------------------------------------------
  function updateTint(whiteColor, blackColor) {
    for (const piece of Pieces.list) {
      const isWhite = piece.userData.color === "white";
      const tint = isWhite ? whiteColor : blackColor;

      piece.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.set(tint);
        }
      });
    }
  }

  // ------------------------------------------------------------
  // UPDATE DEPTH SHADING INTENSITY (THEME)
  // ------------------------------------------------------------
  function updateDepthIntensity(whiteV, blackV) {
    depthWhite = whiteV;
    depthBlack = blackV;
  }

  // ------------------------------------------------------------
  // DYNAMIC DEPTH SHADING (lift fade + scale)
  // ------------------------------------------------------------
  function updateDynamic() {
    for (const piece of Pieces.list) {
      const ds = piece.userData.depthShading;
      if (!ds) continue;

      const isWhite = piece.userData.color === "white";
      const baseIntensity = isWhite ? depthWhite : depthBlack;

      const h = piece.position.y;

      // Opacity scales with height + theme intensity
      ds.material.opacity = THREE.MathUtils.clamp(
        baseIntensity - h * 0.25,
        0.05,
        baseIntensity
      );

      // Scale effect
      const scale = THREE.MathUtils.clamp(1 + h * 0.15, 1, 1.4);
      ds.scale.set(scale, scale, 1);
    }
  }

  return {
    init,
    applyAll,
    updateTint,
    updateDepthIntensity,
    updateDynamic
  };

})();
