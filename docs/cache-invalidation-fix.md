# Cache Invalidation Issue Fix - HR Leave & Salary Screens

## Problem Statement

After approving or rejecting leave requests or salary records in the HR screens, the UI was not updating to reflect the changes. The approve/reject buttons remained visible even after successful mutation, requiring a full app reload to see the updated data.

## Root Cause Analysis

### The Issue: Callback Overwriting

The mutation hooks (`useUpdateSalaryStatus` and `useReviewLeaveRequest`) were designed with cache invalidation logic in their `onSuccess` callbacks:

```typescript
export const useUpdateSalaryStatus = (options?) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, status, approvedBy }) =>
      salaryMutations.updateSalaryStatus(recordId, status, approvedBy),
    onSuccess: async (_, variables) => {
      // Cache invalidation logic here
      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all'
      });
      await queryClient.refetchQueries({
        queryKey: salaryKeys.all,
        type: 'active'
      });
    },
    ...options,  // ❌ PROBLEM: This spreads user options AFTER onSuccess
  });
};
```

When the screen components used these hooks, they passed their own `onSuccess` callback to show alerts:

```typescript
// app/(hr)/salary.tsx
const updateStatusMutation = useUpdateSalaryStatus({
  onSuccess: () => {
    Alert.alert('Success', 'Salary status updated');  // ❌ This replaces the cache invalidation!
  },
  onError: (error) => {
    Alert.alert('Error', error.message);
  },
});
```

The problem: JavaScript object spreading (`...options`) **overwrites** properties that come before it. So the user's `onSuccess` callback completely replaced the mutation hook's cache invalidation logic.

### Why This Happened

1. The mutation hook defined `onSuccess` with cache invalidation
2. Then `...options` was spread, which included the user's `onSuccess`
3. JavaScript object spreading overwrites earlier properties with later ones
4. Result: Cache invalidation never ran, only the Alert was shown

### Why Attendance Worked

The attendance mutations followed the same pattern, but they worked because we were likely not passing custom `onSuccess` callbacks in the attendance screens, so the spread didn't overwrite anything.

## The Solution

### Fix: Merge Callbacks Instead of Replacing

We modified the mutation hooks to explicitly merge both callbacks:

**Before (Broken):**
```typescript
export const useUpdateSalaryStatus = (options?) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, status, approvedBy }) =>
      salaryMutations.updateSalaryStatus(recordId, status, approvedBy),
    onSuccess: async (_, variables) => {
      // Cache invalidation
      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all'
      });
      await queryClient.refetchQueries({
        queryKey: salaryKeys.all,
        type: 'active'
      });
    },
    ...options,  // ❌ Overwrites onSuccess
  });
};
```

**After (Fixed):**
```typescript
export const useUpdateSalaryStatus = (options?) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, status, approvedBy }) =>
      salaryMutations.updateSalaryStatus(recordId, status, approvedBy),
    onSuccess: async (data, variables, context) => {
      // 1. First, do cache invalidation
      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all'
      });
      await queryClient.refetchQueries({
        queryKey: salaryKeys.all,
        type: 'active'
      });

      // 2. Then, call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context);
    },
    // Explicitly pass through other callbacks
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
```

### Key Changes

1. **Changed callback signature**: From `(_, variables)` to `(data, variables, context)` to match TanStack Query's full signature
2. **Added explicit callback invocation**: `options?.onSuccess?.(data, variables, context)` at the end
3. **Removed spread operator**: Instead of `...options`, we explicitly pass through each callback type
4. **Guaranteed execution order**: Cache invalidation always runs first, then user's callback

## Files Modified

### 1. `/hooks/mutations/useSalaryMutations.ts`
- Updated `useUpdateSalaryStatus` mutation hook
- Lines 37-65

### 2. `/hooks/mutations/useLeaveMutations.ts`
- Updated `useReviewLeaveRequest` mutation hook
- Lines 28-61

## Technical Details

### TanStack Query Mutation Callbacks

TanStack Query mutation callbacks receive three parameters:
- `data`: The data returned from the mutation function
- `variables`: The variables passed to the mutation
- `context`: Optional context from `onMutate`

The proper way to extend mutation hooks is to:
1. Execute your custom logic first
2. Then invoke the user's callbacks with all parameters
3. Explicitly pass through each callback type instead of spreading

### Cache Invalidation Strategy

We use a two-step approach for immediate UI updates:

```typescript
// Step 1: Mark all queries as stale and trigger refetch
await queryClient.invalidateQueries({
  queryKey: salaryKeys.all,
  refetchType: 'all'  // Refetch both active and inactive queries
});

// Step 2: Force immediate refetch of active queries
await queryClient.refetchQueries({
  queryKey: salaryKeys.all,
  type: 'active'  // Only refetch currently mounted queries
});
```

Combined with `staleTime: 0` in the query hooks, this ensures instant UI updates.

## Lessons Learned

1. **Order matters with object spreading**: Properties after the spread operator override earlier ones
2. **Hook composition requires explicit callback merging**: When creating wrapper hooks, merge callbacks instead of replacing them
3. **Test with realistic usage**: The hooks worked in isolation but failed when used with custom callbacks
4. **Follow callback signatures**: Use the full signature `(data, variables, context)` to support all use cases

## Best Practice Pattern

When creating mutation hooks that accept options:

```typescript
export const useSomeMutation = (options?) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: someMutationFunction,

    // ✅ Merge callbacks - your logic first, then user's callback
    onSuccess: async (data, variables, context) => {
      // Your hook's logic
      await queryClient.invalidateQueries(...);

      // User's callback
      options?.onSuccess?.(data, variables, context);
    },

    // ✅ Explicitly pass through other callbacks
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,

    // ❌ DON'T use spread operator for options
    // ...options,
  });
};
```

## Result

After this fix:
- ✅ Approving/rejecting leave requests updates the UI instantly
- ✅ Approving/marking salary records as paid updates the UI instantly
- ✅ Success/error alerts still display correctly
- ✅ No app reload required to see changes
- ✅ Behavior now matches the attendance tab's instant updates

## References

- TanStack Query Mutations: https://tanstack.com/query/latest/docs/react/guides/mutations
- Object Spread Operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
- Query Invalidation: https://tanstack.com/query/latest/docs/react/guides/query-invalidation
