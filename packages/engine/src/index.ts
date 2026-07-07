export { computeFreeBlocks, type EventInterval } from './freeBlocks';
export { computeWeeklyScore, type WeeklyScoreInput, type WeeklyScoreResult } from './scoring';
export {
  pickBestFreeBlock,
  BalancedStrategy,
  AcademicStrategy,
  type IRecommendationStrategy,
  type RecommendInput,
} from './recommendation';
export { getWeekKey, todayDateString } from './weekKey';
