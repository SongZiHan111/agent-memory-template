#!/bin/sh
# Install git pre-push gate (Unix/macOS). Windows: use tools/install-hooks.ps1
# Hooks are NOT distributed with the git repo; re-run after re-clone.
# To remove: delete .git/hooks/pre-push
set -e
root=$(git rev-parse --show-toplevel)
cp "$root/tools/hooks/pre-push" "$root/.git/hooks/pre-push"
chmod +x "$root/.git/hooks/pre-push"
echo "pre-push hook installed to $root/.git/hooks/pre-push"
