/**
 * Auto Attendance Hook
 * Handles automatic check-in/check-out based on WiFi connectivity
 *
 * Logic:
 * - Auto check-in when connecting to office WiFi (if not already checked in)
 * - Auto check-out when disconnecting from office WiFi (if checked in and no active break)
 * - Break protection: Does NOT auto check-out if employee is on an active break
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWiFiConnectivity } from '@/lib/providers/WiFiConnectivityProvider';
import { useTodayAttendance } from '@/hooks/queries/useAttendance';
import { useActiveBreak } from '@/hooks/queries/useBreakRequests';
import { useCheckIn, useCheckOut } from '@/hooks/mutations/useAttendanceMutations';
import { useAutoCheckinSetting } from '@/hooks/queries/useUserSettings';
import { AutoAttendanceAction, AutoAttendanceState, WeekDay } from '@/lib/types';
import { isTodayWorkingDay } from '@/lib/utils/workingDays.utils';

// Debounce delays (in milliseconds)
const CHECKIN_DEBOUNCE_MS = 5000; // 5 seconds stable connection before check-in
const CHECKOUT_DEBOUNCE_MS = 10000; // 10 seconds stable disconnection before check-out

interface UseAutoAttendanceOptions {
  userId: string;
  organizationId?: string;
  workingDays?: WeekDay[];
  onAutoCheckin?: () => void;
  onAutoCheckout?: () => void;
  onBlocked?: (reason: string) => void;
}

interface UseAutoAttendanceReturn extends AutoAttendanceState {
  /** Force refresh the auto attendance state */
  refresh: () => void;
}

