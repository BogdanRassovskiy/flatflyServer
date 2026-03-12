export interface ListingRankingContext {
  now?: Date;
}

type RankingListing = {
  relevanceScore?: number;
  matchPercentage?: number;
};

export function rankListings<T extends RankingListing>(
  listings: T[],
  _context: ListingRankingContext = {}
): T[] {
  return [...listings].sort((a, b) => {
    const scoreA = Number.isFinite(a.relevanceScore)
      ? Number(a.relevanceScore)
      : Number(a.matchPercentage || 0);
    const scoreB = Number.isFinite(b.relevanceScore)
      ? Number(b.relevanceScore)
      : Number(b.matchPercentage || 0);
    return scoreB - scoreA;
  });
}