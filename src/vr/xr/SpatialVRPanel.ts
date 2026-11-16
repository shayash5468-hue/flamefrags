import * as THREE from 'three';
import * as xb from 'xrblocks';
import {
  ExplorerMode,
  ExplanationDepth,
  InvestigationStep,
  ScientificAnnotation,
  SpacecraftId,
  SpacecraftMissionData,
} from '../types.ts';

const _headPos = new THREE.Vector3();
const _headDir = new THREE.Vector3();
const _headRight = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

export interface SpatialVRCallbacks {
  onSelectMission: (id: SpacecraftId) => void;
  onSelectAnnotation: (id: string) => void;
  onSetMode: (mode: ExplorerMode) => void;
  onStepTimeline: (delta: number) => void;
  onToggleAnnotations: () => void;
  onToggleDepth: () => void;
  onToggleUpgradeComparison: () => void;
  onToggleHeadGaze: () => void;
  onToggleFacts: () => void;
  onHideVRPanel: () => void;
  onExitVR: () => void;
}

export class SpatialVRPanel extends xb.UICard {
  private titleText: xb.UIText;
  private subtitleText: xb.UIText;
  private bodyText: xb.UIText;
  private stepButtonPrev: xb.UIButton;
  private stepButtonNext: xb.UIButton;
  private modeButton: xb.UIButton;
  private depthButton: xb.UIButton;
  private annButton: xb.UIButton;
  private upgradeButton: xb.UIButton;
  private followHeadButton: xb.UIButton;
  private gazeButton: xb.UIButton;
  private factsButton: xb.UIButton;
  private markerButtons: xb.UIButton[] = [];
  private activeAnnotations: ScientificAnnotation[] = [];

  private headFollowEnabled = true;

