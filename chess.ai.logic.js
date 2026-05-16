// ============================================================
// chess.ai.logic.js — AI/Logic Synchronization Layer (FINAL)
// ============================================================
//
// This module ensures:
//  - Stockfish ALWAYS matches Logic's board
//  - AI moves are validated at 3 levels:
//        1) UCI format
//        2) Logic board occupancy
//        3) Logic legality
//  - AI auto‑repairs desync instantly
//  - AI never plays from an empty square again
//  - Win overlay ALWAYS shown on checkmate
//
// ============================================================

const AILogic = (function () {

  const files = "abcdefgh";
  const ranks = "87654321";

  // ============================================================
  // HELPERS
  // ============================================================

  function decodeUCI(uci) {
    return {
      sf: files.indexOf(uci[0]),
      sr: ranks.indexOf(uci[1]),
      tf: files.indexOf(uci[2]),
      tr: ranks.indexOf(uci[3])
    };
  }

  function getPiece(r, f) {
    if (!Logic._getPiece) {
      console.error("[AI-LOGIC] Logic._getPiece missing");
      return null;
    }
    return Logic._getPiece(r, f);
  }

  function isMoveLegalInLogic(uci) {
    const { sr, sf, tr, tf } = decodeUCI(uci);
    const piece = getPiece(sr, sf);
    if (!piece) return false;
    return Logic._isLegalMove(piece, tr, tf);
  }

  // ============================================================
  // SYNC ENGINE TO LOGIC
  // ============================================================
  function syncEngine() {
    if (!window.ChessAI || !ChessAI.engine) return;

    const moves = Logic.getMoveHistoryUCI();
    const cmd = "position startpos moves " + moves.join(" ");
    ChessAI.engine.postMessage(cmd);
  }

  // ============================================================
  // REQUEST A NEW MOVE FROM STOCKFISH
  // ============================================================
  function requestFreshAIMove() {
    if (!ChessAI || !ChessAI.engine) return;
    ChessAI.engine.postMessage("go depth 12");
  }

  // ============================================================
  // HARD DESYNC REPAIR
  // ============================================================
  function forceResyncAndRetry() {
    console.warn("[AI-LOGIC] Desync detected — repairing…");
    syncEngine();
    requestFreshAIMove();
  }

  // ============================================================
  // VALIDATE AI MOVE BEFORE APPLYING
  // ============================================================
  function validateAIMove(uci) {
    if (!uci || uci.length < 4) {
      console.warn("[AI-LOGIC] Invalid UCI format:", uci);
      return false;
    }

    const { sr, sf } = decodeUCI(uci);
    const piece = getPiece(sr, sf);

    // LEVEL 1 — must have a piece on source square
    if (!piece) {
      console.warn("[AI-LOGIC] AI tried to move from empty square:", uci);
      return false;
    }

    // LEVEL 2 — must be legal in Logic
    if (!isMoveLegalInLogic(uci)) {
      console.warn("[AI-LOGIC] AI move illegal in Logic:", uci);
      return false;
    }

    return true;
  }

  // ============================================================
  // APPLY AI MOVE SAFELY
  // ============================================================
  function applyAIMove(uci) {
    if (!validateAIMove(uci)) {
      forceResyncAndRetry();
      return;
    }

    Logic.applyUCIMove(uci);
    syncEngine();

    // ✅ Always check for checkmate after AI move
    if (typeof Logic.isCheckmate === "function" && Logic.isCheckmate()) {
      const winner = Logic.currentTurn === "white" ? "black" : "white";
      console.log(`[AI-LOGIC] Checkmate detected — ${winner.toUpperCase()} wins`);
      Logic.gameOver = true;
      if (typeof ChessAI.onCheckmate === "function") {
        ChessAI.onCheckmate(winner);
      } else if (typeof window.showWinner === "function") {
        window.showWinner(winner);
      }
    }
  }

  // ============================================================
  // HOOK FOR HUMAN MOVE
  // ============================================================
  function onHumanMove() {
    syncEngine();

    // ✅ Check for human checkmate too
    if (typeof Logic.isCheckmate === "function" && Logic.isCheckmate()) {
      const winner = Logic.currentTurn === "white" ? "black" : "white";
      console.log(`[AI-LOGIC] Checkmate detected — ${winner.toUpperCase()} wins`);
      Logic.gameOver = true;
      if (typeof ChessAI.onCheckmate === "function") {
        ChessAI.onCheckmate(winner);
      } else if (typeof window.showWinner === "function") {
        window.showWinner(winner);
      }
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    syncEngine,
    validateAIMove,
    applyAIMove,
    onHumanMove
  };

})();
