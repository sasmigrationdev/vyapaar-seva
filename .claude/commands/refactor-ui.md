# Refactor UI Component/Screen

Modernize and polish an existing component or screen following the UIUX_IMPROVEMENT_PLAN.md guidelines.

## Instructions

1. **Read these files first**:
   - `UIUX_IMPROVEMENT_PLAN.md` - Full design vision and guidelines
   - `constants/theme.ts` - Design tokens
   - The target file to refactor

2. **Key Improvements to Apply**:

   ### Visual Hierarchy
   - Simplify busy sections
   - Use progressive disclosure (collapsible sections)
   - Create clear visual groupings with spacing

   ### Card Treatments
   - Standard cards: `Shadows.sm`, `BorderRadius.xl`, subtle border
   - Elevated cards: `Shadows.lg`, no border
   - Glass cards: Semi-transparent white, blur effect
   - Gradient cards: For hero sections

   ### Typography
   - Screen titles: 28px, ExtraBold
   - Section headers: 13px, uppercase, letter-spacing 1.5
   - Metrics: 24-48px, ExtraBold, tight letter-spacing

   ### Colors
   - Primary actions: Saffron orange (#FF9933)
   - Success: India green (#138808)
   - Backgrounds: Use warmGlow or coolMint gradients
   - Text: gray900 primary, gray500 secondary

   ### Animations
   - Card press: Scale 0.98, 100ms
   - Transitions: Spring animations with damping 15
   - Loading: Skeleton screens, not spinners

3. **Refactoring Checklist**:
   - [ ] Replace hardcoded colors with theme constants
   - [ ] Replace hardcoded spacing with Spacing constants
   - [ ] Add press animations to interactive elements
   - [ ] Simplify information density
   - [ ] Apply appropriate card variant
   - [ ] Ensure accessibility (touch targets, contrast)

## Target to Refactor

$ARGUMENTS
