#!/bin/bash
#
# A simple script to test if index.html can be run in a headless browser.
# It uses Google Chrome to load the page and reports any console errors.
#

# Default path for Google Chrome on macOS
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Check if the Chrome executable exists
if [ ! -f "$CHROME_PATH" ]; then
    echo "Error: Google Chrome not found at $CHROME_PATH" >&2
    echo "Please install Google Chrome or update the CHROME_PATH variable in this script." >&2
    exit 1
fi

# Run Chrome in headless mode and capture stderr.
CHROME_OUTPUT=$("$CHROME_PATH" \
  --headless \
  --disable-gpu \
  --virtual-time-budget=5000 \
  --run-all-compositor-stages-before-draw \
  --no-sandbox \
  --enable-logging=stderr \
  --log-level=0 \
  "file://$(pwd)/index.html" 2>&1)

# Check for errors in the output.
if echo "$CHROME_OUTPUT" | grep -q "Uncaught SyntaxError"; then
    echo "Error: JavaScript console errors detected:" >&2
    echo "$CHROME_OUTPUT" | grep "Uncaught SyntaxError" >&2
    exit 1
fi