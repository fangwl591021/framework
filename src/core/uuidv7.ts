const MAX_TIMESTAMP = 2 ** 48 - 1;
const RANDOM_BITS = 74n;
const RANDOM_MASK = (1n << RANDOM_BITS) - 1n;
const RAND_B_MASK = (1n << 62n) - 1n;

export interface UuidV7 {
  generate(): string;
}

export type RandomSource = (target: Uint8Array) => Uint8Array;

function webCryptoRandom(target: Uint8Array): Uint8Array {
  return crypto.getRandomValues(target);
}

function random74(randomSource: RandomSource): bigint {
  const bytes = randomSource(new Uint8Array(10));
  if (bytes.length !== 10) {
    throw new TypeError("Random source must return exactly ten bytes");
  }

  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value & RANDOM_MASK;
}

function encodeUuidV7(timestampMs: number, randomValue: bigint): string {
  const bytes = new Uint8Array(16);
  let timestamp = timestampMs;

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }

  const randA = Number((randomValue >> 62n) & 0xfffn);
  const randB = randomValue & RAND_B_MASK;
  bytes[6] = 0x70 | (randA >> 8);
  bytes[7] = randA & 0xff;
  bytes[8] = 0x80 | Number((randB >> 56n) & 0x3fn);

  for (let index = 9, shift = 48n; index < 16; index += 1, shift -= 8n) {
    bytes[index] = Number((randB >> shift) & 0xffn);
  }

  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export class UuidV7Generator implements UuidV7 {
  private lastTimestampMs = -1;
  private lastRandom = 0n;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly randomSource: RandomSource = webCryptoRandom,
  ) {}

  generate(): string {
    const observedTimestamp = Math.floor(this.now());
    if (
      !Number.isSafeInteger(observedTimestamp) ||
      observedTimestamp < 0 ||
      observedTimestamp > MAX_TIMESTAMP
    ) {
      throw new RangeError("UUIDv7 timestamp is outside the 48-bit range");
    }

    if (observedTimestamp > this.lastTimestampMs) {
      this.lastTimestampMs = observedTimestamp;
      this.lastRandom = random74(this.randomSource);
    } else {
      this.lastRandom = (this.lastRandom + 1n) & RANDOM_MASK;
      if (this.lastRandom === 0n) {
        this.lastTimestampMs += 1;
        if (this.lastTimestampMs > MAX_TIMESTAMP) {
          throw new RangeError("UUIDv7 monotonic timestamp overflow");
        }
      }
    }

    return encodeUuidV7(this.lastTimestampMs, this.lastRandom);
  }
}
