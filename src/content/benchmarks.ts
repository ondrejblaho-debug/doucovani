// Orientational benchmarks per track (no school names). Points are per test (max 50).
// Source: CERMAT open data, 1st round 2026, as summarised by an independent analysis
// (admitted applicants to 8-year programmes averaged ~61 % in both tests; the last admitted
// applicant at an average 8-year programme had ~95/200 % points ≈ 47.5 % per test).
export interface Benchmark { label: string; points: number }
export const BENCHMARKS: Record<'g8' | 'g6', { year: number; lines: Benchmark[]; note: string } | null> = {
  g8: {
    year: 2026,
    lines: [
      { label: 'průměr přijatých 2026', points: 30.5 },
      { label: 'hranice průměrného gymnázia 2026', points: 24 },
    ],
    note: 'Orientačně podle otevřených dat CERMAT za rok 2026 (celostátně, 8letá gymnázia). Konkrétní školy se výrazně liší.',
  },
  g6: null, // national 2026 figures for 6-year programmes not available in a reliable form yet
};
