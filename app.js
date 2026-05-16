// ============================================================
// app.js — Core Initialization
// ============================================================
//
// renderer, scene, camera, rig are defined in world.js
// We only declare controls + clock here.
//

let controls, clock;

init();
animate();

function init() {
  clock = new THREE.Clock();

  // ============================================================
  //  WORLD SETUP
  // ============================================================
  // createWorld() sets global renderer, scene, camera, rig
  createWorld();

  // ============================================================
  //  LIGHTING
  // ============================================================
  createLighting(scene);

  // ============================================================
  //  BOARD + PIECES
  // ============================================================
  Board.init(scene, camera);
  Pieces.createPieces(scene);

  // ============================================================
  //  LOGIC INIT (must happen AFTER pieces exist)
  // ============================================================
  if (typeof Logic !== "undefined") {
    const pieceMeshes = Pieces.list.map(p => p.mesh || p);
    Logic.initPieces(pieceMeshes);
  }

  // ============================================================
  //  TEXTURE SYSTEM (BOARD + PIECES)
  // ============================================================
  if (typeof BoardTexture !== "undefined") {
    BoardTexture.init();
    BoardTexture.applyAll();
  }

  if (typeof PiecesTexture !== "undefined") {
    PiecesTexture.init();
    PiecesTexture.applyAll();
  }

  // ============================================================
  //  SHADOW SYSTEM
  // ============================================================
  if (typeof PiecesShadow !== "undefined") {
    PiecesShadow.init(scene);
    for (const p of Pieces.list) {
      PiecesShadow.attachShadow(p.mesh || p);
    }
    console.log("[App] Shadow system initialized");
  }

  // ============================================================
  //  CAMERA VIEW — DEFAULT DIAGONAL
  // ============================================================
  setDefaultCameraView();

  // ============================================================
  //  ORBIT CONTROLS — ZOOM ONLY
  // ============================================================
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  controls.enablePan    = false;
  controls.minDistance  = 80;
  controls.maxDistance  = 800;

  // ============================================================
  //  MOVEMENT SYSTEMS
  // ============================================================
  if (typeof Movement !== "undefined") {
    Movement.init(camera);
  }
  if (typeof PiecesMovement !== "undefined") {
    PiecesMovement.init();
  }

  // ============================================================
  //  THEME SYSTEM — WAIT FOR LOADER
  // ============================================================
  console.log("[App] Waiting for theme...");
  waitForTheme();

  // ============================================================
  //  AI ENGINE INIT
  // ============================================================
  if (typeof ChessAI !== "undefined") {
    ChessAI.init();
    console.log("[App] AI engine initialized");
  }

  // ============================================================
  //  UI BUTTON WIRING (Undo / Redo / Flip)
  // ============================================================
  wireUIButtons();

  // ============================================================
  //  RESIZE HANDLER
  // ============================================================
  window.addEventListener("resize", onResize);
  onResize();
}

// ============================================================
//  DEFAULT CAMERA VIEW
// ============================================================
function setDefaultCameraView() {
  const center = Board.getCenter
    ? Board.getCenter()
    : new THREE.Vector3(0, 0, 0);

  camera.position.set(center.x + 180, 220, center.z + 180);
  camera.lookAt(center);

  if (rig) rig.position.copy(center);

  console.log("[App] Default camera view applied");
}

// ============================================================
//  WAIT FOR THEME LOADER
// ============================================================
function waitForTheme() {
  // theme.js loader sets window.themeData = default OR loaded theme
  if (window.themeData !== undefined) {
    console.log("[App] Theme ready, initializing Theme");
    if (typeof Theme !== "undefined") {
      Theme.init();
    }

    // ============================================================
    // APPLY THEME TO TEXTURES
    // ============================================================

    // PIECES — tint + depth
    if (typeof PiecesTexture !== "undefined" && window.themeData) {
      if (typeof PiecesTexture.updateTint === "function") {
        PiecesTexture.updateTint(
          themeData.pieceWhite,
          themeData.pieceBlack
        );
      }

      if (typeof PiecesTexture.updateDepthIntensity === "function") {
        PiecesTexture.updateDepthIntensity(
          parseFloat(themeData.pieceWhiteDepth),
          parseFloat(themeData.pieceBlackDepth)
        );
      }
    }

    // BOARD — tint + depth
    if (typeof BoardTexture !== "undefined" && window.themeData) {
      if (typeof BoardTexture.updateTint === "function") {
        BoardTexture.updateTint(
          themeData.boardLight,
          themeData.boardDark,
          themeData.boardEdge
        );
      }

      if (typeof BoardTexture.updateDepthIntensity === "function") {
        BoardTexture.updateDepthIntensity(
          parseFloat(themeData.boardDepthIntensity)
        );
      }
    }

  } else {
    requestAnimationFrame(waitForTheme);
  }
}

// ============================================================
//  UI BUTTON WIRING
// ============================================================
function wireUIButtons() {
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const flipBtn = document.getElementById("flipBtn");

  if (undoBtn) {
    undoBtn.onclick = () => {
      if (typeof Sound !== "undefined" && Sound && typeof Sound.click === "function") {
        Sound.click();
      }
      if (typeof UndoRedo !== "undefined" && UndoRedo && typeof UndoRedo.undo === "function") {
        UndoRedo.undo();
      }
    };
  }

  if (redoBtn) {
    redoBtn.onclick = () => {
      if (typeof Sound !== "undefined" && Sound && typeof Sound.click === "function") {
        Sound.click();
      }
      if (typeof UndoRedo !== "undefined" && UndoRedo && typeof UndoRedo.redo === "function") {
        UndoRedo.redo();
      }
    };
  }

  if (flipBtn) {
    flipBtn.onclick = () => {
      if (typeof Sound !== "undefined" && Sound && typeof Sound.click === "function") {
        Sound.click();
      }
      if (typeof FlipBoard !== "undefined" && FlipBoard && typeof FlipBoard.flip === "function") {
        FlipBoard.flip();
      }
    };
  }
}

// ============================================================
//  RESIZE HANDLER
// ============================================================
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (!camera || !renderer) return;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ============================================================
//  ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (typeof Movement !== "undefined" && Movement && typeof Movement.update === "function") {
    Movement.update(delta);
  }

  // Dynamic depth shading (pieces)
  if (typeof PiecesTexture !== "undefined" && PiecesTexture && typeof PiecesTexture.updateDynamic === "function") {
    PiecesTexture.updateDynamic();
  }

  // Shadow update
  if (typeof PiecesShadow !== "undefined" && PiecesShadow && typeof PiecesShadow.updateAll === "function") {
    PiecesShadow.updateAll(Pieces.list);
  }

  renderer.render(scene, camera);
}
