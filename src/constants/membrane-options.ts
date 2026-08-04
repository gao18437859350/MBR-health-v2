export type Phase = "一期" | "二期";

export interface MembranePoolOption {
  id: string;
  phase: Phase;
  poolNumber: number;
}

export interface MembraneBoxOption {
  id: string;
  label: string;
  phase: Phase;
  poolId: string;
  poolNumber: number;
  boxNumber: number;
}

export const MEMBRANE_POOLS: MembranePoolOption[] = (["一期", "二期"] as const).flatMap(
  (phase) => Array.from({ length: 6 }, (_, index) => ({
    id: `${phase}${index + 1}号膜池`,
    phase,
    poolNumber: index + 1,
  }))
);

export const MEMBRANE_OPTIONS: MembraneBoxOption[] = MEMBRANE_POOLS.flatMap(
  (pool) => Array.from({ length: 10 }, (_, index) => ({
    id: `${pool.id}-${index + 1}号膜箱`,
    label: `${index + 1}号膜箱`,
    phase: pool.phase,
    poolId: pool.id,
    poolNumber: pool.poolNumber,
    boxNumber: index + 1,
  }))
);

const LEGACY_MBR_PATTERN = /^MBR-(?:1-)?([AB])-0?([1-6])$/i;
const LEGACY_PHASE_PATTERN = /^(一期|二期)([1-6])号$/;

/** Upgrade known legacy identifiers while preserving unrelated custom identifiers. */
export function canonicalizeMembraneIdentity(
  membraneId: string,
  poolId: string
): { membraneId: string; poolId: string } {
  const trimmedId = membraneId.trim();
  const current = MEMBRANE_OPTIONS.find(({ id }) => id === trimmedId);
  if (current) return { membraneId: current.id, poolId: current.poolId };

  const oldPhase = trimmedId.match(LEGACY_PHASE_PATTERN);
  if (oldPhase) {
    const newPoolId = `${oldPhase[1]}${Number(oldPhase[2])}号膜池`;
    return { membraneId: `${newPoolId}-1号膜箱`, poolId: newPoolId };
  }

  const legacy = trimmedId.match(LEGACY_MBR_PATTERN);
  if (legacy) {
    const phase: Phase = legacy[1].toUpperCase() === "A" ? "一期" : "二期";
    const newPoolId = `${phase}${Number(legacy[2])}号膜池`;
    return { membraneId: `${newPoolId}-1号膜箱`, poolId: newPoolId };
  }

  const normalizedPool = poolId === "MBR-A" ? "一期1号膜池"
    : poolId === "MBR-B" ? "二期1号膜池"
      : poolId;
  return { membraneId: trimmedId, poolId: normalizedPool };
}

export function poolForMembrane(membraneId: string): string {
  return MEMBRANE_OPTIONS.find(({ id }) => id === membraneId)?.poolId ?? "";
}

export function phaseForPool(poolId: string): Phase | "" {
  return MEMBRANE_POOLS.find(({ id }) => id === poolId)?.phase ?? "";
}
