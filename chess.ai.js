// ============================================================
// chess.ai.js — Stockfish 18 (single-thread) AI Integration
// ============================================================

const ChessAI = (function () {

  let engine = null;
  let aiColor = "black";
  let difficulty = "medium";
  let active = false;
  let thinking = false;

  const DEPTH = {
    beginner: 2,
    medium: 6,
    hard: 12
  };

  // ============================================================
  // INIT ENGINE
  // ============================================================
  function init() {
    engine = new Worker("chess-data/engine/stockfish.js");

    engine.postMessage("uci");
    engine.postMessage("isready");

    console.log("[AI] Stockfish initialized");
  }

  // ============================================================
  // RESET ENGINE FOR NEW GAME
  // ============================================================
  function resetEngine() {
    if (!engine) return;

    engine.postMessage("ucinewgame");
    engine.postMessage("isready");
    engine.postMessage("position startpos");

    console.log("[AI] Engine reset to startpos");
  }

  // ============================================================
  // START NEW GAME VS AI
  // ============================================================
  function startGame(opts = {}) {
    aiColor = opts.color || "black";
    difficulty = opts.difficulty || "medium";
    active = true;
    thinking = false;

    console.log(`[AI] New game vs AI (${aiColor}, ${difficulty})`);

    // Reset engine
    resetEngine();

    // Reset captured display
    if (typeof CapturedDisplay !== "undefined") {
      CapturedDisplay.reset();
    }

    // Reset undo/redo
    if (typeof UndoRedo !== "undefined") {
      UndoRedo.clear?.();
    }

    // If AI plays white → AI moves first
    if (aiColor === "white") {
      setTimeout(playTurn, 300);
    }
  }

  // ============================================================
  // PLAY AI TURN
  // ============================================================
  function playTurn() {
    if (!active || thinking) return;
    if (Logic.currentTurn !== aiColor) return;

    thinking = true;

    const depth = DEPTH[difficulty] || 6;

    // Sync Stockfish with Logic move history
    const moves = Logic.getMoveHistoryUCI();
    const posCmd = "position startpos moves " + moves.join(" ");
    engine.postMessage(posCmd);

    engine.onmessage = e => {
      const line = e.data;
      if (typeof line !== "string") return;

      // ========================================================
      //  AI CHECKMATE DETECTION
      // ========================================================
      if (line.includes("bestmove (none)")) {
        thinking = false;

        const winner = aiColor === "white" ? "black" : "white";

        console.warn("[AI] No legal move — checkmate detected");
        if (typeof window.showWinner === "function") {
          window.showWinner(winner);
        }

        active = false;
        return;
      }

      // ========================================================
      //  NORMAL BESTMOVE
      // ========================================================
      if (line.startsWith("bestmove")) {
        const move = line.split(" ")[1];
        thinking = false;

        if (!move || move === "(none)") {
          console.warn("[AI] No legal move found");
          const winner = aiColor === "white" ? "black" : "white";

          if (typeof window.showWinner === "function") {
            window.showWinner(winner);
          }

          active = false;
          return;
        }

        // Validate move through AILogic
        if (typeof AILogic !== "undefined") {
          if (!AILogic.validateAIMove(move)) {
            console.warn("[AI] Move rejected by AILogic:", move);
            return;
          }
        }

        // Apply move
        Logic.applyUCIMove(move);

        // Sound
        if (typeof Sound !== "undefined") {
          Sound.move?.();
        }

        // Update captured display
        if (typeof CapturedDisplay !== "undefined") {
          const last = Logic.getLastMove?.();
          if (last?.capturedMesh) {
            CapturedDisplay.addCaptured(last.capturedMesh);
          }
        }

        // Record for undo/redo
        if (typeof UndoRedo !== "undefined") {
          UndoRedo.record?.(Logic.exportLastMove?.());
        }

        // Sync engine again
        const updatedMoves = Logic.getMoveHistoryUCI();
        engine.postMessage("position startpos moves " + updatedMoves.join(" "));
      }
    };

    engine.postMessage("go depth " + depth);
  }

  // ============================================================
  // PUBLIC HELPERS
  // ============================================================
  function isActive() {
    return active;
  }

  function getColor() {
    return aiColor;
  }

  return {
    init,
    startGame,
    playTurn,
    isActive,
    getColor,
    engine
  };

})();
