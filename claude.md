# Clean Code Guidelines for Salary Book App

## Project Structure

```
/app
  /_layout.tsx - Root layout with auth check
  /auth
    /login.tsx - Login screen
    /forgot-password.tsx - Password reset
  /(tabs)
    /_layout.tsx - Tab layout (role-based: employee vs HR)
    /index.tsx - Dashboard (Employee/HR based on role)
    /attendance.tsx - Attendance (Employee own / HR all)
    /salary.tsx - Salary (Employee only)
    /employees.tsx - All employees (HR only)
    /profile.tsx - Profile/Settings
  /hr
    /employee/[id].tsx - Employee detail
    /employee/edit.tsx - Add/Edit employee
    /salary.tsx - Salary management
  /notifications.tsx
  /modals
    /check-in-out.tsx

/components
  /ui - Reusable UI components (Button, Card, Input, etc.)
  /attendance - Attendance-specific components
  /salary - Salary-specific components
  /employee - Employee-specific components

/lib
  /supabase
    /client.ts - Supabase client setup
    /types.ts - Generated TypeScript types from database
  /api
    /queries
      /attendance.queries.ts - Attendance query functions
      /employee.queries.ts - Employee query functions
      /salary.queries.ts - Salary query functions
      /user.queries.ts - User query functions
    /mutations
      /attendance.mutations.ts - Attendance mutation functions
      /employee.mutations.ts - Employee mutation functions
      /salary.mutations.ts - Salary mutation functions
      /user.mutations.ts - User mutation functions
  /utils
    /date.utils.ts - Date formatting and calculations
    /salary.utils.ts - Salary calculations
    /attendance.utils.ts - Attendance calculations
  /types
    /index.ts - App-specific TypeScript types

/hooks
  /auth
    /useAuth.ts - Authentication state
    /useSession.ts - Session management
  /queries
    /useAttendance.ts - Attendance queries
    /useEmployees.ts - Employee queries
    /useSalary.ts - Salary queries
    /useProfile.ts - Profile queries
  /mutations
    /useAttendanceMutations.ts - Attendance mutations
    /useEmployeeMutations.ts - Employee mutations
    /useSalaryMutations.ts - Salary mutations

/constants
  /Colors.ts - Theme colors
  /Config.ts - App configuration

/assets
  /images
  /fonts
  /icons
```

---

## TanStack Query Pattern

### 1. Query Functions (Pure Data Fetching)
**Location:** `/lib/api/queries/*.queries.ts`

**Pattern:**
```typescript
// lib/api/queries/attendance.queries.ts
import { supabase } from '@/lib/supabase/client';
import { AttendanceRecord } from '@/lib/types';

export const attendanceQueries = {
  /**
   * Fetch today's attendance record for a user
   */
  getTodayAttendance: async (userId: string): Promise<AttendanceRecord | null> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Fetch attendance records for a date range
   */
  getAttendanceByDateRange: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch monthly attendance summary
   */
  getMonthlyAttendanceSummary: async (userId: string, month: number, year: number) => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    return {
      records: data || [],
      totalDays: data?.length || 0,
      validDays: data?.filter(r => r.is_valid_day).length || 0,
      totalHours: data?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0,
    };
  },

  // HR queries
  getAllAttendanceRecords: async (filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<AttendanceRecord[]> => {
    let query = supabase
      .from('attendance_records')
      .select('*, users(full_name, employee_id)');

    if (filters?.startDate) query = query.gte('date', filters.startDate);
    if (filters?.endDate) query = query.lte('date', filters.endDate);
    if (filters?.userId) query = query.eq('user_id', filters.userId);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
```

### 2. Mutation Functions (Data Modifications)
**Location:** `/lib/api/mutations/*.mutations.ts`

**Pattern:**
```typescript
// lib/api/mutations/attendance.mutations.ts
import { supabase } from '@/lib/supabase/client';

export const attendanceMutations = {
  /**
   * Check in for today
   */
  checkIn: async (userId: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        date: today,
        check_in_time: now,
        marked_by: userId,
        marked_by_role: 'self',
        check_in_method: 'self',
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check out for today
   */
  checkOut: async (recordId: string, notes?: string) => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: now,
        notes,
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * HR marks attendance for an employee
   */
  markAttendance: async (params: {
    userId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    markedBy: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: params.userId,
        date: params.date,
        check_in_time: params.checkInTime,
        check_out_time: params.checkOutTime,
        marked_by: params.markedBy,
        marked_by_role: 'hr',
        check_in_method: 'manual',
        notes: params.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update attendance record
   */
  updateAttendance: async (
    recordId: string,
    updates: Partial<{
      check_in_time: string;
      check_out_time: string;
      notes: string;
    }>
  ) => {
    const { data, error } = await supabase
      .from('attendance_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

### 3. Query Hooks (useQuery)
**Location:** `/hooks/queries/*.ts`

**Pattern:**
```typescript
// hooks/queries/useAttendance.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { attendanceQueries } from '@/lib/api/queries/attendance.queries';
import { AttendanceRecord } from '@/lib/types';

/**
 * Query keys for attendance-related queries
 */
