/**
 * 轻量测试运行器 — 替代 vitest（绕过 esbuild 沙箱限制）
 */
export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
}

let currentSuite = "";
let passed = 0;
let failed = 0;
const failures: string[] = [];

export function describe(name: string, fn: () => void) {
  currentSuite = name;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"=".repeat(60)}`);
  fn();
}

export function it(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: unknown) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${msg}`);
    failures.push(`[${currentSuite}] ${name}: ${msg}`);
  }
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== "number" || actual <= expected) {
        throw new Error(`expected > ${expected}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== "number" || actual < expected) {
        throw new Error(`expected >= ${expected}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== "number" || actual >= expected) {
        throw new Error(`expected < ${expected}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== "number" || actual > expected) {
        throw new Error(`expected <= ${expected}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, digits: number = 2) {
      if (typeof actual !== "number") {
        throw new Error(`expected number, got ${typeof actual}`);
      }
      const factor = Math.pow(10, digits);
      const a = Math.round(actual * factor);
      const b = Math.round(expected * factor);
      if (a !== b) {
        throw new Error(`expected ~${expected}, got ${actual}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`expected defined, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item: unknown) {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`expected array to contain ${JSON.stringify(item)}`);
        }
      } else {
        throw new Error("toContain requires array");
      }
    },
    toHaveLength(length: number) {
      if (Array.isArray(actual)) {
        if (actual.length !== length) {
          throw new Error(`expected length ${length}, got ${actual.length}`);
        }
      } else {
        throw new Error("toHaveLength requires array");
      }
    },
    toHaveProperty(prop: string) {
      if (actual === null || typeof actual !== "object") {
        throw new Error("toHaveProperty requires object");
      }
      if (!(prop in (actual as object))) {
        throw new Error(`expected property "${prop}" to exist`);
      }
    },
    get not() {
      const self = this;
      return {
        toBe(expected: T) {
          if (actual === expected) {
            throw new Error(`expected not ${JSON.stringify(expected)}, got same value`);
          }
        },
        toBeNull() {
          if (actual === null) {
            throw new Error(`expected not null`);
          }
        },
      };
    },
  };
}

export function printSummary() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"=".repeat(60)}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    throw new Error("Tests failed");
  }
  console.log("\nAll tests passed!\n");
}
