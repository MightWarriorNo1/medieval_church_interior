import * as THREE from 'three';
import { pointedArchHeight } from '../geom/arch.js';

const CELL = 256;
const COLS = 8;

const HUES = [
  [0.55, 0.08, 0.1],
  [0.1, 0.22, 0.62],
  [0.1, 0.42, 0.28],
  [0.72, 0.55, 0.12],
  [0.4, 0.1, 0.48],
  [0.75, 0.78, 0.72],
  [0.62, 0.28, 0.12],
];

function rng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function palette(random) {
  const colors = [];
  const start = Math.floor(random() * HUES.length);
  for (let i = 0; i < 4; i++) {
    const source = HUES[(start + i * 2) % HUES.length];
    const shift = 0.75 + random() * 0.45;
    colors.push(source.map((channel) => Math.min(1, channel * shift)));
  }
  return colors;
}

function fill(ctx, color) {
  ctx.fillStyle = rgb(color);
  ctx.fill();
}

// Same order as listOpenings. The light shader looks up this rect.
export function paintGlassAtlas(openings) {
  if (openings.length > COLS * COLS) {
    throw new Error('Glass atlas is full (' + openings.length + ' windows)');
  }

  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * COLS;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  openings.forEach((opening, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const rect = atlasRect(col, row);
    opening.atlas = rect;
    opening.color = paintCell(ctx, col, row, opening);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

function atlasRect(col, row) {
  const pad = 0.5 / (CELL * COLS);
  const u0 = col / COLS + pad;
  const u1 = (col + 1) / COLS - pad;
  const v0 = 1 - (row + 1) / COLS + pad;
  const v1 = 1 - row / COLS - pad;
  return { x: u0, y: v0, z: u1, w: v1 };
}

function paintCell(ctx, col, row, opening) {
  const random = rng(opening.seed);
  const colors = palette(random);
  const family = opening.seed % 5;
  const x0 = col * CELL;
  const y0 = row * CELL;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, CELL, CELL);
  ctx.clip();
  ctx.translate(x0, y0 + CELL);
  ctx.scale(CELL, -CELL);
  ctx.fillStyle = rgb(colors[0]);
  ctx.fillRect(0, 0, 1, 1);
  const used = drawFamily(ctx, family, colors, random, opening);
  ctx.restore();

  const average = [0, 0, 0];
  for (const color of used) {
    average[0] += color[0];
    average[1] += color[1];
    average[2] += color[2];
  }
  return average.map((channel) => channel / used.length);
}

function drawFamily(ctx, family, colors, random, opening) {
  if (opening.kind === 'circle') {
    const stained = roundel(ctx, random);
    leadBorder(ctx, opening);
    return stained;
  }
  const aspect = opening.height / Math.max(opening.width, 0.4);
  if (family === 0) medallion(ctx, colors, random, aspect);
  else if (family === 1) bands(ctx, colors, random, aspect);
  else if (family === 2) diamonds(ctx, colors, random, aspect);
  else if (family === 3) star(ctx, colors, random, aspect);
  else grisaille(ctx, colors, random, aspect);
  leadBorder(ctx, opening);
  return colors;
}

function roundel(ctx, random) {
  const stained = HUES.filter((_, index) => index !== 5);
  const start = Math.floor(random() * stained.length);
  const colors = [];
  for (let i = 0; i < 4; i++) {
    const source = stained[(start + i * 2) % stained.length];
    const shift = 0.85 + random() * 0.2;
    colors.push(source.map((channel) => Math.min(1, channel * shift)));
  }
  const petals = 10 + Math.floor(random() * 3);
  const spin = random() * Math.PI;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0.5, 0.5, 0.49, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < petals; i++) {
    const a0 = spin + (i / petals) * Math.PI * 2;
    const a1 = spin + ((i + 1) / petals) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0.5, 0.5);
    ctx.arc(0.5, 0.5, 0.49, a0, a1);
    ctx.closePath();
    fill(ctx, colors[i % colors.length]);
  }
  ctx.strokeStyle = '#1a1614';
  ctx.lineWidth = 0.018;
  for (let i = 0; i < petals; i++) {
    const a = spin + (i / petals) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0.5 + Math.cos(a) * 0.16, 0.5 + Math.sin(a) * 0.16);
    ctx.lineTo(0.5 + Math.cos(a) * 0.48, 0.5 + Math.sin(a) * 0.48);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0.5, 0.5, 0.2, 0, Math.PI * 2);
  fill(ctx, colors[1]);
  ctx.lineWidth = 0.02;
  ctx.stroke();
  const inner = 6;
  for (let i = 0; i < inner; i++) {
    const a = spin + (i / inner) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.arc(0.5 + Math.cos(a) * 0.11, 0.5 + Math.sin(a) * 0.11, 0.055, 0, Math.PI * 2);
    fill(ctx, colors[(i + 1) % colors.length]);
    lead(ctx);
  }
  ctx.beginPath();
  ctx.arc(0.5, 0.5, 0.045, 0, Math.PI * 2);
  fill(ctx, colors[2]);
  lead(ctx);
  ctx.restore();
  return colors;
}

