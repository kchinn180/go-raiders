# Pokémon GO Raid Coordination App - Design Guidelines

## Design Approach
**Reference-Based Gaming UI** inspired by Pokémon GO's visual language, Discord's community features, and Linear's clean information architecture. This is a utility-first app requiring instant readability and rapid interaction patterns.

## Core Design Principles
1. **Speed First**: Every interaction should feel instant - minimal animations, fast visual feedback
2. **Scan-Friendly**: Users need to parse raid information in seconds while potentially walking/moving
3. **Team Identity**: Valor/Mystic/Instinct branding should be prominent and pride-inducing
4. **Gaming Premium**: Dark theme default with vibrant accent colors that pop

---

## Typography System

**Font Family**: Inter (via Google Fonts CDN) - exceptional readability at small sizes
- **Hero/Headers**: Bold 700-900 weight, tight letter-spacing
- **Body**: Regular 400-500 weight  
- **UI Labels**: Medium 600 weight, uppercase with wide tracking for stats/badges
- **Sizes**: Large headings (32-40px), body (14-16px), small labels (11-13px)

---

## Layout & Spacing

**Tailwind Units**: Consistent use of 2, 4, 6, 8, 12, 16, 24 units (e.g., p-4, gap-6, mb-8)

**Grid Patterns**:
- Feed/List Views: Single column cards with full-width touch targets
- Lobby Player Grid: 2-column on mobile, 3-column on tablet+
- Shop Items: 1-column cards highlighting features vertically

**Container Strategy**: 
- Max-width of 640px for mobile-optimized reading
- Full-width cards with internal padding (p-4 to p-6)
- Bottom navigation fixed with safe-area padding

---

## Component Library

### Navigation
- **Bottom Tab Bar**: Fixed position, 4-5 icons, active state uses team color accent
- **Top Header**: Minimal, logo/title left, premium badge + profile right

### Cards (Raid Lobbies)
- Compact design: Boss image (80x80px), stats row, player count, timer
- Border accent matching host's team color (3px left border)
- Quick-scan badges: Tier, weather boost, level requirement
- Shadow intensity indicates urgency (raids expiring soon = stronger shadow)

### Buttons
- **Primary CTA**: Full-width rounded-xl, bold text, team-colored for key actions
- **Secondary**: Ghost style with border, neutral colors
- **Icon Buttons**: 40x40px touch target minimum
- **Join/Ready buttons**: Large, prominent, impossible to miss

### Status Indicators
- **Player Ready State**: Checkmark icon with green pulse animation
- **Timer Countdown**: Large numerals with subtle color shift (green→yellow→red as time decreases)
- **Team Badges**: Small circular icons with team color backgrounds
- **Premium Badge**: Gold/yellow accent with sparkle icon

### Forms (Host Raid)
- Large touch-friendly inputs (min-height 48px)
- Boss selection as visual grid with Pokémon images
- Dropdown selectors with custom styling matching theme
- Toggle switches for weather/requirements using team colors

### Modals/Overlays
- Full-screen takeover on mobile
- Backdrop blur effect (backdrop-blur-md)
- Slide-up animation from bottom
- Close button always top-right

---

## Images

**Pokémon Boss Images**: 
- Source: PokémonDB sprites (already in code)
- Display: Contained within rounded containers, drop-shadow for depth
- Fallback: Letter icon if image fails to load

**No Hero Section**: This is a utility app - users dive straight into the raid feed upon launch.

**Profile Avatars**: Placeholder initials in team-colored circles if no custom avatar

**Empty States**: Simple icon + text, no elaborate illustrations needed

---

## Visual Effects (Minimal)

- **Micro-interactions only**: Button press states (scale 0.98), checkbox checks
- **Loading States**: Skeleton screens with subtle pulse, spinner only for async actions
- **Transitions**: Fast 150-200ms ease curves, never blocking interaction
- **NO scroll animations**: Keep it snappy
- **Hover states**: Subtle brightness increase, never dramatic

---

## Theme-Specific Treatments

**Dark Mode (Default)**:
- Pure black (#000000) background
- Zinc-900 (#18181b) for cards
- Zinc-800 borders
- White text with zinc-400 for secondary text

**Light Mode**:
- Gray-50 (#f9fafb) background  
- White cards with subtle shadows
- Gray-200 borders
- Black text with gray-600 for secondary

**Team Colors** (Always Vibrant):
- Valor: Red-600 (#dc2626)
- Mystic: Blue-600 (#2563eb)  
- Instinct: Yellow-500 (#eab308)
- Use at full saturation for badges, borders, active states

---

## Accessibility
- 4.5:1 contrast minimum for all text
- 44x44px minimum touch targets
- Form labels always visible
- Color never sole indicator (icons + text reinforcement)

---

## Mobile-First Constraints
- Single-column layouts dominate
- Bottom sheet pattern for secondary actions
- Thumb-zone friendly: Critical actions in bottom 2/3 of screen
- Fixed bottom navigation for instant context switching