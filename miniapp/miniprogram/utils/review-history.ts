export const getLatestReview = <T>(history: T[]): T | null => history[0] ?? null;
