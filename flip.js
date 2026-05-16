// ============================================================
// flip.js — Board + Pieces Flip System (FINAL)
// ============================================================

const FlipBoard = (function () {

  let flipped = false;

  // ------------------------------------------------------------
  // FLIP BOARD + PIECES
  // ------------------------------------------------------------
  function flip() {
    flipped = !flipped;

    // 1) Rotate board group (visual flip)
    if (window.boardGroup) {
      boardGroup.rotation.y = flipped ? Math.PI : 0;
    }

    // 2) Flip all pieces by rank/file
    if (typeof Pieces !== "undefined" && Pieces.list) {
      Pieces.list.forEach(p => {
        if (!p.userData) return;
        const r = p.userData.rank;
        const f = p.userData.file;
        if (r == null || f == null) return;

        const nr = 7 - r;
        const nf = 7 - f;

        const pos = Board.worldPosition(nr, nf);
        p.position.set(pos.x, 0, pos.z);

        p.userData.rank = nr;
        p.userData.file = nf;

        // Rotate knights to keep facing correctly
        if (p.userData.role === "knight") {
          p.rotation.y += Math.PI;
        }
      });
    }

    // 3) Flip logic board (optional but recommended)
    if (typeof Logic !== "undefined" && typeof Logic.flipBoard === "function") {
      Logic.flipBoard();
    }

    // 4) Reset captured pieces display
    if (typeof CapturedDisplay !== "undefined" &&
        typeof CapturedDisplay.reset === "function") {
      CapturedDisplay.reset();
    }
  }

  // ------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------
  return {
    flip
  };

})();
