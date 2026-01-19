# Family Location Tracker Design Guidelines

## Design Approach

**System:** Material Design 3 principles adapted for mobile-first location tracking, emphasizing clarity, spatial awareness, and contextual hierarchy. Drawing from Google Maps and Life360 patterns for familiarity.

## Core Design Elements

### Typography

- **Headers:** Inter/SF Pro Display Bold - 24/20/16sp for screen titles, family member names, location labels
- **Body:** Inter/SF Pro Regular - 14sp for addresses, timestamps, status messages
- **Captions:** 12sp Medium for map labels, distance indicators
- **Monospace:** Coordinates display at 11sp

### Layout System

**Tailwind Spacing Primitives:** 2, 3, 4, 6, 8, 12, 16

- Map container: Full screen minus bottom sheet/header
- Card padding: p-4 to p-6
- Icon spacing: gap-3, gap-4
- Screen margins: px-4, py-3
- Bottom sheet handles: h-1, w-12, rounded-full

### Component Library

**Map Interface:**

- Full-screen map view with floating UI elements
- Custom marker clusters showing family member count
- Draggable location markers with drop shadow elevation (8dp)
- Geofence circles with 40% opacity fill, 2px stroke
- Current location pulse animation (subtle, 2s interval)

**Family Member Cards (Bottom Sheet):**

- Horizontal scrollable cards above map (h-24)
- Avatar (56px circular) + Name + Last updated timestamp
- Battery indicator icon + percentage
- Distance from you (e.g., "2.3 mi away")
- Quick action buttons: Message, Notify, Navigate
- Active card expands to show full address + arrival time estimates

**Place Markers:**

- Icon-based (Home, Work, School, Custom) - 40px touch target
- Label underneath icon (12sp)
- Edit mode reveals drag handles + delete action
- Snap-to-location when dragging within 50px

**Navigation Components:**

- Top bar: Floating card design (elevation 4dp), rounded-lg, mx-4, mt-3
- Contains: Menu icon, Family group name, Settings/Add member
- FAB for centering map on user location (bottom-16, right-4)
- Secondary FAB for place management when scrolled

**List Views (Alternate Mode):**

- Swipeable family member rows with avatar-left layout
- Three-line format: Name / Address / Last seen timestamp
- Status indicators: green dot (active <5min), gray (inactive)
- Pull-to-refresh with haptic feedback

**Place Management Screen:**

- Grid layout (2 columns on phone, 3 on tablet)
- Place cards: Icon + Name + Address snippet
- Reorder handles (drag icon right side)
- Add new place: Large dashed border card with plus icon

**Settings/Permissions:**

- Grouped list design with section headers
- Toggle switches for notifications, location accuracy
- Privacy controls with explanation text (14sp, 60% opacity)
- Location history: Timeline view with map preview thumbnails

**Notifications Panel:**

- Card-based alerts stacked vertically
- Icon + timestamp + action text
- Swipe actions: Dismiss, View on map
- Unread indicator: small badge on notification icon

### Visual Treatment

**Elevation Hierarchy:**

- Map: Base layer (0dp)
- Markers: 2dp
- Cards/Bottom sheet: 4dp
- FABs: 6dp
- Modals: 8dp

**Corner Radius:**

- Cards: rounded-2xl (16px)
- Buttons: rounded-xl (12px)
- Avatars: rounded-full
- Map markers: rounded-lg (8px)
- Input fields: rounded-lg

**Spacing Rhythm:**

- Screen padding: p-4
- Card internal: p-6
- List items: py-4
- Icon-text gap: gap-3
- Section spacing: space-y-6

### Interactions

- Bottom sheet: Three states (collapsed 96px, half 50%, full 80%)
- Drag gesture on sheet handle for expansion
- Map gestures: Pan, pinch-zoom, rotation, tilt
- Long-press on map to add place marker
- Haptic feedback on marker drag start/end
- Pull-down to refresh family locations

### Dark Mode Adaptations

- Map style switches to dark tiles
- Reduce card/modal opacity overlays
- Increase marker stroke width for visibility
- Lighter text on overlays (90% vs 60% opacity)
- Softer shadows with increased blur radius

### Images

**Not required** - This is a map-based utility app where the map itself provides the visual foundation. All UI elements float above or integrate with the live map view. Profile avatars are user photos, not marketing imagery.
