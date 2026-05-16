// ============================================================
// board.js — Textured Board + Edge Frame + Hover Glow + Last Move Highlight + King Check Highlight
// ============================================================

const Board = (function () {

  const size = 8;
  const tileSize = 20;
  const tiles = [];

  let raycaster, mouse, camera, scene;
  let onTileClickCallback = null;

  let lastHoverTile = null;
  let hoverColor = "#44aa44";
  let hoverIntensity = 1.0;

  // Texture references
  let texWhite = null;
  let texBlack = null;
  let texEdge  = null;
  let depthTexture = null;

  // Edge frame mesh
  let edgeFrame = null;

  // Depth shading intensity
  let boardDepthIntensity = 1.0;
  const BASE_OPACITY = 0.35;

  // Last-move highlight tiles
  let lastMoveFrom = null;
  let lastMoveTo   = null;

  // King-in-check tile
  let kingCheckTile = null;

  // ------------------------------------------------------------
  // INIT BOARD
  // ------------------------------------------------------------
  function init(targetScene, targetCamera) {
    scene = targetScene;
    camera = targetCamera;
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // ⭐ MAIN BOARD GROUP (required for flip mode)
    const group = new THREE.Group();
    group.name = "boardGroup";
    window.boardGroup = group;   // ⭐ expose globally for FlipBoard

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      emissive: 0x000000,
      emissiveIntensity: 2.5
    });

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0x000000,
      emissiveIntensity: 1.5
    });

    const geo = new THREE.BoxGeometry(tileSize, 2, tileSize);

    // ---------------------------
    // CREATE 8×8 TILES
    // ---------------------------
    for (let r = 0; r < size; r++) {
      tiles[r] = [];
      for (let f = 0; f < size; f++) {
        const isWhite = (r + f) % 2 === 0;

        const tile = new THREE.Mesh(
          geo,
          isWhite ? whiteMat.clone() : blackMat.clone()
        );

        tile.position.set(
          (f - 3.5) * tileSize,
          -1,
          (r - 3.5) * tileSize
        );

        tile.userData = {
          rank: r,
          file: f,
          type: "tile",
          isWhite,
          baseColor: new THREE.Color(tile.material.color),
          isLastMove: false,
          isKingCheck: false
        };

        tiles[r][f] = tile;
        group.add(tile);
      }
    }

    // ---------------------------
    // CREATE EDGE FRAME
    // ---------------------------
    const frameThickness = 10;
    const frameHeight = 3;
    const boardSize = tileSize * size;

    const frameGeo = new THREE.BoxGeometry(
      boardSize + frameThickness * 2,
      frameHeight,
      boardSize + frameThickness * 2
    );

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      emissive: 0x000000,
      emissiveIntensity: 0.5
    });

    edgeFrame = new THREE.Mesh(frameGeo, frameMat);
    edgeFrame.position.set(0, -2.5, 0);
    edgeFrame.userData = { type: "edgeFrame" };

    group.add(edgeFrame);

    // ⭐ Add board group to scene
    scene.add(group);

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
  }

  // ------------------------------------------------------------
  // EXTERNAL TEXTURE INJECTION
  // ------------------------------------------------------------
  function setTextures(whiteTex, blackTex, edgeTex, depthTex) {
    texWhite = whiteTex;
    texBlack = blackTex;
    texEdge  = edgeTex;
    depthTexture = depthTex;

    [texWhite, texBlack].forEach(tex => {
      if (!tex) return;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    });

    if (texEdge) {
      texEdge.wrapS = texEdge.wrapT = THREE.RepeatWrapping;
      texEdge.repeat.set(8, 1);
      texEdge.anisotropy = 16;
      texEdge.minFilter = THREE.LinearMipMapLinearFilter;
      texEdge.magFilter = THREE.LinearFilter;
      texEdge.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------
  // APPLY TEXTURES + DEPTH SHADING
  // ------------------------------------------------------------
  function applyAllTextures() {
    for (const row of tiles) {
      for (const tile of row) {
        const tex = tile.userData.isWhite ? texWhite : texBlack;
        if (tex) tile.material.map = tex;

        if (depthTexture && !tile.userData.depthShading) {
          const ds = makeDepthPlane(30, 0.02);
          tile.add(ds);
          tile.userData.depthShading = ds;
        }
      }
    }

    if (edgeFrame && texEdge) {
      edgeFrame.material.map = texEdge;

      if (depthTexture && !edgeFrame.userData.depthShading) {
        const ds = makeDepthPlane(260, 0.1);
        edgeFrame.add(ds);
        edgeFrame.userData.depthShading = ds;
      }
    }
  }

  function makeDepthPlane(size, y) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: depthTexture,
      transparent: true,
      depthWrite: false,
      opacity: BASE_OPACITY * boardDepthIntensity
    });

    const ds = new THREE.Mesh(geo, mat);
    ds.rotation.x = -Math.PI / 2;
    ds.position.y = y;
    return ds;
  }

  // ------------------------------------------------------------
  // DEPTH INTENSITY UPDATE
  // ------------------------------------------------------------
  function setDepthIntensity(v) {
    boardDepthIntensity = v;

    for (const row of tiles) {
      for (const tile of row) {
        const ds = tile.userData.depthShading;
        if (ds) ds.material.opacity = BASE_OPACITY * v;
      }
    }

    if (edgeFrame?.userData.depthShading) {
      edgeFrame.userData.depthShading.material.opacity = BASE_OPACITY * v;
    }
  }

  // ------------------------------------------------------------
  // CLICK + HOVER
  // ------------------------------------------------------------
  function onMouseDown(e) {
    if (e.button !== 0) return;
    updateMouse(e);
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(scene.children, true);
    if (!hits.length) return;

    const obj = hits[0].object;

    if (obj.userData?.type === "tile") {
      onTileClickCallback?.(obj.userData.rank, obj.userData.file);
      return;
    }

    if (obj.userData?.type === "piece") {
      Logic?.onPieceClicked?.(obj.userData);
      return;
    }
  }

  function onMouseMove(e) {
    updateMouse(e);
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(scene.children, true);

    let tile = null;
    for (const hit of hits) {
      if (hit.object.userData?.type === "tile") {
        tile = hit.object;
        break;
      }
    }

    const blocked = (t) =>
      t?.userData.isLastMove || t?.userData.isKingCheck;

    // If no tile under mouse, clear previous hover (if allowed)
    if (!tile) {
      if (lastHoverTile && !blocked(lastHoverTile)) {
        clearHover(lastHoverTile);
      }
      lastHoverTile = null;
      return;
    }

    if (tile !== lastHoverTile) {
      if (lastHoverTile && !blocked(lastHoverTile)) {
        clearHover(lastHoverTile);
      }

      if (tile && !blocked(tile)) {
        applyHover(tile);
      }

      lastHoverTile = tile;
    }
  }

  // ------------------------------------------------------------
  // HOVER LOGIC (FIXED)
  // ------------------------------------------------------------
  function applyHover(tile) {
    if (!tile) return;

    if (tile.userData.isLastMove || tile.userData.isKingCheck) return;

    const mat = tile.material;

    const baseBoost = tile.userData.isWhite ? 1.2 : 0.6;

    mat.emissive.set(hoverColor);
    mat.emissiveIntensity = (3.5 * hoverIntensity) + baseBoost;

    const darken = tile.userData.isWhite
      ? 0.55 * hoverIntensity
      : 0.18 * hoverIntensity;

    mat.color.copy(tile.userData.baseColor).offsetHSL(0, 0, -darken);

    mat.needsUpdate = true;
  }

  function clearHover(tile) {
    if (!tile) return;

    if (tile.userData.isLastMove || tile.userData.isKingCheck) return;

    const mat = tile.material;

    mat.emissive.set(0x000000);
    mat.emissiveIntensity = tile.userData.isWhite ? 2.5 : 1.5;

    mat.color.copy(tile.userData.baseColor);
    mat.needsUpdate = true;
  }

  function updateHoverIntensity(v) {
    hoverIntensity = parseFloat(v);

    if (lastHoverTile &&
        !lastHoverTile.userData.isLastMove &&
        !lastHoverTile.userData.isKingCheck) {
      applyHover(lastHoverTile);
    }
  }

  // ------------------------------------------------------------
  // CLEAR KING CHECK
  // ------------------------------------------------------------
  function clearKingCheck() {
    if (!kingCheckTile) return;
    kingCheckTile.userData.isKingCheck = false;
    kingCheckTile.material.emissive.set(0x000000);
    kingCheckTile.material.emissiveIntensity =
      kingCheckTile.userData.isWhite ? 2.5 : 1.5;
    kingCheckTile = null;
  }

  // ------------------------------------------------------------
  // KING CHECK HIGHLIGHT
  // ------------------------------------------------------------
  function highlightKingInCheck(rank, file) {
    clearKingCheck();

    const tile = tiles[rank][file];
    if (!tile) return;

    tile.material.emissive.set(0xff8800);
    tile.material.emissiveIntensity = 3.0;

    tile.userData.isKingCheck = true;
    kingCheckTile = tile;
  }

  // ------------------------------------------------------------
  // LAST MOVE HIGHLIGHT
  // ------------------------------------------------------------
  function clearLastMoveHighlight() {
    const resetTile = (tile) => {
      if (!tile) return;
      tile.userData.isLastMove = false;
      tile.material.emissive.set(0x000000);
      tile.material.emissiveIntensity =
        tile.userData.isWhite ? 2.5 : 1.5;
    };

    resetTile(lastMoveFrom);
    resetTile(lastMoveTo);

    lastMoveFrom = null;
    lastMoveTo   = null;
  }

  function setTileGlow(tile, colorHex) {
    tile.material.emissive.set(colorHex);
    tile.material.emissiveIntensity =
      tile.userData.isWhite ? 3.0 : 2.0;
  }

  function highlightMove(sr, sf, tr, tf, mode = "move") {
    clearLastMoveHighlight();
    clearKingCheck();

    const from = tiles[sr]?.[sf];
    const to   = tiles[tr]?.[tf];
    if (!from || !to) return;

    let fromColor = 0x00aaff;
    let toColor   = 0x00aaff;

    if (mode === "capture") {
      toColor = 0xff4444;
    } else if (mode === "checkmate") {
      toColor = 0x00ff66;
    }

    setTileGlow(from, fromColor);
    setTileGlow(to,   toColor);

    from.userData.isLastMove = true;
    to.userData.isLastMove   = true;

    lastMoveFrom = from;
    lastMoveTo   = to;
  }

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  function updateMouse(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onTileClick(cb) {
    onTileClickCallback = cb;
  }

  function worldPosition(rank, file) {
    return {
      x: (file - 3.5) * tileSize,
      z: (rank - 3.5) * tileSize
    };
  }

  // ------------------------------------------------------------
  // THEME COLOR UPDATE
  // ------------------------------------------------------------
  function updateColors(light, dark, edgeColor) {
    tiles.forEach(row => {
      row.forEach(tile => {
        const newColor = tile.userData.isWhite ? light : dark;
        tile.material.color.set(newColor);
        tile.userData.baseColor = new THREE.Color(newColor);
      });
    });

    if (edgeFrame) {
      edgeFrame.material.color.set(edgeColor);
    }
  }

  function updateHoverColor(color) {
    hoverColor = color;

    if (lastHoverTile &&
        !lastHoverTile.userData.isLastMove &&
        !lastHoverTile.userData.isKingCheck) {
      applyHover(lastHoverTile);
    }
  }

  // ------------------------------------------------------------
  // EXPORT API
  // ------------------------------------------------------------
  return {
    init,
    onTileClick,
    worldPosition,
    size,
    updateColors,
    updateHoverColor,
    updateHoverIntensity,
    setTextures,
    applyAllTextures,
    setDepthIntensity,
    highlightMove,
    highlightKingInCheck
  };

})();

