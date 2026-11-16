import React, { useEffect, useRef } from 'react';
import * as xb from 'xrblocks';
import '../../vr/vr.css';
import { InvestigationHUD } from '../../vr/ui/InvestigationHUD';
import { gatherDeviceInfo } from '../../vr/utils/deviceDetection';
import {
  ExplorerStateSnapshot,
  FlameFragsExplorerScript,
} from '../../vr/xr/FlameFragsExplorerScript';

interface VrExplorerOverlayProps {
  onClose: () => void;
}

interface VrSingletonRuntime {
  hostEl: HTMLDivElement;
  canvasEl: HTMLCanvasElement;
  hudRootEl: HTMLDivElement;
  explorer: FlameFragsExplorerScript;
  hud: InvestigationHUD | null;
  initStarted: boolean;
  onExitCallback: () => void;
}

let runtime: VrSingletonRuntime | null = null;

async function ensureVrRuntime(onExit: () => void): Promise<VrSingletonRuntime> {
  if (runtime) {
    runtime.onExitCallback = onExit;
    runtime.hostEl.style.display = 'block';
    runtime.explorer.setSuspended(false);
    runtime.hud?.setSuspended(false);
    runtime.hud?.showPortal();
    if (xb.core.lifecycle === 'running') {
      xb.core.resume();
    }
    window.dispatchEvent(new Event('resize'));
    return runtime;
  }

  const hostEl = document.createElement('div');
  hostEl.className = 'ff-vr-host';

  const canvasEl = document.createElement('canvas');
  canvasEl.className = 'ff-vr-canvas';

  const hudRootEl = document.createElement('div');
  hudRootEl.className = 'ff-vr-hud-root';

  hostEl.append(canvasEl, hudRootEl);
  document.body.appendChild(hostEl);

  const state: VrSingletonRuntime = {
    hostEl,
    canvasEl,
    hudRootEl,
    explorer: null as unknown as FlameFragsExplorerScript,
    hud: null,
    initStarted: true,
    onExitCallback: onExit,
  };
  runtime = state;

  const deviceInfo = await gatherDeviceInfo();

  const explorer = new FlameFragsExplorerScript(
    (snapshot: ExplorerStateSnapshot) => {
      state.hud?.updateSnapshot(snapshot);
    },
    (message: string) => {
      state.hud?.showError(message);
    }
  );
  state.explorer = explorer;

  const hud = new InvestigationHUD(hudRootEl, explorer, deviceInfo, () => {
    state.onExitCallback();
  });
  state.hud = hud;

  const options = new xb.Options();
  options.canvas = canvasEl;
  options.enableVR();
  options.enableControllers();
  options.enableHands();
  options.enableReticles();
  options.referenceSpaceType = 'local-floor';
  options.framebufferScaleFactor = 1.0;
  options.controllers.visualizeRays = true;
  options.xrButton.enabled = false;
  options.enableSimulator = false;
  options.camera.near = 0.04;
  options.camera.far = 250;
  options.setAppTitle('FlameFrags – Historical VR Explorer');
  options.setAppDescription(
    'Interactive 3D & WebXR scientific investigation of Apollo 1 (1967), Apollo 13 (1970), and Mir (1997).'
  );

  try {
    xb.add(explorer);
    await xb.init(options);
    hud.markReady(explorer.getSnapshot());
    if (state.hostEl.style.display === 'none') {
      explorer.setSuspended(true);
      hud.setSuspended(true);
      if (xb.core.lifecycle === 'running') {
        xb.core.pause();
      }
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : 'Unable to start 3D WebGL / WebXR renderer.';
    hud.showError(msg);
  }

  return state;
}

function suspendVrRuntime(): void {
  if (!runtime) return;
  runtime.explorer?.setSuspended(true);
  runtime.hud?.setSuspended(true);
  if (xb.core.lifecycle === 'running') {
    xb.core.pause();
  }
  runtime.hostEl.style.display = 'none';
}

export const VrExplorerOverlay: React.FC<VrExplorerOverlayProps> = ({
  onClose,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let active = true;
    void ensureVrRuntime(() => {
      if (active) {
        onCloseRef.current();
      }
    });

    return () => {
      active = false;
      suspendVrRuntime();
    };
  }, []);

  return null;
};
