# TanStack React Query Architecture Guide

> **A comprehensive guide to implementing clean, scalable data fetching with TanStack Query**
>
> This document describes a production-ready, layered architecture for managing server state in React applications.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Directory Structure](#directory-structure)
4. [Implementation Patterns](#implementation-patterns)
5. [Real-World Examples](#real-world-examples)
6. [Best Practices](#best-practices)
7. [Performance Optimization](#performance-optimization)
8. [Is This Approach Good?](#is-this-approach-good)
9. [Quick Start Template](#quick-start-template)

---

## Overview

### Philosophy

This architecture strictly separates three concerns:

1. **Data Access Layer** - Pure functions that interact with your backend (Supabase, REST API, GraphQL, etc.)
2. **React Integration Layer** - Hooks that wrap TanStack Query's `useQuery` and `useMutation`
3. **UI Layer** - Components that consume the hooks

**Key Principle:** Never mix data fetching logic with React hooks or UI components.

### Why This Matters

```typescript
// ❌ BAD: Everything mixed together
function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('users').select('*').eq('id', userId).single()
      .then(({ data }) => setUser(data))
      .finally(() => setLoading(false));
  }, [userId]);

  // Component logic...
}

// ✅ GOOD: Clean separation
function UserProfile() {
  const { data: user, isLoading } = useUser(userId);
  // Component logic...
}
```

---

## Architecture Layers

### Layer 1: Query Functions (Data Access)

**Location:** `lib/api/queries/*.queries.ts`

**Purpose:** Pure async functions that fetch data from your backend.

**Rules:**
- ✅ Pure functions (no side effects except data fetching)
- ✅ No React hooks
- ✅ Return typed data or throw errors
- ✅ Handle backend-specific error codes
- ❌ No component logic
- ❌ No state management

**Example:**

```typescript
// lib/api/queries/user.queries.ts
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';

export const userQueries = {
  /**
   * Fetch a single user by ID
   */
  getById: async (userId: string): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all users with optional filters
   */
  getAll: async (filters?: {
    department?: string;
    role?: string;
  }): Promise<User[]> => {
    let query = supabase.from('users').select('*');

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Search users by name or email
   */
  search: async (searchTerm: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  },
};
```

---

### Layer 2: Mutation Functions (Data Modifications)

**Location:** `lib/api/mutations/*.mutations.ts`

**Purpose:** Pure async functions that create, update, or delete data.

**Rules:**
- ✅ Pure functions
- ✅ Business logic and validation
- ✅ Complex workflows (upserts, conditional logic)
- ✅ Return typed data or throw errors
- ❌ No React hooks
- ❌ No cache management

**Example:**

```typescript
// lib/api/mutations/user.mutations.ts
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';

export const userMutations = {
  /**
   * Create a new user
   */
  create: async (params: {
    email: string;
    full_name: string;
    role: 'hr' | 'employee';
    department?: string;
  }): Promise<User> => {
    // Validation
    if (!params.email || !params.full_name) {
      throw new Error('Email and full name are required');
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', params.email)
      .maybeSingle();

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: params.email,
        full_name: params.full_name,
        role: params.role,
        department: params.department,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update user details
   */
  update: async (
    userId: string,
    updates: Partial<Pick<User, 'full_name' | 'phone_number' | 'department'>>
  ): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a user (soft delete)
   */
  delete: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  },
};
```

---

### Layer 3: Query Hooks (React Integration)

**Location:** `hooks/queries/*.ts`

**Purpose:** React hooks that wrap TanStack Query's `useQuery`.

**Rules:**
- ✅ Use React hooks (`useQuery`)
- ✅ Define query keys (factory pattern)
- ✅ Configure caching strategies
- ✅ Provide TypeScript types
- ❌ No data fetching logic (delegate to query functions)

**Example:**

```typescript
// hooks/queries/useUser.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { userQueries } from '@/lib/api/queries/user.queries';
import { User } from '@/lib/types';

/**
 * Query key factory for user-related queries
 *
 * Pattern:
 * - `all`: Base key for all user queries
 * - `lists()`: List queries
 * - `list(filters)`: Specific list with filters
 * - `details()`: Detail queries
 * - `detail(id)`: Specific user detail
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: object) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  search: (term: string) => [...userKeys.all, 'search', term] as const,
};

/**
 * Hook to fetch a single user by ID
 *
 * @example
 * ```tsx
 * const { data: user, isLoading } = useUser('user-id-123');
 * ```
 */
export const useUser = (
  userId: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userQueries.getById(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId, // Only run if userId exists
    ...options,
  });
};

/**
 * Hook to fetch all users with optional filters
 *
 * @example
 * ```tsx
 * const { data: users, isLoading } = useUsers({ department: 'Engineering' });
 * ```
 */
export const useUsers = (
  filters?: { department?: string; role?: string },
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => userQueries.getAll(filters),
    staleTime: 1000 * 60 * 3, // 3 minutes
    ...options,
  });
};

/**
 * Hook to search users
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const { data: results } = useUserSearch(searchTerm, {
 *   enabled: searchTerm.length > 2
 * });
 * ```
 */
export const useUserSearch = (
  searchTerm: string,
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.search(searchTerm),
    queryFn: () => userQueries.search(searchTerm),
    staleTime: 1000 * 60, // 1 minute
    enabled: searchTerm.length > 2, // Only search if term is long enough
    ...options,
  });
};
```

---

### Layer 4: Mutation Hooks (React Integration)

**Location:** `hooks/mutations/*.ts`

**Purpose:** React hooks that wrap TanStack Query's `useMutation`.

**Rules:**
- ✅ Use React hooks (`useMutation`, `useQueryClient`)
- ✅ Handle cache invalidation
- ✅ Provide optimistic updates (when appropriate)
- ✅ Preserve user callbacks
- ❌ No data modification logic (delegate to mutation functions)

**Example:**

```typescript
// hooks/mutations/useUserMutations.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { userMutations } from '@/lib/api/mutations/user.mutations';
import { userKeys } from '@/hooks/queries/useUser';
import { User } from '@/lib/types';

/**
 * Hook for creating a new user
 *
 * @example
 * ```tsx
 * const createUser = useCreateUser({
 *   onSuccess: (newUser) => {
 *     console.log('Created:', newUser);
 *   },
 * });
 *
 * <Button onPress={() => createUser.mutate({ email: 'test@example.com', ... })}>
 *   Create User
 * </Button>
 * ```
 */
export const useCreateUser = (
  options?: UseMutationOptions<
    User,
    Error,
    {
      email: string;
      full_name: string;
      role: 'hr' | 'employee';
      department?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => userMutations.create(params),
    onSuccess: async (data, variables, context) => {
      // Invalidate all user lists
      await queryClient.invalidateQueries({
        queryKey: userKeys.lists(),
      });

      // Optionally set the new user in cache
      queryClient.setQueryData(userKeys.detail(data.id), data);

      // Call user's onSuccess callback
      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for updating a user
 *
 * Includes optimistic updates for better UX
 */
export const useUpdateUser = (
  userId: string,
  options?: UseMutationOptions<
    User,
    Error,
    Partial<Pick<User, 'full_name' | 'phone_number' | 'department'>>
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => userMutations.update(userId, updates),

    // Optimistic update: Update UI immediately
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId));

      // Optimistically update the cache
      if (previousUser) {
        queryClient.setQueryData<User>(userKeys.detail(userId), {
          ...previousUser,
          ...updates,
        });
      }

      // Return context with previous value
      return { previousUser };
    },

    // If mutation fails, roll back
    onError: (err, updates, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), context.previousUser);
      }
      options?.onError?.(err, updates, context);
    },

    // Always refetch after error or success
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      options?.onSettled?.(data, error, variables, context);
    },

    onSuccess: options?.onSuccess,
  });
};

