import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import flameFragsLogo from '../assets/flamefrags-logo.png';

interface BootSplashProps {
  onReveal?: () => void;
  onComplete: () => void;
}

type BootPhase = 'loading' | 'title' | 'exit';

const LOADING_DURATION_MS = 3000;
const LETTER_STAGGER_MS = 140;
const TITLE_HOLD_AFTER_LETTERS_MS = 1150;
const EXIT_FADE_MS = 550;
const BRAND_CHARS = 'FlameFrags'.split('');

const LOADING_STAGES = [
  { at: 0, text: 'Initializing orbital telemetry...' },
  { at: 32, text: 'Calibrating microgravity combustion models...' },
  { at: 66, text: 'Syncing NASA PSI datasets & ISS Node 3...' },
  { at: 92, text: 'Ready for ignition sequence...' },
];

export const BootSplash: React.FC<BootSplashProps> = ({ onReveal, onComplete }) => {
  const [phase, setPhase] = useState<BootPhase>('loading');
  const [progress, setProgress] = useState<number>(0);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const completedRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  const onCompleteRef = useRef(onComplete);
  onRevealRef.current = onReveal;
  onCompleteRef.current = onComplete;

  const finishImmediately = () => {
    if (!canSkip || completedRef.current) return;
    completedRef.current = true;
    onRevealRef.current?.();
    setPhase('exit');
    window.setTimeout(() => {
      onCompleteRef.current();
    }, EXIT_FADE_MS);
  };

  useEffect(() => {
    const skipGuardTimer = window.setTimeout(() => {
      setCanSkip(true);
    }, 550);

    const start = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.max(0, Date.now() - start);
      const pct = Math.min(100, (elapsed / LOADING_DURATION_MS) * 100);
      setProgress(pct);
      if (elapsed >= LOADING_DURATION_MS) {
        window.clearInterval(timer);
        setProgress(100);
        setPhase('title');
      }
    }, 25);

    return () => {
      window.clearTimeout(skipGuardTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'title') return;

    const totalTitleTime =
      BRAND_CHARS.length * LETTER_STAGGER_MS + TITLE_HOLD_AFTER_LETTERS_MS;

    const exitTimer = window.setTimeout(() => {
      onRevealRef.current?.();
      setPhase('exit');
    }, totalTitleTime);

    const doneTimer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    }, totalTitleTime + EXIT_FADE_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  const activeStageText =
    [...LOADING_STAGES].reverse().find((s) => progress >= s.at)?.text ??
    LOADING_STAGES[0]!.text;

  const overlay = (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading FlameFrags application"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none ${
        phase === 'loading' ? 'bg-[#04070f]' : 'bg-black'
      } ${
        phase === 'exit'
          ? 'opacity-0 pointer-events-none transition-opacity duration-500'
          : 'opacity-100'
      }`}
    >
      {/* Stage 1: 3-second orbital loading screen */}
      {phase === 'loading' && (
        <div className="w-full max-w-md px-6 flex flex-col items-center text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="w-28 h-28 rounded-full border border-slate-800/90 flex items-center justify-center relative">
              <svg
                className="w-28 h-28 -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="rgba(30, 41, 59, 0.7)"
                  strokeWidth="3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="url(#bootRingGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={276.46}
                  strokeDashoffset={276.46 * (1 - progress / 100)}
                />
                <defs>
                  <linearGradient id="bootRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <img
                src={flameFragsLogo}
                alt="FlameFrags"
                className="absolute w-16 h-16 object-contain drop-shadow-[0_0_14px_rgba(249,115,22,0.5)]"
              />
            </div>
          </div>

          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="truncate pr-3">{activeStageText}</span>
              <span className="tabular-nums text-orange-400 font-semibold shrink-0">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/90">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-orange-500 to-red-500 transition-[width] duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stage 2: Pure black screen with FlameFrags revealing letter by letter in orange & red */}
      {phase !== 'loading' && (
        <div className="relative flex flex-col items-center justify-center px-4 text-center">
          {/* Subtle warm ember aura underneath letters on black */}
          <div
            aria-hidden="true"
            className="absolute w-[340px] sm:w-[520px] h-[140px] bg-gradient-to-r from-orange-600/20 via-red-600/25 to-orange-600/20 blur-3xl rounded-full pointer-events-none"
          />

          <h1
            aria-label="FlameFrags"
            className="relative font-display font-bold tracking-wider leading-none flex items-baseline justify-center"
            style={{ fontSize: 'clamp(2.85rem, 11vw, 6.5rem)' }}
          >
            {BRAND_CHARS.map((char, idx) => (
              <span
                key={`${char}-${idx}`}
                className={`flame-letter ${idx >= 5 ? 'flame-letter-frags' : ''}`}
                style={{ animationDelay: `${idx * LETTER_STAGGER_MS}ms` }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>
      )}

      {/* Quiet skip affordance (enabled after brief guard so stray launch clicks never skip) */}
      {canSkip && (
        <button
          type="button"
          onClick={finishImmediately}
          className="fixed bottom-6 right-6 min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-mono text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
        >
          Skip
        </button>
      )}
    </div>
  );

  if (typeof document === 'undefined') return overlay;
  return createPortal(overlay, document.body);
};
