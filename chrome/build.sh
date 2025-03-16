#!/bin/bash

# Script to copy files from Safari extension to Chrome extension

# Source and destination directories
SOURCE_DIR="../Shared (Extension)/Resources"
DEST_DIR="."

# Create images directory if it doesn't exist
mkdir -p "$DEST_DIR/images"
mkdir -p "$DEST_DIR/_locales/en"

# Copy all JS files except background.js
find "$SOURCE_DIR" -name "*.js" ! -name "background.js" -exec cp {} "$DEST_DIR"/ \;

# Make sure browser-polyfill.js is included
if [ ! -f "$DEST_DIR/browser-polyfill.js" ]; then
  echo "Warning: browser-polyfill.js not found. This file is required for Chrome compatibility."
fi

# Copy all CSS files
cp "$SOURCE_DIR"/*.css "$DEST_DIR"/

# Copy HTML files
cp "$SOURCE_DIR"/*.html "$DEST_DIR"/

# Copy image files
cp "$SOURCE_DIR/images"/*.png "$DEST_DIR/images"/

# Copy localization files
cp "$SOURCE_DIR/_locales/en/messages.json" "$DEST_DIR/_locales/en/"

echo "Files copied successfully!"
echo "Chrome extension is ready to be loaded in Chrome."