/**
 * Hook for deleting a user
 */
export const useDeleteUser = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userMutations.delete(userId),
    onSuccess: async (_, userId, context) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) });

      // Invalidate lists
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      options?.onSuccess?.(_, userId, context);
    },
    onError: options?.onError,
  });
};
```

---

## Directory Structure

```
your-project/
├── lib/
│   ├── api/
│   │   ├── queries/                    # Pure query functions
│   │   │   ├── user.queries.ts
│   │   │   ├── attendance.queries.ts
│   │   │   ├── leave.queries.ts
│   │   │   └── salary.queries.ts
│   │   └── mutations/                  # Pure mutation functions
│   │       ├── user.mutations.ts
│   │       ├── attendance.mutations.ts
│   │       ├── leave.mutations.ts
│   │       └── salary.mutations.ts
│   ├── supabase/                       # Or your backend client
│   │   ├── client.ts
│   │   └── types.ts                    # Generated types
│   ├── types/
│   │   └── index.ts                    # Application types
│   └── utils/                          # Helper functions
│       ├── date.utils.ts
│       └── validation.utils.ts
│
├── hooks/
│   ├── queries/                        # useQuery hooks
│   │   ├── useUser.ts
│   │   ├── useAttendance.ts
│   │   ├── useLeave.ts
│   │   └── useSalary.ts
│   └── mutations/                      # useMutation hooks
│       ├── useUserMutations.ts
│       ├── useAttendanceMutations.ts
│       ├── useLeaveMutations.ts
│       └── useSalaryMutations.ts
│
├── components/                         # UI components
│   ├── UserProfile.tsx
│   ├── AttendanceCard.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Card.tsx
│
└── app/                                # Routes/Screens
    ├── users/
    │   ├── [id].tsx
    │   └── edit.tsx
    └── attendance/
        └── index.tsx