export const attendanceKeys = {
  all: ['attendance'] as const,
  today: (userId: string) => [...attendanceKeys.all, 'today', userId] as const,
  byDateRange: (userId: string, startDate: string, endDate: string) =>
    [...attendanceKeys.all, 'range', userId, startDate, endDate] as const,
  monthlySummary: (userId: string, month: number, year: number) =>
    [...attendanceKeys.all, 'monthly', userId, month, year] as const,
  hrAll: (filters?: object) => [...attendanceKeys.all, 'hr', filters] as const,
};

/**
 * Hook to fetch today's attendance record
 */
export const useTodayAttendance = (
  userId: string,
  options?: UseQueryOptions<AttendanceRecord | null>
) => {
  return useQuery({
    queryKey: attendanceKeys.today(userId),
    queryFn: () => attendanceQueries.getTodayAttendance(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch attendance records by date range
 */
export const useAttendanceByDateRange = (
  userId: string,
  startDate: string,
  endDate: string,
  options?: UseQueryOptions<AttendanceRecord[]>
) => {
  return useQuery({
    queryKey: attendanceKeys.byDateRange(userId, startDate, endDate),
    queryFn: () => attendanceQueries.getAttendanceByDateRange(userId, startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch monthly attendance summary
 */
export const useMonthlyAttendanceSummary = (
  userId: string,
  month: number,
  year: number,
  options?: UseQueryOptions<{
    records: AttendanceRecord[];
    totalDays: number;
    validDays: number;
    totalHours: number;
  }>
) => {
  return useQuery({
    queryKey: attendanceKeys.monthlySummary(userId, month, year),
    queryFn: () => attendanceQueries.getMonthlyAttendanceSummary(userId, month, year),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * HR: Hook to fetch all attendance records
 */
export const useAllAttendanceRecords = (
  filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  },
  options?: UseQueryOptions<AttendanceRecord[]>
) => {
  return useQuery({
    queryKey: attendanceKeys.hrAll(filters),
    queryFn: () => attendanceQueries.getAllAttendanceRecords(filters),
    staleTime: 1000 * 60 * 3,
    ...options,
  });
};
```

### 4. Mutation Hooks (useMutation)
**Location:** `/hooks/mutations/*.ts`

**Pattern:**
```typescript
// hooks/mutations/useAttendanceMutations.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { attendanceMutations } from '@/lib/api/mutations/attendance.mutations';
import { attendanceKeys } from '@/hooks/queries/useAttendance';
import { AttendanceRecord } from '@/lib/types';

/**
 * Hook for checking in
 */
export const useCheckIn = (
  userId: string,
  options?: UseMutationOptions<AttendanceRecord, Error, { notes?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notes }: { notes?: string }) =>
      attendanceMutations.checkIn(userId, notes),
    onSuccess: (data) => {
      // Invalidate today's attendance query
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today(userId) });

      // Invalidate monthly summary
      const now = new Date();
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlySummary(userId, now.getMonth(), now.getFullYear())
      });
    },
    ...options,
  });
};

/**
 * Hook for checking out
 */
export const useCheckOut = (
  userId: string,
  options?: UseMutationOptions<AttendanceRecord, Error, { recordId: string; notes?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, notes }: { recordId: string; notes?: string }) =>
      attendanceMutations.checkOut(recordId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today(userId) });
      const now = new Date();
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlySummary(userId, now.getMonth(), now.getFullYear())
      });
    },
    ...options,
  });
};

/**
 * HR: Hook for marking attendance
 */
export const useMarkAttendance = (
  markedBy: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    {
      userId: string;
      date: string;
      checkInTime: string;
      checkOutTime?: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => attendanceMutations.markAttendance({ ...params, markedBy }),
    onSuccess: (_, variables) => {
      // Invalidate the affected user's queries
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today(variables.userId) });

      // Invalidate HR's all attendance query
      queryClient.invalidateQueries({ queryKey: attendanceKeys.hrAll() });

      // Invalidate monthly summary for the affected month
      const date = new Date(variables.date);
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlySummary(
          variables.userId,
          date.getMonth(),
          date.getFullYear()
        )
      });
    },
    ...options,
  });
};

/**
 * Hook for updating attendance
 */
