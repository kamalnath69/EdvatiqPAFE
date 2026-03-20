export function buildRechargePresets(suggestedTopUp, count = 3) {
  const base = Math.max(Number(suggestedTopUp) || 100, 1);
  const scale = count <= 2 ? [1, 2] : [1, 2, 5];
  return scale
    .slice(0, count)
    .map((multiplier) => Math.round(base * multiplier))
    .filter((value, index, list) => value > 0 && list.indexOf(value) === index);
}
