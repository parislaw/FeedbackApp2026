import { describe, it, expect } from 'vitest';

// Test data
interface SavedReport {
  id: string;
  userId: string;
  userName?: string;
  scenarioTitle?: string;
  provider?: string;
  createdAt: string;
  evaluation?: {
    giverScores: Array<{ score: number; dimension: string }>;
  };
}

// Utility functions from ReportHistoryPage.tsx
function avgScore(report: SavedReport): number | null {
  const scores = report.evaluation?.giverScores;
  if (!scores || scores.length === 0) return null;
  return scores.reduce((s, x) => s + x.score, 0) / scores.length;
}

function scoreColorClass(score: number): string {
  if (score >= 2.5) return 'bg-green-100 text-green-700';
  if (score >= 1.5) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

// Utility functions from AdminReportsTab.tsx
function heatmapColor(score: number | null): string {
  if (score == null) return 'bg-slate-100 text-slate-400';
  if (score >= 2.5) return 'bg-green-100 text-green-800';
  if (score >= 1.5) return 'bg-yellow-100 text-yellow-800';
  if (score >= 0.5) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

function avgScoreValue(report: SavedReport): number | null {
  const scores = report.evaluation?.giverScores;
  if (!scores || scores.length === 0) return null;
  return scores.reduce((s, x) => s + x.score, 0) / scores.length;
}

function buildHeatmap(allReports: SavedReport[]): Record<string, { userName: string; dims: Record<string, number[]> }> {
  const userMap: Record<string, { userName: string; dims: Record<string, number[]> }> = {};
  for (const r of allReports) {
    if (!r.evaluation?.giverScores) continue;
    if (!userMap[r.userId]) {
      userMap[r.userId] = { userName: r.userName || r.userId, dims: {} };
    }
    for (const s of r.evaluation.giverScores) {
      if (!userMap[r.userId].dims[s.dimension]) userMap[r.userId].dims[s.dimension] = [];
      userMap[r.userId].dims[s.dimension].push(s.score);
    }
  }
  return userMap;
}

function extractDimensions(allReports: SavedReport[]): string[] {
  const dims = new Set<string>();
  for (const r of allReports) {
    for (const s of r.evaluation?.giverScores || []) dims.add(s.dimension);
  }
  return Array.from(dims);
}

describe('Report Utility Functions', () => {
  describe('avgScore', () => {
    it('returns null when evaluation is missing', () => {
      const report: SavedReport = {
        id: '1',
        userId: 'user1',
        createdAt: new Date().toISOString(),
      };
      expect(avgScore(report)).toBeNull();
    });

    it('returns null when giverScores is empty', () => {
      const report: SavedReport = {
        id: '1',
        userId: 'user1',
        createdAt: new Date().toISOString(),
        evaluation: { giverScores: [] },
      };
      expect(avgScore(report)).toBeNull();
    });

    it('calculates average of single score', () => {
      const report: SavedReport = {
        id: '1',
        userId: 'user1',
        createdAt: new Date().toISOString(),
        evaluation: { giverScores: [{ score: 2.0, dimension: 'clarity' }] },
      };
      expect(avgScore(report)).toBe(2.0);
    });

    it('calculates average of multiple scores', () => {
      const report: SavedReport = {
        id: '1',
        userId: 'user1',
        createdAt: new Date().toISOString(),
        evaluation: {
          giverScores: [
            { score: 1.0, dimension: 'clarity' },
            { score: 2.0, dimension: 'tone' },
            { score: 3.0, dimension: 'engagement' },
          ],
        },
      };
      expect(avgScore(report)).toBe(2.0);
    });
  });

  describe('scoreColorClass', () => {
    it('returns green for high scores (>= 2.5)', () => {
      expect(scoreColorClass(2.5)).toBe('bg-green-100 text-green-700');
      expect(scoreColorClass(3.0)).toBe('bg-green-100 text-green-700');
    });

    it('returns blue for medium scores (1.5 to < 2.5)', () => {
      expect(scoreColorClass(1.5)).toBe('bg-blue-100 text-blue-700');
      expect(scoreColorClass(2.0)).toBe('bg-blue-100 text-blue-700');
    });

    it('returns amber for low scores (< 1.5)', () => {
      expect(scoreColorClass(1.0)).toBe('bg-amber-100 text-amber-700');
      expect(scoreColorClass(0.5)).toBe('bg-amber-100 text-amber-700');
    });
  });

  describe('heatmapColor', () => {
    it('returns slate for null scores', () => {
      expect(heatmapColor(null)).toBe('bg-slate-100 text-slate-400');
    });

    it('returns green for high scores (>= 2.5)', () => {
      expect(heatmapColor(2.5)).toBe('bg-green-100 text-green-800');
      expect(heatmapColor(3.0)).toBe('bg-green-100 text-green-800');
    });

    it('returns yellow for medium-high scores (1.5 to < 2.5)', () => {
      expect(heatmapColor(1.5)).toBe('bg-yellow-100 text-yellow-800');
      expect(heatmapColor(2.0)).toBe('bg-yellow-100 text-yellow-800');
    });

    it('returns orange for medium-low scores (0.5 to < 1.5)', () => {
      expect(heatmapColor(0.5)).toBe('bg-orange-100 text-orange-800');
      expect(heatmapColor(1.0)).toBe('bg-orange-100 text-orange-800');
    });

    it('returns red for low scores (< 0.5)', () => {
      expect(heatmapColor(0.0)).toBe('bg-red-100 text-red-800');
      expect(heatmapColor(0.2)).toBe('bg-red-100 text-red-800');
    });
  });

  describe('avgScoreValue', () => {
    it('returns null when evaluation is missing', () => {
      const report: SavedReport = {
        id: '1',
        userId: 'user1',
        createdAt: new Date().toISOString(),
      };
      expect(avgScoreValue(report)).toBeNull();
    });

    it('calculates average score correctly', () => {
      const report: SavedReport = {
        id: '1',
        userId: 'user1',
        createdAt: new Date().toISOString(),
        evaluation: {
          giverScores: [
            { score: 1.5, dimension: 'clarity' },
            { score: 2.5, dimension: 'tone' },
          ],
        },
      };
      expect(avgScoreValue(report)).toBe(2.0);
    });
  });

  describe('extractDimensions', () => {
    it('returns empty array for empty reports', () => {
      expect(extractDimensions([])).toEqual([]);
    });

    it('returns empty array when no reports have evaluation', () => {
      const reports: SavedReport[] = [
        { id: '1', userId: 'user1', createdAt: new Date().toISOString() },
      ];
      expect(extractDimensions(reports)).toEqual([]);
    });

    it('extracts single dimension', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          createdAt: new Date().toISOString(),
          evaluation: { giverScores: [{ score: 2.0, dimension: 'clarity' }] },
        },
      ];
      expect(extractDimensions(reports)).toEqual(['clarity']);
    });

    it('extracts multiple unique dimensions', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          createdAt: new Date().toISOString(),
          evaluation: {
            giverScores: [
              { score: 2.0, dimension: 'clarity' },
              { score: 1.5, dimension: 'tone' },
            ],
          },
        },
        {
          id: '2',
          userId: 'user2',
          createdAt: new Date().toISOString(),
          evaluation: {
            giverScores: [{ score: 2.5, dimension: 'engagement' }],
          },
        },
      ];
      const dims = extractDimensions(reports);
      expect(dims).toHaveLength(3);
      expect(dims).toContain('clarity');
      expect(dims).toContain('tone');
      expect(dims).toContain('engagement');
    });

    it('deduplicates dimensions', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          createdAt: new Date().toISOString(),
          evaluation: {
            giverScores: [
              { score: 2.0, dimension: 'clarity' },
              { score: 1.5, dimension: 'clarity' },
            ],
          },
        },
      ];
      const dims = extractDimensions(reports);
      expect(dims).toEqual(['clarity']);
    });
  });

  describe('buildHeatmap', () => {
    it('returns empty map for empty reports', () => {
      expect(buildHeatmap([])).toEqual({});
    });

    it('skips reports without evaluation', () => {
      const reports: SavedReport[] = [
        { id: '1', userId: 'user1', createdAt: new Date().toISOString() },
      ];
      expect(buildHeatmap(reports)).toEqual({});
    });

    it('builds heatmap with single user and dimension', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'User One',
          createdAt: new Date().toISOString(),
          evaluation: { giverScores: [{ score: 2.0, dimension: 'clarity' }] },
        },
      ];
      const heatmap = buildHeatmap(reports);
      expect(heatmap.user1).toBeDefined();
      expect(heatmap.user1.userName).toBe('User One');
      expect(heatmap.user1.dims.clarity).toEqual([2.0]);
    });

    it('aggregates scores by user and dimension', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'User One',
          createdAt: new Date().toISOString(),
          evaluation: {
            giverScores: [
              { score: 2.0, dimension: 'clarity' },
              { score: 1.5, dimension: 'tone' },
            ],
          },
        },
        {
          id: '2',
          userId: 'user1',
          userName: 'User One',
          createdAt: new Date().toISOString(),
          evaluation: {
            giverScores: [{ score: 2.5, dimension: 'clarity' }],
          },
        },
      ];
      const heatmap = buildHeatmap(reports);
      expect(heatmap.user1.dims.clarity).toEqual([2.0, 2.5]);
      expect(heatmap.user1.dims.tone).toEqual([1.5]);
    });

    it('uses userId as fallback for userName', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          createdAt: new Date().toISOString(),
          evaluation: { giverScores: [{ score: 2.0, dimension: 'clarity' }] },
        },
      ];
      const heatmap = buildHeatmap(reports);
      expect(heatmap.user1.userName).toBe('user1');
    });

    it('handles multiple users', () => {
      const reports: SavedReport[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'User One',
          createdAt: new Date().toISOString(),
          evaluation: { giverScores: [{ score: 2.0, dimension: 'clarity' }] },
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'User Two',
          createdAt: new Date().toISOString(),
          evaluation: { giverScores: [{ score: 2.5, dimension: 'clarity' }] },
        },
      ];
      const heatmap = buildHeatmap(reports);
      expect(Object.keys(heatmap)).toHaveLength(2);
      expect(heatmap.user1.dims.clarity).toEqual([2.0]);
      expect(heatmap.user2.dims.clarity).toEqual([2.5]);
    });
  });
});
