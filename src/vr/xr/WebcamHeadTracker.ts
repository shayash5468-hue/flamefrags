/**
 * Lightweight, zero-CDN optical head tracker for desktop/laptop webcams.
 * Uses native FaceDetector when available in Chromium, with a fast 96x72
 * YCbCr skin/head-weighted centroid tracker fallback so it works offline
 * and in sandboxed previews without external model downloads.
 */

interface DetectedFaceLike {
  boundingBox: DOMRectReadOnly;
}

interface FaceDetectorLike {
  detect(image: CanvasImageSource): Promise<DetectedFaceLike[]>;
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

export interface HeadTrackSample {
  yawDelta: number;
  pitchDelta: number;
  confidence: number;
}

export class WebcamHeadTracker {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private faceDetector: FaceDetectorLike | null = null;
  private detectPending = false;
  private running = false;

  private readonly sampleW = 96;
  private readonly sampleH = 72;
  private lastSampleMs = 0;

  private neutralX: number | null = null;
  private neutralY: number | null = null;
  private smoothX = 0.5;
  private smoothY = 0.5;
  private confidence = 0;
  private yawDelta = 0;
  private pitchDelta = 0;

  public async start(): Promise<void> {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Webcam API is unavailable in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        facingMode: 'user',
      },
      audio: false,
    });

    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = this.sampleW;
    canvas.height = this.sampleH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const win = window as unknown as { FaceDetector?: FaceDetectorConstructor };
    if (typeof win.FaceDetector === 'function') {
      try {
        this.faceDetector = new win.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch {
        this.faceDetector = null;
      }
    }

    this.stream = stream;
    this.video = video;
    this.canvas = canvas;
    this.ctx = ctx;
    this.neutralX = null;
    this.neutralY = null;
    this.smoothX = 0.5;
    this.smoothY = 0.5;
    this.yawDelta = 0;
    this.pitchDelta = 0;
    this.confidence = 0;
    this.running = true;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public recenter(): void {
    this.neutralX = this.smoothX;
    this.neutralY = this.smoothY;
    this.yawDelta = 0;
    this.pitchDelta = 0;
  }

  public update(nowMs: number): HeadTrackSample | null {
    if (!this.running || !this.video || this.video.readyState < 2) {
      return null;
    }

    // Throttle optical sampling to ~25 Hz for minimal CPU overhead
    if (nowMs - this.lastSampleMs >= 40) {
      this.lastSampleMs = nowMs;
      if (this.faceDetector && !this.detectPending) {
        this.runFaceDetectorSample();
      } else if (!this.faceDetector) {
        this.runCentroidSample();
      }
    }

    return {
      yawDelta: this.yawDelta,
      pitchDelta: this.pitchDelta,
      confidence: this.confidence,
    };
  }

  private runFaceDetectorSample(): void {
    if (!this.faceDetector || !this.video) return;
    this.detectPending = true;
    const vw = this.video.videoWidth || 320;
    const vh = this.video.videoHeight || 240;

    this.faceDetector
      .detect(this.video)
      .then((faces) => {
        if (!this.running) return;
        if (faces.length > 0) {
          const box = faces[0].boundingBox;
          // Mirror X so moving head right turns view right
          const nx = 1 - (box.x + box.width * 0.5) / vw;
          const ny = (box.y + box.height * 0.42) / vh;
          this.ingestNormalizedHead(nx, ny, 1.0);
        } else {
          this.confidence *= 0.85;
        }
      })
      .catch(() => {
        // Disable FaceDetector if runtime refuses and switch to canvas tracker
        this.faceDetector = null;
      })
      .finally(() => {
        this.detectPending = false;
      });
  }

  private runCentroidSample(): void {
    if (!this.ctx || !this.video) return;
    const w = this.sampleW;
    const h = this.sampleH;

    // Draw mirrored horizontally so moving right moves centroid right
    this.ctx.save();
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(this.video, -w, 0, w, h);
    this.ctx.restore();

    const img = this.ctx.getImageData(0, 0, w, h).data;
    let sumW = 0;
    let sumX = 0;
    let sumY = 0;

    for (let y = 4; y < h - 4; y++) {
      const wy = 1 - Math.abs(y / h - 0.48) * 0.8;
      for (let x = 8; x < w - 8; x++) {
        const idx = (y * w + x) * 4;
        const r = img[idx];
        const g = img[idx + 1];
        const b = img[idx + 2];

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luma < 36 || luma > 245) continue;

        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        if (cb >= 76 && cb <= 132 && cr >= 132 && cr <= 178) {
          const wx = 1 - Math.abs(x / w - 0.5) * 0.65;
          const weight = wx * wy;
          sumW += weight;
          sumX += x * weight;
          sumY += y * weight;
        }
      }
    }

    if (sumW > 18) {
      const nx = sumX / sumW / w;
      const ny = sumY / sumW / h;
      this.ingestNormalizedHead(nx, ny, Math.min(1, sumW / 180));
    } else {
      this.confidence *= 0.85;
    }
  }

  private ingestNormalizedHead(nx: number, ny: number, conf: number): void {
    this.confidence = conf;
    if (this.neutralX === null || this.neutralY === null) {
      this.neutralX = nx;
      this.neutralY = ny;
      this.smoothX = nx;
      this.smoothY = ny;
      return;
    }

    const alpha = 0.26;
    this.smoothX += (nx - this.smoothX) * alpha;
    this.smoothY += (ny - this.smoothY) * alpha;

    const dx = this.smoothX - this.neutralX;
    const dy = this.smoothY - this.neutralY;

    const deadzone = 0.012;
    const adjX = Math.abs(dx) > deadzone ? dx - Math.sign(dx) * deadzone : 0;
    const adjY = Math.abs(dy) > deadzone ? dy - Math.sign(dy) * deadzone : 0;

    // Map head excursion to comfortable spacecraft look angles (~±68° yaw, ±42° pitch)
    this.yawDelta = Math.max(-1.2, Math.min(1.2, -adjX * 4.4));
    this.pitchDelta = Math.max(-0.78, Math.min(0.78, -adjY * 3.4));
  }

  public stop(): void {
    this.running = false;
    this.detectPending = false;
    this.faceDetector = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.neutralX = null;
    this.neutralY = null;
    this.yawDelta = 0;
    this.pitchDelta = 0;
    this.confidence = 0;
  }

  public dispose(): void {
    this.stop();
  }
}