export const useUpdateAttendance = (
  userId: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    {
      recordId: string;
      updates: Partial<{
        check_in_time: string;
        check_out_time: string;
        notes: string;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, updates }) =>
      attendanceMutations.updateAttendance(recordId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today(userId) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.hrAll() });
    },
    ...options,
  });
};
```

---

## File Naming Conventions

### Query Files
- `*.queries.ts` - Pure query functions
- Example: `attendance.queries.ts`, `employee.queries.ts`, `salary.queries.ts`

### Mutation Files
- `*.mutations.ts` - Pure mutation functions
- Example: `attendance.mutations.ts`, `employee.mutations.ts`, `salary.mutations.ts`

### Hook Files
- `use*.ts` - React hooks
- Example: `useAttendance.ts`, `useAttendanceMutations.ts`

### Utility Files
- `*.utils.ts` - Helper functions
- Example: `date.utils.ts`, `salary.utils.ts`

### Component Files
- PascalCase for components
- Example: `Button.tsx`, `AttendanceCard.tsx`, `EmployeeList.tsx`

---

## Code Quality Rules

### 1. Separation of Concerns
- **Query Functions**: Only data fetching logic, no React hooks
- **Mutation Functions**: Only data modification logic, no React hooks
- **Query Hooks**: React Query hooks using query functions
- **Mutation Hooks**: React Query hooks using mutation functions
- **Components**: Only UI logic, use hooks for data

### 2. TypeScript Usage
- Always define types for API responses
- Use interfaces for object shapes
- Use type for unions and primitives
- Export all types from `/lib/types/index.ts`
- Generate database types from Supabase

### 3. Error Handling
```typescript
// In query functions
try {
  const { data, error } = await supabase...
  if (error) throw error;
  return data;
} catch (error) {
  // Let React Query handle the error
  throw error;
}

// In components
const { data, error, isLoading } = useQuery(...);

if (error) return <ErrorComponent error={error} />;
if (isLoading) return <LoadingComponent />;
```

### 4. Query Key Organization
```typescript
// Always use factory pattern for query keys
export const entityKeys = {
  all: ['entity'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters: object) => [...entityKeys.lists(), filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (id: string) => [...entityKeys.details(), id] as const,
};
```

### 5. Cache Invalidation
```typescript
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: entityKeys.detail(id) });

// Invalidate all entity queries
queryClient.invalidateQueries({ queryKey: entityKeys.all });

// Optimistic updates
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: entityKeys.detail(id) });
  const previous = queryClient.getQueryData(entityKeys.detail(id));
  queryClient.setQueryData(entityKeys.detail(id), newData);
  return { previous };
},
onError: (err, newData, context) => {
  queryClient.setQueryData(entityKeys.detail(id), context.previous);
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: entityKeys.detail(id) });
},
```

### 6. Component Structure
```typescript
// Component file structure
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSomeQuery } from '@/hooks/queries/useSomeQuery';
import { useSomeMutation } from '@/hooks/mutations/useSomeMutation';
import { Button } from '@/components/ui/Button';

export default function MyComponent() {
  // 1. State
  const [localState, setLocalState] = useState();

  // 2. Queries
  const { data, isLoading, error } = useSomeQuery();

  // 3. Mutations
  const mutation = useSomeMutation();

  // 4. Handlers
  const handleAction = () => {
    mutation.mutate({ data });
  };

  // 5. Render
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <View style={styles.container}>
      <Text>{data.title}</Text>
      <Button onPress={handleAction}>Action</Button>
    </View>
  );
}

// 6. Styles at bottom
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

## Environment Setup

### Required Files

**`.env`:**
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**`lib/supabase/client.ts`:**
```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Testing Checklist

Before committing code, ensure:
- [ ] All query functions are in `*.queries.ts` files
- [ ] All mutation functions are in `*.mutations.ts` files
- [ ] All React hooks are in separate hook files
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] Cache invalidation is correct
- [ ] Components follow structure guidelines
- [ ] No business logic in components
- [ ] Query keys use factory pattern

---

## Performance Best Practices

1. **Use staleTime and cacheTime appropriately**
   - Frequent updates: `staleTime: 1000 * 60` (1 min)
   - Moderate updates: `staleTime: 1000 * 60 * 5` (5 min)
   - Rare updates: `staleTime: 1000 * 60 * 30` (30 min)

2. **Implement pagination for large lists**
   ```typescript
   const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
     queryKey: ['items'],
     queryFn: ({ pageParam = 0 }) => fetchItems(pageParam),
     getNextPageParam: (lastPage) => lastPage.nextCursor,
   });
   ```

3. **Use React.memo for expensive components**
   ```typescript
   export const ExpensiveComponent = React.memo(({ data }) => {
     // Component logic
   });
   ```

4. **Debounce search inputs**
   ```typescript
   const [searchTerm, setSearchTerm] = useState('');
   const debouncedSearch = useDebounce(searchTerm, 500);

   useQuery({
     queryKey: ['search', debouncedSearch],
     queryFn: () => searchApi(debouncedSearch),
     enabled: debouncedSearch.length > 0,
   });
   ```

---

## Git Commit Guidelines

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `style:` UI/styling changes
- `docs:` Documentation changes
- `chore:` Maintenance tasks

Example:
```
feat: add employee check-in functionality
fix: resolve attendance calculation bug
refactor: separate query and mutation logic
```