```

---

## Implementation Patterns

### Pattern 1: Query Key Factory

**Problem:** Inconsistent query keys lead to cache invalidation bugs.

**Solution:** Centralized query key factory with hierarchical structure.

```typescript
export const entityKeys = {
  all: ['entity'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters?: object) => [...entityKeys.lists(), filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (id: string) => [...entityKeys.details(), id] as const,
  // Add more as needed
};

// Usage in hooks:
useQuery({
  queryKey: entityKeys.detail(id),
  queryFn: () => entityQueries.getById(id),
});

// Invalidate specific query:
queryClient.invalidateQueries({ queryKey: entityKeys.detail(id) });

// Invalidate all entity queries:
queryClient.invalidateQueries({ queryKey: entityKeys.all });

// Invalidate all lists:
queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
```

**Benefits:**
- Type-safe keys with autocomplete
- Easy to invalidate related queries
- Clear hierarchy
- No typos

---

### Pattern 2: Stale Time Configuration

**Problem:** Choosing the right cache duration for different data types.

**Solution:** Configure `staleTime` based on data volatility.

```typescript
// Real-time data (e.g., live attendance status)
useQuery({
  staleTime: 1000 * 60 * 2,      // 2 minutes
  refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
});

// Frequently changing (e.g., today's records)
useQuery({
  staleTime: 1000 * 60 * 5,      // 5 minutes
});

// Moderate updates (e.g., user lists)
useQuery({
  staleTime: 1000 * 60 * 10,     // 10 minutes
});

// Rarely changes (e.g., organization settings)
useQuery({
  staleTime: 1000 * 60 * 30,     // 30 minutes
});

// Always fresh (e.g., current user session)
useQuery({
  staleTime: 0,                   // Always stale
  refetchOnMount: true,
  refetchOnWindowFocus: true,
});
```

---

### Pattern 3: Cache Invalidation Strategies

#### Strategy A: Targeted Invalidation (Precise)

Use when you know exactly which queries to invalidate.

```typescript
export const useUpdateUser = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => userMutations.update(userId, updates),
    onSuccess: () => {
      // Invalidate only this user's detail
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });

      // Invalidate all user lists (might contain this user)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};
