const Logic = (function () {

  const size = 8;
  let board = [];
  let currentTurn = "white";
  let gameOver = false;

  // UCI move history
  let moveHistory = [];

  // Full move objects (for undo/redo)
  let moveObjects = [];
  let lastMove = null;

  // Castling tracking
  let moved = {
    white: { king: false, rookA: false, rookH: false },
    black: { king: false, rookA: false, rookH: false }
  };

  // Pawn promotion UI state
  let pendingUpdatePiece = null;

  // ============================================================
  // INIT
  // ============================================================
  function initPieces(pieces) {
    board = [];
    for (let r = 0; r < size; r++) {
      board[r] = [];
      for (let f = 0; f < size; f++) board[r][f] = null;
    }

    pieces.forEach(p => {
      const d = p.userData;
      board[d.rank][d.file] = p;
    });

    moved = {
      white: { king: false, rookA: false, rookH: false },
      black: { king: false, rookA: false, rookH: false }
    };

    moveHistory = [];
    moveObjects = [];
    lastMove = null;
    currentTurn = "white";
    gameOver = false;
    pendingUpdatePiece = null;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  const inside = (r, f) => r >= 0 && r < size && f >= 0 && f < size;
  const empty  = (r, f) => inside(r, f) && board[r][f] === null;
  const enemy  = (r, f, color) => inside(r, f) && board[r][f] && board[r][f].userData.color !== color;
  const ally   = (r, f, color) => inside(r, f) && board[r][f] && board[r][f].userData.color === color;

  function findKing(color) {
    for (let r = 0; r < size; r++) {
      for (let f = 0; f < size; f++) {
        const p = board[r][f];
        if (p && p.userData.role === "king" && p.userData.color === color) {
          return p;
        }
      }
    }
    return null;
  }

  function getKingSquare(color) {
    const k = findKing(color);
    if (!k) return null;
    return { r: k.userData.rank, f: k.userData.file };
  }

  function _getPiece(r, f) {
    if (!inside(r, f)) return null;
    return board[r][f] || null;
  }

  // ============================================================
  // EXPORT / IMPORT STATE
  // ============================================================
  function exportState() {
    return {
      board: board.map(row =>
        row.map(p => p ? {
          color: p.userData.color,
          role: p.userData.role,
          rank: p.userData.rank,
          file: p.userData.file,
          mesh: p
        } : null)
      ),
      currentTurn,
      moved: JSON.parse(JSON.stringify(moved)),
      moveHistory: [...moveHistory],
      moveObjects: [...moveObjects],
      gameOver
    };
  }

  function importState(state) {
    board = state.board.map(row =>
      row.map(cell => cell ? cell.mesh : null)
    );

    currentTurn = state.currentTurn;
    moved = JSON.parse(JSON.stringify(state.moved));
    moveHistory = [...state.moveHistory];
    moveObjects = [...state.moveObjects];
    gameOver = state.gameOver;

    for (let r = 0; r < size; r++) {
      for (let f = 0; f < size; f++) {
        const p = board[r][f];
        if (p) {
          const pos = Board.worldPosition(r, f);
          p.position.set(pos.x, 0, pos.z);
          p.visible = true;
          p.userData.rank = r;
          p.userData.file = f;
        }
      }
    }
  }

  // ============================================================
  // MOVE REQUEST (PLAYER)
  // ============================================================
  function requestMove(data, tr, tf) {
    if (gameOver) return false;

    const sr = data.rank;
    const sf = data.file;

    const piece = board[sr][sf];
    if (!piece) return false;
    if (piece.userData.color !== currentTurn) return false;

    // Castling
    if (piece.userData.role === "king") {
      const castle = tryCastling(piece, tr, tf);
      if (castle) {
        const mv = buildMoveObject(piece, sr, sf, tr, tf, null);
        commitMove(mv, "move");
        return true;
      }
    }

    // Normal legality
    if (!isLegalMove(piece, tr, tf)) return false;

    // King safety
    const backup = simulateMove(piece, tr, tf);
    const kingSafe = !isKingInCheck(currentTurn);
    undoSimulatedMove(backup);
    if (!kingSafe) return false;

    const captured = board[tr][tf] || null;
    const mv = buildMoveObject(piece, sr, sf, tr, tf, captured);
    commitMove(mv, captured ? "capture" : "move");

    return true;
  }

  // ============================================================
  // BUILD MOVE OBJECT
  // ============================================================
  function buildMoveObject(piece, sr, sf, tr, tf, captured) {
    return {
      piece,
      color: piece.userData.color,
      role: piece.userData.role,
      from: { r: sr, f: sf },
      to: { r: tr, f: tf },
      captured,
      prevState: exportState()
    };
  }

  // ============================================================
  // COMMIT MOVE (HUMAN + AI)
  // ============================================================
  function commitMove(mv, mode) {
    const { piece, from, to, captured } = mv;

    performMove(piece, to.r, to.f);
    markMovement(piece);

    const isAI = mode === "ai";

    // Player promotion UI
    if (!isAI && piece.userData.role === "pawn") {
      const lastRank = piece.userData.color === "white" ? 0 : 7;
      if (to.r === lastRank) {
        pendingUpdatePiece = { piece, r: to.r, f: to.f };
        showUpdatePieceUI(piece.userData.color);
        return;
      }
    }

    if (captured) captured.visible = false;

    recordUCIMove(from.r, from.f, to.r, to.f);

    mv.nextState = exportState();
    moveObjects.push(mv);
    lastMove = mv;

    if (captured && typeof CapturedDisplay !== "undefined") {
      CapturedDisplay.addCaptured(captured);
    }

    if (typeof Sound !== "undefined") {
      if (mode === "capture") Sound.capture?.();
      else Sound.move?.();
    }

    const opponent = currentTurn === "white" ? "black" : "white";

    if (isKingInCheck(opponent)) {
      Sound.check?.();
      const ks = getKingSquare(opponent);
      Board.highlightKingInCheck?.(ks.r, ks.f);
    }

    if (isCheckmate(opponent)) {
      Sound.checkmate?.();

      if (typeof window.showWinner === "function") {
        window.showWinner(piece.userData.color);
      }
      if (typeof ChessAI !== "undefined" && typeof ChessAI.onCheckmate === "function") {
        ChessAI.onCheckmate(piece.userData.color);
      }

      gameOver = true;
    }

    Board.highlightMove?.(from.r, from.f, to.r, to.f, mode);

    currentTurn = opponent;

    if (typeof ChessAI !== "undefined" && ChessAI.engine) {
      ChessAI.engine.postMessage("position startpos moves " + moveHistory.join(" "));
    }
  }

  // ============================================================
  // APPLY UCI MOVE (AI)
  // ============================================================
  function applyUCIMove(uci) {
    if (gameOver) return;

    const files = "abcdefgh";
    const ranks = "87654321";

    const sf = files.indexOf(uci[0]);
    const sr = ranks.indexOf(uci[1]);
    const tf = files.indexOf(uci[2]);
    const tr = ranks.indexOf(uci[3]);

    if (sf < 0 || sr < 0 || tf < 0 || tr < 0) return;

    const piece = board[sr]?.[sf];
    if (!piece) return;

    const color = piece.userData.color;
    const role  = piece.userData.role;

    // Castling (AI)
    if (role === "king" && sr === tr && Math.abs(tf - sf) === 2) {
      const rank = sr;

      // king-side
      if (tf === 6 && sf === 4) {
        const rook = board[rank][7];
        if (rook && rook.userData.role === "rook") {
          performMove(piece, rank, 6);
          performMove(rook, rank, 5);
          moved[color].king = true;
          moved[color].rookH = true;

          recordUCIMove(sr, sf, tr, tf);

          const mv = buildMoveObject(piece, sr, sf, tr, tf, null);
          mv.nextState = exportState();
          moveObjects.push(mv);
          lastMove = mv;

          currentTurn = currentTurn === "white" ? "black" : "white";
          Board.highlightMove?.(sr, sf, tr, tf, "move");

          if (typeof ChessAI !== "undefined" && ChessAI.engine) {
            ChessAI.engine.postMessage("position startpos moves " + moveHistory.join(" "));
          }
          return;
        }
      }

      // queen-side
      if (tf === 2 && sf === 4) {
        const rook = board[rank][0];
        if (rook && rook.userData.role === "rook") {
          performMove(piece, rank, 2);
          performMove(rook, rank, 3);
          moved[color].king = true;
          moved[color].rookA = true;

          recordUCIMove(sr, sf, tr, tf);

          const mv = buildMoveObject(piece, sr, sf, tr, tf, null);
          mv.nextState = exportState();
          moveObjects.push(mv);
          lastMove = mv;

          currentTurn = currentTurn === "white" ? "black" : "white";
          Board.highlightMove?.(sr, sf, tr, tf, "move");

          if (typeof ChessAI !== "undefined" && ChessAI.engine) {
            ChessAI.engine.postMessage("position startpos moves " + moveHistory.join(" "));
          }
          return;
        }
      }
    }

    // Normal AI move
    const captured = board[tr][tf] || null;
    const mv = buildMoveObject(piece, sr, sf, tr, tf, captured);
    commitMove(mv, captured ? "capture" : "ai");

    // AI auto-promotion to queen
    if (piece.userData.role === "pawn") {
      const lastRank = piece.userData.color === "white" ? 0 : 7;
      if (tr === lastRank) {
        updatePawn(piece, "queen");
      }
    }
  }

  // ============================================================
  // UCI MOVE RECORD
  // ============================================================
  function recordUCIMove(sr, sf, tr, tf) {
    const files = "abcdefgh";
    const ranks = "87654321";

    const move =
      files[sf] +
      ranks[sr] +
      files[tf] +
      ranks[tr];

    moveHistory.push(move);
  }

  function getMoveHistoryUCI() {
    return moveHistory.slice();
  }

  // ============================================================
  // CASTLING (HUMAN)
  // ============================================================
  function tryCastling(king, tr, tf) {
    const color = king.userData.color;
    const rank = color === "white" ? 7 : 0;

    if (king.userData.rank !== rank || king.userData.file !== 4) return false;
    if (moved[color].king) return false;
    if (isKingInCheck(color)) return false;

    // king-side
    if (tr === rank && tf === 6) {
      const rook = board[rank][7];
      if (!rook || rook.userData.role !== "rook") return false;
      if (moved[color].rookH) return false;
      if (!empty(rank, 5) || !empty(rank, 6)) return false;
      if (!isSafeForKing(color, rank, 5)) return false;
      if (!isSafeForKing(color, rank, 6)) return false;

      performMove(king, rank, 6);
      performMove(rook, rank, 5);

      moved[color].king = true;
      moved[color].rookH = true;

      return true;
    }

    // queen-side
    if (tr === rank && tf === 2) {
      const rook = board[rank][0];
      if (!rook || rook.userData.role !== "rook") return false;
      if (moved[color].rookA) return false;
      if (!empty(rank, 1) || !empty(rank, 2) || !empty(rank, 3)) return false;
      if (!isSafeForKing(color, rank, 3)) return false;
      if (!isSafeForKing(color, rank, 2)) return false;

      performMove(king, rank, 2);
      performMove(rook, rank, 3);

      moved[color].king = true;
      moved[color].rookA = true;

      return true;
    }

    return false;
  }

  function isSafeForKing(color, r, f) {
    const king = findKing(color);
    const backup = simulateMove(king, r, f);
    const safe = !isKingInCheck(color);
    undoSimulatedMove(backup);
    return safe;
  }

  function markMovement(piece) {
    const color = piece.userData.color;
    const role = piece.userData.role;
    const file = piece.userData.file;

    if (role === "king") moved[color].king = true;
    if (role === "rook") {
      if (file === 0) moved[color].rookA = true;
      if (file === 7) moved[color].rookH = true;
    }
  }

  // ============================================================
  // PERFORM MOVE
  // ============================================================
  function performMove(piece, tr, tf) {
    const { rank, file } = piece.userData;

    const target = board[tr][tf];

    if (target && target.userData.color !== piece.userData.color) {
      target.visible = false;
    }

    board[rank][file] = null;
    board[tr][tf] = piece;

    piece.userData.rank = tr;
    piece.userData.file = tf;

    const pos = Board.worldPosition(tr, tf);
    piece.position.set(pos.x, 0, pos.z);
  }

  // ============================================================
  // SIMULATE MOVE
  // ============================================================
  function simulateMove(piece, tr, tf) {
    const { rank, file } = piece.userData;

    const backup = {
      piece,
      oldR: rank,
      oldF: file,
      newR: tr,
      newF: tf,
      captured: board[tr][tf]
    };

    board[rank][file] = null;
    board[tr][tf] = piece;

    piece.userData.rank = tr;
    piece.userData.file = tf;

    return backup;
  }

  function undoSimulatedMove(b) {
    const { piece, oldR, oldF, newR, newF, captured } = b;

    board[oldR][oldF] = piece;
    board[newR][newF] = captured;

    piece.userData.rank = oldR;
    piece.userData.file = oldF;
  }

  // ============================================================
  // CHECK / CHECKMATE
  // ============================================================
  function isKingInCheck(color) {
    const king = findKing(color);
    if (!king) return false;

    const kr = king.userData.rank;
    const kf = king.userData.file;

    const enemyColor = color === "white" ? "black" : "white";

    for (let r = 0; r < size; r++) {
      for (let f = 0; f < size; f++) {
        const p = board[r][f];
        if (p && p.userData.color === enemyColor) {
          if (isLegalMove(p, kr, kf, true)) return true;
        }
      }
    }
    return false;
  }

  function isCheckmate(color) {
    if (!isKingInCheck(color)) return false;

    for (let r = 0; r < size; r++) {
      for (let f = 0; f < size; f++) {
        const p = board[r][f];
        if (p && p.userData.color === color) {
          for (let tr = 0; tr < size; tr++) {
            for (let tf = 0; tf < size; tf++) {
              if (isLegalMove(p, tr, tf)) {
                const backup = simulateMove(p, tr, tf);
                const safe = !isKingInCheck(color);
                undoSimulatedMove(backup);
                if (safe) return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  // ============================================================
  // LEGAL MOVE LOGIC
  // ============================================================
  function isLegalMove(piece, tr, tf, ignoreCheck = false) {
    const { rank, file, color, role } = piece.userData;

    if (!inside(tr, tf)) return false;
    if (ally(tr, tf, color)) return false;
    if (rank === tr && file === tf) return false;

    const dr = tr - rank;
    const df = tf - file;

    // Pawn
    if (role === "pawn") {
      const dir = color === "white" ? -1 : 1;
      const startRank = color === "white" ? 6 : 1;

      if (df === 0) {
        if (dr === dir && empty(tr, tf)) return true;
        if (rank === startRank && dr === 2 * dir && empty(rank + dir, file) && empty(tr, tf)) return true;
      }

      if (dr === dir && Math.abs(df) === 1 && enemy(tr, tf, color)) return true;

      return false;
    }

    // Knight
    if (role === "knight") {
      if (
        (Math.abs(dr) === 2 && Math.abs(df) === 1) ||
        (Math.abs(dr) === 1 && Math.abs(df) === 2)
      ) return true;
      return false;
    }

    // Rook / Queen (straight)
    if (role === "rook" || role === "queen") {
      if (dr === 0 || df === 0) {
        const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
        const stepF = df === 0 ? 0 : df > 0 ? 1 : -1;

        let r = rank + stepR;
        let f = file + stepF;

        while (r !== tr || f !== tf) {
          if (!empty(r, f)) return false;
          r += stepR;
          f += stepF;
        }

        return true;
      }
    }

    // Bishop / Queen (diagonal)
    if (role === "bishop" || role === "queen") {
      if (Math.abs(dr) === Math.abs(df)) {
        const stepR = dr > 0 ? 1 : -1;
        const stepF = df > 0 ? 1 : -1;

        let r = rank + stepR;
        let f = file + stepF;

        while (r !== tr || f !== tf) {
          if (!empty(r, f)) return false;
          r += stepR;
          f += stepF;
        }

        return true;
      }
    }

    // King
    if (role === "king") {
      if (Math.max(Math.abs(dr), Math.abs(df)) === 1) return true;

      // Allow 2-square king move for castling validation
      if (dr === 0 && Math.abs(df) === 2) return true;

      return false;
    }

    return false;
  }

  function _isLegalMove(piece, tr, tf) {
    return isLegalMove(piece, tr, tf);
  }

  // ============================================================
  // PROMOTION SUPPORT
  // ============================================================
  function findTemplatePiece(role, color) {
    for (let r = 0; r < size; r++) {
      for (let f = 0; f < size; f++) {
        const p = board[r][f];
        if (!p) continue;
        if (p.userData.role === role && p.userData.color === color) {
          return p;
        }
      }
    }
    return null;
  }

  function updatePawn(piece, newRole) {
    const color = piece.userData.color;
    const r = piece.userData.rank;
    const f = piece.userData.file;

    const template = findTemplatePiece(newRole, color);

    if (template && typeof template.clone === "function") {
      piece.visible = false;

      const newMesh = template.clone();
      newMesh.userData = {
        color,
        role: newRole,
        rank: r,
        file: f
      };

      board[r][f] = newMesh;

      const pos = Board.worldPosition(r, f);
      newMesh.position.set(pos.x, 0, pos.z);

      if (typeof scene !== "undefined") {
        scene.add(newMesh);
      }
    } else {
      piece.userData.role = newRole;
      board[r][f] = piece;
      const pos = Board.worldPosition(r, f);
      piece.position.set(pos.x, 0, pos.z);
      piece.visible = true;
    }

    if (typeof Pieces !== "undefined" && typeof Pieces.update === "function") {
      Pieces.update();
    }

    console.log(`[UPDATE] ${color} pawn → ${newRole}`);
  }

  function showUpdatePieceUI(color) {
    const overlay =
      document.getElementById("updatePieceOverlay") ||
      document.getElementById("promotionOverlay");

    if (!overlay) {
      console.error("updatePieceOverlay / promotionOverlay not found in HTML");
      return;
    }

    overlay.classList.remove("hidden");

    const buttons =
      overlay.querySelectorAll(".updatePiece-btn")?.length
        ? overlay.querySelectorAll(".updatePiece-btn")
        : overlay.querySelectorAll(".promotion-btn");

    buttons.forEach(btn => {
      btn.onclick = () => {
        const role = btn.dataset.role;
        finalizeUpdatePiece(role);
        overlay.classList.add("hidden");
      };
    });
  }

  function finalizeUpdatePiece(role) {
    if (!pendingUpdatePiece) return;

    const { piece } = pendingUpdatePiece;
    updatePawn(piece, role);

    pendingUpdatePiece = null;

    const opponent = currentTurn === "white" ? "black" : "white";
    currentTurn = opponent;

    if (typeof ChessAI !== "undefined" && ChessAI.engine) {
      ChessAI.engine.postMessage("position startpos moves " + moveHistory.join(" "));
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    initPieces,
    requestMove,
    getMoveHistoryUCI,
    applyUCIMove,

    exportState,
    importState,
    getLastMove: () => lastMove,
    exportLastMove: () => lastMove,

    get currentTurn() {
      return currentTurn;
    },

    _getPiece,
    _isLegalMove
  };
})();
