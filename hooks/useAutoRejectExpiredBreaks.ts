import { useEffect, useRef } from 'react';
import { useMyBreakRequests } from './queries/useBreakRequests';
import { useRejectBreakRequest } from './mutations/useBreakRequestMutations';

/**
 * Custom hook that automatically rejects pending break requests
 * where the start time has already passed
 */
export const useAutoRejectExpiredBreaks = (userId: string) => {
  const { data: breakRequests, refetch } = useMyBreakRequests(userId, undefined, {
    refetchInterval: 30000, // Check every 30 seconds for expired breaks
  });
  const rejectMutation = useRejectBreakRequest(userId, {
    onSuccess: () => {
      // Refetch after successful rejection to update the list
      refetch();
    },
  });

  // Track which requests we've already processed to avoid duplicate rejections
  const processedRequestsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!breakRequests || breakRequests.length === 0) return;

    const now = new Date();

    // Find all pending requests where the start time has passed
    const expiredRequests = breakRequests.filter((req: any) => {
      // Only process pending_start requests (awaiting approval)
      if (req.status !== 'pending_start') return false;

      // Skip if already processed
      if (processedRequestsRef.current.has(req.id)) return false;

      // Check if request has a start time
      if (!req.requested_start_time) return false;

      // Check if start time has passed
      const startTime = new Date(req.requested_start_time);
      return now >= startTime;
    });

    // Auto-reject each expired request
    expiredRequests.forEach((req: any) => {
      // Mark as processed to avoid duplicate rejections
      processedRequestsRef.current.add(req.id);

      // Reject with automatic system note
      rejectMutation.mutate({
        breakRequestId: req.id,
        reviewerNotes: 'Automatically rejected: Break request expired (not approved before start time)',
      });
    });
  }, [breakRequests, rejectMutation]);

  return {
    isProcessing: rejectMutation.isPending,
  };
};
