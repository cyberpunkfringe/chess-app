// ============================================================
// load.chess.js
// Auto-load theme from chess-data/chess.json (PURE JSON)
// ============================================================

(function () {

  fetch("chess-data/chess.json", { cache: "no-store" })
    .then(res => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(json => {
      window.themeData = json;   // now JSON becomes themeData
      console.log("[load.chess] Loaded JSON chess-data/chess.json");
    })
    .catch(err => {
      console.warn("[load.chess] No valid chess-data/chess.json found", err);
      window.themeData = null;   // fallback to built-in default
    });

})();
