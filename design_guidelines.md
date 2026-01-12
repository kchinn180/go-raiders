# GO Raiders Design Guidelines

## Theme: Volcanic/Lava Pixel Art

The app's visual identity is inspired by the volcanic pixel art logo featuring warm lava colors (oranges, reds) contrasted with dark charcoal grays. The logo depicts a molten lava creature emerging from volcanic rock, setting the tone for a fiery, intense gaming experience.

## Color Palette

### Primary Colors
- **Primary Orange**: `hsl(20, 90%, 50%)` - Main action color, buttons, accents
- **Accent Orange**: `hsl(30, 80%, 55%)` - Secondary highlights
- **Lava Gradient**: `from-orange-600 to-red-700` - Primary buttons and CTAs

### Neutral Colors
- **Dark Background**: Very dark charcoal gray with subtle warmth (`hsl(15, 8%, 6%)`)
- **Card Background**: Slightly elevated gray surfaces (`hsl(15, 8%, 9%)`)
- **Muted Text**: Warm gray for secondary text (`hsl(20, 5%, 60%)`)

### Team Colors (Pokemon GO Teams)
- **Valor (Red)**: `#dc2626` - Red team, flame icon
- **Mystic (Blue)**: `#2563eb` - Blue team, shield icon  
- **Instinct (Yellow)**: `#eab308` - Yellow team, lightning icon
- **Neutral (Gray)**: `#64748b` - No team preference

## Team Glow Effects
Each raid lobby card displays a subtle glow effect matching the gym's controlling team:
- **Valor**: Red glow (`box-shadow: 0 0 20px rgba(239, 68, 68, 0.4)`)
- **Mystic**: Blue glow (`box-shadow: 0 0 20px rgba(59, 130, 246, 0.4)`)
- **Instinct**: Yellow glow (`box-shadow: 0 0 20px rgba(234, 179, 8, 0.4)`)
- **Neutral**: Slate glow (`box-shadow: 0 0 20px rgba(100, 116, 139, 0.3)`)

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
- **Bottom Tab Bar**: Fixed position, 4 icons (Find, Host, Shop, Profile)
- **Top Header**: Logo left (volcanic pixel art), premium status badge right

### Cards (Raid Lobbies)
- Compact design: Boss image (56x56px), stats row, player count, timer
- Border accent matching host's team color (4px left border)
- Team glow shadow effect for visual highlight
- Team tint background overlay
- Quick-scan badges: Tier, Shadow/MAX, weather boost

### Buttons
- **Primary CTA**: Full-width rounded-2xl, gradient `from-orange-600 to-red-700`
- **Secondary**: Card background with border, `hover-elevate` interaction
- **Icon Buttons**: 40x40px touch target minimum
- **Filter Buttons**: Rounded-full pills, primary color when active

### Status Indicators
- **Player Ready State**: Checkmark icon with green background
- **Spots Available**: Color-coded badges (green/yellow/red based on availability)
- **Team Badges**: Small icons with team colors
- **Premium Badge**: Amber-500 pulsing dot

### Forms (Host Raid)
- Large touch-friendly inputs (min-height 48px)
- Boss selection as scrollable visual grid with Pokemon images
- Toggle switches for settings using team/primary colors
- Form labels in uppercase, small size, zinc-400

---

## Visual Effects (Minimal)

- **Micro-interactions only**: Button press states (scale 0.98), checkbox checks
- **Loading States**: Skeleton screens with subtle pulse
- **Transitions**: Fast 150-200ms ease curves
- **Team glow effects**: Subtle box-shadows on lobby cards
- **Hover states**: Use `hover-elevate` utility class

---

## Theme-Specific Treatments

**Dark Mode (Default)**:
- Near-black background with warm undertone (`hsl(15, 8%, 6%)`)
- Dark charcoal cards (`hsl(15, 8%, 9%)`)
- Warm gray borders
- White text with warm gray-500 for secondary

**Light Mode**:
- Warm off-white background (`hsl(20, 10%, 96%)`)
- Light cards with subtle warm gray borders
- Dark text hierarchy

**Team Colors** (Always Vibrant):
- Valor: Red-600 (#dc2626)
- Mystic: Blue-600 (#2563eb)  
- Instinct: Yellow-500 (#eab308)
- Use at full saturation for glow effects, borders, active states

---

## Accessibility
- 4.5:1 contrast minimum for all text
- 44x44px minimum touch targets
- Form labels always visible
- Color never sole indicator (icons + text reinforcement)

---

## Mobile-First Constraints
- Single-column layouts dominate
- Bottom sheet pattern for modals
- Thumb-zone friendly: Critical actions in bottom 2/3 of screen
- Fixed bottom navigation for instant context switching