export function useAutoAttendance({
  userId,
  organizationId,
  workingDays = [],
  onAutoCheckin,
  onAutoCheckout,
  onBlocked,
}: UseAutoAttendanceOptions): UseAutoAttendanceReturn {
  const [lastAction, setLastAction] = useState<AutoAttendanceAction | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Track previous WiFi state to detect transitions
  const prevIsOfficeWiFi = useRef<boolean | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAction = useRef<'checkin' | 'checkout' | null>(null);
  const appState = useRef(AppState.currentState);
  const hasCheckedInToday = useRef(false);
  const hasCheckedOutToday = useRef(false);

  // WiFi connectivity state
  const wifiState = useWiFiConnectivity();

  // Get auto check-in setting
  const { data: autoCheckinEnabled = false } = useAutoCheckinSetting(userId, {
    enabled: !!userId,
  });

  // Today's attendance record
  const { data: todayAttendance, refetch: refetchAttendance } = useTodayAttendance(userId, {
    enabled: !!userId,
  });

  // Active break (for break protection)
  const { data: activeBreak } = useActiveBreak(userId, {
    enabled: !!userId,
  });

  // Check-in/check-out mutations
  const checkInMutation = useCheckIn(userId);
  const checkOutMutation = useCheckOut(userId);

  // Determine if today is a working day
  const isTodayWorking = useMemo(() => {
    return isTodayWorkingDay(workingDays);
  }, [workingDays]);

  // Determine current attendance state
  const isCheckedIn = !!todayAttendance && !todayAttendance.check_out_time;
  const isCheckedOut = !!todayAttendance?.check_out_time;

  // Determine if auto checkout is allowed (break protection)
  const canAutoCheckout = useMemo(() => {
    if (activeBreak) {
      return { allowed: false, reason: 'Cannot auto check-out during active break' };
    }
    return { allowed: true, reason: null };
  }, [activeBreak]);

  // Perform auto check-in
  const performAutoCheckin = useCallback(async () => {
    if (isProcessing || hasCheckedInToday.current) return;

    setIsProcessing(true);
    setBlockReason(null);

    try {
      await checkInMutation.mutateAsync({
        notes: 'Auto check-in via WiFi',
        wifiInfo: {
          ssid: wifiState.ssid,
          verified: true,
        },
      });

      const action: AutoAttendanceAction = {
        type: 'check-in',
        timestamp: new Date(),
        success: true,
      };
      setLastAction(action);
      hasCheckedInToday.current = true;
      onAutoCheckin?.();

      // Refetch attendance to update state
      refetchAttendance();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto check-in';
      const action: AutoAttendanceAction = {
        type: 'check-in',
        timestamp: new Date(),
        success: false,
        reason: errorMessage,
      };
      setLastAction(action);
      console.error('Auto check-in failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, checkInMutation, wifiState.ssid, onAutoCheckin, refetchAttendance]);

  // Perform auto check-out
  const performAutoCheckout = useCallback(async () => {
    if (isProcessing || hasCheckedOutToday.current || !todayAttendance?.id) return;

    // Check break protection
    if (!canAutoCheckout.allowed) {
      setBlockReason(canAutoCheckout.reason);
      onBlocked?.(canAutoCheckout.reason || 'Cannot auto check-out');
      return;
    }

    setIsProcessing(true);
    setBlockReason(null);

    try {
      await checkOutMutation.mutateAsync({
        recordId: todayAttendance.id,
        notes: 'Auto check-out via WiFi disconnect',
        wifiInfo: {
          ssid: null,
          verified: false,
        },
      });

      const action: AutoAttendanceAction = {
        type: 'check-out',
        timestamp: new Date(),
        success: true,
      };
      setLastAction(action);
      hasCheckedOutToday.current = true;
      onAutoCheckout?.();

      // Refetch attendance to update state
      refetchAttendance();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto check-out';
      const action: AutoAttendanceAction = {
        type: 'check-out',
        timestamp: new Date(),
        success: false,
        reason: errorMessage,
      };
      setLastAction(action);
      console.error('Auto check-out failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    todayAttendance?.id,
    canAutoCheckout,
    checkOutMutation,
    onAutoCheckout,
    onBlocked,
    refetchAttendance,
  ]);

  // Handle WiFi state changes with debouncing
  useEffect(() => {
    // Skip if auto check-in is disabled
    if (!autoCheckinEnabled) {
      prevIsOfficeWiFi.current = wifiState.isOfficeWiFi;
      return;
    }

    // Skip if not a working day
    if (!isTodayWorking) {
      prevIsOfficeWiFi.current = wifiState.isOfficeWiFi;
      return;
    }

    // Skip if no organization or user
    if (!organizationId || !userId) {
      prevIsOfficeWiFi.current = wifiState.isOfficeWiFi;
      return;
    }

    // Detect transitions
    const wasOfficeWiFi = prevIsOfficeWiFi.current;
    const isOfficeWiFi = wifiState.isOfficeWiFi;

    // Connected to office WiFi (transition from not-office to office, or initial connection)
    if (isOfficeWiFi && (wasOfficeWiFi === false || wasOfficeWiFi === null)) {
      // Should auto check-in?
      const shouldCheckin = !todayAttendance && !hasCheckedInToday.current;

      if (shouldCheckin) {
        // Clear any pending 
        // r since we're now connecting
        if (debounceTimer.current && pendingAction.current === 'checkout') {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        pendingAction.current = 'checkin';
        // Capture current state for the timeout callback
        const currentIsOffice = isOfficeWiFi;
        debounceTimer.current = setTimeout(() => {
          // Use captured value to avoid stale closure
          if (currentIsOffice) {
            performAutoCheckin();
          }
          pendingAction.current = null;
        }, CHECKIN_DEBOUNCE_MS);
      }
    }

    // AUTO CHECK-OUT DISABLED - Commented out until bug is fully resolved
    // Disconnected from office WiFi (transition from office to not-office, or app restart while away with active check-in)
    // if (!isOfficeWiFi && (wasOfficeWiFi === true || (wasOfficeWiFi === null && isCheckedIn))) {
    //   // Should auto check-out?
    //   const shouldCheckout = isCheckedIn && !hasCheckedOutToday.current;
    //
    //   // Only start checkout if not already pending (prevents re-triggering on re-renders)
    //   if (shouldCheckout && pendingAction.current !== 'checkout') {
    //     // Clear any pending checkin timer since we're now disconnecting
    //     if (debounceTimer.current && pendingAction.current === 'checkin') {
    //       clearTimeout(debounceTimer.current);
    //       debounceTimer.current = null;
    //     }
    //     pendingAction.current = 'checkout';
    //     // Capture current state for the timeout callback
    //     const currentCanAutoCheckout = canAutoCheckout;
    //     debounceTimer.current = setTimeout(() => {
    //       // Re-check break protection (may have changed during debounce)
    //       if (currentCanAutoCheckout.allowed) {
    //         performAutoCheckout();
    //       } else {
    //         setBlockReason(currentCanAutoCheckout.reason);
    //         onBlocked?.(currentCanAutoCheckout.reason || 'Cannot auto check-out');
    //       }
    //       pendingAction.current = null;
    //     }, CHECKOUT_DEBOUNCE_MS);
    //   }
    // }

    // Update previous state
    prevIsOfficeWiFi.current = isOfficeWiFi;

    // NOTE: We intentionally don't clear the debounce timer in this effect's cleanup
    // because it would cancel our pending checkout when React re-runs the effect
    // due to dependency changes. Timer cleanup happens in unmount-only effect below.
  }, [
    autoCheckinEnabled,
    wifiState.isOfficeWiFi,
    organizationId,
    userId,
    isTodayWorking,
    todayAttendance,
    isCheckedIn,
    canAutoCheckout,
    performAutoCheckin,
    performAutoCheckout,
    onBlocked,
  ]);

  // Reset daily flags when date changes or on mount
  useEffect(() => {
    const checkDateChange = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const storedDate = hasCheckedInToday.current ? today : null;

      // Reset if it's a new day
      if (storedDate !== today) {
        hasCheckedInToday.current = false;
        hasCheckedOutToday.current = false;
      }
    };

    checkDateChange();

    // Also update based on actual attendance data
    if (todayAttendance) {
      hasCheckedInToday.current = true;
      if (todayAttendance.check_out_time) {
        hasCheckedOutToday.current = true;
      }
    }
  }, [todayAttendance]);

  // Handle app state changes (clear pending actions when app goes to background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Clear pending debounce timer when app goes to background
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        pendingAction.current = null;
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Cleanup timer on unmount only
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      pendingAction.current = null;
    };
  }, []);

  // Refresh function
  const refresh = useCallback(() => {
    refetchAttendance();
    wifiState.refreshState();
    setBlockReason(null);
  }, [refetchAttendance, wifiState]);

  return {
    isEnabled: autoCheckinEnabled,
    lastAction,
    blockReason,
    isProcessing,
    refresh,
  };
}
