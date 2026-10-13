/** Reserve space for round caps, keeping small sectors visible as capsules. */
export function expenseSlices<T extends { total: number }>(
  categories: T[],
  total: number,
) {
  let start = -90;
  return categories
    .filter((c) => c.total > 0)
    .map((c) => {
      const degrees = (c.total / total) * 360,
        rounded = true;
      const gap = Math.min(3, degrees * 0.12);
      const strokeWidth = Math.min(
        27,
        Math.max(8, (((degrees - gap) * Math.PI) / 180) * 105 * 0.8),
      );
      const span = Math.max(
        0.01,
        degrees - gap - ((strokeWidth / 105) * 180) / Math.PI,
      );
      const mid = start + degrees / 2,
        s = mid - span / 2,
        e = mid + span / 2;
      start += degrees;
      const point = (angle: number) => [
        150 + 105 * Math.cos((angle * Math.PI) / 180),
        150 + 105 * Math.sin((angle * Math.PI) / 180),
      ];
      const [sx, sy] = point(s),
        [ex, ey] = point(e),
        [mx, my] = point(mid);
      return {
        ...c,
        degrees,
        rounded,
        strokeWidth,
        tiny: degrees < 2,
        mx,
        my,
        path: `M ${sx} ${sy} A 105 105 0 ${e - s > 180 ? 1 : 0} 1 ${ex} ${ey}`,
      };
    });
}
export function expensePercent(amount: number, total: number) {
  if (!amount || !total) return "0%";
  const value = (amount / total) * 100;
  return value < 1 ? "<1%" : `${Math.round(value)}%`;
}