```

#### Strategy B: Broad Invalidation (Aggressive)

Use when a mutation affects many related queries.

```typescript
export const useCheckIn = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => attendanceMutations.checkIn(userId),
    onSuccess: async () => {
      // Invalidate ALL attendance queries
      await queryClient.invalidateQueries({
        queryKey: ['attendance'],
        refetchType: 'all',
      });

      // Invalidate related queries (salary, earnings)
      await queryClient.invalidateQueries({ queryKey: ['salary'] });
      await queryClient.invalidateQueries({ queryKey: ['earnings'] });

      // Force refetch active queries immediately
      await queryClient.refetchQueries({
        queryKey: ['attendance'],
        type: 'active',
      });
    },
  });
};
```

#### Strategy C: Optimistic Updates

Use for instant UI feedback before server confirmation.

```typescript
export const useUpdateUser = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => userMutations.update(userId, updates),

    // 1. Update UI immediately
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });

      const previous = queryClient.getQueryData<User>(userKeys.detail(userId));

      if (previous) {
        queryClient.setQueryData<User>(userKeys.detail(userId), {
          ...previous,
          ...updates,
        });
      }

      return { previous };
    },

    // 2. If mutation fails, rollback
    onError: (err, updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userKeys.detail(userId), context.previous);
      }
    },

    // 3. Always refetch to sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
};
```

---

### Pattern 4: Conditional Queries

**Problem:** Running queries when prerequisites aren't met.

**Solution:** Use the `enabled` option.

```typescript
// Only fetch if userId exists
export const useUser = (userId: string | undefined) => {
  return useQuery({
    queryKey: userKeys.detail(userId!),
    queryFn: () => userQueries.getById(userId!),
    enabled: !!userId,  // Only run if userId is truthy
  });
};

// Only fetch if user is authenticated
export const useProfile = () => {
  const { isAuthenticated, userId } = useAuth();

  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userQueries.getById(userId),
    enabled: isAuthenticated && !!userId,
  });
};

