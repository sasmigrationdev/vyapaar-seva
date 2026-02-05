# Style Audit

Audit a component or screen for styling consistency with the design system.

## Instructions

1. **Scan the target file** for styling issues.

2. **Check Against Theme Constants**:

   ### Colors (from constants/theme.ts)
   - Primary: #FF9933 (saffron)
   - Success: #138808 (India green)
   - Error: #EF4444
   - Warning: #F59E0B
   - Text primary: gray900
   - Text secondary: gray500
   - Background: #FFFFFF or gray50

   ### Spacing Scale
   - xs: 4, sm: 8, md: 12, lg: 16, xl: 20, 2xl: 24, 3xl: 32, 4xl: 40

   ### Border Radius
   - sm: 4, md: 8, lg: 12, xl: 16, 2xl: 20, 3xl: 24, full: 9999

   ### Typography
   - Font family: Funnel Sans variants
   - Sizes: xs(12), sm(14), base(16), lg(18), xl(20), 2xl(24)

   ### Shadows
   - Use Shadows.xs/sm/md/lg/xl from theme
   - Never hardcode shadow values

3. **Common Issues to Flag**:
   - [ ] Hardcoded color values (should use Colors.*)
   - [ ] Hardcoded spacing (should use Spacing.*)
   - [ ] Hardcoded font sizes (should use Typography.*)
   - [ ] Missing press feedback on interactive elements
   - [ ] Inconsistent border radius
   - [ ] Touch targets < 48px
   - [ ] Missing accessibility labels
   - [ ] Inline styles that should be in StyleSheet

4. **Output Format**:
   ```
   ## Style Audit Report: [filename]

   ### Issues Found
   1. Line X: Hardcoded color "#FF9933" → use Colors.primary
   2. Line Y: padding: 16 → use Spacing.lg
   ...

   ### Recommendations
   - ...

   ### Auto-fixable
   - [ ] Issue 1
   - [ ] Issue 2
   ```

5. **Offer to fix** the issues after reporting.

## Target to Audit

$ARGUMENTS