function lead(ctx) {
  ctx.strokeStyle = '#1a1614';
  ctx.lineWidth = 0.016;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function leadBorder(ctx, opening) {
  ctx.save();
  ctx.strokeStyle = '#1a1614';
  ctx.lineWidth = 0.028;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  if (opening.kind === 'circle') {
    ctx.arc(0.5, 0.5, 0.46, 0, Math.PI * 2);
  } else {
    const width = opening.width;
    const rise = opening.rise;
    const jamb = opening.jamb - opening.sill;
    const apex = jamb + pointedArchHeight(0, width, rise);
    const spring = jamb / apex;
    const inset = 0.06;
    const x0 = -width * (0.5 - inset);
    const x1 = -x0;
    const u = (x) => x / width + 0.5;
    ctx.moveTo(u(x0), 0.03);
    ctx.lineTo(u(x0), spring);
    const segs = 18;
    for (let i = 0; i <= segs; i++) {
      const x = x0 + ((x1 - x0) * i) / segs;
      const v = (jamb + pointedArchHeight(x, width, rise)) / apex;
      ctx.lineTo(u(x), Math.min(0.98, v));
    }
    ctx.lineTo(u(x1), 0.03);
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
}

function medallion(ctx, colors, random, aspect) {
  const count = Math.max(2, Math.round(aspect * 0.55));
  const petals = 6 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    const cy = (i + 0.55) / (count + 0.3);
    const rx = 0.3;
    const ry = 0.38 / count;
    for (let p = 0; p < petals; p++) {
      const angle = (p / petals) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        0.5 + Math.cos(angle) * rx * 0.55,
        cy + Math.sin(angle) * ry * 0.55,
        rx * 0.28,
        ry * 0.28,
        0, 0, Math.PI * 2
      );
      fill(ctx, colors[(i + p) % colors.length]);
      lead(ctx);
    }
    ctx.beginPath();
    ctx.ellipse(0.5, cy, rx * 0.22, ry * 0.22, 0, 0, Math.PI * 2);
    fill(ctx, colors[(i + 2) % colors.length]);
    lead(ctx);
  }
}

function bands(ctx, colors, random, aspect) {
  const count = Math.max(5, Math.round(aspect * 0.9));
  const y0 = 0.03;
  const y1 = 0.97;
  for (let i = 0; i < count; i++) {
    const y = y0 + ((y1 - y0) * i) / count;
    const h = (y1 - y0) / count - 0.012;
    ctx.fillStyle = rgb(colors[i % colors.length]);
    ctx.fillRect(0.08, y, 0.84, h);
    ctx.strokeStyle = '#1a1614';
    ctx.lineWidth = 0.016;
    ctx.strokeRect(0.08, y, 0.84, h);
  }
  ctx.fillStyle = '#1a1614';
  ctx.fillRect(0.47, 0.03, 0.06, 0.94);
}

function diamonds(ctx, colors, random, aspect) {
  const cols = 2 + Math.floor(random() * 2);
  const rows = Math.max(cols + 2, Math.round(aspect * 1.15));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = 0.14 + (x + 0.5) * (0.72 / cols);
      const cy = 0.06 + (y + 0.5) * (0.88 / rows);
      const rx = 0.3 / cols;
      const ry = 0.36 / rows;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry);
      ctx.lineTo(cx + rx, cy);
      ctx.lineTo(cx, cy + ry);
      ctx.lineTo(cx - rx, cy);
      ctx.closePath();
      fill(ctx, colors[(x + y) % colors.length]);
      lead(ctx);
    }
  }
}

function star(ctx, colors, random, aspect) {
  const count = Math.max(2, Math.round(aspect * 0.5));
  const points = 6 + (Math.floor(random() * 2) === 0 ? 0 : 2);
  for (let s = 0; s < count; s++) {
    const cy = (s + 0.6) / (count + 0.35);
    const rx = 0.32;
    const ry = 0.36 / count;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? 1 : 0.42;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = 0.5 + Math.cos(angle) * rx * radius;
      const y = cy + Math.sin(angle) * ry * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    fill(ctx, colors[s % colors.length]);
    lead(ctx);
    ctx.beginPath();
    ctx.ellipse(0.5, cy, rx * 0.18, ry * 0.18, 0, 0, Math.PI * 2);
    fill(ctx, colors[(s + 2) % colors.length]);
    lead(ctx);
  }
}

