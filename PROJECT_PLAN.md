# Salary Book & Attendance Management App - Project Plan

## Overview
A comprehensive employee attendance and salary management system where employees can check in/out, view their profiles and salary information, with HR and manager oversight capabilities.

---

## Tech Stack
- **Framework**: React Native with Expo (Expo Router for navigation)
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (Database, Auth, Real-time)
- **Query Language**: Supabase PostgreSQL with RLS policies
- **UI**: React Native components with custom styling
- **Authentication**: Supabase Auth with expo-auth-session
- **Platform**: iOS, Android, Web (Expo supports all)

---

## Database Schema

### Tables

#### 1. `users` (extends Supabase auth.users)
- id (uuid, primary key)
- email
- full_name
- role (enum: 'employee', 'hr')
- employee_id (unique)
- created_at

#### 2. `employee_profiles`
- id (uuid, primary key)
- user_id (foreign key → users)
- department
- designation
- join_date
- salary_amount
- salary_currency
- phone_number
- address
- profile_image_url
- created_at
- updated_at

#### 3. `attendance_records`
- id (uuid, primary key)
- user_id (foreign key → users)
- check_in_time (timestamp)
- check_out_time (timestamp, nullable)
- date (date)
- total_hours (decimal, computed)
- is_valid_day (boolean, based on minimum hours)
- marked_by (foreign key → users) - who marked it
- marked_by_role (enum: 'self', 'hr')
- check_in_method (enum: 'self', 'manual') - Phase 2: will add 'wifi_verified'
- notes (text, nullable)
- created_at
- updated_at

#### 4. `attendance_settings`
- id (uuid, primary key)
- minimum_hours_per_day (decimal, default: 8)
- office_wifi_ssid (text) - Phase 2
- office_wifi_enabled (boolean, default: false) - Phase 2
- created_at
- updated_at

#### 5. `salary_records`
- id (uuid, primary key)
- user_id (foreign key → users)
- month (date)
- base_salary
- days_present
- days_required
- deductions
- bonuses
- net_salary
- payment_status (enum: 'pending', 'paid')
- paid_on (timestamp, nullable)
- created_at
- updated_at

---

## Phase 1: Core Attendance & Salary System

### Features

#### 1. Authentication & Authorization
- Supabase Auth integration
- Role-based access control (RLS policies)
- Protected routes based on user roles
- Session management

#### 2. Employee Features

##### Check In/Out System
- Check in button (records timestamp)
- Check out button (records timestamp, calculates hours)
- View current day status (checked in/out, hours worked)
- Real-time status updates
- Validation: Cannot check in if already checked in
- Validation: Cannot check out if not checked in

##### Personal Dashboard
- Current month attendance summary
- Days present vs days required
- Total hours worked
- Upcoming salary projection
- Recent attendance history (last 7 days)

##### Employee Profile
- View personal information
- View salary details
- View department
- Profile image
- Contact information

##### Attendance History
- Calendar view of attendance
- Filter by date range
- View daily hours worked
- Valid/invalid day indicators
- Monthly summary statistics

#### 3. HR Features

##### All Employee Management
- View all employees across departments
- Mark attendance for any employee
- Access all attendance records
- Generate attendance reports
- Manage employee profiles

##### Salary Management
- View all salary records
- Generate monthly salary sheets
- Mark salary as paid/unpaid
- Calculate net salary based on attendance

##### System Settings
- Configure minimum hours per day
- Manage attendance rules
- User role management

#### 4. Shared Features

##### Notifications
- Check in reminder (if not checked in by specific time)
- Check out reminder (if not checked out by EOD)
- Attendance marked by HR notification

---

## Phase 2: WiFi Verification & Advanced Features

### Additional Features

#### 1. WiFi Verification System
- Check device WiFi connection before check in
- Verify against configured office WiFi SSID
- Browser API for network detection (limited support)
- Fallback: Allow check in with flag "Not verified by WiFi"
- Settings to enable/disable WiFi requirement

#### 2. Geolocation (Optional Enhancement)
- Verify employee is within office premises
- Geofencing capabilities
- Location-based check in validation

#### 3. Advanced Reporting
- Export attendance to Excel/PDF
- Department-wise reports
- Late check-in/early check-out tracking
- Monthly trends and analytics
- Overtime calculation

