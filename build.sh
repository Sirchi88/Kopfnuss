#!/bin/sh
# Baut app.js aus den Teilen in src/
cd "$(dirname "$0")" && cat src/part1.js src/part2.js src/part3.js > app.js
