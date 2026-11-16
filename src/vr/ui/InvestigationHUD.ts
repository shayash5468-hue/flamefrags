import { MISSION_ORDER, SPACECRAFT_MISSIONS } from '../data/historicalData.ts';
import {
  ExplorerStateSnapshot,
  FlameFragsExplorerScript,
} from '../xr/FlameFragsExplorerScript.ts';
import {
  HeadTrackingMode,
  ScientificAnnotation,
  ScientificExplanationTier,
  SpacecraftId,
} from '../types.ts';
import {
  DeviceEnvironmentInfo,
  isFullscreenActive,
  requestDeviceOrientationPermission,
  requestSafeFullscreen,
  restoreOrientationAndExitFullscreen,
} from '../utils/deviceDetection.ts';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

const NINE_SECTIONS: ReadonlyArray<{
  key: keyof ScientificExplanationTier;
  heading: string;
}> = [
  { key: 'whatIsIt', heading: 'WHAT IS IT?' },
  { key: 'whenDidItHappen', heading: 'WHEN DID IT HAPPEN?' },
  { key: 'whatHappened', heading: 'WHAT HAPPENED?' },
  { key: 'howDidItHappen', heading: 'HOW DID IT HAPPEN?' },
  { key: 'whyDidItHappen', heading: 'WHY DID IT HAPPEN?' },
  { key: 'consequences', heading: 'WHAT WERE THE CONSEQUENCES?' },
  { key: 'howFixedOrAddressed', heading: 'HOW WAS IT FIXED OR ADDRESSED?' },
  { key: 'howPrevented', heading: 'HOW COULD IT BE PREVENTED?' },
  { key: 'scientificLesson', heading: 'SCIENTIFIC LESSON' },
];

export class InvestigationHUD {
  private root: HTMLElement;
  private explorer: FlameFragsExplorerScript;
  private deviceInfo: DeviceEnvironmentInfo;

  // UI view state
  private portalVisible = true;
  private topMenuOpen = false;
  private hudCollapsed = false;
  private latestSnapshot: ExplorerStateSnapshot | null = null;
  private errorMessage: string | null = null;
  private isLoaded = false;
  private suspended = false;
  private onExitHub?: () => void;

  // Top-level overlays
  private loadingOverlay: HTMLElement;
  private loadingStatusText: HTMLElement;
  private portalOverlay: HTMLElement;
  private portraitGuardOverlay: HTMLElement;
  private hudLayer: HTMLElement;
  private errorBanner: HTMLElement;
  private errorBannerText: HTMLElement;
  private contextLostOverlay: HTMLElement;

  // Dynamic HUD slots
  private topBarSlot: HTMLElement;
  private inspectorSlot: HTMLElement;
  private bottomDockSlot: HTMLElement;
  private mobileControlsSlot: HTMLElement;
  private splitVRSlot: HTMLElement;
  private restoreHudBtn: HTMLButtonElement;

  private boundOrientationCheck: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundOutsidePointerDown: (e: PointerEvent) => void;
  private boundFullscreenChange: () => void;

  constructor(
    root: HTMLElement,
    explorer: FlameFragsExplorerScript,
    deviceInfo: DeviceEnvironmentInfo,
    onExitHub?: () => void
  ) {
    this.root = root;
    this.explorer = explorer;
    this.deviceInfo = deviceInfo;
    this.onExitHub = onExitHub;

    this.boundOrientationCheck = () => this.syncOrientationGuard();
    this.boundFullscreenChange = () => {
      if (this.suspended) return;
      if (this.latestSnapshot && !this.portalVisible) {
        this.renderTopBar(this.latestSnapshot);
      }
    };
    this.boundOutsidePointerDown = (e: PointerEvent) => {
      if (this.suspended || !this.topMenuOpen) return;
      const target = e.target as Node | null;
      if (target && !this.topBarSlot.contains(target)) {
        this.topMenuOpen = false;
        if (this.latestSnapshot) this.renderTopBar(this.latestSnapshot);
      }
    };
    this.boundKeyDown = (e: KeyboardEvent) => {
      if (this.suspended) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Escape' && this.topMenuOpen) {
        this.topMenuOpen = false;
        if (this.latestSnapshot) this.renderTopBar(this.latestSnapshot);
      } else if (
        e.code === 'KeyH' &&
        !this.portalVisible &&
        !this.latestSnapshot?.isInVR
      ) {
        this.hudCollapsed = !this.hudCollapsed;
        this.topMenuOpen = false;
        this.renderHUD();
      }
    };

    // Main HUD wrapper (pointer-events: none so WebGL canvas stays interactive)
    this.hudLayer = el('div', 'ff-hud-layer ff-hidden');

    this.topBarSlot = el('header', 'ff-top-bar');
    this.inspectorSlot = el('aside', 'ff-inspector-slot');
    this.bottomDockSlot = el('section', 'ff-bottom-dock-slot');
    this.mobileControlsSlot = el('div', 'ff-mobile-pad-slot');
    this.splitVRSlot = el('div', 'ff-split-vr-overlay ff-hidden');

    this.restoreHudBtn = el(
      'button',
      'ff-btn ff-btn-ghost ff-btn-sm ff-restore-hud-btn ff-hidden',
      'Show UI (H)'
    );
    this.restoreHudBtn.type = 'button';
    this.restoreHudBtn.title = 'Restore Investigation UI (H)';
    this.restoreHudBtn.addEventListener('click', () => {
      this.hudCollapsed = false;
      this.renderHUD();
    });

    this.hudLayer.append(
      this.topBarSlot,
      this.inspectorSlot,
      this.bottomDockSlot,
      this.mobileControlsSlot,
      this.splitVRSlot,
      this.restoreHudBtn
    );

    // Loading Overlay
    this.loadingOverlay = el('div', 'ff-loading-overlay');
    const loadCard = el('div', 'ff-loading-card');
    const loadBrand = el('div', 'ff-brand-kicker', 'FLAMEFRAGS AEROSPACE LAB');
    const loadTitle = el(
      'h1',
      'ff-loading-title',
      'Historical VR Spacecraft Explorer'
    );
    this.loadingStatusText = el(
      'p',
      'ff-loading-status',
      'Calibrating spacecraft geometry, lighting, and WebXR optics...'
    );
    const loadBar = el('div', 'ff-loading-track');
    loadBar.append(el('div', 'ff-loading-bar'));
    loadCard.append(loadBrand, loadTitle, this.loadingStatusText, loadBar);
    this.loadingOverlay.append(loadCard);

