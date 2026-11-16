import { DeviceType, XRModeStatus } from '../types.ts';

export interface DeviceEnvironmentInfo {
  deviceType: DeviceType;
  isTouchCapable: boolean;
  isLandscape: boolean;
  isEmbeddedIframe: boolean;
  isDedicatedXRHeadset: boolean;
  webXRSupported: boolean;
  hasDeviceOrientationAPI: boolean;
  requiresIOSOrientationPermission: boolean;
  canLockOrientation: boolean;
  canFullscreen: boolean;
  xrModeStatus: XRModeStatus;
}

export function detectEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function detectDedicatedXRHeadset(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Quest|OculusBrowser|Oculus|Pico|Vive|Android XR|Wolvic|Reality|VisionOS/i.test(
    ua
  );
}

export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const maxTouch = navigator.maxTouchPoints ?? 0;
  const minDim = Math.min(window.innerWidth, window.innerHeight);

  const isIPad =
    /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  const isPhoneUA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua);

  if (isIPad || isAndroidTablet || (hasCoarsePointer && minDim >= 600 && minDim < 1024)) {
    return 'tablet';
  }
  if (isPhoneUA || (hasCoarsePointer && minDim < 600)) {
    return 'mobile';
  }
  return 'desktop';
}

export function isViewportLandscape(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= window.innerHeight;
}

export async function checkWebXRVRSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
    return false;
  }
  try {
    return await navigator.xr.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}

export function checkDeviceOrientationSupport(): {
  supported: boolean;
  needsPermission: boolean;
} {
  if (typeof window === 'undefined') {
    return { supported: false, needsPermission: false };
  }
  const hasAPI = 'DeviceOrientationEvent' in window;
  const doe = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      })
    | undefined;
  const needsPermission = typeof doe?.requestPermission === 'function';
  return { supported: hasAPI, needsPermission };
}

export async function gatherDeviceInfo(): Promise<DeviceEnvironmentInfo> {
  const deviceType = detectDeviceType();
  const isEmbeddedIframe = detectEmbeddedIframe();
  const isDedicatedXRHeadset = detectDedicatedXRHeadset();
  const isTouchCapable =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0);
  const isLandscape = isViewportLandscape();
  const webXRSupported = await checkWebXRVRSupport();
  const orientationSupport = checkDeviceOrientationSupport();
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
  };
  const canLockOrientation = typeof orientation?.lock === 'function';
  const canFullscreen =
    typeof document !== 'undefined' &&
    Boolean(document.documentElement.requestFullscreen);

  let xrModeStatus: XRModeStatus = 'desktop-3d';
  if (webXRSupported) {
    xrModeStatus = 'webxr-supported';
  } else if (deviceType !== 'desktop') {
    xrModeStatus = orientationSupport.supported
      ? 'mobile-gyro-ready'
      : 'mobile-touch-3d';
  }

  return {
    deviceType,
    isTouchCapable,
    isLandscape,
    isEmbeddedIframe,
    isDedicatedXRHeadset,
    webXRSupported,
    hasDeviceOrientationAPI: orientationSupport.supported,
    requiresIOSOrientationPermission: orientationSupport.needsPermission,
    canLockOrientation,
    canFullscreen,
    xrModeStatus,
  };
}

export interface LandscapeLockResult {
  locked: boolean;
  fullscreenEntered: boolean;
  reason?: string;
}

/**
 * Only attempts fullscreen/landscape lock when running top-level (never inside embedded iframes
 * where fullscreen transitions can collapse mobile host views).
 */
export async function requestMobileLandscapeMode(): Promise<LandscapeLockResult> {
  if (detectEmbeddedIframe()) {
    return {
      locked: false,
      fullscreenEntered: false,
      reason: 'Skipped fullscreen inside embedded preview frame',
    };
  }

  let fullscreenEntered = false;
  let locked = false;

  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      fullscreenEntered = true;
    }
  } catch {
    fullscreenEntered = false;
  }

  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (typeof orientation?.lock === 'function') {
      await orientation.lock('landscape');
      locked = true;
    }
  } catch (error) {
    return {
      locked: false,
      fullscreenEntered,
      reason: error instanceof Error ? error.message : 'Orientation lock unsupported',
    };
  }

  return { locked, fullscreenEntered };
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenElement);
}

/**
 * Safely requests browser fullscreen with navigationUI hidden (when supported)
 * without forcing screen.orientation.lock, preventing mobile host tab switches.
 */
export async function requestSafeFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (document.fullscreenElement) return true;
  const root = document.documentElement;
  if (!root?.requestFullscreen) return false;
  if (document.fullscreenEnabled === false) return false;

  try {
    await root.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    return Boolean(document.fullscreenElement);
  } catch {
    try {
      await root.requestFullscreen();
      return Boolean(document.fullscreenElement);
    } catch {
      return false;
    }
  }
}

export async function exitSafeFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    // Ignore fullscreen exit failure
  }
}

export async function restoreOrientationAndExitFullscreen(): Promise<void> {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };
    if (typeof orientation?.unlock === 'function') {
      orientation.unlock();
    }
  } catch {
    // Ignore unsupported unlock
  }

  await exitSafeFullscreen();
}

export async function requestDeviceOrientationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return false;
  }
  const doe = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof doe.requestPermission === 'function') {
    try {
      const result = await doe.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}
