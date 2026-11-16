// Synthesized space station audio effects via Web Audio API

class SoundSystem {
  private ctx: AudioContext | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private sprayNode: AudioBufferSourceNode | null = null;
  private sprayGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.6;

  private initContext() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore AudioContext restriction errors
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopStationHum();
      this.stopSpray();
      this.stopFireAlarmLoop();
    } else {
      this.startStationHum();
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public startStationHum() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || this.humOsc) return;

    try {
      this.humOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.humGain = this.ctx.createGain();

      this.humOsc.type = 'sawtooth';
      this.humOsc.frequency.setValueAtTime(68, this.ctx.currentTime); // Low air circulation hum

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.humGain.gain.setValueAtTime(0.04 * this.volume, this.ctx.currentTime);

      this.humOsc.connect(filter);
      filter.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);
      this.humOsc.start();
    } catch {
      // Audio context might need user interaction
    }
  }

  public stopStationHum() {
    if (this.humOsc) {
      try {
        this.humOsc.stop();
        this.humOsc.disconnect();
      } catch {
        // Ignore
      }
      this.humOsc = null;
      this.humGain = null;
    }
  }

  private fireAlarmInterval: number | null = null;
  private activeAlarmOscs: OscillatorNode[] = [];
  private activeAlarmNodes: AudioNode[] = [];
  private alarmMasterGain: GainNode | null = null;
  private lastDamageSoundTime: number = 0;

  private createSirenDistortionCurve(amount = 28): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  public playAlarm(times = 3) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    for (let i = 0; i < times; i++) {
      const startTime = this.ctx.currentTime + i * 0.45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.exponentialRampToValueAtTime(440, startTime + 0.35);

      gain.gain.setValueAtTime(0.18 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    }
  }

  // Sudden national-emergency EAS + klaxon shock blast to jumpscare the player
  private triggerEmergencyJumpscareBlast(targetNode: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Sub-bass shock thud
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(115, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.36);
    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    sub.connect(subGain);
    subGain.connect(targetNode);
    sub.start(t);
    sub.stop(t + 0.4);
    this.activeAlarmOscs.push(sub);

    // 2. Real National EAS Attention Dual-Tone (853 Hz + 960 Hz) jarring burst
    [853, 960, 1280].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 2 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(idx === 2 ? 0.22 : 0.32, t);
      g.gain.setValueAtTime(idx === 2 ? 0.22 : 0.32, t + 0.28);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      osc.connect(g);
      g.connect(targetNode);
      osc.start(t);
      osc.stop(t + 0.5);
      this.activeAlarmOscs.push(osc);
    });

    this.triggerVibration([120, 40, 160, 40, 220]);
  }

  // Schedules one 3.2s cycle of a terrifying mechanical air-raid / civil-defense siren wail + EAS pulse
  private scheduleEmergencySirenCycle(targetNode: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const cycleDur = 3.15;

    // Dual detuned mechanical rotor horns + 2nd harmonic + ominous sub-growl
    const rotorA = this.ctx.createOscillator();
    const rotorB = this.ctx.createOscillator();
    const rotorHarm = this.ctx.createOscillator();
    const subGrowl = this.ctx.createOscillator();

    rotorA.type = 'sawtooth';
    rotorB.type = 'sawtooth';
    rotorHarm.type = 'square';
    subGrowl.type = 'triangle';

    // Classic Civil Defense Siren Wail curve: fast terrifying scream up -> held high scream -> dread howl down
    const applyWailCurve = (param: AudioParam, mult: number) => {
      param.setValueAtTime(275 * mult, t);
      param.exponentialRampToValueAtTime(840 * mult, t + 1.15);
      param.setValueAtTime(840 * mult, t + 1.72);
      param.exponentialRampToValueAtTime(245 * mult, t + cycleDur);
    };

    applyWailCurve(rotorA.frequency, 1.0);
    applyWailCurve(rotorB.frequency, 1.014); // Detuned rotor beating for massive outdoor siren realism
    applyWailCurve(rotorHarm.frequency, 1.498); // Dissonant tritone/fifth warning bite
    applyWailCurve(subGrowl.frequency, 0.5);

    const cycleGain = this.ctx.createGain();
    cycleGain.gain.setValueAtTime(0.01, t);
    cycleGain.gain.linearRampToValueAtTime(0.55, t + 0.08);
    cycleGain.gain.setValueAtTime(0.62, t + 1.2);
    cycleGain.gain.setValueAtTime(0.58, t + 1.85);
    cycleGain.gain.linearRampToValueAtTime(0.28, t + cycleDur - 0.05);
    cycleGain.gain.linearRampToValueAtTime(0.001, t + cycleDur);

    const harmGain = this.ctx.createGain();
    harmGain.gain.value = 0.24;

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.35;

    rotorA.connect(cycleGain);
    rotorB.connect(cycleGain);
    rotorHarm.connect(harmGain);
    harmGain.connect(cycleGain);
    subGrowl.connect(subGain);
    subGain.connect(cycleGain);
    cycleGain.connect(targetNode);

    [rotorA, rotorB, rotorHarm, subGrowl].forEach((osc) => {
      osc.start(t);
      osc.stop(t + cycleDur + 0.02);
      this.activeAlarmOscs.push(osc);
      osc.onended = () => {
        this.activeAlarmOscs = this.activeAlarmOscs.filter((o) => o !== osc);
      };
    });

    // Piercing National Emergency EAS Dual-Tone double-pulse overlaid near peak wail
    [0.05, 1.42].forEach((offset) => {
      if (!this.ctx) return;
      [853, 960].forEach((freq) => {
        if (!this.ctx) return;
        const eas = this.ctx.createOscillator();
        const easGain = this.ctx.createGain();
        eas.type = 'square';
        eas.frequency.setValueAtTime(freq, t + offset);
        easGain.gain.setValueAtTime(0.001, t + offset);
        easGain.gain.linearRampToValueAtTime(0.16, t + offset + 0.015);
        easGain.gain.setValueAtTime(0.16, t + offset + 0.32);
        easGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.42);
        eas.connect(easGain);
        easGain.connect(targetNode);
        eas.start(t + offset);
        eas.stop(t + offset + 0.44);
        this.activeAlarmOscs.push(eas);
        eas.onended = () => {
          this.activeAlarmOscs = this.activeAlarmOscs.filter((o) => o !== eas);
        };
      });
    });
  }

  public playFireAlarm(times = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const master = this.ctx.createGain();
    master.gain.value = 0.72 * this.volume;
    master.connect(this.ctx.destination);
    this.activeAlarmNodes.push(master);

    this.triggerEmergencyJumpscareBlast(master);
    for (let i = 0; i < times; i++) {
      this.scheduleEmergencySirenCycle(master);
    }
  }

  public startFireAlarmLoop() {
    if (this.isMuted || this.fireAlarmInterval) return;
    this.initContext();
    if (!this.ctx) return;

    // Build shared civil-defense acoustic chain: Soft Saturation -> Horn Filter -> Echo Delay -> Limiter -> Master Gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.85 * this.volume, this.ctx.currentTime);

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    compressor.knee.setValueAtTime(8, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'peaking';
    hornFilter.frequency.setValueAtTime(920, this.ctx.currentTime);
    hornFilter.Q.setValueAtTime(1.6, this.ctx.currentTime);
    hornFilter.gain.setValueAtTime(6.5, this.ctx.currentTime);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.createSirenDistortionCurve(24);
    shaper.oversample = '2x';

    // Distant metallic emergency echo so it feels like a nationwide disaster broadcast
    const echoDelay = this.ctx.createDelay(0.5);
    echoDelay.delayTime.setValueAtTime(0.16, this.ctx.currentTime);
    const echoFilter = this.ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.setValueAtTime(1900, this.ctx.currentTime);
    const echoFeedback = this.ctx.createGain();
    echoFeedback.gain.setValueAtTime(0.32, this.ctx.currentTime);
    const echoWet = this.ctx.createGain();
    echoWet.gain.setValueAtTime(0.35, this.ctx.currentTime);

    const busInput = this.ctx.createGain();
    busInput.gain.setValueAtTime(1.0, this.ctx.currentTime);

    busInput.connect(shaper);
    shaper.connect(hornFilter);
    hornFilter.connect(compressor);

    // Echo loop
    hornFilter.connect(echoDelay);
    echoDelay.connect(echoFilter);
    echoFilter.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoFilter.connect(echoWet);
    echoWet.connect(compressor);

    compressor.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    this.alarmMasterGain = masterGain;
    this.activeAlarmNodes.push(
      busInput,
      shaper,
      hornFilter,
      echoDelay,
      echoFilter,
      echoFeedback,
      echoWet,
      compressor,
      masterGain
    );

    // Immediate jumpscare shock blast + continuous deadly siren cycles
    this.triggerEmergencyJumpscareBlast(busInput);
    this.scheduleEmergencySirenCycle(busInput);

    this.fireAlarmInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.alarmMasterGain) return;
      this.scheduleEmergencySirenCycle(busInput);
    }, 3100);
  }

  public stopFireAlarmLoop() {
    if (this.fireAlarmInterval) {
      clearInterval(this.fireAlarmInterval);
      this.fireAlarmInterval = null;
    }
    if (this.alarmMasterGain && this.ctx) {
      try {
        this.alarmMasterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.alarmMasterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      } catch {
        // Ignore
      }
    }
    for (const osc of this.activeAlarmOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    }
    for (const node of this.activeAlarmNodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeAlarmOscs = [];
    this.activeAlarmNodes = [];
    this.alarmMasterGain = null;
  }

  public playFlameDamage() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastDamageSoundTime < 200) return;
    this.lastDamageSoundTime = now;

    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Harsh Sawtooth Thermal Impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.16);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);

    // 2. Sizzling Thermal Noise
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2200, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28 * this.volume, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
    } catch {
      // Audio buffer fallback
    }

    this.triggerVibration([50, 40, 50]);
  }

  public startSpray() {
    if (this.isMuted || this.sprayNode) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // Create white noise buffer for water-mist / CO2 hiss
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.sprayNode = this.ctx.createBufferSource();
      this.sprayNode.buffer = noiseBuffer;
      this.sprayNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 1.2;

      this.sprayGain = this.ctx.createGain();
      this.sprayGain.gain.setValueAtTime(0.15 * this.volume, this.ctx.currentTime);

      this.sprayNode.connect(filter);
      filter.connect(this.sprayGain);
      this.sprayGain.connect(this.ctx.destination);

      this.sprayNode.start();
    } catch {
      // Ignore
    }
  }

  public stopSpray() {
    if (this.sprayNode) {
      try {
        this.sprayNode.stop();
        this.sprayNode.disconnect();
      } catch {
        // Ignore
      }
      this.sprayNode = null;
      this.sprayGain = null;
    }
  }

  private lastHoverTime: number = 0;
  private lastClickTime: number = 0;
  private globalHapticsInitialized: boolean = false;

  // Real tactile vibration feedback on supported devices
  public triggerVibration(pattern: number | number[] = 14) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if not supported or disallowed
      }
    }
  }

  // Single Tactile Mechanical Switch Click (Physical snap + sub-bass body)
  public playHapticClick(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
    if (this.isMuted) return;
    const now = Date.now();
    // 120ms debounce ensures exactly ONE single sound per click action (never repeats)
    if (now - this.lastClickTime < 120) return;
    this.lastClickTime = now;

    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const isHeavy = intensity === 'heavy';
      const isLight = intensity === 'light';

      // 1. Tactile Snap (Mechanical Switch Crisp Transient)
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'sine';

      const startFreq = isHeavy ? 1400 : isLight ? 1900 : 1650;
      const endFreq = isHeavy ? 180 : isLight ? 320 : 240;
      const duration = isHeavy ? 0.024 : isLight ? 0.013 : 0.018;

      snapOsc.frequency.setValueAtTime(startFreq, t);
      snapOsc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

      const snapVol = (isHeavy ? 0.15 : isLight ? 0.06 : 0.10) * this.volume;
      snapGain.gain.setValueAtTime(snapVol, t);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      snapOsc.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snapOsc.start(t);
      snapOsc.stop(t + duration);

      // 2. Physical Sub-bass Body (The physical mechanical switch depress feel)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';

      const subStart = isHeavy ? 95 : 75;
      const subEnd = isHeavy ? 28 : 35;
      const subDur = isHeavy ? 0.038 : 0.025;

      subOsc.frequency.setValueAtTime(subStart, t);
      subOsc.frequency.exponentialRampToValueAtTime(subEnd, t + subDur);

      const subVol = (isHeavy ? 0.16 : isLight ? 0.05 : 0.10) * this.volume;
      subGain.gain.setValueAtTime(subVol, t);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + subDur);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + subDur);
    } catch {
      // Ignore audio synthesis errors
    }

    // 3. Tactile Vibration
    this.triggerVibration(intensity === 'heavy' ? [18, 25, 16] : intensity === 'light' ? 8 : 14);
  }

  // Hover sounds disabled: audio triggers strictly on click only
  public playHapticHover() {
    // Intentionally silent: sound only plays on actual click
  }

  // Single clean click for module launches (no repeat or double tap)
  public playHapticLaunch() {
    this.playHapticClick('medium');
  }

  // Standard playClick automatically routes to tactile haptic click
  public playClick(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
    this.playHapticClick(intensity);
  }

  // Auto-bind haptics to all interactive buttons and unlock mobile audio context on touch
  public initGlobalButtonHaptics() {
    if (this.globalHapticsInitialized || typeof window === 'undefined') return;
    this.globalHapticsInitialized = true;

    window.addEventListener(
      'touchstart',
      () => {
        this.initContext();
      },
      { passive: true, once: true }
    );

    window.addEventListener(
      'keydown',
      () => {
        this.initContext();
      },
      { passive: true }
    );

    // Single crisp mechanical switch click on pressing interactive buttons
    window.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        this.initContext();
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const interactive = target.closest('button, [role="button"], .menu-tab, summary');
        if (interactive) {
          this.playHapticClick('medium');
        }
      },
      { passive: true }
    );
  }

  public playSuccess() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = this.ctx!.currentTime + idx * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  public playBreakerClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }
}

export const sound = new SoundSystem();
