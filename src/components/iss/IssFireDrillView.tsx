import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
  Flame,
  Shield,
  RotateCcw,
  CheckCircle2,
  Pause,
  Play,
  LayoutDashboard,
  Gamepad2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Wind,
  Hand,
} from "lucide-react";
import { InteriorScene } from "./InteriorScene";
import type { Node3Interactable } from "./Node3Equipment";
import { goTo, input, sim } from "./input";
import { sound } from "../../utils/audio";
import {
  GROUP_LABEL,
  MODULES,
  START,
  getModule,
  mapShape,
  type Group,
  type ModuleId,
} from "./layout";

const GROUPS: Group[] = ["us", "intl", "ru"];

interface IssFireDrillViewProps {
  isFullScreen?: boolean;
  onExit?: () => void;
  onReturnToDashboard?: () => void;
}

export const IssFireDrillView: React.FC<IssFireDrillViewProps> = ({
  isFullScreen = false,
  onExit,
  onReturnToDashboard,
}) => {
  const [currentId, setCurrentId] = useState<ModuleId>(START);
  const [hudVisible, setHudVisible] = useState<boolean>(true);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      (navigator.maxTouchPoints ?? 0) > 0
    );
  });
  const [showPauseMenu, setShowPauseMenu] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [isNativeFs, setIsNativeFs] = useState<boolean>(
    Boolean(typeof document !== "undefined" && document.fullscreenElement)
  );

  // Emergency Fire Drill Simulation State
  const [health, setHealth] = useState<number>(100);
  const [flameActive, setFlameActive] = useState<boolean>(false);
  const [flameHealth, setFlameHealth] = useState<number>(100);
  const [flameExtinguished, setFlameExtinguished] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [oxygenSuppressed, setOxygenSuppressed] = useState<boolean>(false);
  const [hasO2Gear, setHasO2Gear] = useState<boolean>(false);
  const [hasCo2Extinguisher, setHasCo2Extinguisher] = useState<boolean>(false);
  const [isSprayingCo2, setIsSprayingCo2] = useState<boolean>(false);
  const [hoverTarget, setHoverTarget] = useState<Node3Interactable>(null);
  const [isDead, setIsDead] = useState<boolean>(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ignoreNextLockReleaseRef = useRef<boolean>(false);

  const oxygenSuppressedRef = useRef(oxygenSuppressed);
  oxygenSuppressedRef.current = oxygenSuppressed;
  const flameActiveRef = useRef(flameActive);
  flameActiveRef.current = flameActive;
  const flameHealthRef = useRef(flameHealth);
  flameHealthRef.current = flameHealth;
  const isDeadRef = useRef(isDead);
  isDeadRef.current = isDead;
  const hoverTargetRef = useRef(hoverTarget);
  hoverTargetRef.current = hoverTarget;
  const showPauseMenuRef = useRef(showPauseMenu);
  showPauseMenuRef.current = showPauseMenu;

  // Oxygen asphyxiation check when oxygen is suppressed without O2 gear
  useEffect(() => {
    if (!oxygenSuppressed || hasO2Gear || isDead) return;
    const interval = setInterval(() => {
      setHealth((prev) => {
        const next = prev - 45;
        if (next <= 0) {
          setIsDead(true);
          sound.playFlameDamage();
          return 0;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [oxygenSuppressed, hasO2Gear, isDead]);

  // Auto exit after death screen
  useEffect(() => {
    if (isDead) {
      sound.stopFireAlarmLoop();
      sound.stopSpray();
      setIsSprayingCo2(false);
      setShowPauseMenu(false);
      ignoreNextLockReleaseRef.current = true;
      if (document.pointerLockElement && document.exitPointerLock) {
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
      }
      const t = setTimeout(() => {
        onExit?.();
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [isDead, onExit]);

  const extinguishFlame = () => {
    flameActiveRef.current = false;
    flameHealthRef.current = 0;
    setFlameActive(false);
    setFlameHealth(0);
    setFlameExtinguished(true);
    setIsSprayingCo2(false);
    sound.stopFireAlarmLoop();
    sound.stopSpray();
    sound.playSuccess();
  };

  const handleSuppressO2 = () => {
    oxygenSuppressedRef.current = true;
    setOxygenSuppressed(true);
    sound.playHapticClick("heavy");
    if (flameActiveRef.current) {
      extinguishFlame();
    }
  };

  const handleEquipO2 = () => {
    setHasO2Gear(true);
    sound.playHapticClick("light");
  };

  const handleEquipCo2 = () => {
    setHasCo2Extinguisher(true);
    sound.playHapticClick("heavy");
  };

  const triggerHoverInteraction = () => {
    const t = hoverTargetRef.current;
    if (t === "suppressO2" && !oxygenSuppressedRef.current) {
      handleSuppressO2();
    } else if (t === "equipO2" && !hasO2Gear) {
      handleEquipO2();
    } else if (t === "equipCo2" && !hasCo2Extinguisher) {
      handleEquipCo2();
    }
  };

  const handleSprayHitFlame = (dt: number) => {
    if (!flameActiveRef.current || isDeadRef.current || showPauseMenuRef.current) return;
    const next = Math.max(0, flameHealthRef.current - dt * 75);
    flameHealthRef.current = next;
    setFlameHealth(next);
    if (next <= 0) {
      extinguishFlame();
    }
  };

  // Pause menu open/continue/dashboard handlers
  const openPauseMenu = () => {
    if (isDeadRef.current) return;
    sound.stopSpray();
    setIsSprayingCo2(false);
    clearThrust();
    if (document.pointerLockElement && document.exitPointerLock) {
      ignoreNextLockReleaseRef.current = true;
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    setShowPauseMenu(true);
  };

  const handleContinueOnWeb = () => {
    sound.playHapticClick("medium");
    setShowPauseMenu(false);
    const isTouchPrimary = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (!isTouchPrimary) {
      const canvas = rootRef.current?.querySelector("canvas");
      if (canvas && canvas.requestPointerLock) {
        try {
          canvas.requestPointerLock();
        } catch {
          // Safe fallback: continue playing without pointer lock
        }
      }
    }
  };

  const handleReturnDashboardAction = () => {
    ignoreNextLockReleaseRef.current = true;
    sound.stopFireAlarmLoop();
    sound.stopSpray();
    clearThrust();
    setShowPauseMenu(false);
    if (onReturnToDashboard) {
      onReturnToDashboard();
    } else {
      onExit?.();
    }
  };

  // CO2 Extinguisher spray controls (Hold Left Mouse, Hold F, or Hold Touch button when equipped)
  useEffect(() => {
    if (!hasCo2Extinguisher || isDead || showPauseMenu) {
      sound.stopSpray();
      setIsSprayingCo2(false);
      return;
    }

    const beginSpray = () => {
      setIsSprayingCo2(true);
      sound.startSpray();
    };

    const endSpray = () => {
      setIsSprayingCo2(false);
      sound.stopSpray();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, select, a, input, [role='button'], [data-no-look]")) return;
      if (hoverTargetRef.current) return;
      beginSpray();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) endSpray();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && !e.repeat && !hoverTargetRef.current) {
        beginSpray();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyF") {
        endSpray();
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", endSpray);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", endSpray);
      sound.stopSpray();
    };
  }, [hasCo2Extinguisher, isDead, showPauseMenu]);

  const scheduleFireBreakout = () => {
    if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
    fireTimerRef.current = setTimeout(() => {
      if (oxygenSuppressedRef.current || isDeadRef.current) return;
      flameActiveRef.current = true;
      flameHealthRef.current = 100;
      setFlameHealth(100);
      setFlameExtinguished(false);
      setFlameActive(true);
      setDamageFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setDamageFlash(false), 450);
      sound.startFireAlarmLoop();
    }, 2000);
  };

  // Drill Initialization, 2-Second Fire Breakout in Node 3, and ESC Pause UI handler
  useEffect(() => {
    goTo("destiny");
    setCurrentId("destiny");
    setHealth(100);
    setFlameActive(false);
    setFlameHealth(100);
    flameHealthRef.current = 100;
    setFlameExtinguished(false);

    scheduleFireBreakout();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDeadRef.current) return;
        e.preventDefault();
        if (showPauseMenuRef.current) {
          handleContinueOnWeb();
        } else {
          openPauseMenu();
        }
        return;
      }
      if ((e.key === "r" || e.key === "R") && !showPauseMenuRef.current) {
        handleRestart();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      window.removeEventListener("keydown", handleKey);
      sound.stopFireAlarmLoop();
      sound.stopSpray();
    };
  }, []);

  const handleFlameDamage = (dt: number) => {
    if (isDeadRef.current || showPauseMenuRef.current) return;
    setHealth((prev) => {
      const next = Math.max(0, prev - dt * 32);
      if (next <= 0 && !isDeadRef.current) {
        isDeadRef.current = true;
        setIsDead(true);
        sound.playFlameDamage();
      }
      return next;
    });
    sound.playFlameDamage();
    setDamageFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setDamageFlash(false), 200);
  };

  const handleRestart = () => {
    sound.playHapticLaunch();
    sound.stopFireAlarmLoop();
    sound.stopSpray();
    goTo("destiny");
    setCurrentId("destiny");
    setHealth(100);
    oxygenSuppressedRef.current = false;
    setOxygenSuppressed(false);
    setHasO2Gear(false);
    setHasCo2Extinguisher(false);
    setIsSprayingCo2(false);
    flameActiveRef.current = false;
    setFlameActive(false);
    flameHealthRef.current = 100;
    setFlameHealth(100);
    setFlameExtinguished(false);
    isDeadRef.current = false;
    setIsDead(false);
    setShowPauseMenu(false);
    setDamageFlash(false);
    scheduleFireBreakout();
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFs(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.debug("Native fullscreen toggle:", err);
    }
  };

  const currentMod = useMemo(() => getModule(currentId), [currentId]);
  const shapes = useMemo(() => MODULES.map((m) => mapShape(m)), []);

  const bounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of shapes) {
      if (s.kind === "rect") {
        minX = Math.min(minX, s.x);
        maxX = Math.max(maxX, s.x + s.w);
        minY = Math.min(minY, s.y);
        maxY = Math.max(maxY, s.y + s.h);
      } else {
        minX = Math.min(minX, s.cx - s.r, s.from.x);
        maxX = Math.max(maxX, s.cx + s.r, s.from.x);
        minY = Math.min(minY, s.cy - s.r, s.from.y);
        maxY = Math.max(maxY, s.cy + s.r, s.from.y);
      }
    }
    return { minX, maxX, minY, maxY };
  }, [shapes]);

  // Live 2D ISS mini-map updater driven by rAF reading sim.player directly
  useEffect(() => {
    if (!hudVisible) return;
    let raf = 0;

    const draw = () => {
      const canvas = mapCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;
          const pad = 12;
          const spanX = bounds.maxX - bounds.minX || 1;
          const spanY = bounds.maxY - bounds.minY || 1;
          const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
          const ox = (W - spanX * scale) / 2 - bounds.minX * scale;
          const oy = (H - spanY * scale) / 2 - bounds.minY * scale;

          const toPx = (wx: number, wy: number) => ({
            px: ox + wx * scale,
            py: oy + wy * scale,
          });

          ctx.clearRect(0, 0, W, H);

          for (const s of shapes) {
            if (s.kind === "circle") {
              const a = toPx(s.from.x, s.from.y);
              const b = toPx(s.cx, s.cy);
              ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(a.px, a.py);
              ctx.lineTo(b.px, b.py);
              ctx.stroke();
            }
          }

          for (const s of shapes) {
            const active = s.id === currentId;
            const mod = getModule(s.id);
            const fill = active
              ? "#0ea5e9"
              : mod.group === "ru"
              ? "#3b4738"
              : mod.group === "intl"
              ? "#293954"
              : "#1e293b";
            ctx.fillStyle = fill;
            ctx.strokeStyle = active ? "#bae6fd" : "#64748b";
            ctx.lineWidth = active ? 1.5 : 1;

            if (s.kind === "rect") {
              const p = toPx(s.x, s.y);
              ctx.fillRect(p.px, p.py, s.w * scale, s.h * scale);
              ctx.strokeRect(p.px, p.py, s.w * scale, s.h * scale);
            } else {
              const p = toPx(s.cx, s.cy);
              ctx.beginPath();
              ctx.arc(p.px, p.py, Math.max(3, s.r * scale), 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          }

          const playerPt = toPx(sim.player.z, sim.player.x);
          const dirWorldX = -Math.sin(sim.player.yaw);
          const dirWorldZ = -Math.cos(sim.player.yaw);
          const angle = Math.atan2(dirWorldX, dirWorldZ);

          ctx.save();
          ctx.translate(playerPt.px, playerPt.py);
          ctx.rotate(angle);
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.moveTo(6.5, 0);
          ctx.lineTo(-4, -3.5);
          ctx.lineTo(-2.5, 0);
          ctx.lineTo(-4, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          if (flameActive) {
            const flamePt = toPx(7.2, -4.8);
            const pulseR = 3.5 + Math.sin(Date.now() * 0.009) * 1.5;
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(flamePt.px, flamePt.py, pulseR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bounds, currentId, hudVisible, shapes, flameActive]);

  const handleMiniMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const pad = 12;
    const spanX = bounds.maxX - bounds.minX || 1;
    const spanY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min((canvas.width - pad * 2) / spanX, (canvas.height - pad * 2) / spanY);
    const ox = (canvas.width - spanX * scale) / 2 - bounds.minX * scale;
    const oy = (canvas.height - spanY * scale) / 2 - bounds.minY * scale;

    const wx = (clickX - ox) / scale;
    const wy = (clickY - oy) / scale;

    for (const s of shapes) {
      if (s.kind === "rect") {
        if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) {
          goTo(s.id);
          return;
        }
      } else {
        if (Math.hypot(wx - s.cx, wy - s.cy) <= Math.max(s.r, 0.8)) {
          goTo(s.id);
          return;
        }
      }
    }
  };

  const setThrust = (x: number, y: number, lift: number) => {
    input.stick.x = x;
    input.stick.y = y;
    input.lift = lift;
  };
  const clearThrust = () => {
    input.stick.x = 0;
    input.stick.y = 0;
    input.lift = 0;
  };

  const renderAlarmBanner = (compact: boolean) => {
    if (flameActive) {
      return (
        <div
          data-no-look="true"
          className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-red-950/95 border-2 border-red-500 text-white shadow-[0_0_28px_rgba(239,68,68,0.65)] backdrop-blur-md animate-pulse ${
            compact ? "w-full" : ""
          }`}
        >
          <div className="p-1.5 rounded-lg bg-red-600 text-white shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-widest text-red-300 uppercase font-bold">
                EMERGENCY FIRE ALARM
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            </div>
            <p className="font-display text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
              FLAME BROKE OUT IN NODE 3
            </p>
            <p className="text-[10px] text-red-200/90 font-mono leading-snug">
              {oxygenSuppressed
                ? "O2 suppressed"
                : "Suppress O2 (equip mask first) or spray CO2"}{" "}
              · {Math.ceil(flameHealth)}%
            </p>
          </div>
          <button
            type="button"
            onClick={() => goTo("tranquility")}
            className="px-2 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-[11px] font-mono font-bold text-white transition cursor-pointer border border-red-500/80 whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Flame className="w-3 h-3 text-cyan-300 animate-pulse" />
            <span>Node 3</span>
          </button>
        </div>
      );
    }

    if (flameExtinguished && !flameActive && !isDead) {
      return (
        <div
          data-no-look="true"
          className="pointer-events-none flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-950/95 border border-emerald-400 text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] backdrop-blur-md"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <div>
            <p className="font-mono text-xs font-bold text-emerald-200 tracking-wide">
              FLAME EXTINGUISHED IN NODE 3
            </p>
            <p className="text-[10px] font-mono text-emerald-300/85">
              Fire alarm stopped · Press R or Menu to reset
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={rootRef}
      data-scene-root="true"
      className={
        isFullScreen
          ? "relative w-full h-[100dvh] bg-black overflow-hidden select-none touch-none"
          : "relative w-full h-[calc(100dvh-3.5rem)] min-h-[520px] bg-black overflow-hidden select-none touch-none"
      }
    >
      {/* Full-bleed 3D ISS Interior Scene */}
      <InteriorScene
        onSection={setCurrentId}
        onContextLostChange={setContextLost}
        onPointerLockReleased={() => {
          if (ignoreNextLockReleaseRef.current) {
            ignoreNextLockReleaseRef.current = false;
            return;
          }
          if (!isDeadRef.current) {
            setShowPauseMenu(true);
            sound.stopSpray();
            setIsSprayingCo2(false);
          }
        }}
        flameActive={flameActive}
        flameIntensity={Math.max(0.2, flameHealth / 100)}
        onFlameDamage={handleFlameDamage}
        oxygenSuppressed={oxygenSuppressed}
        hasO2Gear={hasO2Gear}
        hasCo2Extinguisher={hasCo2Extinguisher}
        isSprayingCo2={isSprayingCo2}
        onSuppressO2={handleSuppressO2}
        onEquipO2={handleEquipO2}
        onEquipCo2={handleEquipCo2}
        onSprayHitFlame={handleSprayHitFlame}
        onHoverTarget={setHoverTarget}
      />

      {/* Slow Pop-Up "YOU DIED" Death Screen Overlay */}
      {isDead && (
        <div
          data-no-look="true"
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <div className="space-y-4 max-w-2xl animate-fade-in">
            <h1 className="text-6xl sm:text-8xl font-black text-red-600 tracking-widest drop-shadow-[0_0_50px_rgba(239,68,68,0.9)] animate-pulse transition-all duration-1000 transform scale-100">
              YOU DIED
            </h1>
            <p className="font-mono text-sm sm:text-base text-red-300 tracking-wider uppercase">
              {oxygenSuppressed && !hasO2Gear
                ? "Asphyxiation · Oxygen suppressed in Node 3 without O2 mask & cylinder equipped"
                : "Suit Integrity Failure · Fatal thermal exposure in Node 3"}
            </p>
            <div className="pt-6 font-mono text-xs text-slate-500">
              Exiting simulation automatically...
            </div>
          </div>
        </div>
      )}

      {/* ESC / PAUSE MENU OVERLAY (Continue on Web or Return to Dashboard) */}
      {showPauseMenu && !isDead && (
        <div
          data-no-look="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-[#070b18]/95 p-6 shadow-2xl space-y-5 text-center">
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/70 text-[10px] font-mono text-cyan-300 uppercase tracking-widest">
                Simulation Paused
              </span>
              <h3 className="text-xl font-display font-bold text-white pt-1">
                ISS Fire Drill Menu
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Press ESC or tap Continue to resume on web
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleContinueOnWeb}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Continue on Web</span>
              </button>

              <button
                type="button"
                onClick={handleReturnDashboardAction}
                className="w-full py-3 px-4 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-500/60 text-amber-200 hover:text-white font-mono font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-300" />
                <span>Return to Dashboard</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  sound.playHapticClick("light");
                  setHudVisible((v) => !v);
                }}
                className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {hudVisible ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{hudVisible ? "Hide HUD" : "Show HUD"}</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restart Drill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Red Thermal Damage Flash Vignette */}
      {damageFlash && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-red-600/30 border-[12px] border-red-500/80 shadow-[inset_0_0_140px_rgba(239,68,68,0.85)] animate-pulse" />
      )}

      {/* TOP-LEFT HUD STACK (Module Header + Fire Banner on <xl screens so nothing overlaps) */}
      {hudVisible && (
        <div
          data-no-look="true"
          className="pointer-events-none absolute top-3 left-3 z-20 flex flex-col gap-2 items-start max-w-[min(290px,calc(100vw-11.5rem))] sm:max-w-sm"
        >
          <div className="pointer-events-auto border border-slate-700/80 bg-[#070b18]/90 px-3 py-2.5 shadow-lg rounded-xl w-full">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>{GROUP_LABEL[currentMod.group]}</span>
              <span aria-hidden="true">·</span>
              <span>ISS Interior</span>
            </div>
            <h2 className="mt-0.5 text-sm sm:text-base font-semibold tracking-tight text-white truncate">
              {currentMod.name}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-300 line-clamp-1">
              {currentMod.detail}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => goTo("cupola")}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono border rounded transition cursor-pointer whitespace-nowrap shrink-0 ${
                  currentId === "cupola"
                    ? "border-cyan-400 bg-cyan-950 text-cyan-200"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Cupola View</span>
              </button>
              <button
                type="button"
                onClick={() => goTo(START)}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono border rounded transition cursor-pointer whitespace-nowrap shrink-0 ${
                  currentId === START
                    ? "border-cyan-400 bg-cyan-950 text-cyan-200"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60 hover:text-white"
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Destiny Lab</span>
              </button>
              {flameActive && (
                <button
                  type="button"
                  onClick={() => goTo("tranquility")}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono border rounded transition cursor-pointer whitespace-nowrap shrink-0 ${
                    currentId === "tranquility"
                      ? "border-red-400 bg-red-950 text-red-200"
                      : "border-red-600/70 bg-red-950/60 text-red-300 hover:border-red-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Node 3 Fire</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile/Tablet/Compact desktop banner stacked cleanly below module header */}
          <div className="xl:hidden w-full">{renderAlarmBanner(true)}</div>
        </div>
      )}

      {/* Wide Desktop Center Fire / Extinguished Banner */}
      {hudVisible && (flameActive || (flameExtinguished && !flameActive && !isDead)) && (
        <div
          data-no-look="true"
          className="hidden xl:block pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-md w-auto"
        >
          {renderAlarmBanner(false)}
        </div>
      )}

      {/* TOP-RIGHT ACTION BAR + COLLAPSIBLE TELEMETRY STACK */}
      <div
        data-no-look="true"
        className="pointer-events-none absolute top-3 right-3 z-30 flex flex-col items-end gap-2"
      >
        {/* Always-accessible minimal top-right controls (Hide/Show HUD, Touch Pad, Fullscreen, Pause Menu) */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              sound.playHapticClick("light");
              setHudVisible((v) => !v);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-[#070b18]/90 text-[11px] font-mono text-slate-200 hover:text-white hover:border-cyan-400 transition cursor-pointer shadow-lg"
            title={hudVisible ? "Hide HUD panels for clean view" : "Show HUD panels"}
          >
            {hudVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hide HUD</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Show HUD</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playHapticClick("light");
              setShowTouchControls((v) => !v);
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-mono transition cursor-pointer shadow-lg ${
              showTouchControls
                ? "border-cyan-500/70 bg-cyan-950/85 text-cyan-200"
                : "border-slate-700/80 bg-[#070b18]/90 text-slate-300 hover:text-white"
            }`}
            title="Toggle on-screen touch movement & action controls"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Touch</span>
          </button>

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-[#070b18]/90 text-[11px] font-mono text-slate-300 hover:text-white hover:border-cyan-400 transition cursor-pointer shadow-lg"
            title={isNativeFs ? "Exit Native Fullscreen" : "Enter Native Fullscreen"}
          >
            {isNativeFs ? (
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>

          <button
            type="button"
            onClick={openPauseMenu}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-600/70 bg-amber-950/85 text-[11px] font-mono text-amber-200 hover:bg-amber-900 hover:text-white transition cursor-pointer shadow-lg"
            title="Open Pause Menu (ESC)"
          >
            <Pause className="w-3.5 h-3.5 text-amber-300" />
            <span>Menu</span>
          </button>
        </div>

        {/* Player Suit Health Bar (Hidden when Hide HUD is active) */}
        {hudVisible && (
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 bg-[#070b18]/90 border border-slate-700/80 px-3 py-2 rounded-xl shadow-xl w-[170px] sm:w-[225px]">
            <div className="flex items-center justify-between w-full text-[11px] font-mono">
              <span className="text-slate-300 flex items-center gap-1 font-semibold">
                <Shield
                  className={`w-3.5 h-3.5 ${
                    health < 35
                      ? "text-red-400 animate-pulse"
                      : health < 70
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                />
                <span>Suit</span>
              </span>
              <span
                className={`font-bold ${
                  health < 35
                    ? "text-red-400"
                    : health < 70
                    ? "text-amber-300"
                    : "text-emerald-400"
                }`}
              >
                {Math.round(health)}%
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
              <div
                className={`h-full transition-all duration-150 ${
                  health < 35
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                    : health < 70
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                }`}
                style={{ width: `${health}%` }}
              />
            </div>

            {health <= 0 ? (
              <button
                type="button"
                onClick={handleRestart}
                className="mt-0.5 w-full py-1 text-center font-mono text-[10px] font-bold uppercase rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer transition shadow flex items-center justify-center gap-1 animate-pulse"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restart Drill</span>
              </button>
            ) : (
              <div className="flex items-center justify-between w-full text-[9px] sm:text-[10px] font-mono text-slate-400">
                <span>Thermal:</span>
                <span className={health < 100 ? "text-red-400 font-semibold" : "text-slate-500"}>
                  {health < 100 ? "DAMAGE" : "SAFE"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Node 3 O2 Suppression & Equipment Status Card (Hidden when Hide HUD is active) */}
        {hudVisible && (
          <div className="pointer-events-none flex flex-col items-end gap-1 bg-[#070b18]/90 border border-slate-700/80 px-3 py-2 rounded-xl shadow-xl w-[185px] sm:w-[242px]">
            <div className="flex items-center justify-between w-full text-[10px] sm:text-xs font-mono">
              <span className="text-slate-300 font-semibold">Node 3 O2:</span>
              <span
                className={
                  oxygenSuppressed
                    ? "text-red-400 font-bold animate-pulse"
                    : "text-emerald-400 font-bold"
                }
              >
                {oxygenSuppressed ? "SUPPRESSED" : "NORMAL"}
              </span>
            </div>
            <div className="flex items-center justify-between w-full text-[10px] sm:text-xs font-mono">
              <span className="text-slate-300 font-semibold">O2 Mask:</span>
              <span className={hasO2Gear ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {hasO2Gear ? "EQUIPPED" : "UNEQUIPPED"}
              </span>
            </div>
            <div className="flex items-center justify-between w-full text-[10px] sm:text-xs font-mono">
              <span className="text-slate-300 font-semibold">CO2 Ext:</span>
              <span
                className={
                  hasCo2Extinguisher ? "text-cyan-300 font-bold" : "text-slate-400 font-bold"
                }
              >
                {hasCo2Extinguisher ? (isSprayingCo2 ? "SPRAYING" : "EQUIPPED") : "ON WALL"}
              </span>
            </div>
            {flameActive && (
              <div className="w-full pt-0.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300 mb-0.5">
                  <span>Flame</span>
                  <span>{Math.ceil(flameHealth)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, flameHealth))}%` }}
                  />
                </div>
              </div>
            )}
            <p className="hidden sm:block text-[9px] font-mono text-slate-400 text-right pt-1 border-t border-slate-800 w-full">
              {hasCo2Extinguisher && flameActive
                ? "Aim at flame & hold Click/F to spray"
                : "Aim at Node 3 wall gear & Click or F"}
            </p>
          </div>
        )}
      </div>

      {/* Center Crosshair Interaction / Spray Prompt (Always active & tappable on phone!) */}
      {!isDead && !showPauseMenu && (hoverTarget || (hasCo2Extinguisher && flameActive)) && (
        <div
          data-no-look="true"
          className="absolute top-[56%] left-1/2 -translate-x-1/2 z-20"
        >
          {hoverTarget ? (
            <button
              type="button"
              onClick={triggerHoverInteraction}
              className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-[#070b18]/95 border border-cyan-400/80 text-[11px] font-mono text-cyan-200 hover:bg-cyan-950 whitespace-nowrap shadow-lg cursor-pointer active:scale-95 transition"
            >
              {hoverTarget === "suppressO2" && "[TAP / CLICK / F] Suppress Node 3 O2"}
              {hoverTarget === "equipO2" && "[TAP / CLICK / F] Equip O2 Mask & Cylinder"}
              {hoverTarget === "equipCo2" && "[TAP / CLICK / F] Equip CO2 Extinguisher"}
            </button>
          ) : (
            <div className="pointer-events-none px-3 py-1 rounded bg-[#070b18]/90 border border-cyan-500/60 text-[11px] font-mono text-cyan-200 whitespace-nowrap shadow-lg">
              {isSprayingCo2
                ? `Spraying CO2 · Flame ${Math.ceil(flameHealth)}%`
                : "[HOLD CLICK / F] Spray CO2 at Flame"}
            </div>
          )}
        </div>
      )}

      {/* STANDARD FIRST-PERSON CROSSHAIR */}
      {!showPauseMenu && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center">
          <div className="relative w-8 h-8 rounded-full border border-cyan-400/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.95)]" />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-cyan-300/80" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-cyan-300/80" />
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-0.5 w-1.5 bg-cyan-300/80" />
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-0.5 w-1.5 bg-cyan-300/80" />
          </div>
        </div>
      )}

      {/* MOBILE / TOUCH ON-SCREEN THRUSTER PAD & ACTION BUTTONS */}
      {showTouchControls && !isDead && !showPauseMenu && (
        <>
          {/* Bottom-Left Zero-G Movement D-Pad */}
          <div
            data-no-look="true"
            className="pointer-events-none absolute bottom-5 left-4 z-30 grid grid-cols-3 gap-1.5 w-[136px]"
          >
            <div />
            <button
              type="button"
              aria-label="Float Forward"
              onPointerDown={(e) => {
                e.stopPropagation();
                setThrust(0, 1, 0);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                clearThrust();
              }}
              onPointerCancel={clearThrust}
              onPointerLeave={clearThrust}
              className="pointer-events-auto h-11 rounded-xl bg-[#070b18]/80 border border-slate-600/80 active:border-cyan-400 active:bg-cyan-950/90 text-slate-200 flex items-center justify-center shadow-lg touch-none"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />

            <button
              type="button"
              aria-label="Float Left"
              onPointerDown={(e) => {
                e.stopPropagation();
                setThrust(-1, 0, 0);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                clearThrust();
              }}
              onPointerCancel={clearThrust}
              onPointerLeave={clearThrust}
              className="pointer-events-auto h-11 rounded-xl bg-[#070b18]/80 border border-slate-600/80 active:border-cyan-400 active:bg-cyan-950/90 text-slate-200 flex items-center justify-center shadow-lg touch-none"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              aria-label="Float Backward"
              onPointerDown={(e) => {
                e.stopPropagation();
                setThrust(0, -1, 0);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                clearThrust();
              }}
              onPointerCancel={clearThrust}
              onPointerLeave={clearThrust}
              className="pointer-events-auto h-11 rounded-xl bg-[#070b18]/80 border border-slate-600/80 active:border-cyan-400 active:bg-cyan-950/90 text-slate-200 flex items-center justify-center shadow-lg touch-none"
            >
              <ArrowDown className="w-5 h-5" />
            </button>

            <button
              type="button"
              aria-label="Float Right"
              onPointerDown={(e) => {
                e.stopPropagation();
                setThrust(1, 0, 0);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                clearThrust();
              }}
              onPointerCancel={clearThrust}
              onPointerLeave={clearThrust}
              className="pointer-events-auto h-11 rounded-xl bg-[#070b18]/80 border border-slate-600/80 active:border-cyan-400 active:bg-cyan-950/90 text-slate-200 flex items-center justify-center shadow-lg touch-none"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom-Right Vertical Lift & Interact / Spray CO2 Controls */}
          <div
            data-no-look="true"
            className="pointer-events-none absolute bottom-5 right-4 z-30 flex flex-col items-end gap-2"
          >
            {hoverTarget && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHoverInteraction();
                }}
                className="pointer-events-auto px-3.5 py-2.5 rounded-xl bg-cyan-600/95 active:bg-cyan-500 border border-cyan-300 text-white font-mono text-xs font-bold shadow-xl flex items-center gap-1.5"
              >
                <Hand className="w-4 h-4" />
                <span>
                  {hoverTarget === "suppressO2"
                    ? "Suppress O2"
                    : hoverTarget === "equipO2"
                    ? "Equip O2"
                    : "Equip CO2"}
                </span>
              </button>
            )}

            {hasCo2Extinguisher && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsSprayingCo2(true);
                  sound.startSpray();
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  setIsSprayingCo2(false);
                  sound.stopSpray();
                }}
                onPointerCancel={() => {
                  setIsSprayingCo2(false);
                  sound.stopSpray();
                }}
                onPointerLeave={() => {
                  setIsSprayingCo2(false);
                  sound.stopSpray();
                }}
                className={`pointer-events-auto px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold shadow-xl flex items-center gap-1.5 touch-none ${
                  isSprayingCo2
                    ? "bg-cyan-500 border-white text-slate-950"
                    : "bg-red-600/90 border-red-300 text-white"
                }`}
              >
                <Wind className="w-4 h-4" />
                <span>{isSprayingCo2 ? "SPRAYING..." : "HOLD SPRAY CO2"}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Float Up"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setThrust(0, 0, 1);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  clearThrust();
                }}
                onPointerCancel={clearThrust}
                onPointerLeave={clearThrust}
                className="pointer-events-auto px-3 h-11 rounded-xl bg-[#070b18]/80 border border-slate-600/80 active:border-cyan-400 active:bg-cyan-950/90 text-[11px] font-mono font-bold text-slate-200 shadow-lg touch-none"
              >
                UP
              </button>
              <button
                type="button"
                aria-label="Float Down"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setThrust(0, 0, -1);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  clearThrust();
                }}
                onPointerCancel={clearThrust}
                onPointerLeave={clearThrust}
                className="pointer-events-auto px-3 h-11 rounded-xl bg-[#070b18]/80 border border-slate-600/80 active:border-cyan-400 active:bg-cyan-950/90 text-[11px] font-mono font-bold text-slate-200 shadow-lg touch-none"
              >
                DN
              </button>
            </div>
          </div>
        </>
      )}

      {/* WebGL Context Lost Notice */}
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85">
          <div className="max-w-sm border border-slate-700 bg-[#0b1222] px-5 py-4 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-amber-300">
              WebGL Context Interrupted
            </p>
            <p className="mt-1.5 text-xs text-slate-300">
              The browser paused the 3D renderer. Restoring station viewport automatically.
            </p>
          </div>
        </div>
      )}

      {/* Bottom-Right Interactive 2D ISS Schematic Mini-Map (Only when HUD visible & not overlapping touch controls) */}
      {hudVisible && !showTouchControls && (
        <div
          data-no-look="true"
          className="pointer-events-auto hidden md:block absolute bottom-4 right-4 z-10 border border-slate-700/80 bg-[#070b18]/90 p-2.5 shadow-lg rounded-xl"
        >
          <div className="mb-1 flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>Station Schematic (18 Modules)</span>
            <span>Click to jump</span>
          </div>
          <canvas
            ref={mapCanvasRef}
            width={280}
            height={118}
            onClick={handleMiniMapClick}
            className="block cursor-pointer rounded bg-[#040812] border border-slate-800/80"
            title="Click any ISS module to float directly there"
          />
        </div>
      )}

      {/* Bottom-Center Collapsible Control Dock (Hidden when Hide HUD is active) */}
      {hudVisible && (
        <div
          data-no-look="true"
          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 max-w-[min(640px,92vw)]"
        >
          <div className="pointer-events-auto hidden sm:flex flex-wrap items-center justify-center gap-2.5 border border-slate-700/80 bg-[#070b18]/90 px-3.5 py-2 shadow-xl rounded-xl">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">Module</span>
              <select
                value={currentId}
                onChange={(e) => goTo(e.target.value)}
                aria-label="Jump to ISS module"
                className="bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 rounded"
              >
                {GROUPS.map((grp) => (
                  <optgroup key={grp} label={GROUP_LABEL[grp]}>
                    {MODULES.filter((m) => m.group === grp).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="hidden md:block h-4 w-[1px] bg-slate-700" />

            <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
              Mouse / Touch: Look · WASD: Float · Space/Q: Lift · ESC: Menu
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Left First-Person Mouse Status Indicator (Hidden on small mobile & when HUD hidden) */}
      {hudVisible && !showTouchControls && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800/80 bg-[#070b18]/85 text-[11px] font-mono text-slate-300 backdrop-blur-sm shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>FPS Mouse Look Active · Click to lock pointer · ESC for Menu</span>
        </div>
      )}
    </div>
  );
};
