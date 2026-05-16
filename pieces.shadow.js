// ============================================================
// pieces.shadow.js — Soft Realistic Shadows for Chess Pieces
// ============================================================

const PiecesShadow = (function () {

  const shadowGroup = new THREE.Group();
  let shadowMaterial = null;

  // ------------------------------------------------------------
  // INIT — create shadow system
  // ------------------------------------------------------------
  function init(scene) {

    // Soft transparent shadow material
    shadowMaterial = new THREE.ShadowMaterial({
      opacity: 0.35   // adjust for darker/lighter shadows
    });

    // Enable renderer shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add group to scene
    scene.add(shadowGroup);
  }

  // ------------------------------------------------------------
  // ATTACH SHADOW TO A PIECE
  // ------------------------------------------------------------
  function attachShadow(piece) {

    // Create a shadow plane under the piece
    const geo = new THREE.PlaneGeometry(18, 18); // adjust size per piece
    const shadow = new THREE.Mesh(geo, shadowMaterial);

    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.1; // slightly above board to avoid z-fighting

    shadow.receiveShadow = true;

    // Store reference
    piece.userData.shadow = shadow;

    // Add to shadow group
    shadowGroup.add(shadow);

    // Initial sync
    updateShadow(piece);
  }

  // ------------------------------------------------------------
  // UPDATE SHADOW POSITION
  // ------------------------------------------------------------
  function updateShadow(piece) {
    if (!piece.userData.shadow) return;

    const shadow = piece.userData.shadow;

    shadow.position.x = piece.position.x;
    shadow.position.z = piece.position.z;

    // Optional: dynamic opacity based on piece height
    const height = piece.position.y;
    shadow.material.opacity = THREE.MathUtils.clamp(0.35 - height * 0.1, 0.15, 0.35);
  }

  // ------------------------------------------------------------
  // UPDATE ALL SHADOWS (call every frame)
  // ------------------------------------------------------------
  function updateAll(pieces) {
    for (const p of pieces) {
      updateShadow(p);
    }
  }

  return {
    init,
    attachShadow,
    updateAll
  };

})();
