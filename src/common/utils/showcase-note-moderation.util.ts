import IDProfanityFilter, { type AnalysisResult } from '@sideid/id-profanity-filter';

const showcaseNoteFilter = new IDProfanityFilter();

showcaseNoteFilter.usePreset('childSafe', {
  indonesianVariation: true,
  detectSplit: true,
  detectLeetSpeak: true,
  detectSimilarity: true,
  useLevenshtein: true,
  similarityThreshold: 0.85,
  maxLevenshteinDistance: 2,
});

export type ShowcaseModerationResult = Pick<
  AnalysisResult,
  'hasProfanity' | 'matches' | 'categories' | 'regions' | 'severityScore'
>;

export function analyzeShowcaseNote(
  value?: string | null,
): ShowcaseModerationResult {
  const safeValue = typeof value === 'string' ? value.trim() : '';

  if (!safeValue) {
    return {
      hasProfanity: false,
      matches: [],
      categories: [],
      regions: [],
      severityScore: 0,
    };
  }

  const analysis = showcaseNoteFilter.analyze(safeValue);
  return {
    hasProfanity: analysis.hasProfanity,
    matches: analysis.matches ?? [],
    categories: analysis.categories ?? [],
    regions: analysis.regions ?? [],
    severityScore: analysis.severityScore ?? 0,
  };
}

export function hasBlockedTerms(value?: string | null): boolean {
  return analyzeShowcaseNote(value).hasProfanity;
}