#### 4. Leave Management
- Apply for leave
- Leave approval workflow
- Leave balance tracking
- Leave types (sick, casual, earned)
- Integration with attendance

#### 5. Biometric/QR Code Integration
- QR code-based check in
- Integration with biometric devices
- Mobile app for QR scanning

---

## Screen Structure (Expo Router File-based Routing)

### Auth Screens (Unauthenticated)
1. **Login Screen** (`app/auth/login.tsx`)
   - Email/password login
   - Forgot password link
   - Supabase Auth integration
   - Redirect to appropriate dashboard after login

2. **Forgot Password Screen** (`app/auth/forgot-password.tsx`)
   - Password reset flow
   - Email input
   - Back to login

### Employee Screens (Tab Navigation)
3. **Employee Dashboard** (`app/(tabs)/index.tsx`)
   - Large check in/out button
   - Today's status card (hours worked)
   - Monthly summary cards (days present)
   - Quick stats widgets
   - Recent attendance list

4. **My Attendance** (`app/(tabs)/attendance.tsx`)
   - Calendar view (react-native-calendars or custom)
   - Date range picker
   - FlatList of attendance records
   - Monthly statistics bar
   - Filter options

5. **My Salary** (`app/(tabs)/salary.tsx`)
   - Current month projection card
   - Salary breakdown
   - Payment status indicator
   - Salary history (FlatList)
   - Detailed calculation modal

6. **My Profile** (`app/(tabs)/profile.tsx`)
   - Profile image
   - Personal information
   - Salary details (view only for employees)
   - Department details
   - Edit profile button
   - Logout button

### HR Screens (Tab Navigation)
7. **HR Dashboard** (`app/(tabs)/index.tsx` - for HR role)
   - Company-wide statistics cards
   - Department summaries
   - Pending salary payments
   - Quick action buttons
   - Recent activity feed

8. **All Employees** (`app/(tabs)/employees.tsx` - HR only)
   - Employee list (FlatList with search)
   - Filter by department
   - Add employee button (modal)
   - Pull-to-refresh
   - Card layout with key info

9. **Attendance Management** (`app/(tabs)/attendance.tsx` - HR version)
   - All attendance records (FlatList)
   - Search by employee
   - Filter by date range
   - Mark attendance for anyone
   - Bulk actions bottom sheet

10. **Settings/Profile** (`app/(tabs)/profile.tsx` - HR version)
    - HR profile information
    - Attendance settings (min hours)
    - WiFi configuration (Phase 2)
    - System preferences
    - Logout button

### HR Stack Screens
11. **Employee Detail** (`app/hr/employee/[id].tsx`)
    - Full employee profile
    - Edit employee button
    - Attendance summary
    - Salary information
    - Action buttons (mark attendance, edit)

12. **Add/Edit Employee** (`app/hr/employee/edit.tsx` or modal)
    - Form with all employee fields
    - Department picker
    - Role selector (employee/hr)
    - Salary input
    - Save/Cancel actions

13. **Salary Management** (`app/hr/salary.tsx`)
    - Monthly salary sheet view
    - Generate salary button
    - Employee salary list (FlatList)
    - Mark as paid action
    - Export functionality

### Shared Screens
14. **Notifications** (`app/notifications.tsx`)
    - FlatList of all notifications
    - Mark as read action
    - Filter by type
    - Clear all button

15. **Check In/Out Modal** (`app/modals/check-in-out.tsx`)
    - Confirmation modal for check in/out
    - Current time display
    - Notes field (optional)
    - Confirm/Cancel buttons

---

## Key Features by Role

| Feature | Employee | HR |
|---------|----------|-----|
| Check In/Out | ✓ | ✓ |
| View Own Attendance | ✓ | ✓ |
| View Own Salary | ✓ | ✓ |
| View All Employees | ✗ | ✓ |
| Mark Anyone's Attendance | ✗ | ✓ |
| Manage Salaries | ✗ | ✓ |
| System Settings | ✗ | ✓ |
| Add/Edit Employees | ✗ | ✓ |

---

## Supabase Setup Requirements

### 0. Package Installation (Verified with Official Docs)

