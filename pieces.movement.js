// ============================================================
// pieces.movement.js — Drag & Drop Chess Movement (AI‑Aware)
// ============================================================

const PiecesMovement = (function () {

  let dragging = false;
  let selected = null;
  let originalRank = null;
  let originalFile = null;

  const raycaster    = new THREE.Raycaster();
  const mouse        = new THREE.Vector2();
  const plane        = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  function init() {
    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    dom.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // ------------------------------------------------------------
  // UPDATE MOUSE
  // ------------------------------------------------------------
  function updateMouse(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // ------------------------------------------------------------
  // AI MODE HELPERS
  // ------------------------------------------------------------
  function aiActive() {
    return typeof ChessAI !== "undefined" &&
           ChessAI &&
           typeof ChessAI.isActive === "function" &&
           ChessAI.isActive();
  }

  function aiColor() {
    if (typeof ChessAI !== "undefined" &&
        ChessAI &&
        typeof ChessAI.getColor === "function") {
      return ChessAI.getColor();
    }
    return "black";
  }

  function humanColor() {
    return aiColor() === "white" ? "black" : "white";
  }

  // ------------------------------------------------------------
  // MOUSE DOWN — SELECT PIECE
  // ------------------------------------------------------------
  function onMouseDown(e) {
    if (e.button !== 0) return;

    // Block if game over
    if (Logic.gameOver === true) return;

    updateMouse(e);
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(scene.children, true);
    if (!hits.length) return;

    let obj = hits[0].object;

    // Climb to piece root (skip labels, depth planes, etc.)
    while (obj && (!obj.userData || obj.userData.type !== "piece") && obj.parent) {
      obj = obj.parent;
    }
    if (!obj || !obj.userData || obj.userData.type !== "piece") return;

    // AI mode: only allow dragging human pieces on human turn
    if (aiActive()) {
      if (Logic.currentTurn !== humanColor()) return;
      if (obj.userData.color === aiColor()) return;
    }

    // Non‑AI: only allow dragging side to move
    if (!aiActive()) {
      if (obj.userData.color !== Logic.currentTurn) return;
    }

    selected = obj;
    dragging = true;

    originalRank = selected.userData.rank;
    originalFile = selected.userData.file;

    if (typeof Sound !== "undefined" && Sound && typeof Sound.click === "function") {
      Sound.click();
    }
  }

  // ------------------------------------------------------------
  // MOUSE MOVE — DRAG
  // ------------------------------------------------------------
  function onMouseMove(e) {
    if (!dragging || !selected) return;

    updateMouse(e);
    raycaster.setFromCamera(mouse, camera);

    if (raycaster.ray.intersectPlane(plane, intersection)) {
      selected.position.x = intersection.x;
      selected.position.z = intersection.z;
    }
  }

  // ------------------------------------------------------------
  // MOUSE UP — DROP PIECE
  // ------------------------------------------------------------
  function onMouseUp(e) {
    if (!dragging || !selected) {
      dragging = false;
      selected = null;
      return;
    }

    // Block if game over
    if (Logic.gameOver === true) {
      dragging = false;
      selected = null;
      return;
    }

    updateMouse(e);
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(scene.children, true);

    let tileHit = null;
    for (const h of hits) {
      if (h.object.userData && h.object.userData.type === "tile") {
        tileHit = h.object;
        break;
      }
    }

    if (tileHit) {
      const { rank, file } = tileHit.userData;

      const ok = Logic.requestMove(selected.userData, rank, file);

      if (!ok) {
        // INVALID → snap back
        const pos = Board.worldPosition(originalRank, originalFile);
        selected.position.set(pos.x, 0, pos.z);

        if (typeof Sound !== "undefined" && Sound && typeof Sound.invalid === "function") {
          Sound.invalid();
        }
      } else {
        // VALID
        const pos = Board.worldPosition(rank, file);
        selected.position.set(pos.x, 0, pos.z);

        selected.userData.rank = rank;
        selected.userData.file = file;

        if (typeof Sound !== "undefined" && Sound && typeof Sound.move === "function") {
          Sound.move();
        }

        // AI TURN?
        if (aiActive() && Logic.currentTurn === aiColor()) {
          setTimeout(() => ChessAI.playTurn(), 150);
        }
      }

    } else {
      // Dropped outside → snap back
      const pos = Board.worldPosition(originalRank, originalFile);
      selected.position.set(pos.x, 0, pos.z);

      if (typeof Sound !== "undefined" && Sound && typeof Sound.invalid === "function") {
        Sound.invalid();
      }
    }

    dragging = false;
    selected = null;
  }

  return { init };

})();
