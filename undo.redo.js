// ============================================================
// undo.redo.js — Time Travel (Undo / Redo) using Logic.exportState
// ============================================================

const UndoRedo = (function () {

  let history = [];
  let index = -1;

  // ------------------------------------------------------------
  // INTERNAL: CAPTURE CURRENT STATE
  // ------------------------------------------------------------
  function captureState() {
    if (typeof Logic === "undefined" || !Logic || typeof Logic.exportState !== "function") return;

    const snapshot = Logic.exportState();
    // truncate future if we branched
    history = history.slice(0, index + 1);
    history.push(snapshot);
    index = history.length - 1;
  }

  // ------------------------------------------------------------
  // PUBLIC: UNDO
  // ------------------------------------------------------------
  function undo() {
    if (index <= 0) return;
    index--;

    const state = history[index];
    if (!state) return;

    if (typeof Logic !== "undefined" && Logic && typeof Logic.importState === "function") {
      Logic.importState(state);
    }
  }

  // ------------------------------------------------------------
  // PUBLIC: REDO
  // ------------------------------------------------------------
  function redo() {
    if (index >= history.length - 1) return;
    index++;

    const state = history[index];
    if (!state) return;

    if (typeof Logic !== "undefined" && Logic && typeof Logic.importState === "function") {
      Logic.importState(state);
    }
  }

  // ------------------------------------------------------------
  // MONKEY‑PATCH LOGIC TO AUTO‑CAPTURE AFTER MOVES
  // ------------------------------------------------------------
  function patchLogic() {
    if (typeof Logic === "undefined" || !Logic) return;

    // Patch initPieces → capture initial state
    const _initPieces = Logic.initPieces;
    Logic.initPieces = function (...args) {
      const res = _initPieces.apply(Logic, args);
      history = [];
      index = -1;
      captureState();
      return res;
    };

    // Patch requestMove (human moves)
    const _requestMove = Logic.requestMove;
    Logic.requestMove = function (...args) {
      const ok = _requestMove.apply(Logic, args);
      if (ok) captureState();
      return ok;
    };

    // Patch applyUCIMove (AI moves)
    const _applyUCIMove = Logic.applyUCIMove;
    Logic.applyUCIMove = function (...args) {
      _applyUCIMove.apply(Logic, args);
      captureState();
    };
  }

  // Patch as soon as possible
  if (document.readyState === "complete" || document.readyState === "interactive") {
    patchLogic();
  } else {
    window.addEventListener("load", patchLogic);
  }

  return {
    undo,
    redo
  };
})();