// Only search if term is long enough
export const useUserSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: userKeys.search(searchTerm),
    queryFn: () => userQueries.search(searchTerm),
    enabled: searchTerm.length > 2,
  });
};
```

---

### Pattern 5: Dependent Queries

**Problem:** Query B depends on data from Query A.

**Solution:** Chain queries using `enabled`.

```typescript
function UserAttendance({ userId }: { userId: string }) {
  // First, fetch the user
  const { data: user } = useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userQueries.getById(userId),
  });

  // Then, fetch their attendance (only if user loaded)
  const { data: attendance } = useQuery({
    queryKey: attendanceKeys.byUser(userId),
    queryFn: () => attendanceQueries.getByUserId(userId),
    enabled: !!user, // Only run after user is loaded
  });

  // ...
}
```

---

### Pattern 6: Parallel Queries

**Problem:** Need multiple independent queries.

**Solution:** Use multiple `useQuery` calls or `useQueries`.

```typescript
function Dashboard() {
  // Method 1: Multiple useQuery calls (runs in parallel)
  const { data: users } = useUsers();
  const { data: attendance } = useAttendance();
  const { data: leaves } = useLeaves();

  // Method 2: useQueries (more control)
  const results = useQueries({
    queries: [
      {
        queryKey: userKeys.list(),
        queryFn: () => userQueries.getAll(),
      },
      {
        queryKey: attendanceKeys.today(),
        queryFn: () => attendanceQueries.getToday(),
      },
      {
        queryKey: leaveKeys.pending(),
        queryFn: () => leaveQueries.getPending(),
      },
    ],
  });

  const [usersResult, attendanceResult, leavesResult] = results;

  // ...
}
```

---

## Real-World Examples

### Example 1: Check-In Feature

**Scenario:** Employee checks in for the day. Need to update attendance and reflect it across all related views (dashboard, attendance list, earnings).

#### Step 1: Mutation Function

```typescript
// lib/api/mutations/attendance.mutations.ts
export const attendanceMutations = {
  checkIn: async (
    userId: string,
    notes?: string,
    wifiInfo?: { ssid: string | null; verified: boolean }
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Validate WiFi if required
    const { data: userData } = await supabase
      .from('users')
      .select('wifi_verification_required')
      .eq('id', userId)
      .single();

    if (userData?.wifi_verification_required && !wifiInfo?.verified) {
      throw new Error('You must be connected to office WiFi to check in');
    }

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
        check_in_wifi_ssid: wifiInfo?.ssid || null,
        check_in_wifi_verified: wifiInfo?.verified || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

#### Step 2: Mutation Hook

```typescript
// hooks/mutations/useAttendanceMutations.ts
export const useCheckIn = (
  userId: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    { notes?: string; wifiInfo?: { ssid: string | null; verified: boolean } }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notes, wifiInfo }) =>
      attendanceMutations.checkIn(userId, notes, wifiInfo),

    onSuccess: async (data, variables, context) => {
      // Broad invalidation: check-in affects many queries
      await queryClient.invalidateQueries({
        queryKey: ['attendance'],
        refetchType: 'all',
      });

      await queryClient.invalidateQueries({ queryKey: ['salary'] });
      await queryClient.invalidateQueries({ queryKey: ['earnings'] });

      // Force immediate refetch of active queries
      await queryClient.refetchQueries({
        queryKey: ['attendance'],
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
  });
};
```

#### Step 3: Component Usage

```typescript
// components/CheckInButton.tsx
import { useCheckIn } from '@/hooks/mutations/useAttendanceMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from '@/components/ui/Button';

export function CheckInButton() {
  const { user } = useAuth();
  const checkIn = useCheckIn(user.id, {
    onSuccess: () => {
      Alert.alert('Success', 'Checked in successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  return (
    <Button
      onPress={() => checkIn.mutate({ notes: 'Morning check-in' })}
      loading={checkIn.isPending}
      disabled={checkIn.isPending}
    >
      Check In
    </Button>
  );
}
```

---

### Example 2: Employee List with Search

**Scenario:** HR views all employees with real-time search.

#### Step 1: Query Functions

```typescript
// lib/api/queries/user.queries.ts
export const userQueries = {
  getAll: async (filters?: {
    department?: string;
    role?: string;
  }): Promise<User[]> => {
    let query = supabase.from('users').select('*');

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  search: async (searchTerm: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  },
};
```

#### Step 2: Query Hooks

```typescript
// hooks/queries/useUser.ts
export const useUsers = (
  filters?: { department?: string; role?: string },
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => userQueries.getAll(filters),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useUserSearch = (
  searchTerm: string,
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.search(searchTerm),
    queryFn: () => userQueries.search(searchTerm),
    staleTime: 1000 * 60,
    enabled: searchTerm.length > 2, // Only search if term is meaningful
    ...options,
  });
};
```

#### Step 3: Component

```typescript
// app/hr/employees.tsx
import { useState } from 'react';
import { useUsers, useUserSearch } from '@/hooks/queries/useUser';
import { useDebounce } from '@/hooks/useDebounce';

export default function EmployeesScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Show search results if searching, otherwise show all users
  const { data: allUsers } = useUsers(undefined, {
    enabled: !debouncedSearch, // Disable when searching
  });

  const { data: searchResults } = useUserSearch(debouncedSearch, {
    enabled: debouncedSearch.length > 2, // Only search if term is long enough
  });

  const displayUsers = debouncedSearch ? searchResults : allUsers;

  return (
    <View>
      <SearchBar
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search employees..."
      />

      <FlatList
        data={displayUsers}
        renderItem={({ item }) => <EmployeeCard user={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
```

---

## Best Practices

### 1. Error Handling

```typescript
// In query/mutation functions: Throw errors
export const userQueries = {
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error; // Let React Query handle it
    return data;
  },
};

// In components: Handle errors gracefully
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useUser(userId);

  if (error) {
    return (
      <ErrorView
        message="Failed to load user"
        onRetry={() => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })}
      />
    );
  }

  if (isLoading) return <LoadingSpinner />;

  return <ProfileCard user={user} />;
}
```

---

### 2. Loading States

```typescript
function UserList() {
  const { data: users, isLoading, isFetching, isRefetching } = useUsers();

  // Initial load
  if (isLoading) return <LoadingSpinner />;

  return (
    <FlatList
      data={users}
      renderItem={({ item }) => <UserCard user={item} />}
      // Show refresh indicator on background refetch
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: userKeys.lists() })}
        />
      }
      // Show subtle indicator on background refetch
      ListHeaderComponent={
        isFetching && !isRefetching ? <SubtleLoadingBar /> : null
      }
    />
  );
}
```

---

### 3. TypeScript Best Practices

```typescript
// Define return types explicitly
export const userQueries = {
  getById: async (id: string): Promise<User> => {
    // ...
  },
};

// Use Omit to prevent overriding critical options
export const useUser = (
  userId: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userQueries.getById(userId),
    ...options,
  });
};

// Type mutation parameters
export const useCreateUser = (
  options?: UseMutationOptions<
    User,                    // Return type
    Error,                   // Error type
    { email: string; ... }   // Variables type
  >
) => {
  return useMutation({
    mutationFn: (params) => userMutations.create(params),
    ...options,
  });
};
```

---

### 4. Query Key Consistency

```typescript
// ✅ GOOD: Consistent, hierarchical keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: object) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// ❌ BAD: Inconsistent keys
useQuery({ queryKey: ['users', userId], ... });
useQuery({ queryKey: ['user', userId], ... });
useQuery({ queryKey: [userId, 'user'], ... });
```

---

### 5. Preserve User Callbacks

```typescript
export const useUpdateUser = (
  userId: string,
  options?: UseMutationOptions<User, Error, Updates>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => userMutations.update(userId, updates),
    onSuccess: async (data, variables, context) => {
      // Your logic
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });

      // ✅ IMPORTANT: Call user's callback
      options?.onSuccess?.(data, variables, context);
    },
    // Also preserve other callbacks
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
```

---

## Performance Optimization

### 1. Debounce Search Inputs

```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data } = useUserSearch(debouncedSearch);
  // ...
}
```

---

### 2. Pagination

```typescript
// Query function
export const userQueries = {
  getPage: async (page: number, pageSize: number = 20) => {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      users: data || [],
      totalCount: count || 0,
      hasMore: (count || 0) > to + 1,
    };
  },
};

// Hook
export const useUsersPaginated = (page: number) => {
  return useQuery({
    queryKey: userKeys.page(page),
    queryFn: () => userQueries.getPage(page),
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true, // Keep old data while loading new page
  });
};

// Component
function UserList() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching } = useUsersPaginated(page);

  return (
    <>
      <FlatList data={data?.users} ... />
      <Button
        onPress={() => setPage(p => p + 1)}
        disabled={!data?.hasMore || isFetching}
      >
        Load More
      </Button>
    </>
  );
}
```

---

### 3. Infinite Queries

```typescript
// For infinite scroll
export const useUsersInfinite = () => {
  return useInfiniteQuery({
    queryKey: userKeys.lists(),
    queryFn: ({ pageParam = 0 }) => userQueries.getPage(pageParam),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
    staleTime: 1000 * 60 * 5,
  });
};

// Component
function UserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsersInfinite();

  const users = data?.pages.flatMap(page => page.users) || [];

  return (
    <FlatList
      data={users}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <LoadingSpinner /> : null
      }
    />
  );
}
```

---

### 4. Prefetching

```typescript
// Prefetch on hover/focus (web)
function UserCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const prefetchUser = () => {
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(userId),
      queryFn: () => userQueries.getById(userId),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <Link
      href={`/users/${userId}`}
      onMouseEnter={prefetchUser} // Prefetch on hover
      onFocus={prefetchUser}      // Prefetch on focus
    >
      {user.name}
    </Link>
  );
}

// Prefetch on navigation intent
function EmployeeList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleNavigate = (userId: string) => {
    // Prefetch before navigation
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(userId),
      queryFn: () => userQueries.getById(userId),
    });

    router.push(`/users/${userId}`);
  };

  return (
    <FlatList
      data={users}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleNavigate(item.id)}>
          <UserCard user={item} />
        </TouchableOpacity>
      )}
    />
  );
}
```

---

## Is This Approach Good?

### ✅ Strengths

1. **Excellent Separation of Concerns**
   - Data fetching is completely decoupled from React and UI
   - Easy to test each layer independently
   - Can reuse query/mutation functions outside of React (e.g., in Node.js scripts)

2. **Type Safety**
   - Full TypeScript coverage end-to-end
   - Generated database types from Supabase
   - Autocomplete for query keys and functions

3. **Maintainability**
   - Clear file structure and naming conventions
   - Easy to find and modify code
   - Consistent patterns across the codebase

4. **Scalability**
   - Adding new features is straightforward (follow the pattern)
   - Query key factory prevents cache bugs
   - Easy to refactor without breaking things

5. **Performance**
   - Fine-grained cache control with `staleTime`
   - Optimistic updates for instant UX
   - Efficient cache invalidation strategies

6. **Developer Experience**
   - Clear documentation and examples
   - Hooks are easy to use in components
   - Great IntelliSense support

---

### ⚠️ Potential Weaknesses

1. **Boilerplate**
   - Three files for each entity (queries, mutations, hooks)
   - More upfront setup than inline queries
   - **Mitigation:** Use code generators or snippets

2. **Learning Curve**
   - Team needs to understand the pattern
   - Multiple concepts to learn (query keys, invalidation, etc.)
   - **Mitigation:** Good documentation (this file!) and examples

3. **Over-Engineering for Simple Apps**
   - Might be overkill for small projects with few queries
   - **When to use:** Medium to large applications, team projects

4. **Cache Invalidation Complexity**
   - Deciding between targeted vs. broad invalidation
   - Need to think about related queries
   - **Mitigation:** Document invalidation strategies per entity

---

### 🎯 When to Use This Pattern

**✅ Use this pattern when:**
- Building medium to large applications
- Working in a team
- Need to maintain the code long-term
- Have complex data relationships
- Want strong type safety
- Need to test data fetching logic independently

**❌ Consider simpler approaches when:**
- Building a small prototype or MVP
- Working solo on a simple app
- Have very few queries (< 10)
- Don't need complex cache management

---

### 📊 Comparison with Alternatives

| Approach | Separation of Concerns | Type Safety | Testability | Boilerplate | Learning Curve |
|----------|----------------------|-------------|-------------|-------------|----------------|
| **This Pattern** | ✅ Excellent | ✅ Full | ✅ Easy | ⚠️ Medium | ⚠️ Medium |
| **Inline useQuery** | ❌ Poor | ✅ Good | ❌ Hard | ✅ Low | ✅ Easy |
| **Custom Hooks Only** | ⚠️ Medium | ✅ Good | ⚠️ Medium | ✅ Low | ✅ Easy |
| **RTK Query** | ✅ Good | ✅ Good | ✅ Easy | ⚠️ High | ❌ Hard |
| **Apollo Client** | ✅ Good | ✅ Good | ✅ Easy | ⚠️ High | ❌ Hard |

---

### 🏆 Overall Verdict

**This is an EXCELLENT pattern for production applications.**

**Why:**
1. It scales beautifully from small to large codebases
2. Prevents common bugs (cache inconsistency, type errors)
3. Makes code easy to understand and maintain
4. Supports team collaboration well
5. Aligns with industry best practices

**Recommended for:**
- Production applications
- Team projects
- Long-term maintenance
- Complex data requirements

**Use with caution for:**
- Quick prototypes (might be overkill)
- Very simple apps (< 10 queries)
- Solo learning projects (simpler patterns first)

---

## Quick Start Template

### Step 1: Set up types

```typescript
// lib/types/index.ts
import { Tables } from '../supabase/types';

export type User = Tables<'users'>;
export type Post = Tables<'posts'>;
// ... more types
```

### Step 2: Create query functions

```typescript
// lib/api/queries/post.queries.ts
import { supabase } from '@/lib/supabase/client';
import { Post } from '@/lib/types';

export const postQueries = {
  getAll: async (): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Post> => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },
};
```

### Step 3: Create mutation functions

```typescript
// lib/api/mutations/post.mutations.ts
import { supabase } from '@/lib/supabase/client';
import { Post } from '@/lib/types';

export const postMutations = {
  create: async (params: { title: string; content: string }): Promise<Post> => {
    const { data, error } = await supabase
      .from('posts')
      .insert(params)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Post>): Promise<Post> => {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
```

### Step 4: Create query hooks

```typescript
// hooks/queries/usePost.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { postQueries } from '@/lib/api/queries/post.queries';
import { Post } from '@/lib/types';

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters?: object) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

export const usePosts = (
  options?: Omit<UseQueryOptions<Post[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: postKeys.list(),
    queryFn: () => postQueries.getAll(),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const usePost = (
  id: string,
  options?: Omit<UseQueryOptions<Post>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => postQueries.getById(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
    ...options,
  });
};
```

### Step 5: Create mutation hooks

```typescript
// hooks/mutations/usePostMutations.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { postMutations } from '@/lib/api/mutations/post.mutations';
import { postKeys } from '@/hooks/queries/usePost';
import { Post } from '@/lib/types';

export const useCreatePost = (
  options?: UseMutationOptions<Post, Error, { title: string; content: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => postMutations.create(params),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
  });
};

export const useUpdatePost = (
  id: string,
  options?: UseMutationOptions<Post, Error, Partial<Post>>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => postMutations.update(id, updates),
    onSuccess: async (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
  });
};

export const useDeletePost = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => postMutations.delete(id),
    onSuccess: async (_, id, context) => {
      queryClient.removeQueries({ queryKey: postKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      options?.onSuccess?.(_, id, context);
    },
    onError: options?.onError,
  });
};
```

### Step 6: Use in components

```typescript
// app/posts/index.tsx
import { usePosts } from '@/hooks/queries/usePost';
import { useCreatePost } from '@/hooks/mutations/usePostMutations';

export default function PostsScreen() {
  const { data: posts, isLoading } = usePosts();
  const createPost = useCreatePost({
    onSuccess: () => {
      Alert.alert('Success', 'Post created!');
    },
  });

  if (isLoading) return <Loading />;

  return (
    <View>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
      />
      <Button
        onPress={() =>
          createPost.mutate({
            title: 'New Post',
            content: 'Hello world',
          })
        }
      >
        Create Post
      </Button>
    </View>
  );
}
```

---

## Conclusion

This TanStack Query architecture provides:

- ✅ **Clean code** with clear separation of concerns
- ✅ **Type safety** end-to-end
- ✅ **Scalability** for growing applications
- ✅ **Maintainability** with consistent patterns
- ✅ **Performance** with intelligent caching
- ✅ **Developer experience** with great tooling

**It's battle-tested, production-ready, and highly recommended for professional React applications.**

---

## Additional Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Query Key Factory Pattern](https://tkdodo.eu/blog/effective-react-query-keys)
- [Cache Invalidation Best Practices](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- [Optimistic Updates Guide](https://tkdodo.eu/blog/optimistic-updates-in-react-query)

---

**Last Updated:** 2025-01-30

**Author:** Based on analysis of a production Khatabook app implementation
