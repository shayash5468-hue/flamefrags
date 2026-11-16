import * as THREE from 'three';
import * as xb from 'xrblocks';
import { ScientificAnnotation } from '../types.ts';

const _camWorldQuat = new THREE.Quaternion();
const _parentWorldQuat = new THREE.Quaternion();

interface MarkerInstance {
  annotation: ScientificAnnotation;
  root: THREE.Group;
  hitProxy: MarkerInteractiveScript;
  badgeSprite: THREE.Sprite;
  badgeTexture: THREE.CanvasTexture;
  badgeActiveTexture: THREE.CanvasTexture;
  leaderLine: THREE.Line;
  arrowGroup: THREE.Group;
  anchorRing: THREE.Mesh;
  arrowMat: THREE.MeshBasicMaterial;
  lineMat: THREE.LineBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  lastActive: boolean | null;
  lastScaleBoost: number;
}

class MarkerInteractiveScript extends xb.MeshScript {
  private readonly annotationId: string;
  private readonly onSelectCallback: (id: string) => void;
  private readonly onHoverCallback: (id: string | null) => void;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    annotationId: string,
    onSelect: (id: string) => void,
    onHover: (id: string | null) => void
  ) {
    super(geometry, material);
    this.annotationId = annotationId;
    this.onSelectCallback = onSelect;
    this.onHoverCallback = onHover;
    this.name = `Marker-${annotationId}`;
  }

  onObjectSelectStart(event: xb.SelectEvent): void {
    this.onSelectCallback(this.annotationId);
    event.stopPropagation();
  }

  onHoverEnter(event: xb.HoverEvent): void {
    this.onHoverCallback(this.annotationId);
    event.stopPropagation();
  }

  onHoverExit(event: xb.HoverEvent): void {
    this.onHoverCallback(null);
    event.stopPropagation();
  }
}