function grisaille(ctx, colors, random, aspect) {
  ctx.fillStyle = '#d9d3c6';
  ctx.fillRect(0, 0, 1, 1);
  const rows = Math.max(4, Math.round(aspect));
  ctx.beginPath();
  ctx.moveTo(0.5, 0.02);
  for (let i = 0; i < rows; i++) {
    const y = (i + 1) / rows;
    const swing = (i % 2 === 0 ? 0.16 : -0.16) + (random() - 0.5) * 0.08;
    ctx.quadraticCurveTo(0.5 + swing, y - 0.5 / rows, 0.5, y * 0.96);
  }
  ctx.strokeStyle = '#241e1a';
  ctx.lineWidth = 0.014;
  ctx.stroke();
  for (let i = 0; i < rows; i++) {
    const cy = (i + 0.5) / rows;
    const side = i % 2 === 0 ? 0.28 : 0.72;
    ctx.beginPath();
    ctx.ellipse(side, cy, 0.1, 0.34 / rows, 0, 0, Math.PI * 2);
    fill(ctx, colors[i % colors.length]);
    lead(ctx);
    ctx.beginPath();
    ctx.ellipse(0.5, cy, 0.06, 0.2 / rows, 0, 0, Math.PI * 2);
    fill(ctx, colors[(i + 1) % colors.length]);
    lead(ctx);
  }
}

function rgb(color) {
  return `rgb(${color.map((c) => Math.round(Math.min(1, c) * 255)).join(',')})`;
}

export function buildGlassMeshes(openings, atlas) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: atlas,
    roughness: 0.16,
    metalness: 0,
    side: THREE.DoubleSide,
    emissive: 0xffffff,
    emissiveMap: atlas,
    emissiveIntensity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const group = new THREE.Group();
  group.name = 'glass';

  for (const opening of openings) {
    const geo = opening.kind === 'circle'
      ? circleGeometry(opening)
      : lancetGeometry(opening);
    placeGlass(geo, opening);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }
  return { group, material };
}

function lancetGeometry(opening) {
  const margin = 0.02;
  const points = insetLancet(opening, margin);
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  writeUVs(geo, opening);
  return geo;
}

// Same outline as the stone hole, pulled in a couple of cm.
function insetLancet(opening, margin) {
  const span = opening.width;
  const jamb = opening.jamb - opening.sill;
  const rise = opening.rise;
  const s = span / 2;
  const segs = 18;
  const outline = [
    { x: -s, y: 0 },
    { x: -s, y: jamb },
  ];
  for (let i = 1; i < segs; i++) {
    const x = -s + (span * i) / segs;
    outline.push({ x, y: jamb + pointedArchHeight(x, span, rise) });
  }
  outline.push({ x: s, y: jamb }, { x: s, y: 0 });

  return outline.map((point, index) => {
    const prev = outline[Math.max(0, index - 1)];
    const next = outline[Math.min(outline.length - 1, index + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const length = Math.hypot(tx, ty) || 1;
    tx /= length;
    ty /= length;
    return { x: point.x + ty * margin, y: point.y - tx * margin };
  });
}

function circleGeometry(opening) {
  const radius = Math.max(0.35, opening.radius - 0.04);
  const geo = new THREE.CircleGeometry(radius, 32);
  writeUVs(geo, opening);
  return geo;
}

function writeUVs(geo, opening) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const rect = opening.atlas;
  const spanX = opening.kind === 'circle' ? opening.radius * 2 : opening.width;
  const spanY = opening.kind === 'circle' ? opening.radius * 2 : opening.height;
  for (let i = 0; i < pos.count; i++) {
    const gu = pos.getX(i) / spanX + 0.5;
    const gv = pos.getY(i) / spanY + (opening.kind === 'circle' ? 0.5 : 0);
    uv.setXY(
      i,
      rect.x + (rect.z - rect.x) * THREE.MathUtils.clamp(gu, 0, 1),
      rect.y + (rect.w - rect.y) * THREE.MathUtils.clamp(gv, 0, 1)
    );
  }
  uv.needsUpdate = true;
}

function placeGlass(geo, opening) {
  const normal = opening.normal;
  if (Math.abs(normal.x) > 0.5) geo.rotateY(Math.PI / 2);
  geo.translate(opening.origin.x, opening.origin.y, opening.origin.z);
}
