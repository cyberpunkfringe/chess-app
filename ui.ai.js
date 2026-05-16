// ============================================================
// ui.ai.js — Floating AI Button + Difficulty Overlay
// ============================================================

// ⭐ AUTO‑START AI AFTER A FULL RELOAD
(function () {
  const pending = localStorage.getItem("aiStartAfterReload");
  if (pending && typeof ChessAI !== "undefined" && typeof ChessAI.startGame === "function") {
    localStorage.removeItem("aiStartAfterReload");

    // Start AI game cleanly after reload
    ChessAI.startGame({
      color: "black",
      difficulty: pending
    });
  }
})();


// ------------------------------------------------------------
//  OPEN OVERLAY (AI BUTTON ALWAYS VISIBLE)
// ------------------------------------------------------------
const aiButton  = document.getElementById("aiFloatingButton");
const aiOverlay = document.getElementById("aiOverlay");

if (aiButton && aiOverlay) {
  aiButton.onclick = () => {
    aiOverlay.classList.remove("hidden");
  };

  // Close overlay when clicking outside the box
  aiOverlay.onclick = e => {
    if (e.target.id === "aiOverlay") {
      aiOverlay.classList.add("hidden");
    }
  };
}


// ------------------------------------------------------------
//  DIFFICULTY SELECTION — STORE + RELOAD
// ------------------------------------------------------------
document.querySelectorAll(".ai-overlay-option").forEach(opt => {
  opt.onclick = () => {
    const difficulty = opt.dataset.difficulty;

    // ⭐ Store difficulty so after reload we know what to start with
    localStorage.setItem("aiStartAfterReload", difficulty);

    // ⭐ FULL FRESH RESET: app.js init() will rebuild board, pieces, logic, etc.
    location.reload();

    // Overlay will disappear after reload anyway, but hide it immediately too
    aiOverlay.classList.add("hidden");
  };
});


// ------------------------------------------------------------
//  GLOBAL WIN OVERLAY (SHOWS WHITE OR BLACK WIN)
//  ⭐ NOW CLICKABLE TO CLOSE — STYLE UNCHANGED
// ------------------------------------------------------------
window.showWinner = function (color) {
  const old = document.querySelector(".winOverlay");
  if (old) old.remove();

  const div = document.createElement("div");
  div.className = "winOverlay";
  div.textContent = color === "white" ? "WHITE WINS" : "BLACK WINS";

  Object.assign(div.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "20px 40px",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    fontSize: "64px",
    fontFamily: "Arial",
    border: "3px solid #0ff",
    borderRadius: "12px",
    zIndex: 999999,
    cursor: "pointer",        // ⭐ NEW
    pointerEvents: "auto"     // ⭐ FIXED (was none)
  });

  // ⭐ CLICK ANYWHERE ON THE BOX TO CLOSE
  div.onclick = () => {
    div.remove();
  };

  document.body.appendChild(div);
};


// ------------------------------------------------------------
//  AI CHECKMATE HOOK — ALWAYS SHOW WIN OVERLAY
// ------------------------------------------------------------
if (typeof ChessAI !== "undefined") {
  ChessAI.onCheckmate = function (winnerColor) {
    window.showWinner(winnerColor);
  };
}