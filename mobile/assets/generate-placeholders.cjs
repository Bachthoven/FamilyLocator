// Simple placeholder generator for Expo assets
// These are temporary placeholders that can be replaced with real assets later

const fs = require("fs");
const path = require("path");

// Simple 1x1 colored pixel PNG data (blue)
const bluePixelPNG = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // PNG signature
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52, // IHDR chunk
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x02,
  0x00,
  0x00,
  0x00,
  0x90,
  0x77,
  0x53,
  0xde,
  0x00,
  0x00,
  0x00,
  0x0c,
  0x49,
  0x44,
  0x41,
  0x54,
  0x08,
  0x99,
  0x63,
  0x60,
  0x64,
  0xf8,
  0x0f,
  0x00,
  0x00,
  0x01,
  0x01,
  0x00,
  0x01,
  0x0a,
  0xdd,
  0x3b,
  0x5e,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4e,
  0x44,
  0xae,
  0x42,
  0x60,
  0x82,
]);

// Create placeholder PNG files
const placeholders = [
  { name: "icon.png", description: "512x512 app icon" },
  { name: "splash.png", description: "1284x2778 splash screen" },
  { name: "adaptive-icon.png", description: "108x108 adaptive icon" },
  { name: "favicon.png", description: "48x48 favicon" },
];

placeholders.forEach((placeholder) => {
  const filePath = path.join(__dirname, placeholder.name);
  fs.writeFileSync(filePath, bluePixelPNG);
  console.log(
    `Created placeholder: ${placeholder.name} (${placeholder.description})`,
  );
});

console.log("\nPlaceholder assets created successfully!");
console.log("Note: These are temporary 1x1 pixel placeholders.");
console.log("Replace them with actual assets before publishing.");