**Required packages:**
```bash
# Core Supabase and storage
npx expo install @supabase/supabase-js expo-sqlite

# OR if using AsyncStorage approach (both work):
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage

# Additional packages for Phase 1
npx expo install @tanstack/react-query react-native-calendars

# URL polyfill for React Native
npm install react-native-url-polyfill
```

**Supabase Client Setup (`lib/supabase.ts`):**
```typescript
// Option 1: Using expo-sqlite (Recommended by Expo docs)
import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

// Option 2: Using AsyncStorage (Recommended by Supabase docs)
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

**Environment Variables (.env):**
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Auth State Management (App.tsx or _layout.tsx):**
```typescript
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { supabase } from './lib/supabase'

// Tells Supabase to refresh session when app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

// Listen to auth state changes
useEffect(() => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    // Handle auth state changes
  })
  return () => data.subscription.unsubscribe()
}, [])
```

### 1. Database Setup
- Create Supabase project in dashboard
- Create all tables with proper relationships
- Set up foreign key constraints
- Create indexes for performance

### 2. Row Level Security (RLS) Policies

#### users table
- Employees can read their own record
- HR can read all records

#### attendance_records table
- Employees can insert/read their own records
- HR can insert/read/update all records

#### employee_profiles table
- Employees can read their own profile
- HR can read/update all profiles

#### salary_records table
- Employees can read their own salary
- HR can read/update all salary records

### 3. Database Functions
- Function to calculate total hours worked
- Function to determine if day is valid (min hours)
- Function to prevent duplicate check-ins
- Trigger to update `is_valid_day` on check out

### 4. Real-time Subscriptions
- Subscribe to attendance changes
- Subscribe to notifications
- Real-time dashboard updates

---

## TanStack Query Structure

### Query Keys Convention
```
['users', userId]
['employee-profile', userId]
['attendance', userId, { month, year }]
['attendance-today', userId]
['team-attendance', managerId]
['salary', userId, { month, year }]
['settings']
```

### Mutations
- `useCheckIn`
- `useCheckOut`
- `useMarkAttendance`
- `useUpdateProfile`
- `useCreateSalaryRecord`
- `useUpdateSalaryStatus`

### Query Patterns
- Prefetching for dashboard data
- Optimistic updates for check in/out
- Invalidation after mutations
- Background refetching for real-time feel

---

## Implementation Phases

### Phase 1A: Foundation (Week 1)
- **Supabase Dashboard Setup:**
  - Create new Supabase project
  - Get Project URL and anon key
  - Create database schema (tables listed above)
  - Set up RLS policies

- **Package Installation (Verified):**
  ```bash
  npx expo install @supabase/supabase-js expo-sqlite
  npx expo install @tanstack/react-query react-native-calendars
  npm install react-native-url-polyfill
  ```

- **Project Configuration:**
  - Create `.env` with Supabase credentials
  - Set up `lib/supabase.ts` with client (use expo-sqlite approach)
  - Configure TanStack Query provider
  - Set up auth state management with AppState listener

- **App Structure:**
  - Root layout (`app/_layout.tsx`) with auth check
  - Protected route logic
  - Constants and theme setup
  - Basic navigation structure

### Phase 1B: Employee Core (Week 2)
- Employee tab navigation setup (Home, Attendance, Salary, Profile)
- Employee dashboard screen
- Check in/out functionality with modals
- Real-time status updates
- Profile screen (read-only for employees)
- Attendance history screen with FlatList
- Calendar component for attendance view
- Salary screen with breakdown
- Basic UI components (Card, Button, etc.)

### Phase 1C: HR Features (Week 3)
- HR tab navigation (Dashboard, Employees, Attendance, Settings)
- HR dashboard with company stats
- All employees screen with search/filter
- Employee detail screen
- Add/Edit employee form
- Mark attendance for any employee
- Salary management screen (accessed from dashboard)
- Settings screen with attendance configuration
- Bottom sheets for bulk actions

### Phase 1D: Polish & Testing (Week 4)
- UI/UX improvements (animations, transitions)
- Error handling with error boundaries
- Loading states and skeletons
- Form validations
- Pull-to-refresh on all lists
- Offline support (React Query cache)
- Push notifications setup (expo-notifications)
- Testing all flows on iOS/Android
- Performance optimization

### Phase 2A: WiFi Verification (Week 5)
- Install `expo-network` for WiFi detection
- WiFi verification before check-in
- Settings screen updates for WiFi config
- Modified check-in flow with WiFi check
- Fallback for manual check-in
- HR can bypass WiFi requirement

### Phase 2B: Advanced Features (Week 6-7)
- Install `expo-sharing` and `expo-file-system` for exports
- Enhanced reporting with charts (`react-native-chart-kit` or `victory-native`)
- Export to PDF/CSV functionality
- Leave management screens and flow
- Leave approval workflow
- Analytics dashboard with visualizations
- Geolocation support (`expo-location`)
- Advanced filters and search
- Overtime tracking

---

## Key Technical Considerations

### 1. Minimum Code Principles
- Use Supabase built-in features (Auth, RLS, Real-time)
- Leverage TanStack Query for caching (avoid redundant state)
- Use React Native's built-in components (FlatList, ScrollView, etc.)
- Shared components for repeated UI patterns
- Utility functions for common calculations
- Expo modules for native features (WiFi detection, location, etc.)

### 2. Clean Code Structure
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
  /ui - Reusable UI components (Button, Card, etc.)
  /attendance - Attendance-specific components
  /salary - Salary-specific components
/lib
  /supabase - Supabase client setup
  /queries - TanStack Query hooks
  /utils - Helper functions
  /types - TypeScript types
/constants
  /Colors.ts - Theme colors
  /Config.ts - App configuration
/hooks
  /useAuth.ts - Authentication hook
  /useUser.ts - User data hook
/assets - Images, fonts, icons
```

