// ============================================================
// engine.js — Core Chess Engine Wrapper (Logic + Pieces + AI)
// ============================================================

const Engine = (function () {

  // --------------------------------------------
  // RESET BOARD (used when starting new AI game)
  // --------------------------------------------
  function resetBoard() {
    // Reset Logic state
    Logic.initPieces(Pieces.list);

    // Reset piece positions in 3D
    Pieces.list.forEach(p => {
      const pos = Board.worldPosition(p.userData.rank, p.userData.file);
      p.position.set(pos.x, 0, pos.z);
      p.visible = true;
    });
  }

  // --------------------------------------------
  // UCI MOVE HISTORY (AI uses this)
  // --------------------------------------------
  function getMoveHistoryUCI() {
    return Logic.getMoveHistoryUCI();
  }

  // --------------------------------------------
  // APPLY UCI MOVE (AI move)
  // --------------------------------------------
  function applyUCIMove(uci) {
    Logic.applyUCIMove(uci);
  }

  return {
    resetBoard,
    getMoveHistoryUCI,
    applyUCIMove
  };

})();
