// ============================================================
// movement.js — Chess + FPS Camera + Smart Mouse-Look + Center Snap
// ============================================================

const Movement = (function () {

  // -----------------------------
  // CHESS MOVEMENT
  // -----------------------------
  let selectedPiece = null;
  let isMovingPiece = false;

  // -----------------------------
  // CAMERA MOVEMENT (WASD + Q/E)
  // -----------------------------
  const keys = { w: false, a: false, s: false, d: false, q: false, e: false };
  let cam = null;
  const speed = 80;

  // mouse look
  let isLooking = false;
  let allowLook = true;
  let lastX = 0;
  let lastY = 0;
  let yaw = 0;
  let pitch = 0;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  function init(targetCamera) {
    cam = targetCamera;

    const e = new THREE.Euler().setFromQuaternion(cam.quaternion, "YXZ");
    yaw = e.y;
    pitch = e.x;

    Board.onTileClick(onTileClicked);

    // WASD keys
    window.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (k in keys) keys[k] = true;
    });

    window.addEventListener("keyup", e => {
      const k = e.key.toLowerCase();
      if (k in keys) keys[k] = false;
    });

    // Mouse look + hover detection
    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
  }

  // ------------------------------------------------------------
  // HOVER DETECTION — disables mouse-look when over board/pieces
  // ------------------------------------------------------------
  function updateHover(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    allowLook = true;

    if (hits.length > 0) {
      for (const h of hits) {
        if (!h.object.userData) continue;
        const type = h.object.userData.type;
        if (type === "tile" || type === "piece") {
          allowLook = false;
          return;
        }
      }
    }
  }

  // ------------------------------------------------------------
  // MOUSE DOWN — only allow look if not on board/pieces
  // ------------------------------------------------------------
  function onMouseDown(e) {
    if (e.button !== 0) return;

    updateHover(e);

    if (!allowLook) {
      isLooking = false;
      return;
    }

    isLooking = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onMouseUp() {
    isLooking = false;
  }

  // ------------------------------------------------------------
  // MOUSE MOVE — rotate camera only if allowed
  // ------------------------------------------------------------
  function onMouseMove(e) {
    updateHover(e);

    if (!isLooking || !allowLook || !cam) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const lookSpeed = 0.002;

    yaw   -= dx * lookSpeed;
    pitch -= dy * lookSpeed;

    const maxPitch = Math.PI / 2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    const rot = new THREE.Euler(pitch, yaw, 0, "YXZ");
    cam.quaternion.setFromEuler(rot);
  }

  // ------------------------------------------------------------
  // CHESS TILE CLICKED
  // ------------------------------------------------------------
  function onTileClicked(rank, file) {
    if (isMovingPiece) return;

    // SELECT
    if (!selectedPiece) {
      const p = Pieces.findPieceAt(rank, file);
      if (p) {
        selectedPiece = p;
        if (typeof Sound !== "undefined") Sound.click();
      }
      return;
    }

    // DESELECT SAME TILE
    if (selectedPiece.userData.rank === rank &&
        selectedPiece.userData.file === file) {
      selectedPiece = null;
      return;
    }

    // MOVE
    const legal = Logic.requestMove(selectedPiece.userData, rank, file);

    if (!legal) {
      if (typeof Sound !== "undefined") Sound.invalid();
      selectedPiece = null;
      return;
    }

    movePiece(selectedPiece, rank, file);
  }

  // ------------------------------------------------------------
  // SMOOTH PIECE MOVEMENT + CENTER SNAP
  // ------------------------------------------------------------
  function movePiece(piece, newRank, newFile) {
    isMovingPiece = true;

    const target = Pieces.findPieceAt(newRank, newFile);
    if (target && target !== piece) {
      target.parent.remove(target);
      if (typeof Sound !== "undefined") Sound.capture();
    } else {
      if (typeof Sound !== "undefined") Sound.move();
    }

    const start = piece.position.clone();
    const endPos = Board.worldPosition(newRank, newFile);
    const end = new THREE.Vector3(endPos.x, piece.position.y, endPos.z);

    let t = 0;

    function animateMove() {
      t += 0.08;
      if (t > 1) t = 1;

      piece.position.lerpVectors(start, end, t);

      if (t < 1) {
        requestAnimationFrame(animateMove);
      } else {
        // Snap perfectly to tile center
        const pos = Board.worldPosition(newRank, newFile);
        piece.position.x = pos.x;
        piece.position.z = pos.z;

        piece.userData.rank = newRank;
        piece.userData.file = newFile;

        selectedPiece = null;
        isMovingPiece = false;
      }
    }

    animateMove();
  }

  // ------------------------------------------------------------
  // CAMERA UPDATE (WASD + Q/E)
  // ------------------------------------------------------------
  function update(delta) {
    if (!cam) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up      = new THREE.Vector3(0, 1, 0);

    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();

    let move = new THREE.Vector3();

    if (keys.w) move.add(forward);
    if (keys.s) move.sub(forward);
    if (keys.a) move.sub(right);
    if (keys.d) move.add(right);
    if (keys.q) move.sub(up);
    if (keys.e) move.add(up);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta);
      cam.position.add(move);
    }
  }

  return {
    init,
    update
  };
})();
