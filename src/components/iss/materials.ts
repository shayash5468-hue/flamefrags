import * as THREE from "three";

/** Off-white aluminium panel texture with seams, fasteners and grime (procedural). */
export function makePanelTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d8d5cd";
  g.fillRect(0, 0, S, S);

  // fine speckle
  const img = g.getImageData(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 14;
    img.data[i] = img.data[i]! + n;
    img.data[i + 1] = img.data[i + 1]! + n;
    img.data[i + 2] = img.data[i + 2]! + n;
  }
  g.putImageData(img, 0, 0);

  // panel seams
  g.strokeStyle = "rgba(60,60,58,0.55)";
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath();
    g.moveTo(i * (S / 4), 0);
    g.lineTo(i * (S / 4), S);
    g.stroke();
  }
  for (let i = 0; i <= 2; i++) {
    g.beginPath();
    g.moveTo(0, i * (S / 2));
    g.lineTo(S, i * (S / 2));
    g.stroke();
  }
  // highlight edge
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(i * (S / 4) + 3, 0);
    g.lineTo(i * (S / 4) + 3, S);
    g.stroke();
  }
  // fasteners
  g.fillStyle = "#8d8a83";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const x0 = i * (S / 4);
      const y0 = j * (S / 2);
      const pts: [number, number][] = [
        [12, 12],
        [S / 4 - 12, 12],
        [12, S / 2 - 12],
        [S / 4 - 12, S / 2 - 12],
        [S / 8, 12],
        [S / 8, S / 2 - 12],
      ];
      for (const [fx, fy] of pts) {
        g.beginPath();
        g.arc(x0 + fx, y0 + fy, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // a few labels / velcro
  for (let k = 0; k < 6; k++) {
    const x = rnd() * (S - 60);
    const y = rnd() * (S - 30);
    if (rnd() > 0.5) {
      g.fillStyle = "#2f5ea8";
      g.fillRect(x, y, 26, 26);
    } else {
      g.fillStyle = "#f4f2ea";
      g.fillRect(x, y, 54, 16);
      g.fillStyle = "#222";
      for (let b = 0; b < 12; b++) g.fillRect(x + 4 + b * 4, y + 4, rnd() > 0.5 ? 2 : 1, 8);
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