    // Portal Overlay (Mission Launcher)
    this.portalOverlay = el('div', 'ff-portal-overlay ff-hidden');
    this.buildPortalContent();

    // Mobile Portrait Guard
    this.portraitGuardOverlay = el('div', 'ff-portrait-guard ff-hidden');
    this.buildPortraitGuard();

    // Error Banner
    this.errorBanner = el('div', 'ff-error-banner ff-hidden');
    this.errorBannerText = el('span', 'ff-error-text');
    const errorClose = el('button', 'ff-btn ff-btn-ghost', 'Dismiss');
    errorClose.type = 'button';
    errorClose.addEventListener('click', () => {
      this.errorMessage = null;
      this.errorBanner.classList.add('ff-hidden');
    });
    this.errorBanner.append(this.errorBannerText, errorClose);

    // WebGL Context Lost Overlay
    this.contextLostOverlay = el('div', 'ff-context-lost ff-hidden');
    const clCard = el('div', 'ff-modal-card');
    clCard.append(
      el('h2', 'ff-modal-title', '3D Graphics Context Interrupted'),
      el(
        'p',
        'ff-body-text',
        'Your browser paused the WebGL context. Restoring automatically, or reload the view.'
      )
    );
    this.contextLostOverlay.append(clCard);

    this.root.append(
      this.hudLayer,
      this.portalOverlay,
      this.portraitGuardOverlay,
      this.errorBanner,
      this.contextLostOverlay,
      this.loadingOverlay
    );

