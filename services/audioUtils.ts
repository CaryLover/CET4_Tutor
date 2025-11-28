// Utility to convert base64 string to byte array
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Utility to decode raw PCM data into an AudioBuffer
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Class to handle streaming audio playback
export class StreamAudioPlayer {
  private ctx: AudioContext;
  private nextStartTime: number = 0;
  private pcmChunks: Float32Array[] = [];
  private sources: AudioBufferSourceNode[] = [];
  private sampleRate: number;
  private startedAt: number = 0;
  private hasStarted: boolean = false;

  constructor(ctx: AudioContext, sampleRate: number = 24000) {
    this.ctx = ctx;
    this.sampleRate = sampleRate;
    this.nextStartTime = ctx.currentTime;
  }

  // Ensure context is running (fixes browser autoplay policy blocking)
  async ensureRunning() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Process a Base64 PCM chunk: decode, play, and store
  addChunk(base64Data: string) {
    // 1. Decode Base64 -> Float32
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // 2. Store for later full-buffer reconstruction
    this.pcmChunks.push(float32);

    // 3. Play immediately (Gapless)
    const buffer = this.ctx.createBuffer(1, float32.length, this.sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    // Schedule playback
    const now = this.ctx.currentTime;
    // Prevent scheduling in the past
    if (this.nextStartTime < now) {
        this.nextStartTime = now;
    }
    
    // Capture the actual start time of the first chunk for UI sync
    if (!this.hasStarted) {
        this.startedAt = this.nextStartTime;
        this.hasStarted = true;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    
    // Track source to allow stopping
    this.sources.push(source);
    source.onended = () => {
        this.sources = this.sources.filter(s => s !== source);
    };
  }

  // Reconstruct the full audio buffer from all chunks
  getFullBuffer(): AudioBuffer {
    const totalLength = this.pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = this.ctx.createBuffer(1, totalLength || 1, this.sampleRate); // Prevent 0 length
    const channel = buffer.getChannelData(0);
    
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      channel.set(chunk, offset);
      offset += chunk.length;
    }
    
    return buffer;
  }

  // Stop all currently scheduled chunks
  stop() {
      this.sources.forEach(source => {
          try { source.stop(); } catch(e) {}
      });
      this.sources = [];
  }

  // Get the timestamp when playback started
  getStartTime(): number {
      return this.startedAt;
  }
}