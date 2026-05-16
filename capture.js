// ============================================================
// capture.js — Captured Pieces Display
// ============================================================

const CapturedDisplay = (function () {

  let whiteBox = null;
  let blackBox = null;

  // ------------------------------------------------------------
  // INIT UI
  // ------------------------------------------------------------
  function ensureUI() {
    if (whiteBox && blackBox) return;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "50%";
    container.style.left = "10px";
    container.style.transform = "translateY(-50%)";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.zIndex = "9998";
    container.style.pointerEvents = "none";

    whiteBox = document.createElement("div");
    whiteBox.style.minWidth = "80px";
    whiteBox.style.minHeight = "24px";
    whiteBox.style.padding = "6px 8px";
    whiteBox.style.background = "rgba(0,0,0,0.6)";
    whiteBox.style.border = "1px solid #0ff";
    whiteBox.style.borderRadius = "6px";
    whiteBox.style.color = "#fff";
    whiteBox.style.fontSize = "12px";
    whiteBox.style.fontFamily = "Segoe UI, Arial, sans-serif";
    whiteBox.textContent = "White captured:";

    blackBox = document.createElement("div");
    blackBox.style.minWidth = "80px";
    blackBox.style.minHeight = "24px";
    blackBox.style.padding = "6px 8px";
    blackBox.style.background = "rgba(0,0,0,0.6)";
    blackBox.style.border = "1px solid #0ff";
    blackBox.style.borderRadius = "6px";
    blackBox.style.color = "#fff";
    blackBox.style.fontSize = "12px";
    blackBox.style.fontFamily = "Segoe UI, Arial, sans-serif";
    blackBox.textContent = "Black captured:";

    container.appendChild(whiteBox);
    container.appendChild(blackBox);
    document.body.appendChild(container);
  }

  // ------------------------------------------------------------
  // ADD CAPTURED PIECE
  // ------------------------------------------------------------
  function addCaptured(piece) {
    if (!piece || !piece.userData) return;
    ensureUI();

    const color = piece.userData.color;
    const role  = piece.userData.role || "?";

    const tag = document.createElement("span");
    tag.style.display = "inline-block";
    tag.style.marginLeft = "4px";
    tag.textContent = role[0].toUpperCase();

    if (color === "white") {
      whiteBox.appendChild(tag);
    } else {
      blackBox.appendChild(tag);
    }
  }

  // ------------------------------------------------------------
  // CLEAR (used for reset)
  // ------------------------------------------------------------
  function clear() {
    ensureUI();
    whiteBox.textContent = "White captured:";
    blackBox.textContent = "Black captured:";
  }

  return {
    addCaptured,
    clear,
    reset: clear
  };
})();