function createMarkerBadgeTexture(
  num: number,
  label: string,
  active: boolean,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create badge canvas context');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const accent = active ? '#f59e0b' : '#06b6d4';
  const bg = active ? 'rgba(15, 23, 42, 0.96)' : 'rgba(7, 11, 18, 0.92)';

  // Outer technical rectangular frame (aerospace callout card)
  const rx = 20;
  const ry = 24;
  const rw = 472;
  const rh = 112;
  const r = 14;

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(rx + r, ry);
  ctx.lineTo(rx + rw - r, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
  ctx.lineTo(rx + rw, ry + rh - r);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
  ctx.lineTo(rx + r, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
  ctx.lineTo(rx, ry + r);
  ctx.quadraticCurveTo(rx, ry, rx + r, ry);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = active ? 5 : 3;
  ctx.stroke();

  // Numbered circular index badge on left
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(74, 80, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#040810';
  ctx.font = '700 34px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 74, 82);

  // Component short label (kept clean, 2 lines max)
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const words = label.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 22 && line2 === '') {
      line1 = (line1 + ' ' + w).trim();
    } else {
      line2 = (line2 + ' ' + w).trim();
    }
  }
  if (line2.length > 24) {
    line2 = line2.slice(0, 21) + '…';
  }

  if (line2) {
    ctx.fillText(line1, 124, 62);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(line2, 124, 98);
  } else {
    ctx.fillText(line1, 124, 80);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export class AnnotationSystem {
  private markers = new Map<string, MarkerInstance>();
  private hitMeshes: THREE.Object3D[] = [];
  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private visible = true;
  private sharedHitGeo: THREE.SphereGeometry;
  private sharedHitMat: THREE.MeshBasicMaterial;
  private sharedShaftGeo: THREE.CylinderGeometry;
  private sharedConeGeo: THREE.ConeGeometry;
  private sharedRingGeo: THREE.RingGeometry;
  private anisotropy: number;
  private onSelect: (id: string) => void;
  private onHover: (id: string | null) => void;

  constructor(
    anisotropy: number,
    onSelect: (id: string) => void,
    onHover: (id: string | null) => void
  ) {
    this.anisotropy = anisotropy;
    this.onSelect = onSelect;
    this.onHover = onHover;
    // Generous touch/click hit target (0.11m radius) invisible sphere
    this.sharedHitGeo = new THREE.SphereGeometry(0.11, 12, 10);
    this.sharedHitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.sharedShaftGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.08, 8);
    this.sharedConeGeo = new THREE.ConeGeometry(0.012, 0.036, 12);
    this.sharedRingGeo = new THREE.RingGeometry(0.035, 0.048, 24);
  }

  mountAnnotations(
    annotations: ScientificAnnotation[],
    componentAnchors: Map<string, THREE.Object3D>
  ): void {
    this.clear();

    for (const ann of annotations) {
      const targetAnchor = componentAnchors.get(ann.id);
      if (!targetAnchor) continue;

      // Attach marker group directly to the actual 3D component anchor!
      const markerGroup = new THREE.Group();
      markerGroup.name = `AnnotationGroup-${ann.id}`;
      markerGroup.visible = this.visible;

      const offsetVec = new THREE.Vector3(...ann.markerOffset);
      const dirToAnchor = offsetVec.clone().negate().normalize();

      // Thin scientific arrow pointing directly to the 3D component origin (0,0,0 in anchor space)
      const arrowMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.92,
      });
      const arrowGroup = new THREE.Group();
      const arrowTipOffset = dirToAnchor.clone().multiplyScalar(-0.045);
      arrowGroup.position.copy(arrowTipOffset);

      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dirToAnchor
      );
      arrowGroup.quaternion.copy(quat);

      const shaft = new THREE.Mesh(this.sharedShaftGeo, arrowMat);
      shaft.position.y = -0.04;
      const cone = new THREE.Mesh(this.sharedConeGeo, arrowMat);
      cone.position.y = 0.015;
      arrowGroup.add(shaft, cone);
      arrowGroup.xb = { pointerEvents: 'none' };
      markerGroup.add(arrowGroup);

      // Precision elbow leader line from near arrow base to badge position
      const elbow = offsetVec.clone().multiplyScalar(0.62);
      elbow.y = offsetVec.y;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        arrowTipOffset.clone().sub(dirToAnchor.clone().multiplyScalar(0.06)),
        elbow,
        offsetVec,
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.78,
      });
      const leaderLine = new THREE.Line(lineGeo, lineMat);
      leaderLine.xb = { pointerEvents: 'none' };
      markerGroup.add(leaderLine);

      // Calibrated target anchor ring on the component surface
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      });
      const anchorRing = new THREE.Mesh(this.sharedRingGeo, ringMat);
      anchorRing.renderOrder = 50;
      anchorRing.xb = { pointerEvents: 'none' };
      markerGroup.add(anchorRing);

      // Crisp 3D sprite badge attached at markerOffset
      const badgeTexture = createMarkerBadgeTexture(
        ann.number,
        ann.componentName,
        false,
        this.anisotropy
      );
      const badgeActiveTexture = createMarkerBadgeTexture(
        ann.number,
        ann.componentName,
        true,
        this.anisotropy
      );

      const spriteMat = new THREE.SpriteMaterial({
        map: badgeTexture,
        transparent: true,
        depthTest: false,
      });
      const badgeSprite = new THREE.Sprite(spriteMat);
      badgeSprite.position.copy(offsetVec);
      badgeSprite.scale.set(0.36, 0.112, 1);
      badgeSprite.renderOrder = 120;
      badgeSprite.xb = { pointerEvents: 'none' };
      markerGroup.add(badgeSprite);

      // Interactive invisible hit sphere at the badge center for easy mouse/touch/XR raycasting
      const hitProxy = new MarkerInteractiveScript(
        this.sharedHitGeo,
        this.sharedHitMat,
        ann.id,
        (id) => this.onSelect(id),
        (id) => this.onHover(id)
      );
      hitProxy.position.copy(offsetVec);
      hitProxy.userData.annotationId = ann.id;
      markerGroup.add(hitProxy);

      targetAnchor.add(markerGroup);
      this.hitMeshes.push(hitProxy);

      this.markers.set(ann.id, {
        annotation: ann,
        root: markerGroup,
        hitProxy,
        badgeSprite,
        badgeTexture,
        badgeActiveTexture,
        leaderLine,
        arrowGroup,
        anchorRing,
        arrowMat,
        lineMat,
        ringMat,
        lastActive: null,
        lastScaleBoost: 0,
      });
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const marker of this.markers.values()) {
      marker.root.visible = visible;
    }
  }

  getVisible(): boolean {
    return this.visible;
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
  }

  setHoveredId(id: string | null): void {
    this.hoveredId = id;
  }

  getHitMeshes(): THREE.Object3D[] {
    return this.visible ? this.hitMeshes : [];
  }

  update(camera: THREE.Camera, elapsed: number): void {
    if (!this.visible) return;
    camera.getWorldQuaternion(_camWorldQuat);

    for (const [id, m] of this.markers.entries()) {
      if (!m.root.visible) continue;
      const isSelected = id === this.selectedId;
      const isHovered = id === this.hoveredId;
      const active = isSelected || isHovered;

      // World-space billboard for the anchor ring (supports VR head rotation + container offsets)
      if (m.root.parent) {
        m.root.parent.getWorldQuaternion(_parentWorldQuat);
        m.anchorRing.quaternion.copy(_parentWorldQuat.invert().multiply(_camWorldQuat));
      } else {
        m.anchorRing.quaternion.copy(_camWorldQuat);
      }

      const scaleBoost = isSelected
        ? 1.14
        : isHovered
          ? 1.08
          : 1.0;

      if (m.lastScaleBoost !== scaleBoost) {
        m.lastScaleBoost = scaleBoost;
        m.badgeSprite.scale.set(0.36 * scaleBoost, 0.112 * scaleBoost, 1);
      }

      if (m.lastActive !== active) {
        m.lastActive = active;
        const spriteMat = m.badgeSprite.material as THREE.SpriteMaterial;
        spriteMat.map = active ? m.badgeActiveTexture : m.badgeTexture;
        spriteMat.needsUpdate = true;

        const colorHex = active ? 0xf59e0b : 0x06b6d4;
        m.arrowMat.color.setHex(colorHex);
        m.lineMat.color.setHex(colorHex);
        m.ringMat.color.setHex(colorHex);
      }

      // Subtle anchor ring scale feedback for selected component
      const ringScale = isSelected
        ? 1.25 + Math.sin(elapsed * 4) * 0.15
        : isHovered
          ? 1.2
          : 1.0;
      m.anchorRing.scale.setScalar(ringScale);
    }
  }

  clear(): void {
    for (const m of this.markers.values()) {
      m.root.removeFromParent();
      m.badgeTexture.dispose();
      m.badgeActiveTexture.dispose();
      (m.badgeSprite.material as THREE.Material).dispose();
      m.leaderLine.geometry.dispose();
      m.arrowMat.dispose();
      m.lineMat.dispose();
      m.ringMat.dispose();
    }
    this.markers.clear();
    this.hitMeshes = [];
  }

  dispose(): void {
    this.clear();
    this.sharedHitGeo.dispose();
    this.sharedHitMat.dispose();
    this.sharedShaftGeo.dispose();
    this.sharedConeGeo.dispose();
    this.sharedRingGeo.dispose();
  }
}
