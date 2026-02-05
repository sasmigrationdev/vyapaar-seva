# Polish Screen

Apply comprehensive UI/UX polish to a screen following the $10M quality standard.

## Instructions

1. **Read the full context**:
   - `UIUX_IMPROVEMENT_PLAN.md` - Design vision
   - `CLAUDE.md` - Code patterns
   - `constants/theme.ts` - Design tokens
   - The target screen file

2. **Polish Checklist**:

   ### Layout & Hierarchy
   - [ ] Clear visual hierarchy (hero → actions → details)
   - [ ] Appropriate spacing between sections (Spacing.2xl or 3xl)
   - [ ] Content grouped logically in cards
   - [ ] Progressive disclosure for complex info

   ### Hero Section (if applicable)
   - [ ] Gradient background (saffronHero or navyDepth)
   - [ ] Large, clear greeting/title
   - [ ] Key metric or action prominently displayed
   - [ ] Safe area padding respected

   ### Cards & Containers
   - [ ] Consistent card styling (use Card component variants)
   - [ ] Appropriate shadows for elevation
   - [ ] Proper padding (Spacing.lg standard)
   - [ ] Border radius consistency (BorderRadius.xl standard)

   ### Typography
   - [ ] Screen title: 28px ExtraBold
   - [ ] Section headers: Uppercase, spaced, gray500
   - [ ] Body text: 16px regular
   - [ ] Metrics: Large, bold, tight letter-spacing

   ### Interactions
   - [ ] All touchables have press animation
   - [ ] Loading states use skeletons
   - [ ] Error states are styled consistently
   - [ ] Empty states have helpful messaging

   ### Colors
   - [ ] Primary actions use saffron
   - [ ] Success states use India green
   - [ ] No hardcoded colors
   - [ ] Sufficient contrast (4.5:1 minimum)

   ### Animations
   - [ ] Screen entry animation (fade/slide)
   - [ ] Card press animations
   - [ ] List item stagger (if applicable)
   - [ ] Smooth transitions between states

   ### Accessibility
   - [ ] Touch targets ≥ 48x48
   - [ ] accessibilityLabel on icons/buttons
   - [ ] accessibilityRole appropriate
   - [ ] Supports font scaling

3. **Apply changes incrementally**, testing each improvement.

4. **Before/After Summary**: Describe what was improved.

## Screen to Polish

$ARGUMENTS
