import { describe, expect, it } from "vitest";
import {
  UuidV7Generator,
  type RandomSource,
} from "../src/core/uuidv7";

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const zeroRandom: RandomSource = (target) => {
  target.fill(0);
  return target;
};

const maxRandom: RandomSource = (target) => {
  target.fill(0xff);
  return target;
};

function timestampFromUuid(value: string): number {
  return Number.parseInt(value.replaceAll("-", "").slice(0, 12), 16);
}

describe("UUIDv7", () => {
  it("creates an RFC-shaped Version 7 UUID with the correct variant", () => {
    const value = new UuidV7Generator(() => 1_721_600_000_000).generate();
    const groups = value.split("-");

    expect(value).toMatch(UUID_V7_PATTERN);
    expect(groups[2]?.startsWith("7")).toBe(true);
    expect(groups[3]?.[0]).toMatch(/[89ab]/);
  });

  it("encodes Unix milliseconds in the first 48 bits", () => {
    const timestamp = 1_721_600_000_000;
    const value = new UuidV7Generator(() => timestamp, zeroRandom).generate();

    expect(value.replaceAll("-", "").slice(0, 12)).toBe(
      timestamp.toString(16).padStart(12, "0"),
    );
  });

  it("sorts monotonically within the same millisecond", () => {
    const generator = new UuidV7Generator(() => 1_721_600_000_000, zeroRandom);
    const values = [
      generator.generate(),
      generator.generate(),
      generator.generate(),
    ];

    expect([...values].sort()).toEqual(values);
  });

  it("sorts by increasing observed time", () => {
    let timestamp = 1_721_600_000_000;
    const generator = new UuidV7Generator(() => timestamp++, zeroRandom);
    const first = generator.generate();
    const second = generator.generate();

    expect(first < second).toBe(true);
  });

  it("advances the timestamp when the 74-bit random field overflows", () => {
    const timestamp = 1_721_600_000_000;
    const generator = new UuidV7Generator(() => timestamp, maxRandom);
    const first = generator.generate();
    const second = generator.generate();

    expect(timestampFromUuid(first)).toBe(timestamp);
    expect(timestampFromUuid(second)).toBe(timestamp + 1);
    expect(first < second).toBe(true);

    for (const value of [first, second]) {
      const groups = value.split("-");

      expect(value).toMatch(UUID_V7_PATTERN);
      expect(groups[2]?.startsWith("7")).toBe(true);
      expect(groups[3]?.[0]).toMatch(/[89ab]/);
    }
  });

  it("does not regress or duplicate when the clock moves backward", () => {
    const firstTimestamp = 1_721_600_000_001;
    const timestamps = [firstTimestamp, firstTimestamp - 1_000];
    const generator = new UuidV7Generator(
      () => timestamps.shift() ?? firstTimestamp - 1_000,
      zeroRandom,
    );
    const first = generator.generate();
    const second = generator.generate();

    expect(timestampFromUuid(first)).toBe(firstTimestamp);
    expect(timestampFromUuid(second)).toBe(firstTimestamp);
    expect(first < second).toBe(true);
    expect(second).not.toBe(first);
  });

  it("fails closed when the random source does not return ten bytes", () => {
    const invalidRandom: RandomSource = () => new Uint8Array(9);
    const generator = new UuidV7Generator(
      () => 1_721_600_000_000,
      invalidRandom,
    );
    let generated: string | undefined;

    expect(() => {
      generated = generator.generate();
    }).toThrowError("Random source must return exactly ten bytes");
    expect(generated).toBeUndefined();
  });

  it("generates a large batch without duplicates", () => {
    const generator = new UuidV7Generator(() => 1_721_600_000_000);
    const values = new Set(
      Array.from({ length: 10_000 }, () => generator.generate()),
    );

    expect(values.size).toBe(10_000);
  });
});
