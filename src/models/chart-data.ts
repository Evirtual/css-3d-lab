/**
 * The JSON the chart models are drawn from. One copy, used by the models on the site AND printed
 * into their copy-paste snippets, so the two can never show different numbers. Shaped like an
 * API response: plain objects and arrays, nothing chart-specific.
 */

/** neonbars: monthly sales per year, in thousands. */
export const SALES = {
  unit: 'k$',
  years: {
    '2024': [
      { label: 'Jan', value: 42 },
      { label: 'Feb', value: 58 },
      { label: 'Mar', value: 51 },
      { label: 'Apr', value: 73 },
      { label: 'May', value: 66 },
      { label: 'Jun', value: 88 },
    ],
    '2025': [
      { label: 'Jan', value: 64 },
      { label: 'Feb', value: 71 },
      { label: 'Mar', value: 97 },
      { label: 'Apr', value: 82 },
      { label: 'May', value: 109 },
      { label: 'Jun', value: 94 },
    ],
    '2026': [
      { label: 'Jan', value: 118 },
      { label: 'Feb', value: 96 },
      { label: 'Mar', value: 131 },
      { label: 'Apr', value: 124 },
      { label: 'May', value: 142 },
      { label: 'Jun', value: 157 },
    ],
  } as Record<string, { label: string; value: number }[]>,
};

/** heatmap: commits per weekday, one row per week. */
export const COMMITS = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  weeks: [
    [3, 8, 5, 12, 7],
    [6, 14, 9, 4, 10],
    [2, 7, 16, 11, 5],
    [9, 12, 6, 15, 13],
  ],
};

/** chartpanel: a year of monthly values. */
export const TREND = {
  unit: 'k',
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  values: [18, 24, 21, 30, 27, 36, 33, 41, 37, 47, 44, 55],
};

/** The top of a chart's scale: the largest value rounded up to a tidy step. */
export const niceMax = (max: number, step = 20): number => Math.ceil(max / step) * step;