  constructor(callbacks: SpatialVRCallbacks) {
    const titleText = new xb.UIText({
      text: 'FlameFrags Historical VR',
      style: { fontSize: 23, fontWeight: 'bold', color: '#f8fafc' },
    });
    const subtitleText = new xb.UIText({
      text: 'Apollo 1 · 1967',
      style: { fontSize: 15, color: '#38bdf8' },
    });
    const bodyText = new xb.UIText({
      text: 'Look at any numbered 3D marker (dwell 1s) or point with your controller/hand to inspect NASA records.',
      style: {
        fontSize: 14.5,
        lineHeight: 1.38,
        whiteSpace: 'pre-line',
        color: '#e2e8f0',
      },
    });

    const scrollBody = new xb.UIScrollView({
      ariaLabel: 'VR Investigation Details',
      style: {
        width: '100%',
        height: 210,
        padding: 12,
        backgroundColor: 'rgba(10, 16, 28, 0.88)',
        borderRadius: 12,
      },
      children: [bodyText],
    });

    const missionRow = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 6 },
      children: [
        new xb.UIButton({
          label: 'Apollo 1',
          style: { flexGrow: 1, fontSize: 13 },
          onClick: () => callbacks.onSelectMission('apollo1'),
        }),
        new xb.UIButton({
          label: 'Apollo 13',
          style: { flexGrow: 1, fontSize: 13 },
          onClick: () => callbacks.onSelectMission('apollo13'),
        }),
        new xb.UIButton({
          label: 'Mir 1997',
          style: { flexGrow: 1, fontSize: 13 },
          onClick: () => callbacks.onSelectMission('mir'),
        }),
      ],
    });

    const markerButtons: xb.UIButton[] = [0, 1, 2, 3].map(
      (idx) =>
        new xb.UIButton({
          label: `#${idx + 1}`,
          style: { flexGrow: 1, fontSize: 13 },
          onClick: () => {
            const ann = this.activeAnnotations[idx];
            if (ann) callbacks.onSelectAnnotation(ann.id);
          },
        })
    );

    const factsButton = new xb.UIButton({
      label: 'Facts',
      icon: 'fact_check',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onToggleFacts(),
    });

    const markerRow = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 6 },
      children: [...markerButtons, factsButton],
    });

    const modeButton = new xb.UIButton({
      label: 'Investigate',
      icon: 'timeline',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () =>
        callbacks.onSetMode(
          modeButton.label === 'Investigate' ? 'investigate' : 'explore'
        ),
    });
    const annButton = new xb.UIButton({
      label: 'Markers: On',
      icon: 'visibility',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onToggleAnnotations(),
    });
    const depthButton = new xb.UIButton({
      label: 'Tier: Simple',
      icon: 'science',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onToggleDepth(),
    });

    const stepButtonPrev = new xb.UIButton({
      label: 'Prev Stage',
      icon: 'arrow_back',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onStepTimeline(-1),
    });
    const stepButtonNext = new xb.UIButton({
      label: 'Next Stage',
      icon: 'arrow_forward',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onStepTimeline(1),
    });
    const upgradeButton = new xb.UIButton({
      label: 'Upgrades: Off',
      icon: 'build',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onToggleUpgradeComparison(),
    });

    let followBtnRef: xb.UIButton;
    const followHeadButton = new xb.UIButton({
      label: 'Follow Head: On',
      icon: 'center_focus_strong',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => {
        this.headFollowEnabled = !this.headFollowEnabled;
        followBtnRef.label = this.headFollowEnabled
          ? 'Follow Head: On'
          : 'Pin in Cabin';
      },
    });
    followBtnRef = followHeadButton;

    const gazeButton = new xb.UIButton({
      label: 'Head Gaze: On',
      icon: 'visibility',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onToggleHeadGaze(),
    });

    const hidePanelButton = new xb.UIButton({
      label: 'Hide UI (Grip)',
      icon: 'visibility_off',
      style: { flexGrow: 1, fontSize: 13 },
      onClick: () => callbacks.onHideVRPanel(),
    });

    super({
      size: { width: 0.72, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 16,
        backgroundColor: 'rgba(8, 13, 24, 0.94)',
        borderRadius: 18,
      },
      children: [
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [
            new xb.UIPanel({
              style: { flexDirection: 'column', gap: 4 },
              children: [titleText, subtitleText],
            }),
            new xb.UIExitButton({
              onExit: () => callbacks.onExitVR(),
            }),
          ],
        }),
        missionRow,
        markerRow,
        scrollBody,
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 6 },
          children: [modeButton, annButton, depthButton],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 6 },
          children: [stepButtonPrev, stepButtonNext, upgradeButton],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 6 },
          children: [followHeadButton, gazeButton, hidePanelButton],
        }),
      ],
    });

    this.name = 'FlameFrags Spatial VR Console';
    this.position.set(-0.56, 1.32, -1.08);
    this.rotation.y = 0.36;
    this.visible = false;

    this.titleText = titleText;
    this.subtitleText = subtitleText;
    this.bodyText = bodyText;
    this.stepButtonPrev = stepButtonPrev;
    this.stepButtonNext = stepButtonNext;
    this.modeButton = modeButton;
    this.depthButton = depthButton;
    this.annButton = annButton;
    this.upgradeButton = upgradeButton;
    this.followHeadButton = followHeadButton;
    this.gazeButton = gazeButton;
    this.factsButton = factsButton;
    this.markerButtons = markerButtons;
  }

  snapToHead(camera: THREE.Camera): void {
    this.computeHeadTarget(camera);
    this.position.copy(_targetPos);
    this.quaternion.copy(_targetQuat);
  }

  updateHeadFollow(camera: THREE.Camera, dt: number): void {
    if (!this.visible || !this.headFollowEnabled) return;
    this.computeHeadTarget(camera);
    const alpha = 1 - Math.exp(-3.2 * dt);
    this.position.lerp(_targetPos, alpha);
    this.quaternion.slerp(_targetQuat, alpha);
  }

  private computeHeadTarget(camera: THREE.Camera): void {
    camera.getWorldPosition(_headPos);
    camera.getWorldDirection(_headDir);
    // Stabilize along horizontal head yaw so small pitch nods don't swing the console
    _headDir.y = 0;
    if (_headDir.lengthSq() < 0.0001) {
      _headDir.set(0, 0, -1);
    } else {
      _headDir.normalize();
    }
    _headRight.crossVectors(_headDir, _up).normalize();

    // Ergonomic peripheral lower-left placement (~1.14m out, 0.44m left, 0.16m below eye line)
    _targetPos
      .copy(_headPos)
      .addScaledVector(_headDir, 1.14)
      .addScaledVector(_headRight, -0.44);
    _targetPos.y = _headPos.y - 0.16;

    _lookMat.lookAt(_targetPos, _headPos, _up);
    _targetQuat.setFromRotationMatrix(_lookMat);
  }

  syncState(params: {
    mission: SpacecraftMissionData;
    mode: ExplorerMode;
    depth: ExplanationDepth;
    annotationsVisible: boolean;
    showUpgradeComparison: boolean;
    headGazeEnabled: boolean;
    factsVisible: boolean;
    factsSecondsLeft: number;
    factSecondsLeft: number;
    annotation: ScientificAnnotation | null;
    timelineStep: InvestigationStep | null;
  }): void {
    const {
      mission,
      mode,
      depth,
      annotationsVisible,
      showUpgradeComparison,
      headGazeEnabled,
      factsVisible,
      factsSecondsLeft,
      factSecondsLeft,
      annotation,
      timelineStep,
    } = params;

    this.activeAnnotations = mission.annotations;
    this.markerButtons.forEach((btn, idx) => {
      const ann = mission.annotations[idx];
      if (ann) {
        btn.visible = true;
        btn.label =
          annotation?.id === ann.id
            ? `[#${ann.number}]`
            : `#${ann.number}`;
      } else {
        btn.visible = false;
      }
    });

    this.titleText.text = mission.shortName;
    this.modeButton.label = mode === 'investigate' ? 'Free Explore' : 'Investigate';
    this.annButton.label = annotationsVisible ? 'Markers: On' : 'Markers: Off';
    this.depthButton.label = depth === 'simple' ? 'Tier: Simple' : 'Tier: Advanced';
    this.upgradeButton.label = showUpgradeComparison
      ? 'Upgrades: On'
      : 'Upgrades: Off';
    this.gazeButton.label = headGazeEnabled ? 'Head Gaze: On' : 'Head Gaze: Off';
    this.factsButton.label = factsVisible ? `Facts (${factsSecondsLeft}s)` : 'Facts';
    this.followHeadButton.label = this.headFollowEnabled
      ? 'Follow Head: On'
      : 'Pin in Cabin';

    const showSteps = mode === 'investigate';
    this.stepButtonPrev.disabled = !showSteps;
    this.stepButtonNext.disabled = !showSteps;

    if (factsVisible) {
      this.subtitleText.text = `MISSION FACTS · CLOSES IN ${factsSecondsLeft}s`;
      const comparisonsText = mission.comparisons
        .map(
          (c) =>
            `${c.system}\n• Before: ${c.beforeSummary}\n• After: ${c.afterSummary}\n• Impact: ${c.engineeringImpact}`
        )
        .join('\n\n');
      this.bodyText.text =
        `${mission.name} (${mission.dateLabel})\n` +
        `Crew: ${mission.crew.join(', ')}\n\n` +
        `${mission.overview}\n\n` +
        `BEFORE & AFTER ENGINEERING COMPARISONS\n\n` +
        comparisonsText;
    } else if (mode === 'investigate' && timelineStep) {
      this.subtitleText.text = `Stage ${timelineStep.stepNumber}/6 · ${timelineStep.phaseLabel}`;
      this.bodyText.text =
        `${timelineStep.title} (${timelineStep.timestamp})\n\n` +
        `${timelineStep.summary}\n\n` +
        `Scientific Mechanism: ${timelineStep.scientificMechanism}\n\n` +
        `[${timelineStep.distinctionLabel}] ${timelineStep.distinctionNote}`;
    } else if (annotation) {
      const tier = depth === 'simple' ? annotation.simple : annotation.advanced;
      this.subtitleText.text =
        mode === 'explore' && factSecondsLeft > 0
          ? `#${annotation.number} ${annotation.componentName} · ${factSecondsLeft}s`
          : `#${annotation.number} ${annotation.componentName}`;
      this.bodyText.text =
        `WHAT IS IT?\n${tier.whatIsIt}\n\n` +
        `WHEN DID IT HAPPEN?\n${tier.whenDidItHappen}\n\n` +
        `WHAT HAPPENED?\n${tier.whatHappened}\n\n` +
        `HOW DID IT HAPPEN?\n${tier.howDidItHappen}\n\n` +
        `WHY DID IT HAPPEN?\n${tier.whyDidItHappen}\n\n` +
        `CONSEQUENCES\n${tier.consequences}\n\n` +
        `HOW ADDRESSED?\n${tier.howFixedOrAddressed}\n\n` +
        `HOW PREVENTED?\n${tier.howPrevented}\n\n` +
        `SCIENTIFIC LESSON\n${tier.scientificLesson}`;
    } else {
      this.subtitleText.text = mission.dateLabel;
      this.bodyText.text =
        `${mission.overview}\n\n` +
        `Crew: ${mission.crew.join(', ')}\n\n` +
        `Look at any numbered 3D marker for 1 second (Head Gaze) or point with your VR controller/hand to inspect.`;
    }
  }
}
