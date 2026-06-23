# Project Rules & Design Guidelines

## 1. Minecraft Local Integration
- **Save Path Resolution**: Minecraft world day tracking should support absolute paths pointing directly to `level.dat`, root save directories, or fallback to default OS folders (`.minecraft/saves`) using `os.homedir()` for cross-platform robustness.
- **NBT Parsing**: Use the `nbt` library to read `level.dat`. Ticks are stored inside the NBT structure under `Data.DayTime` or `Data.Time`. A single Minecraft day corresponds to `24000` ticks.

## 2. Gameplay Area Occlusion Rules
- **Sacred Gameplay Space**: The middle portion of the 16:9 canvas (between 23.23% and 76.77% height) contains the primary video game feed and must remain clear of static or draggable widgets.
- **Drag Constraints**: Draggable floor widgets (like `comp-chat-avatars`) must have vertical coordinate constraints in their drag hooks (`useDraggable.js`) to snap immediately to the top panel or bottom panel, preventing them from resting in the middle zone.

## 3. Title Animation Layouts
- **Staggered Animations**: When titles or subtitles are split by letters into `span` elements for animation, process any explicit newline characters (`\n`) to return `<br />` tags inside the loop. This preserves layout constraints and maintains correct animation delay timing.
