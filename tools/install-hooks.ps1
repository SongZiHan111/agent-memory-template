# Install git pre-push gate: copies tools/hooks/pre-push into .git/hooks/
# Hooks are NOT distributed with the git repo; re-run after re-clone or new machine.
# To remove: delete .git/hooks/pre-push
$root = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { Write-Error "not inside a git repo"; exit 1 }
$dst = Join-Path $root ".git/hooks/pre-push"
Copy-Item (Join-Path $root "tools/hooks/pre-push") $dst -Force
Write-Output "pre-push hook installed to $dst"
