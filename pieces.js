// ============================================================
// pieces.js — 3D Chess Pieces + Labels + Flip-Compatible System
// ============================================================

const Pieces = (function () {

  const pieces = [];

  // Theme-driven values
  let labelWhite = "#ffffff";
  let labelBlack = "#ff6666";
  let fontStyle = "Arial";
  let glowIntensity = 1.0;
  let labelSize = 28;

  // Materials
  let whiteMat, blackMat;

  // Texture references
  let texWhite = null;
  let texBlack = null;
  let depthTexture = null;

  // Depth shading intensity
  let depthWhite = 0.35;
  let depthBlack = 0.35;

  // ============================================================
  // TEXTURE INJECTION
  // ============================================================
  function setTextures(whiteTex, blackTex, depthTex) {
    texWhite = whiteTex;
    texBlack = blackTex;
    depthTexture = depthTex;
  }

  function setDepthIntensity(whiteV, blackV) {
    depthWhite = whiteV;
    depthBlack = blackV;
  }

  // ============================================================
  // LABEL DRAWING
  // ============================================================
  function measureTextSize(text, size) {
    const tmp = document.createElement("canvas").getContext("2d");
    tmp.font = `${size}px ${fontStyle}`;
    const width = tmp.measureText(text).width;
    return { w: width + size * 1.5, h: size * 2 };
  }

  function drawLabel(ctx, text, color, size, glow = false) {
    const { w, h } = measureTextSize(text, size);
    ctx.canvas.width = w;
    ctx.canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, w, h);

    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 40 * glowIntensity;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = color;
    ctx.font = `${size}px ${fontStyle}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2);
  }

  function createLabel(text, color) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    drawLabel(ctx, text, color, labelSize);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(canvas.width * 0.12, canvas.height * 0.12, 1);

    sprite.userData = { isLabel: true, canvas, ctx, text, color };
    return sprite;
  }

  function setLabelGlow(label, isOn) {
    const { ctx, text, color, canvas } = label.userData;
    drawLabel(ctx, text, color, labelSize, isOn);
    label.material.map.needsUpdate = true;
    label.scale.set(canvas.width * 0.12, canvas.height * 0.12, 1);
  }

  // ============================================================
  // PIECE SHAPES
  // ============================================================
  const Shape = {
    pawn(mat) {
      const g = new THREE.Group();

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 6, 4, 16),
        mat
      );
      base.position.y = 2;

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 4.5, 10, 16),
        mat
      );
      body.position.y = 9;

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 16, 16),
        mat
      );
      head.position.y = 16;

      g.add(base, body, head);
      return g;
    },

    rook(mat) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 4, 16), mat);
      base.position.y = 2;

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 16), mat);
      tower.position.y = 11;

      g.add(base, tower);

      for (let i = 0; i < 4; i++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), mat);
        const angle = (i / 4) * Math.PI * 2;
        block.position.set(Math.cos(angle) * 4.5, 19, Math.sin(angle) * 4.5);
        g.add(block);
      }

      return g;
    },

    knight(mat) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 4, 16), mat);
      base.position.y = 2;

      const body = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 6), mat);
      body.position.set(0, 11, -1);

      const neck = new THREE.Mesh(new THREE.BoxGeometry(3.5, 6, 4), mat);
      neck.position.set(0, 17, -2);

      const head = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), mat);
      head.position.set(0, 21, -3);

      g.add(base, body, neck, head);
      return g;
    },

    bishop(mat) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 4, 16), mat);
      base.position.y = 2;

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, 6, 16), mat);
      lower.position.y = 7;

      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.8, 12, 24), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 11;

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 6, 16), mat);
      upper.position.y = 15;

      const head = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), mat);
      head.position.y = 20;

      const top = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 16), mat);
      top.position.y = 24;

      g.add(base, lower, ring, upper, head, top);
      return g;
    },

    queen(mat) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 4, 16), mat);
      base.position.y = 2;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6, 14, 16), mat);
      body.position.y = 12;

      const crownBase = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), mat);
      crownBase.position.y = 21;

      g.add(base, body, crownBase);

      for (let i = 0; i < 6; i++) {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), mat);
        const angle = (i / 6) * Math.PI * 2;
        orb.position.set(Math.cos(angle) * 3.5, 24, Math.sin(angle) * 3.5);
        g.add(orb);
      }

      return g;
    },

    king(mat) {
      const g = new THREE.Group();

      const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 4, 16), mat);
      base.position.y = 2;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6, 15, 16), mat);
      body.position.y = 12.5;

      const head = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), mat);
      head.position.y = 22;

      const crossCenterY = 26.5;

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.0, 1.4), mat);
      crossV.position.y = crossCenterY;

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.4, 1.4), mat);
      crossH.position.y = crossCenterY;

      g.add(base, body, head, crossV, crossH);
      return g;
    }
  };

  function createMeshForType(type, mat) {
    switch (type) {
      case "pawn":   return Shape.pawn(mat);
      case "rook":   return Shape.rook(mat);
      case "knight": return Shape.knight(mat);
      case "bishop": return Shape.bishop(mat);
      case "queen":  return Shape.queen(mat);
      case "king":   return Shape.king(mat);
      default:       return Shape.pawn(mat);
    }
  }

  // ============================================================
  // APPLY TEXTURE + DEPTH SHADING
  // ============================================================
  function applyTextureAndDepth(mesh, color) {
    const tex = color === "white" ? texWhite : texBlack;

    mesh.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.map = tex;
        child.material.needsUpdate = true;
      }
    });

    if (depthTexture && !mesh.userData.depthShading) {
      const geo = new THREE.PlaneGeometry(22, 22);
      const mat = new THREE.MeshBasicMaterial({
        map: depthTexture,
        transparent: true,
        depthWrite: false
      });

      const ds = new THREE.Mesh(geo, mat);
      ds.rotation.x = -Math.PI / 2;
      ds.position.y = 0.05;

      mesh.add(ds);
      mesh.userData.depthShading = ds;
    }
  }

  // ============================================================
  // ADD PIECE
  // ============================================================
  function addPiece(mesh, color, type, rank, file, scene) {
    mesh.userData = {
      type: "piece",
      color,
      role: type,
      rank,
      file,
      isSelected: false
    };

    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    applyTextureAndDepth(mesh, color);

    const labelColor = color === "white" ? labelWhite : labelBlack;
    const label = createLabel(type.toUpperCase(), labelColor);
    label.position.set(0, 28, 0);
    mesh.add(label);

    pieces.push(mesh);
    scene.add(mesh);
  }

  // ============================================================
  // CREATE ALL PIECES
  // ============================================================
  function createPieces(scene) {
    whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    blackMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    // Pawns
    for (let f = 0; f < 8; f++) {
      const wp = Shape.pawn(whiteMat);
      const posW = Board.worldPosition(6, f);
      wp.position.set(posW.x, 0, posW.z);
      addPiece(wp, "white", "pawn", 6, f, scene);

      const bp = Shape.pawn(blackMat);
      const posB = Board.worldPosition(1, f);
      bp.position.set(posB.x, 0, posB.z);
      addPiece(bp, "black", "pawn", 1, f, scene);
    }

    const backOrder = [
      "rook", "knight", "bishop", "queen",
      "king", "bishop", "knight", "rook"
    ];

    // Major pieces
    for (let f = 0; f < 8; f++) {
      const type = backOrder[f];

      // WHITE
      const wMesh = createMeshForType(type, whiteMat);
      const posW = Board.worldPosition(7, f);
      wMesh.position.set(posW.x, 0, posW.z);

      if (type === "knight") {
        wMesh.rotation.y = f < 4 ? Math.PI / 2 : -Math.PI / 2;
      }

      addPiece(wMesh, "white", type, 7, f, scene);

      // BLACK
      const bMesh = createMeshForType(type, blackMat);
      const posB = Board.worldPosition(0, f);
      bMesh.position.set(posB.x, 0, posB.z);

      if (type === "knight") {
        bMesh.rotation.y = f < 4 ? Math.PI / 2 : -Math.PI / 2;
      }

      addPiece(bMesh, "black", type, 0, f, scene);
    }
  }

  // ============================================================
  // FIND PIECE
  // ============================================================
  function findPieceAt(rank, file) {
    return pieces.find(
      p => p.userData.rank === rank && p.userData.file === file
    );
  }

  // ============================================================
  // UPDATE PIECE COLORS
  // ============================================================
  function updatePieceColors(white, black) {
    pieces.forEach(p => {
      const isWhite = p.userData.color === "white";
      const tint = isWhite ? white : black;

      p.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.set(tint);
        }
      });
    });
  }

  // ============================================================
  // UPDATE LABEL COLORS
  // ============================================================
  function updateLabelColors(white, black) {
    labelWhite = white;
    labelBlack = black;

    pieces.forEach(p => {
      const isWhite = p.userData.color === "white";
      const color = isWhite ? labelWhite : labelBlack;

      p.traverse(child => {
        if (child.userData && child.userData.isLabel) {
          const { ctx, canvas, text } = child.userData;
          child.userData.color = color;

          drawLabel(ctx, text, color, labelSize);
          child.material.map.needsUpdate = true;

          child.scale.set(canvas.width * 0.12, canvas.height * 0.12, 1);
        }
      });
    });
  }

  // ============================================================
  // UPDATE LABEL SIZE
  // ============================================================
  function updateLabelSize(size) {
    labelSize = size;

    pieces.forEach(p => {
      p.traverse(child => {
        if (child.userData && child.userData.isLabel) {
          const { ctx, canvas, text, color } = child.userData;

          if (size <= 0) {
            child.material.opacity = 0;
            return;
          }

          child.material.opacity = 1;

          drawLabel(ctx, text, color, size);
          child.material.map.needsUpdate = true;

          child.scale.set(canvas.width * 0.12, canvas.height * 0.12, 1);
        }
      });
    });
  }

  // ============================================================
  // UPDATE FONT STYLE
  // ============================================================
  function updateFontStyle(style) {
    fontStyle = style;

    pieces.forEach(p => {
      p.traverse(child => {
        if (child.userData && child.userData.isLabel) {
          const { ctx, canvas, text, color } = child.userData;

          drawLabel(ctx, text, color, labelSize);
          child.material.map.needsUpdate = true;

          child.scale.set(canvas.width * 0.12, canvas.height * 0.12, 1);
        }
      });
    });
  }

  // ============================================================
  // UPDATE GLOW INTENSITY
  // ============================================================
  function updateGlowIntensity(v) {
    glowIntensity = v;
  }

  // ============================================================
  // EXPOSE API
  // ============================================================
  return {
    createPieces,
    findPieceAt,
    updatePieceColors,
    updateLabelColors,
    updateFontStyle,
    updateGlowIntensity,
    updateLabelSize,
    setLabelGlow,
    setTextures,
    setDepthIntensity,
    list: pieces
  };

})();
