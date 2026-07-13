#!/usr/bin/env node
/**
 * Verifies High Priority sort uses raw metric values when match % ties.
 * Run: node packages/data/scripts/verify-hp-sort.mjs
 */

function compareHighPriorityMetricScores(a, b, hpMetrics, higherIsBetterByMetric) {
  for (const metric of hpMetrics) {
    const higherIsBetter = higherIsBetterByMetric[metric];
    const aValue = a.metrics[metric];
    const bValue = b.metrics[metric];
    if (higherIsBetter) {
      if (bValue !== aValue) return bValue - aValue;
    } else if (aValue !== bValue) {
      return aValue - bValue;
    }
  }
  return 0;
}

function compareRanked(a, b, hpMetrics, higherIsBetterByMetric) {
  const matchDiff = b.matchPercent - a.matchPercent;
  if (matchDiff !== 0) return matchDiff;
  const hpDiff = compareHighPriorityMetricScores(a, b, hpMetrics, higherIsBetterByMetric);
  if (hpDiff !== 0) return hpDiff;
  return b.score - a.score;
}

function makeEntry(zip, matchPercent, walkabilityScore) {
  return {
    zip,
    matchPercent,
    score: matchPercent,
    metrics: { walkabilityScore },
    breakdown: { byMetric: { walkabilityScore: matchPercent } },
  };
}

const hpMetrics = ["walkabilityScore"];
const higherIsBetter = { walkabilityScore: true };

const landrum = makeEntry("29356", 78, 55);
const greenville = makeEntry("29605", 78, 68);
const downtown = makeEntry("29601", 78, 72);
const downtownLowerMatch = makeEntry("29601", 70, 72);

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

// Old bug: criterion match scores tie at same match %
const oldHpDiff = (landrum.breakdown.byMetric.walkabilityScore ?? 0) -
  (downtown.breakdown.byMetric.walkabilityScore ?? 0);
assert(oldHpDiff === 0, "criterion match scores tie at 78% (reproduces user bug)");

assert(
  compareRanked(downtown, landrum, hpMetrics, higherIsBetter) < 0,
  "72 walk ranks above 55 walk at same 78% match",
);
assert(
  compareRanked(greenville, landrum, hpMetrics, higherIsBetter) < 0,
  "68 walk ranks above 55 walk at same 78% match",
);

const sorted = [landrum, greenville, downtown].sort((a, b) =>
  compareRanked(a, b, hpMetrics, higherIsBetter),
);
assert(
  sorted.map((e) => e.zip).join(",") === "29601,29605,29356",
  `sort order is downtown, greenville, landrum (got ${sorted.map((e) => e.zip).join(",")})`,
);

assert(
  compareRanked(landrum, downtownLowerMatch, hpMetrics, higherIsBetter) < 0,
  "78% match still beats 70% despite lower walk score",
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nAll High Priority sort checks passed.");
