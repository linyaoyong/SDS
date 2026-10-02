export const shouldCloseReviewDialog = (targetId: string, currentTargetId: string): boolean =>
  targetId === currentTargetId;

export const canSubmitReview = (reviewSubmitting: boolean, rating: number): boolean =>
  !reviewSubmitting && rating > 0;
