#!/bin/bash -e

TYPE=$1

if [ -z "$TYPE" ]; then
    echo "Usage: $0 <type>"
    echo "type: major, minor, patch"
    exit 1
fi

# Confirm release
read -p "Are you sure you want to release a new version? (y/N): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release cancelled."
    exit 1
fi

# Tag release
npm version $TYPE

# Publish to npm
npm publish

# Push to GitHub
git push origin main
git push --tags