### 3. Performance Optimization
- FlatList with proper keyExtractor and optimization props
- React.memo for expensive components
- useMemo/useCallback for expensive calculations
- Pagination for large data sets (FlatList pagination)
- Debounced search inputs
- Image optimization (expo-image)
- Efficient database queries with proper indexes
- React Query's automatic caching and background updates

### 4. Security
- All database operations through RLS
- Validate user roles on every action
- Sanitize inputs
- Secure API routes
- Environment variables for sensitive data

---

## Success Metrics

### Phase 1
- Employees can check in/out successfully
- Attendance is accurately tracked
- Managers can view and manage team attendance
- HR can manage all employees and salaries
- System calculates valid days correctly

### Phase 2
- WiFi verification works reliably
- Advanced reports generate correctly
- Leave management integrates seamlessly
- System handles edge cases gracefully
- Performance remains optimal with scale

---

## React Native & Expo Specific Considerations

### Navigation Pattern
- **Expo Router** file-based routing (already configured)
- Tab navigator for main app sections (employee, manager, hr)
- Stack navigator for nested screens
- Modal presentation for forms and confirmations
- Deep linking support for notifications

### Native Features (Expo Modules)
- **expo-sqlite**: LocalStorage polyfill for Supabase auth (Phase 1)
- **expo-network**: WiFi detection and network info (Phase 2)
- **expo-location**: Geolocation for office check-in (Phase 2)
- **expo-notifications**: Push notifications (Phase 1E)
- **expo-image**: Optimized image loading (Phase 1B)
- **expo-file-system**: File operations for exports (Phase 2B)
- **expo-sharing**: Share functionality (Phase 2B)
- **react-native-url-polyfill**: URL polyfill for React Native (Phase 1A)

### UI Components Strategy
- Build custom components (no heavy UI library needed)
- Use React Native's built-in components
- Custom styling with StyleSheet
- Reusable component library in `/components/ui`
- Consistent theming via constants

### Offline Support
- React Query cache persistence
- AsyncStorage for auth tokens
- Queue failed mutations for retry
- Offline indicator in UI
- Sync when back online

### Platform-Specific Considerations
- **iOS**: Use SafeAreaView, respect notch
- **Android**: Handle back button, use Material design patterns
- **Web**: Responsive layout, keyboard navigation
- Test on all platforms before release

---

## Future Enhancements (Post Phase 2)
- Biometric authentication (Face ID, Touch ID)
- Apple Watch / Android Wear companion app
- Widget for quick check-in
- Shift management for 24/7 operations
- Integration with payroll systems
- AI-based anomaly detection
- Facial recognition for attendance
- Integration with HR management systems
- Multi-tenant support for multiple companies
- Slack/Teams integration for notifications
