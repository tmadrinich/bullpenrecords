#!/bin/bash
# Regenerates every PNG the site needs from the logo SVGs in /brand.
# The artwork is only ever scaled and centered on a brand color; it is never redrawn.
# macOS only (uses AppKit through osascript). Run from anywhere:  tools/make-icons.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORDMARK="$ROOT/brand/bullpen-records-cream.svg"   # full logo, chalk
B_CREAM="$ROOT/brand/bullpen-B-cream.svg"          # the B on its own, chalk, transparent
B_TILE="$ROOT/brand/bullpen-favicon.svg"           # the B on a rounded Dugout Black tile
BRAND_OUT="$ROOT/site/assets/brand"
APP_OUT="$ROOT/site/assets/app"
mkdir -p "$BRAND_OUT" "$APP_OUT"

# Site-served copies of the artwork (the /brand folder stays the source).
cp "$ROOT"/brand/bullpen-records-*.svg "$ROOT"/brand/bullpen-B-*.svg "$B_TILE" "$BRAND_OUT/"
chmod 644 "$BRAND_OUT"/*.svg

# render <svg> <out.png> <width> <height> <art width as a fraction of the canvas width> <black|none>
render() {
  osascript -l JavaScript - "$1" "$2" "$3" "$4" "$5" "$6" <<'JXA'
ObjC.import('AppKit');
function run(argv) {
  var img = $.NSImage.alloc.initWithContentsOfFile(argv[0]);
  if (img.isNil()) throw new Error('Could not load ' + argv[0]);
  var w = parseInt(argv[2], 10), h = parseInt(argv[3], 10), frac = parseFloat(argv[4]);
  var rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, w, h, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  var ctx = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext(ctx);
  ctx.setImageInterpolation($.NSImageInterpolationHigh);
  if (argv[5] === 'black') {
    // Dugout Black #121212
    $.NSColor.colorWithSRGBRedGreenBlueAlpha(18 / 255, 18 / 255, 18 / 255, 1).setFill;
    $.NSRectFill($.NSMakeRect(0, 0, w, h));
  } else {
    $.NSColor.clearColor.setFill;
    $.NSRectFillUsingOperation($.NSMakeRect(0, 0, w, h), $.NSCompositingOperationCopy);
  }
  // The artwork keeps its own proportions.
  var lw = Math.round(w * frac), lh = Math.round(lw * img.size.height / img.size.width);
  img.drawInRectFromRectOperationFraction(
    $.NSMakeRect(Math.round((w - lw) / 2), Math.round((h - lh) / 2), lw, lh),
    $.NSZeroRect, $.NSCompositingOperationSourceOver, 1.0);
  ctx.flushGraphics;
  $.NSGraphicsContext.restoreGraphicsState;
  rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $()).writeToFileAtomically(argv[1], true);
  return argv[1].split('/').pop() + '  ' + w + 'x' + h;
}
JXA
}

# Share image: full chalk logo on Dugout Black.
render "$WORDMARK" "$BRAND_OUT/og-image.png"        1200 630 0.80 black

# Browser tab: the rounded B tile, corners left transparent. (Modern browsers use the SVG itself.)
render "$B_TILE" "$BRAND_OUT/favicon-32.png"          32  32 1.00 none
render "$B_TILE" "$BRAND_OUT/favicon-48.png"          48  48 1.00 none

# Home-screen icons: the chalk B on a full Dugout Black square. Phones round the corners themselves.
render "$B_CREAM" "$APP_OUT/apple-touch-icon.png"    180 180 0.92 black
render "$B_CREAM" "$APP_OUT/icon-192.png"            192 192 0.92 black
render "$B_CREAM" "$APP_OUT/icon-512.png"            512 512 0.92 black
# Maskable icons get cropped to a circle or squircle; keep the B inside the centre 80%.
render "$B_CREAM" "$APP_OUT/icon-maskable-512.png"   512 512 0.72 black