    window.addEventListener('resize', this.boundOrientationCheck);
    window.addEventListener('orientationchange', this.boundOrientationCheck);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('pointerdown', this.boundOutsidePointerDown);
    document.addEventListener('fullscreenchange', this.boundFullscreenChange);
  }

  public markReady(snapshot: ExplorerStateSnapshot): void {
    this.isLoaded = true;
    this.latestSnapshot = snapshot;
    this.loadingOverlay.classList.add('ff-hidden');
    this.portalOverlay.classList.remove('ff-hidden');
    this.renderHUD();
  }

  public showError(message: string): void {
    this.errorMessage = message;
    this.errorBannerText.textContent = message;
    this.errorBanner.classList.remove('ff-hidden');
    if (!this.isLoaded) {
      this.loadingStatusText.textContent = message;
    }
  }

  public updateSnapshot(snapshot: ExplorerStateSnapshot): void {
    this.latestSnapshot = snapshot;
    if (snapshot.contextLost) {
      this.contextLostOverlay.classList.remove('ff-hidden');
    } else {
      this.contextLostOverlay.classList.add('ff-hidden');
    }
    this.renderHUD();
  }

  private getDeviceCapabilityBadge(): string {
    if (this.deviceInfo.webXRSupported) {
      return 'WebXR VR Headset Ready · Desktop/Touch Fallback Active';
    }
    if (this.deviceInfo.deviceType === 'desktop') {
      return 'Desktop 3D Simulation · Drag Look & WASD Navigation';
    }
    if (this.deviceInfo.hasDeviceOrientationAPI) {
      return 'Mobile 3D Explorer · Touch Controls & Gyroscope Supported';
    }
    return 'Mobile 3D Explorer · Touch Controls Active';
  }

  private buildPortalContent(): void {
    this.portalOverlay.replaceChildren();

    const shell = el('div', 'ff-portal-shell');

    // Header
    const header = el('header', 'ff-portal-header');
    const brandRow = el('div', 'ff-portal-brand-row');
    const brandLeft = el('div', 'ff-portal-brand-row');
    brandLeft.append(
      el('span', 'ff-brand-kicker', 'FLAMEFRAGS · HISTORICAL VR EXPLORER'),
      el('span', 'ff-device-caption', this.getDeviceCapabilityBadge())
    );
    brandRow.append(brandLeft);
    if (this.onExitHub) {
      const hubExitBtn = el(
        'button',
        'ff-btn ff-btn-ghost ff-btn-sm',
        '← Return to Simulation Hub'
      );
      hubExitBtn.type = 'button';
      hubExitBtn.addEventListener('click', () => {
        void this.exitToHub();
      });
      brandRow.append(hubExitBtn);
    }
    const title = el(
      'h1',
      'ff-portal-title',
      'Investigate Historical Spacecraft Incidents in 3D'
    );
    const subtitle = el(
      'p',
      'ff-portal-subtitle',
      'Step inside historically informed spacecraft reconstructions, inspect numbered 3D component markers, and trace each engineering lesson through interactive chronological simulations sourced from NASA archives.'
    );
    header.append(brandRow, title, subtitle);

    // Mission Cards Grid
    const grid = el('div', 'ff-mission-grid');
    for (const missionId of MISSION_ORDER) {
      const m = SPACECRAFT_MISSIONS[missionId];
      const card = el('article', 'ff-mission-card');

      const cardTop = el('div', 'ff-mission-card-top');
      cardTop.append(
        el('span', 'ff-mono-tag', `${m.year} · ${m.missionDesignation}`),
        el('span', 'ff-mono-muted', m.agency)
      );

      const cardTitle = el('h2', 'ff-mission-card-title', m.name);
      const cardDate = el('div', 'ff-mission-card-date', m.dateLabel);
      const cardOverview = el('p', 'ff-mission-card-desc', m.overview);

      const cardMeta = el(
        'div',
        'ff-mission-card-meta',
        `${m.annotations.length} 3D Component Markers · ${m.timeline.length}-Stage Timeline`
      );

      const cardActions = el('div', 'ff-mission-card-actions');
      const enterBtn = el(
        'button',
        'ff-btn ff-btn-primary',
        'Enter VR View'
      );
      enterBtn.type = 'button';
      enterBtn.addEventListener('click', () => {
        void this.enterExplorerWithMission(missionId, 'explore', false);
      });

      const investBtn = el(
        'button',
        'ff-btn ff-btn-amber',
        'Incident Timeline'
      );
      investBtn.type = 'button';
      investBtn.addEventListener('click', () => {
        void this.enterExplorerWithMission(missionId, 'investigate', false);
      });

      cardActions.append(enterBtn, investBtn);
      card.append(cardTop, cardTitle, cardDate, cardOverview, cardMeta, cardActions);
      grid.append(card);
    }

    // Footer note explaining unobstructed VR view, gestures & optional 2-Eye Goggles
    const footer = el('footer', 'ff-portal-footer');
    const fallbackNote = el(
      'p',
      'ff-portal-note',
      this.deviceInfo.webXRSupported
        ? 'Launches in an unobstructed 1-view VR cockpit with Head Tracking (swipe to look, pinch to walk, tap/gaze markers). Optional 2-Eye Goggles (V) & Incident Timeline sit in Controls ▾. Press H to hide UI.'
        : this.deviceInfo.deviceType !== 'desktop'
          ? 'Launches automatically in fullscreen single-view VR with gyroscope head tracking — drag with 1 finger to look, pinch with 2 fingers to walk, tap or gaze at markers. Timeline & 2-Eye Goggles sit in Controls ▾.'
          : 'Single-View VR Explorer renders 1 crisp unified view with real-time Head Tracking, WASD + mouse look, and unobstructed sightlines. Incident Timeline & 2-Eye Goggles (V) sit in Controls ▾. Press H to hide UI.'
    );
    footer.append(fallbackNote);

    shell.append(header, grid, footer);
    this.portalOverlay.append(shell);
  }

  private buildPortraitGuard(): void {
    this.portraitGuardOverlay.replaceChildren();

    const box = el('div', 'ff-portrait-box');
    const phoneIcon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    phoneIcon.setAttribute('viewBox', '0 0 64 64');
    phoneIcon.setAttribute('class', 'ff-rotate-phone-svg');
    phoneIcon.innerHTML =
      '<rect x="20" y="8" width="24" height="48" rx="4" fill="none" stroke="#06b6d4" stroke-width="3"/><circle cx="32" cy="49" r="2" fill="#06b6d4"/><path d="M12 24 C8 32, 10 42, 16 48" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/><polyline points="11,47 17,49 17,43" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';

    const msg = el(
      'h2',
      'ff-portrait-title',
      'Please rotate your device horizontally to enter VR Explorer.'
    );
    const sub = el(
      'p',
      'ff-portrait-sub',
      'Landscape orientation gives unobstructed cockpit sightlines and touch controls.'
    );

    const exitBtn = el(
      'button',
      'ff-btn ff-btn-ghost',
      'Return to Mission Select'
    );
    exitBtn.type = 'button';
    exitBtn.addEventListener('click', () => {
      void this.exitToPortal();
    });

    box.append(phoneIcon, msg, sub, exitBtn);
    this.portraitGuardOverlay.append(box);
  }

  private async enterExplorerWithMission(
    missionId: SpacecraftId,
    initialMode: 'explore' | 'investigate',
    startSplitVR = false
  ): Promise<void> {
    // Enter safe fullscreen immediately inside user gesture on mobile/tablet (never force screen.orientation.lock)
    const fullscreenPromise =
      this.deviceInfo.deviceType !== 'desktop'
        ? requestSafeFullscreen()
        : Promise.resolve(false);

    // Request iOS/mobile motion permission synchronously inside the same user gesture
    let chosenTrackMode: HeadTrackingMode | undefined;
    if (
      this.deviceInfo.deviceType !== 'desktop' &&
      this.deviceInfo.hasDeviceOrientationAPI
    ) {
      const granted = await requestDeviceOrientationPermission();
      if (granted) {
        chosenTrackMode = 'imu';
      }
    }
    await fullscreenPromise;

    this.portalVisible = false;
    this.hudCollapsed = false;
    this.portalOverlay.classList.add('ff-hidden');
    this.hudLayer.classList.remove('ff-hidden');

    this.explorer.loadMission(missionId);
    if (initialMode === 'investigate') {
      this.explorer.setMode('investigate');
    }

    if (chosenTrackMode === 'imu') {
      await this.explorer.setHeadTrackingMode('imu');
    }

    if (startSplitVR) {
      this.explorer.setSplitVRMode(true, chosenTrackMode);
    } else {
      this.explorer.setSplitVRMode(false);
    }

    this.syncOrientationGuard();
    this.renderHUD();
  }

  public setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (suspended) {
      this.topMenuOpen = false;
      this.hudCollapsed = false;
    }
  }

  public showPortal(): void {
    this.portalVisible = true;
    this.topMenuOpen = false;
    this.hudCollapsed = false;
    this.portraitGuardOverlay.classList.add('ff-hidden');
    this.hudLayer.classList.add('ff-hidden');
    if (this.isLoaded) {
      this.loadingOverlay.classList.add('ff-hidden');
      this.portalOverlay.classList.remove('ff-hidden');
    }
  }

  private async exitToHub(): Promise<void> {
    await this.exitToPortal();
    this.onExitHub?.();
  }

  private async exitToPortal(): Promise<void> {
    this.explorer.toggleFacts(false);
    this.topMenuOpen = false;
    this.explorer.setTimelinePlaying(false);
    this.explorer.setSplitVRMode(false);
    if (this.latestSnapshot?.isInVR) {
      await this.explorer.exitVRSession();
    }
    await this.explorer.setHeadTrackingMode('off');
    await restoreOrientationAndExitFullscreen();

    this.portalVisible = true;
    this.portraitGuardOverlay.classList.add('ff-hidden');
    this.hudLayer.classList.add('ff-hidden');
    this.portalOverlay.classList.remove('ff-hidden');
  }

  private syncOrientationGuard(): void {
    // Allow seamless portrait and landscape VR exploration on mobile without blocking overlays
    this.portraitGuardOverlay.classList.add('ff-hidden');
  }

  private renderHUD(): void {
    const snap = this.latestSnapshot;
    if (!snap || this.portalVisible) return;

    if (this.hudCollapsed) {
      this.topBarSlot.classList.add('ff-hidden');
      this.inspectorSlot.classList.add('ff-hidden');
      this.bottomDockSlot.classList.add('ff-hidden');
      this.mobileControlsSlot.classList.add('ff-hidden');
      this.splitVRSlot.classList.add('ff-hidden');
      this.restoreHudBtn.classList.remove('ff-hidden');
      return;
    }

    this.restoreHudBtn.classList.add('ff-hidden');

    if (snap.splitVRMode) {
      this.topBarSlot.classList.add('ff-hidden');
      this.inspectorSlot.classList.add('ff-hidden');
      this.bottomDockSlot.classList.add('ff-hidden');
      this.mobileControlsSlot.classList.add('ff-hidden');
      this.splitVRSlot.classList.remove('ff-hidden');
      this.renderSplitVRHud(snap);
      return;
    }

    this.splitVRSlot.classList.add('ff-hidden');
    this.topBarSlot.classList.remove('ff-hidden');
    this.inspectorSlot.classList.remove('ff-hidden');
    this.mobileControlsSlot.classList.add('ff-hidden');
    this.mobileControlsSlot.replaceChildren();

    if (snap.mode === 'investigate') {
      this.bottomDockSlot.classList.remove('ff-hidden');
      this.renderBottomDock(snap);
    } else {
      this.bottomDockSlot.classList.add('ff-hidden');
      this.bottomDockSlot.replaceChildren();
    }

    this.renderTopBar(snap);
    this.renderInspector(snap);
  }

  private renderTopBar(snap: ExplorerStateSnapshot): void {
    this.topBarSlot.replaceChildren();
    const isCompact =
      this.deviceInfo.deviceType !== 'desktop' || window.innerWidth < 720;

    // Minimal Top-Left Corner Pill: Back button + Mission name (tabs stay inside Controls ▾ on mobile)
    const leftPill = el('div', 'ff-top-pill');
    const exitBtn = el(
      'button',
      'ff-btn ff-btn-ghost ff-btn-sm',
      isCompact ? '←' : '← Missions'
    );
    exitBtn.type = 'button';
    exitBtn.title = 'Return to Mission Select';
    exitBtn.addEventListener('click', () => {
      void this.exitToPortal();
    });
    leftPill.append(exitBtn);

    if (isCompact) {
      leftPill.append(
        el('span', 'ff-compact-mission-name', snap.mission.shortName)
      );
    } else {
      const missionTabs = el('div', 'ff-seg-group');
      for (const id of MISSION_ORDER) {
        const m = SPACECRAFT_MISSIONS[id];
        const btn = el(
          'button',
          `ff-seg-btn ${snap.mission.id === id ? 'is-active' : ''}`,
          m.shortName
        );
        btn.type = 'button';
        btn.addEventListener('click', () => this.explorer.loadMission(id));
        missionTabs.append(btn);
      }
      leftPill.append(missionTabs);
    }

    // Minimal Top-Right Corner Pill: Facts (5s), VR (when supported), Controls ▾, Hide
    const rightPill = el('div', 'ff-top-pill ff-top-menu-wrap');

    const factsBtn = el(
      'button',
      `ff-btn ff-btn-sm ${snap.factsVisible ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
      snap.factsVisible ? `Facts (${snap.factsSecondsLeft}s)` : 'Facts'
    );
    factsBtn.type = 'button';
    factsBtn.title = 'Show Mission Facts on the VR side (auto-exits after 5s)';
    factsBtn.addEventListener('click', () => {
      this.topMenuOpen = false;
      this.explorer.toggleFacts();
    });
    rightPill.append(factsBtn);

    const canLaunchWebXR =
      this.deviceInfo.webXRSupported &&
      (!this.deviceInfo.isEmbeddedIframe || this.deviceInfo.isDedicatedXRHeadset);

    if (canLaunchWebXR || snap.isInVR) {
      const vrBtn = el(
        'button',
        'ff-btn ff-btn-sm ff-btn-primary',
        snap.isInVR ? 'Exit VR' : 'Enter VR'
      );
      vrBtn.type = 'button';
      vrBtn.addEventListener('click', () => {
        if (snap.isInVR) {
          void this.explorer.exitVRSession();
        } else {
          void this.explorer.enterVRSession();
        }
      });
      rightPill.append(vrBtn);
    } else if (this.deviceInfo.deviceType !== 'desktop') {
      const isGyroActive = snap.headTrackingMode === 'imu';
      const mobileVrBtn = el(
        'button',
        `ff-btn ff-btn-sm ${isGyroActive ? 'ff-btn-cyan-outline' : 'ff-btn-primary'}`,
        isGyroActive ? 'Gyro: On' : 'Gyro'
      );
      mobileVrBtn.type = 'button';
      mobileVrBtn.title = 'Toggle mobile gyroscope head-tracked VR view';
      mobileVrBtn.addEventListener('click', () => {
        void (async () => {
          if (isGyroActive) {
            await this.explorer.setHeadTrackingMode('off');
          } else {
            const granted = await requestDeviceOrientationPermission();
            if (!granted) {
              this.showError(
                'Motion sensor permission denied. Use touch drag or Controls ▾ → Cursor.'
              );
              return;
            }
            this.explorer.setHeadGazeEnabled(true);
            await this.explorer.setHeadTrackingMode('imu');
          }
        })();
      });
      rightPill.append(mobileVrBtn);
    }

    const menuBtn = el(
      'button',
      `ff-btn ff-btn-sm ${this.topMenuOpen ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
      this.topMenuOpen ? 'Controls ▴' : 'Controls ▾'
    );
    menuBtn.type = 'button';
    menuBtn.title = 'Spacecraft, Timeline, Head Tracking, Fullscreen & 2-Eye Goggles';
    menuBtn.addEventListener('click', () => {
      this.topMenuOpen = !this.topMenuOpen;
      this.renderTopBar(snap);
    });

    const hideUiBtn = el(
      'button',
      'ff-btn ff-btn-ghost ff-btn-sm',
      isCompact ? 'Hide' : 'Hide (H)'
    );
    hideUiBtn.type = 'button';
    hideUiBtn.title = 'Hide all UI overlays (H)';
    hideUiBtn.addEventListener('click', () => {
      this.hudCollapsed = true;
      this.topMenuOpen = false;
      this.renderHUD();
    });

    rightPill.append(menuBtn, hideUiBtn);

    // Collapsible Floating Controls Popover (keeps top & bottom edges completely clear when closed)
    if (this.topMenuOpen) {
      const popover = el('div', 'ff-top-menu');

      // Spacecraft Switcher Row
      const missionRow = el('div', 'ff-menu-row');
      missionRow.append(el('span', 'ff-mono-muted', 'SPACECRAFT'));
      const missionSeg = el('div', 'ff-seg-group');
      for (const id of MISSION_ORDER) {
        const m = SPACECRAFT_MISSIONS[id];
        const btn = el(
          'button',
          `ff-seg-btn ${snap.mission.id === id ? 'is-active' : ''}`,
          m.shortName
        );
        btn.type = 'button';
        btn.addEventListener('click', () => {
          this.topMenuOpen = false;
          this.explorer.loadMission(id);
        });
        missionSeg.append(btn);
      }
      missionRow.append(missionSeg);

      // Mode Row
      const modeRow = el('div', 'ff-menu-row');
      modeRow.append(el('span', 'ff-mono-muted', 'MODE'));
      const modeSeg = el('div', 'ff-seg-group');
      const exploreBtn = el(
        'button',
        `ff-seg-btn ${snap.mode === 'explore' ? 'is-active' : ''}`,
        'Explore'
      );
      exploreBtn.type = 'button';
      exploreBtn.addEventListener('click', () => {
        this.topMenuOpen = false;
        this.explorer.setMode('explore');
      });
      const investBtn = el(
        'button',
        `ff-seg-btn ${snap.mode === 'investigate' ? 'is-active-amber' : ''}`,
        'Timeline'
      );
      investBtn.type = 'button';
      investBtn.addEventListener('click', () => {
        this.topMenuOpen = false;
        this.explorer.setMode('investigate');
      });
      modeSeg.append(exploreBtn, investBtn);
      modeRow.append(modeSeg);

      // Head Tracking Row
      const headRow = el('div', 'ff-menu-row');
      headRow.append(el('span', 'ff-mono-muted', 'HEAD TRACK'));
      const headTrackGroup = el('div', 'ff-seg-group');
      const trackModes: Array<{ mode: HeadTrackingMode; label: string }> = [
        { mode: 'off', label: 'Off' },
        { mode: 'imu', label: 'Gyro' },
        { mode: 'webcam', label: 'Webcam' },
        { mode: 'cursor', label: 'Cursor' },
      ];
      for (const item of trackModes) {
        const btn = el(
          'button',
          `ff-seg-btn ${snap.headTrackingMode === item.mode ? 'is-active' : ''}`,
          item.label
        );
        btn.type = 'button';
        btn.addEventListener('click', () => {
          void (async () => {
            if (item.mode === 'imu') {
              const granted = await requestDeviceOrientationPermission();
              if (!granted) {
                this.showError(
                  'Motion sensor permission denied. Try Webcam or Cursor Head-Look.'
                );
                return;
              }
            }
            await this.explorer.setHeadTrackingMode(item.mode);
          })();
        });
        headTrackGroup.append(btn);
      }
      headRow.append(headTrackGroup);

      // Toggles Grid
      const actionsGrid = el('div', 'ff-menu-actions');

      const markersBtn = el(
        'button',
        `ff-btn ff-btn-sm ${snap.annotationsVisible ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
        snap.annotationsVisible ? 'Markers: On (M)' : 'Markers: Off (M)'
      );
      markersBtn.type = 'button';
      markersBtn.addEventListener('click', () => this.explorer.toggleAnnotations());

      const gazeBtn = el(
        'button',
        `ff-btn ff-btn-sm ${snap.headGazeEnabled ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
        snap.headGazeEnabled ? 'Head Gaze: On (G)' : 'Head Gaze: Off (G)'
      );
      gazeBtn.type = 'button';
      gazeBtn.addEventListener('click', () => this.explorer.toggleHeadGaze());

      const resetBtn = el(
        'button',
        'ff-btn ff-btn-ghost ff-btn-sm',
        snap.headTrackingMode !== 'off' || snap.isInVR
          ? 'Recenter Head (R)'
          : 'Reset View (R)'
      );
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', () =>
        this.explorer.recenterHeadTracking()
      );

      const fullscreenBtn = el(
        'button',
        `ff-btn ff-btn-sm ${isFullscreenActive() ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
        isFullscreenActive() ? 'Exit Fullscreen' : 'Fullscreen'
      );
      fullscreenBtn.type = 'button';
      fullscreenBtn.addEventListener('click', () => {
        void (async () => {
          if (isFullscreenActive()) {
            await restoreOrientationAndExitFullscreen();
          } else {
            await requestSafeFullscreen();
          }
          if (this.latestSnapshot) this.renderTopBar(this.latestSnapshot);
        })();
      });

      const splitVrBtn = el(
        'button',
        `ff-btn ff-btn-sm ${snap.splitVRMode ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
        '2-Eye Goggles (V)'
      );
      splitVrBtn.type = 'button';
      splitVrBtn.addEventListener('click', () => {
        this.topMenuOpen = false;
        void (async () => {
          if (
            !snap.splitVRMode &&
            this.deviceInfo.deviceType !== 'desktop' &&
            this.deviceInfo.hasDeviceOrientationAPI
          ) {
            await requestDeviceOrientationPermission();
          }
          this.explorer.toggleSplitVRMode();
        })();
      });

      // Quick 5-Second VR Fact Toggles Row
      const factsRow = el('div', 'ff-menu-row');
      factsRow.append(el('span', 'ff-mono-muted', 'FACTS (5s)'));
      const factsSeg = el('div', 'ff-seg-group');
      for (const item of snap.mission.annotations) {
        const b = el(
          'button',
          `ff-seg-btn ${snap.selectedAnnotation?.id === item.id ? 'is-active' : ''}`,
          `#${item.number}`
        );
        b.type = 'button';
        b.title = item.componentName;
        b.addEventListener('click', () => {
          this.topMenuOpen = false;
          this.explorer.selectAnnotation(
            snap.selectedAnnotation?.id === item.id ? null : item.id,
            true
          );
        });
        factsSeg.append(b);
      }
      const missionFactChip = el(
        'button',
        `ff-seg-btn ${snap.factsVisible ? 'is-active-amber' : ''}`,
        'Mission'
      );
      missionFactChip.type = 'button';
      missionFactChip.title = 'Show Historical Mission Facts for 5s';
      missionFactChip.addEventListener('click', () => {
        this.topMenuOpen = false;
        this.explorer.toggleFacts();
      });
      factsSeg.append(missionFactChip);
      factsRow.append(factsSeg);

      actionsGrid.append(markersBtn, gazeBtn, resetBtn, fullscreenBtn, splitVrBtn);
      if (this.onExitHub) {
        const exitHubBtn = el(
          'button',
          'ff-btn ff-btn-ghost ff-btn-sm',
          '← Exit to Hub'
        );
        exitHubBtn.type = 'button';
        exitHubBtn.title = 'Exit Historical VR Explorer and return to Simulation Hub';
        exitHubBtn.addEventListener('click', () => {
          this.topMenuOpen = false;
          void this.exitToHub();
        });
        actionsGrid.append(exitHubBtn);
      }
      popover.append(missionRow, modeRow, factsRow, headRow, actionsGrid);
      rightPill.append(popover);
    }

    this.topBarSlot.append(leftPill, rightPill);
  }

  private renderSplitVRHud(snap: ExplorerStateSnapshot): void {
    this.splitVRSlot.replaceChildren();
    const eyeStep = Math.round(snap.splitEyeScale * 100);
    this.splitVRSlot.className = `ff-split-vr-overlay ff-eye-w-${eyeStep}`;

    const makeEyeColumn = (eyeClass: string): HTMLElement => {
      const eye = el('div', `ff-split-eye ${eyeClass}`);
      eye.append(el('div')); // Spacer keeps optional bottom card anchored low without top clutter

      if (snap.factsVisible) {
        const m = snap.mission;
        const firstComp = m.comparisons[0];
        const card = el('div', 'ff-split-info-card');
        card.append(
          el(
            'div',
            'ff-mono-amber',
            `MISSION FACTS · EXITS IN ${snap.factsSecondsLeft}s`
          ),
          el('div', 'ff-split-info-title', `${m.shortName} · ${m.dateLabel}`),
          el('div', 'ff-split-info-body', m.overview)
        );
        if (firstComp) {
          card.append(
            el(
              'div',
              'ff-split-info-sub',
              `${firstComp.system}: ${firstComp.afterTitle}`
            )
          );
        }
        eye.append(card);
      } else if (snap.mode === 'investigate' && snap.currentStep) {
        const card = el('div', 'ff-split-info-card');
        card.append(
          el(
            'div',
            'ff-mono-amber',
            `STEP ${snap.currentStep.stepNumber}/6 · ${snap.currentStep.phaseLabel.toUpperCase()}`
          ),
          el('div', 'ff-split-info-title', snap.currentStep.title),
          el('div', 'ff-split-info-body', snap.currentStep.summary)
        );
        eye.append(card);
      } else if (snap.selectedAnnotation) {
        const ann = snap.selectedAnnotation;
        const tier = snap.depth === 'simple' ? ann.simple : ann.advanced;
        const card = el('div', 'ff-split-info-card');
        card.append(
          el(
            'div',
            'ff-mono-tag',
            snap.factAutoCloseActive
              ? `MARKER #${ann.number} · EXITS IN ${snap.factSecondsLeft}s`
              : `MARKER #${ann.number} · ${ann.subsystem}`
          ),
          el('div', 'ff-split-info-title', ann.componentName),
          el('div', 'ff-split-info-body', tier.whatHappened)
        );
        eye.append(card);
      }

      return eye;
    };

    const leftEye = makeEyeColumn('is-left');
    const divider = el('div', 'ff-split-divider');
    const rightEye = makeEyeColumn('is-right');

    // Bottom calibration & VR-side fact toggle strip for physical goggles
    const bar = el('div', 'ff-split-controls');

    const factsBtn = el(
      'button',
      `ff-btn ff-btn-sm ${snap.factsVisible ? 'ff-btn-amber' : 'ff-btn-ghost'}`,
      snap.factsVisible ? `Facts (${snap.factsSecondsLeft}s)` : 'Facts'
    );
    factsBtn.type = 'button';
    factsBtn.title = 'Show Mission Facts in both VR eyes for 5s';
    factsBtn.addEventListener('click', () => this.explorer.toggleFacts());
    bar.append(factsBtn);

    for (const item of snap.mission.annotations) {
      const mBtn = el(
        'button',
        `ff-btn ff-btn-sm ${snap.selectedAnnotation?.id === item.id ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
        `#${item.number}`
      );
      mBtn.type = 'button';
      mBtn.title = `${item.componentName} (shows for 5s)`;
      mBtn.addEventListener('click', () =>
        this.explorer.selectAnnotation(
          snap.selectedAnnotation?.id === item.id ? null : item.id
        )
      );
      bar.append(mBtn);
    }

    const depthBtn = el(
      'button',
      `ff-btn ff-btn-sm ${snap.splitStereoDepth === 0 ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
      snap.splitStereoDepth === 0 ? 'Fusion Lock' : 'Subtle 3D'
    );
    depthBtn.type = 'button';
    depthBtn.title =
      'Toggle between zero-double-vision Fusion Lock (0mm) and Subtle 3D parallax (20mm)';
    depthBtn.addEventListener('click', () =>
      this.explorer.toggleSplitStereoDepth()
    );

    const alignOutBtn = el(
      'button',
      'ff-btn ff-btn-ghost ff-btn-sm',
      'Align -'
    );
    alignOutBtn.type = 'button';
    alignOutBtn.title = 'Narrow eye boxes toward center nose bridge';
    alignOutBtn.addEventListener('click', () =>
      this.explorer.adjustSplitEyeScale(-0.05)
    );

    const alignInBtn = el(
      'button',
      'ff-btn ff-btn-ghost ff-btn-sm',
      'Align +'
    );
    alignInBtn.type = 'button';
    alignInBtn.title = 'Widen eye boxes';
    alignInBtn.addEventListener('click', () =>
      this.explorer.adjustSplitEyeScale(0.05)
    );

    const cycleHeadBtn = el(
      'button',
      'ff-btn ff-btn-cyan-outline ff-btn-sm',
      `Track: ${snap.headTrackingMode.toUpperCase()}`
    );
    cycleHeadBtn.type = 'button';
    cycleHeadBtn.addEventListener('click', () => {
      const order: HeadTrackingMode[] = ['imu', 'webcam', 'cursor', 'off'];
      const curIdx = order.indexOf(snap.headTrackingMode);
      const nextMode = order[(curIdx + 1) % order.length];
      void (async () => {
        if (nextMode === 'imu') {
          await requestDeviceOrientationPermission();
        }
        await this.explorer.setHeadTrackingMode(nextMode);
      })();
    });

    const recenterBtn = el('button', 'ff-btn ff-btn-ghost ff-btn-sm', 'Recenter (R)');
    recenterBtn.type = 'button';
    recenterBtn.addEventListener('click', () =>
      this.explorer.recenterHeadTracking()
    );

    const hideBtn = el('button', 'ff-btn ff-btn-ghost ff-btn-sm', 'Hide UI (H)');
    hideBtn.type = 'button';
    hideBtn.addEventListener('click', () => {
      this.hudCollapsed = true;
      this.renderHUD();
    });

    const exitSplitBtn = el(
      'button',
      'ff-btn ff-btn-primary ff-btn-sm',
      'Single View (V)'
    );
    exitSplitBtn.type = 'button';
    exitSplitBtn.addEventListener('click', () =>
      this.explorer.setSplitVRMode(false)
    );

    bar.append(
      depthBtn,
      alignOutBtn,
      alignInBtn,
      cycleHeadBtn,
      recenterBtn,
      hideBtn,
      exitSplitBtn
    );
    this.splitVRSlot.append(leftEye, divider, rightEye, bar);
  }

  private renderInspector(snap: ExplorerStateSnapshot): void {
    this.inspectorSlot.replaceChildren();

    // Show toggleable Facts on the VR side panel (never blocking center 3D view) and auto-exit at 5s
    if (snap.factsVisible) {
      this.inspectorSlot.classList.remove('is-empty');
      this.renderSideFactsCard(snap);
      return;
    }

    const ann: ScientificAnnotation | null = snap.selectedAnnotation;
    if (!ann) {
      this.inspectorSlot.classList.add('is-empty');
      return;
    }
    this.inspectorSlot.classList.remove('is-empty');

    const card = el('div', 'ff-inspector-card');

    // Quick marker tabs 1..4
    const jumpRow = el('div', 'ff-jump-row');
    const jumpLabel = el('span', 'ff-mono-muted', 'COMPONENTS');
    const jumpBtns = el('div', 'ff-jump-btns');
    for (const item of snap.mission.annotations) {
      const b = el(
        'button',
        `ff-jump-btn ${item.id === ann.id ? 'is-active' : ''}`,
        String(item.number)
      );
      b.type = 'button';
      b.title = item.componentName;
      b.addEventListener('click', () => this.explorer.selectAnnotation(item.id));
      jumpBtns.append(b);
    }
    const factsJumpBtn = el(
      'button',
      'ff-jump-btn ff-jump-facts',
      'Facts'
    );
    factsJumpBtn.type = 'button';
    factsJumpBtn.title = 'Open Mission Facts for 5s';
    factsJumpBtn.addEventListener('click', () => this.explorer.toggleFacts(true));
    jumpBtns.append(factsJumpBtn);

    const closeBtn = el('button', 'ff-close-btn', '×');
    closeBtn.type = 'button';
    closeBtn.ariaLabel = 'Close component details';
    closeBtn.addEventListener('click', () =>
      this.explorer.selectAnnotation(null)
    );
    jumpRow.append(jumpLabel, jumpBtns, closeBtn);

    // Header
    const head = el('div', 'ff-inspector-head');
    const numRow = el('div', 'ff-inspector-kicker-row');
    numRow.append(
      el(
        'span',
        'ff-mono-tag',
        snap.factAutoCloseActive
          ? `MARKER #${ann.number} · EXITS IN ${snap.factSecondsLeft}s`
          : `MARKER #${ann.number}`
      ),
      el('span', 'ff-mono-muted', ann.subsystem)
    );
    const title = el('h2', 'ff-inspector-title', ann.componentName);

    // Simple / Advanced toggle
    const depthRow = el('div', 'ff-depth-row');
    const depthLabel = el('span', 'ff-mono-muted', 'EXPLANATION DEPTH');
    const depthSeg = el('div', 'ff-seg-group');
    const simpleBtn = el(
      'button',
      `ff-seg-btn ${snap.depth === 'simple' ? 'is-active' : ''}`,
      'Simple'
    );
    simpleBtn.type = 'button';
    simpleBtn.addEventListener('click', () => {
      if (snap.depth !== 'simple') this.explorer.toggleExplanationDepth();
    });
    const advBtn = el(
      'button',
      `ff-seg-btn ${snap.depth === 'advanced' ? 'is-active' : ''}`,
      'Advanced'
    );
    advBtn.type = 'button';
    advBtn.addEventListener('click', () => {
      if (snap.depth !== 'advanced') this.explorer.toggleExplanationDepth();
    });
    depthSeg.append(simpleBtn, advBtn);
    depthRow.append(depthLabel, depthSeg);
    head.append(numRow, title, depthRow);

    // Scrollable Body with all 9 required sections + accuracy note + NASA link
    const body = el('div', 'ff-inspector-body');
    const tier = snap.depth === 'simple' ? ann.simple : ann.advanced;

    for (const sec of NINE_SECTIONS) {
      const secBlock = el('section', 'ff-sec-block');
      secBlock.append(
        el('h3', 'ff-sec-heading', sec.heading),
        el('p', 'ff-sec-copy', tier[sec.key])
      );
      body.append(secBlock);
    }

    const accuracyBox = el('div', 'ff-accuracy-box');
    accuracyBox.append(
      el('div', 'ff-sec-heading', 'HISTORICAL PRECISION NOTE'),
      el('p', 'ff-sec-note', ann.historicalAccuracyNote)
    );
    const sourceLink = el('a', 'ff-source-link', `NASA Source: ${ann.sourceLabel} ↗`);
    sourceLink.href = ann.sourceUrl;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    accuracyBox.append(sourceLink);
    body.append(accuracyBox);

    card.append(jumpRow, head, body);
    this.inspectorSlot.append(card);
  }

  private renderBottomDock(snap: ExplorerStateSnapshot): void {
    this.bottomDockSlot.replaceChildren();
    if (snap.mode !== 'investigate') {
      return;
    }

    const dock = el('div', 'ff-bottom-dock');
    const step = snap.currentStep;
    const total = snap.mission.timeline.length;

    // Step progress bar (1..6)
    const stepsStrip = el('div', 'ff-timeline-steps');
    snap.mission.timeline.forEach((item, idx) => {
      const isCurrent = idx === snap.timelineIndex;
      const isPast = idx < snap.timelineIndex;
      const stepBtn = el(
        'button',
        `ff-step-node ${isCurrent ? 'is-current' : ''} ${isPast ? 'is-past' : ''}`,
        `${item.stepNumber}. ${item.phaseLabel}`
      );
      stepBtn.type = 'button';
      stepBtn.addEventListener('click', () =>
        this.explorer.goToTimelineStep(idx)
      );
      stepsStrip.append(stepBtn);
    });

    // Active Step Summary + Distinction + Playback Controls
    const detailRow = el('div', 'ff-timeline-detail-row');

    const infoCol = el('div', 'ff-timeline-info');
    if (step) {
      const metaRow = el('div', 'ff-timeline-meta');
      metaRow.append(
        el(
          'span',
          'ff-mono-amber',
          `STEP ${step.stepNumber}/${total} · ${step.phaseLabel.toUpperCase()}`
        ),
        el('span', 'ff-mono-muted', step.timestamp),
        el(
          'span',
          `ff-distinction-label ${
            step.distinctionLabel === 'Historical Reconstruction'
              ? 'is-historical'
              : 'is-animation'
          }`,
          step.distinctionLabel
        )
      );

      const title = el('h3', 'ff-timeline-title', step.title);
      const summary = el(
        'p',
        'ff-timeline-summary',
        `${step.summary} Mechanism: ${step.scientificMechanism}`
      );
      const note = el('div', 'ff-timeline-note', step.distinctionNote);
      infoCol.append(metaRow, title, summary, note);
    }

    const ctrlCol = el('div', 'ff-timeline-ctrls');
    const prevBtn = el('button', 'ff-btn ff-btn-ghost ff-btn-sm', '◀ Prev');
    prevBtn.type = 'button';
    prevBtn.addEventListener('click', () => this.explorer.stepTimeline(-1));

    const playBtn = el(
      'button',
      'ff-btn ff-btn-primary ff-btn-sm',
      snap.timelinePlaying ? '⏸ Pause' : '▶ Auto-Play'
    );
    playBtn.type = 'button';
    playBtn.addEventListener('click', () =>
      this.explorer.setTimelinePlaying(!snap.timelinePlaying)
    );

    const nextBtn = el('button', 'ff-btn ff-btn-ghost ff-btn-sm', 'Next ▶');
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => this.explorer.stepTimeline(1));

    const upgradeBtn = el(
      'button',
      `ff-btn ff-btn-sm ${snap.showUpgradeComparison ? 'ff-btn-cyan-outline' : 'ff-btn-ghost'}`,
      snap.showUpgradeComparison ? '3D Upgrades: On' : '3D Upgrades'
    );
    upgradeBtn.type = 'button';
    upgradeBtn.addEventListener('click', () =>
      this.explorer.toggleUpgradeComparison()
    );

    const backBtn = el(
      'button',
      'ff-btn ff-btn-ghost ff-btn-sm',
      'Explore'
    );
    backBtn.type = 'button';
    backBtn.addEventListener('click', () => this.explorer.setMode('explore'));

    ctrlCol.append(prevBtn, playBtn, nextBtn, upgradeBtn, backBtn);
    detailRow.append(infoCol, ctrlCol);

    dock.append(stepsStrip, detailRow);
    this.bottomDockSlot.append(dock);
  }

  private renderSideFactsCard(snap: ExplorerStateSnapshot): void {
    const m = snap.mission;
    const card = el('div', 'ff-inspector-card');

    const jumpRow = el('div', 'ff-jump-row');
    const jumpLabel = el('span', 'ff-mono-amber', `EXITS IN ${snap.factsSecondsLeft}s`);
    const jumpBtns = el('div', 'ff-jump-btns');
    for (const item of m.annotations) {
      const b = el('button', 'ff-jump-btn', String(item.number));
      b.type = 'button';
      b.title = item.componentName;
      b.addEventListener('click', () => this.explorer.selectAnnotation(item.id));
      jumpBtns.append(b);
    }
    const factsActiveBtn = el(
      'button',
      'ff-jump-btn ff-jump-facts is-active',
      'Facts'
    );
    factsActiveBtn.type = 'button';
    factsActiveBtn.addEventListener('click', () => this.explorer.toggleFacts(false));
    jumpBtns.append(factsActiveBtn);

    const closeBtn = el('button', 'ff-close-btn', '×');
    closeBtn.type = 'button';
    closeBtn.ariaLabel = 'Close mission facts';
    closeBtn.addEventListener('click', () => this.explorer.toggleFacts(false));
    jumpRow.append(jumpLabel, jumpBtns, closeBtn);

    const head = el('div', 'ff-inspector-head');
    const kickerRow = el('div', 'ff-inspector-kicker-row');
    kickerRow.append(
      el('span', 'ff-mono-tag', m.missionDesignation),
      el('span', 'ff-mono-muted', m.dateLabel)
    );
    const title = el('h2', 'ff-inspector-title', m.name);

    const toggle3DBtn = el(
      'button',
      `ff-btn ff-btn-sm ${snap.showUpgradeComparison ? 'ff-btn-primary' : 'ff-btn-amber'}`,
      snap.showUpgradeComparison
        ? 'Showing Upgraded 3D Hardware'
        : 'Preview Upgrades in 3D Scene'
    );
    toggle3DBtn.type = 'button';
    toggle3DBtn.addEventListener('click', () => {
      this.explorer.toggleUpgradeComparison();
    });
    head.append(kickerRow, title, toggle3DBtn);

    const body = el('div', 'ff-inspector-body');
    const overviewBlock = el('section', 'ff-sec-block');
    overviewBlock.append(
      el('h3', 'ff-sec-heading', 'HISTORICAL OVERVIEW'),
      el('p', 'ff-sec-copy', m.overview)
    );

    const crewWrap = el('div', 'ff-crew-block');
    crewWrap.append(
      el('div', 'ff-sec-heading', 'CREW & AGENCY'),
      el('p', 'ff-sec-copy', `${m.agency} — ${m.crew.join(' · ')}`)
    );

    const compGrid = el('div', 'ff-comp-grid');
    for (const comp of m.comparisons) {
      const compCard = el('div', 'ff-comp-card');
      compCard.append(el('div', 'ff-comp-system', comp.system));

      const beforeCol = el('div', 'ff-comp-before');
      beforeCol.append(
        el('div', 'ff-mono-amber', 'BEFORE'),
        el('div', 'ff-comp-sub', comp.beforeTitle),
        el('p', 'ff-sec-note', comp.beforeSummary)
      );

      const afterCol = el('div', 'ff-comp-after');
      afterCol.append(
        el('div', 'ff-mono-cyan', 'AFTER'),
        el('div', 'ff-comp-sub', comp.afterTitle),
        el('p', 'ff-sec-note', comp.afterSummary)
      );

      compCard.append(
        beforeCol,
        afterCol,
        el('div', 'ff-comp-impact', `Impact: ${comp.engineeringImpact}`)
      );
      compGrid.append(compCard);
    }

    const src = el('a', 'ff-source-link', `Primary Source: ${m.historicalReferenceTitle} ↗`);
    src.href = m.historicalReferenceUrl;
    src.target = '_blank';
    src.rel = 'noopener noreferrer';

    body.append(overviewBlock, crewWrap, compGrid, src);
    card.append(jumpRow, head, body);
    this.inspectorSlot.append(card);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.boundOrientationCheck);
    window.removeEventListener('orientationchange', this.boundOrientationCheck);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('pointerdown', this.boundOutsidePointerDown);
    document.removeEventListener('fullscreenchange', this.boundFullscreenChange);
  }
}
