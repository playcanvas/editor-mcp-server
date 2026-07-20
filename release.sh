#!/bin/bash -e

TYPE=$1
PRE_ID_PREVIEW="beta"

if [[ ! " major minor patch premajor prerelease " =~ " $TYPE " ]]; then
    echo "Usage: $0 (major|minor|patch|premajor|prerelease)"
    exit 1
fi

# Fetch all remote tags
git fetch --tags

# Calculate the next version
npm version $TYPE --preid=$PRE_ID_PREVIEW --no-git-tag-version >> /dev/null
NEXT_VERSION=$(npm pkg get version | sed 's/"//g')
git reset --hard >> /dev/null

# Confirm release
read -p "About to release 'v$NEXT_VERSION'. Continue? (y/N) " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release cancelled."
    exit 1
fi

# Tag release
npm version $TYPE --preid=$PRE_ID_PREVIEW
