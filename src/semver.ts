/** Is version `a` newer than `b` (both "major.minor.patch")? Compared by number, so 0.10.0 is newer than 0.9.0. */
export function newerThan(a: string, b: string) {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}
