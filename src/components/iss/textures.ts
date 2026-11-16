import * as THREE from "three";

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finalizeTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Four side-by-side EXPRESS/ISPR science & avionics rack bay variants along U (1024x512)
 * matching Modules.tsx u0 = Math.floor(rnd() * 4) * 0.25 UV indexing.
 */
export function makeRackWallTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rnd = prng(101);

  const bayW = W / 4;
  for (let bay = 0; bay < 4; bay++) {
    const x0 = bay * bayW;
    // Outer metal bay surround
    g.fillStyle = "#c8c9c4";
    g.fillRect(x0, 0, bayW, H);
    g.fillStyle = "#8a8d91";
    g.fillRect(x0, 0, 8, H);
    g.fillRect(x0 + bayW - 8, 0, 8, H);
    g.fillRect(x0, 0, bayW, 10);
    g.fillRect(x0, H - 12, bayW, 12);

    // 4 vertical drawers / avionics sub-units per rack bay
    const units = 4 + (bay % 2);
    const unitH = (H - 36) / units;
    for (let u = 0; u < units; u++) {
      const uy = 16 + u * unitH;
      const uh = unitH - 6;
      const isDarkUnit = (bay + u) % 3 === 1;
      g.fillStyle = isDarkUnit ? "#31363f" : "#d6d7d2";
      g.fillRect(x0 + 14, uy, bayW - 28, uh);
      g.strokeStyle = "#5a5e66";
      g.lineWidth = 2;
      g.strokeRect(x0 + 14, uy, bayW - 28, uh);

      // Rack face details: ventilation grilles, LED strips, displays, gauges, latches
      if (isDarkUnit) {
        // Cooling louver lines
        g.fillStyle = "#191c22";
        for (let lv = 0; lv < 5; lv++) {
          g.fillRect(x0 + 24, uy + 14 + lv * 9, bayW - 110, 4);
        }
        // Status telemetry screen & LED indicators
        g.fillStyle = "#0e2236";
        g.fillRect(x0 + bayW - 80, uy + 12, 44, Math.min(34, uh - 24));
        g.fillStyle = "#38bdf8";
        g.fillRect(x0 + bayW - 76, uy + 18, 28, 3);
        g.fillStyle = "#4ade80";
        g.fillRect(x0 + bayW - 76, uy + 26, 18, 3);
        // Illuminated toggle switches
        for (let sw = 0; sw < 4; sw++) {
          g.fillStyle = sw === 0 ? "#4ade80" : sw === 3 ? "#f59e0b" : "#94a3b8";
          g.beginPath();
          g.arc(x0 + 28 + sw * 16, uy + uh - 14, 3.2, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        // Drawer pull handles + blue velcro squares + barcode labels
        g.fillStyle = "#6c7078";
        g.fillRect(x0 + 28, uy + uh / 2 - 4, 46, 8);
        g.fillRect(x0 + bayW - 74, uy + uh / 2 - 4, 46, 8);

        // Label plate
        g.fillStyle = "#f4f2ea";
        g.fillRect(x0 + 92, uy + 12, 64, 16);
        g.fillStyle = "#1e293b";
        for (let b = 0; b < 11; b++) {
          g.fillRect(x0 + 96 + b * 5, uy + 15, rnd() > 0.45 ? 3 : 1.5, 9);
        }

        // Blue Nomex velcro patch & umbilical connector
        if (rnd() > 0.35) {
          g.fillStyle = "#2b59a1";
          g.fillRect(x0 + 26, uy + 12, 22, 18);
        }
        g.fillStyle = "#4b5563";
        g.beginPath();
        g.arc(x0 + bayW - 36, uy + 22, 7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#cbd5e1";
        g.beginPath();
        g.arc(x0 + bayW - 36, uy + 22, 3, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Yellow hazard bar & rack identifier on header strip
    g.fillStyle = bay % 2 === 0 ? "#d9a528" : "#2f5ea8";
    g.fillRect(x0 + 18, 2, 72, 6);
  }

  return finalizeTex(c);
}

/** Four Cargo Transfer Bag (CTB) stowage bay variants along U (1024x512). */
export function makeStowageWallTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rnd = prng(202);

  g.fillStyle = "#d8d5cc";
  g.fillRect(0, 0, W, H);

  const bayW = W / 4;
  for (let bay = 0; bay < 4; bay++) {
    const x0 = bay * bayW;
    // Outer bay frame
    g.fillStyle = "#8c8f92";
    g.fillRect(x0, 0, 7, H);
    g.fillRect(x0 + bayW - 7, 0, 7, H);

    // Stacked padded Nomex bags
    const rows = 4;
    const bagH = (H - 28) / rows;
    for (let r = 0; r < rows; r++) {
      const by = 12 + r * bagH;
      const bh = bagH - 10;
      const tone = 228 + Math.floor((rnd() - 0.5) * 18);
      g.fillStyle = `rgb(${tone}, ${tone - 4}, ${tone - 12})`;
      g.fillRect(x0 + 14, by, bayW - 28, bh);

      // Soft quilted seam border around CTB
      g.strokeStyle = "#a5a196";
      g.lineWidth = 2;
      g.strokeRect(x0 + 14, by, bayW - 28, bh);

      // Center zipper & padded crease
      g.strokeStyle = "rgba(80,78,72,0.35)";
      g.beginPath();
      g.moveTo(x0 + 18, by + bh * 0.5);
      g.lineTo(x0 + bayW - 18, by + bh * 0.5);
      g.stroke();

      // White ID label + blue velcro
      g.fillStyle = "#f8f7f2";
      g.fillRect(x0 + 28, by + 12, 62, 22);
      g.fillStyle = "#334155";
      g.fillRect(x0 + 34, by + 18, 42, 3);
      g.fillRect(x0 + 34, by + 25, 28, 3);

      g.fillStyle = "#2b59a1";
      g.fillRect(x0 + bayW - 58, by + 14, 24, 18);
    }

    // Vertical blue restraint straps across entire stowage stack
    g.fillStyle = "#29528f";
    g.fillRect(x0 + 56, 4, 14, H - 8);
    g.fillRect(x0 + bayW - 70, 4, 14, H - 8);

    // Anodized strap buckles
    g.fillStyle = "#1f242c";
    for (let r = 0; r < rows; r++) {
      const buckleY = 12 + r * bagH + bagH * 0.45;
      g.fillRect(x0 + 53, buckleY, 20, 12);
      g.fillRect(x0 + bayW - 73, buckleY, 20, 12);
    }
  }

  return finalizeTex(c);
}

/** Four Russian segment (Zvezda/Zarya/Nauka) quilted olive-cream panel variants (1024x512). */
export function makeRussianWallTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rnd = prng(303);

  const bayW = W / 4;
  for (let bay = 0; bay < 4; bay++) {
    const x0 = bay * bayW;
    g.fillStyle = "#b8bfa6";
    g.fillRect(x0, 0, bayW, H);

    // Subtle olive trim frame
    g.fillStyle = "#7b8269";
    g.fillRect(x0, 0, 8, H);
    g.fillRect(x0 + bayW - 8, 0, 8, H);
    g.fillRect(x0, 0, bayW, 10);
    g.fillRect(x0, H - 10, bayW, 10);

    // Diamond acoustic quilting lines
    g.strokeStyle = "rgba(86, 92, 74, 0.35)";
    g.lineWidth = 1.5;
    for (let y = 20; y < H; y += 64) {
      g.beginPath();
      g.moveTo(x0 + 10, y);
      g.lineTo(x0 + bayW - 10, y + 48);
      g.moveTo(x0 + bayW - 10, y);
      g.lineTo(x0 + 10, y + 48);
      g.stroke();
    }

    // Recessed equipment bays & fabric covers
    for (let r = 0; r < 3; r++) {
      const py = 26 + r * 158;
      const ph = 136;
      const shade = 180 + Math.floor((rnd() - 0.5) * 16);
      g.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade - 16})`;
      g.fillRect(x0 + 18, py, bayW - 36, ph);
      g.strokeStyle = "#626853";
      g.lineWidth = 2.5;
      g.strokeRect(x0 + 18, py, bayW - 36, ph);

      // Olive fabric straps with brass studs
      g.fillStyle = "#6d7055";
      g.fillRect(x0 + 24, py + ph * 0.45, bayW - 48, 12);
      g.fillStyle = "#c7a858";
      for (const bx of [x0 + 36, x0 + bayW / 2, x0 + bayW - 36]) {
        g.beginPath();
        g.arc(bx, py + ph * 0.45 + 6, 3.5, 0, Math.PI * 2);
        g.fill();
      }

      // Russian control switchplate on middle panel
      if (r === 1 && bay % 2 === 1) {
        g.fillStyle = "#3f4638";
        g.fillRect(x0 + 44, py + 18, bayW - 88, 36);
        g.fillStyle = "#4ade80";
        g.fillRect(x0 + 56, py + 28, 10, 6);
        g.fillStyle = "#f59e0b";
        g.fillRect(x0 + 74, py + 28, 10, 6);
        g.fillStyle = "#cbd5e1";
        g.fillRect(x0 + bayW - 92, py + 26, 26, 18);
      }
    }
  }

  return finalizeTex(c);
}

/** Four BEAM inflatable Vectran/Nomex quilted fabric wall bays along U (1024x512). */
export function makeFabricWallTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.fillStyle = "#ebe6da";
  g.fillRect(0, 0, W, H);

  const bayW = W / 4;
  for (let bay = 0; bay < 4; bay++) {
    const x0 = bay * bayW;
    // Quilted vertical structural webbing ribs
    g.fillStyle = "#b5ac99";
    g.fillRect(x0, 0, 12, H);
    g.fillRect(x0 + bayW - 12, 0, 12, H);

    // Subtle padded diamond stitching
    g.strokeStyle = "rgba(130, 120, 102, 0.3)";
    g.lineWidth = 2;
    const step = 64;
    for (let x = x0; x < x0 + bayW; x += step) {
      for (let y = 0; y < H; y += step) {
        g.beginPath();
        g.moveTo(x + step / 2, y);
        g.lineTo(x + step, y + step / 2);
        g.lineTo(x + step / 2, y + step);
        g.lineTo(x, y + step / 2);
        g.closePath();
        g.stroke();
      }
    }

    // Tie-down grommets
    g.fillStyle = "#7c776c";
    for (let y = 64; y < H; y += 128) {
      g.beginPath();
      g.arc(x0 + 32, y, 4.5, 0, Math.PI * 2);
      g.arc(x0 + bayW - 32, y, 4.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  return finalizeTex(c);
}

/**
 * Procedural equirectangular daylight Earth texture (1024x512) with zero network latency.
 * Used directly both by Planet.tsx under the Cupola and Props.tsx WallLaptop ground-track screen.
 */
export function makeEarthDayTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  // Deep orbital ocean bathymetry base
  const oceanGrad = g.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0, "#dbeafe");
  oceanGrad.addColorStop(0.08, "#164e87");
  oceanGrad.addColorStop(0.5, "#0d3b6e");
  oceanGrad.addColorStop(0.92, "#164e87");
  oceanGrad.addColorStop(1, "#e2e8f0");
  g.fillStyle = oceanGrad;
  g.fillRect(0, 0, W, H);

  // Polar ice caps
  g.fillStyle = "#e8eef5";
  g.fillRect(0, 0, W, 28);
  g.fillRect(0, H - 34, W, 34);

  // Stylized continent silhouettes + coastal turquoise shelves (equirectangular UV)
  const continents: { pts: [number, number][]; color: string; desert?: [number, number, number, number] }[] = [
    // North America
    {
      pts: [[130, 80], [270, 75], [320, 125], [275, 195], [240, 235], [205, 215], [160, 155]],
      color: "#3f6e49",
      desert: [195, 155, 42, 26],
    },
    // South America
    {
      pts: [[275, 250], [340, 275], [360, 340], [315, 435], [290, 420], [270, 315]],
      color: "#33663f",
    },
    // Greenland
    {
      pts: [[335, 42], [410, 45], [390, 96], [340, 92]],
      color: "#dde6ef",
    },
    // Europe
    {
      pts: [[465, 82], [565, 76], [585, 130], [515, 155], [462, 140]],
      color: "#4d7448",
    },
    // Africa
    {
      pts: [[470, 175], [575, 175], [615, 240], [575, 365], [530, 378], [495, 285], [455, 225]],
      color: "#6b7d45",
      desert: [525, 200, 70, 34],
    },
    // Asia
    {
      pts: [[570, 72], [845, 76], [890, 135], [820, 220], [740, 250], [645, 225], [585, 165]],
      color: "#4a6f47",
      desert: [690, 155, 85, 32],
    },
    // Maritime SE Asia
    {
      pts: [[775, 265], [845, 270], [835, 295], [770, 290]],
      color: "#396a42",
    },
    // Australia
    {
      pts: [[795, 318], [895, 322], [902, 392], [810, 398]],
      color: "#997b4c",
    },
  ];

  for (const cont of continents) {
    // Shallow continental shelf halo
    g.beginPath();
    cont.pts.forEach(([x, y], idx) => (idx === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.lineWidth = 14;
    g.strokeStyle = "rgba(34, 156, 178, 0.38)";
    g.stroke();

    // Landmass fill
    g.fillStyle = cont.color;
    g.fill();

    // Arid belt highlight
    if (cont.desert) {
      const [dx, dy, dw, dh] = cont.desert;
      const dGrad = g.createRadialGradient(dx, dy, 4, dx, dy, dw);
      dGrad.addColorStop(0, "rgba(196, 166, 108, 0.85)");
      dGrad.addColorStop(1, "rgba(196, 166, 108, 0)");
      g.fillStyle = dGrad;
      g.fillRect(dx - dw, dy - dh, dw * 2, dh * 2);
    }
  }

  // Sweeping orbital cloud systems
  const rnd = prng(808);
  for (let i = 0; i < 65; i++) {
    const cx = rnd() * W;
    const cy = 48 + rnd() * (H - 96);
    const rx = 28 + rnd() * 90;
    const ry = 6 + rnd() * 18;
    const grad = g.createRadialGradient(cx, cy, 2, cx, cy, rx);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.42)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.save();
    g.translate(cx, cy);
    g.rotate((rnd() - 0.5) * 0.45);
    g.scale(1, ry / rx);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  const tex = finalizeTex(c);
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
