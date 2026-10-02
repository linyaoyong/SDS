#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
GITLEAKS_BIN=${GITLEAKS_BIN:-gitleaks}
command -v "$GITLEAKS_BIN" >/dev/null
mkdir -p .security-reports
SCAN_DIR=$(mktemp -d)
trap 'rm -rf "$SCAN_DIR"' EXIT HUP INT TERM
export SCAN_DIR
python3 - <<'PY'
import os, pathlib, re, shutil, subprocess
root = pathlib.Path.cwd()
target = pathlib.Path(os.environ['SCAN_DIR'])
names = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard']).split(b'\0')
private_dirs = {'.idea', '.vscode', '.worktrees', '.claude', '.agents', 'node_modules', 'target', 'dist', 'static', 'logs', '.security-reports', 'groupprojectdocsofspringcloud', 'superpowers', '__pycache__'}
for raw in set(names):
    if not raw:
        continue
    path = pathlib.Path(os.fsdecode(raw))
    source = root / path
    if source.is_symlink():
        raise SystemExit('Review symlink before publishing: ' + str(path))
    if not source.is_file():
        continue
    name = path.name
    if (set(path.parts) & private_dirs or name in {'.DS_Store', '.mcp.json', 'project.private.config.json'}
            or 'postman_collection' in name or name.startswith('~$')
            or path.suffix.lower() in {'.jar', '.war', '.log', '.p12', '.pem', '.key', '.sql.gz', '.doc', '.docx', '.pdf', '.pptx', '.zip', '.jmx', '.csv'}
            or ((name == '.env' or name.startswith('.env.')) and name != '.env.example')):
        raise SystemExit('Private or generated candidate: ' + str(path))
    if name == 'application.yml':
        for line in source.read_text().splitlines():
            if re.match(r'\s*(password|secret|token):', line) and not re.search(r'\$\{[A-Z_]+\}', line):
                raise SystemExit('Literal credential in configuration: ' + str(path))
    if path.suffix == '.java' and re.search(r'\$\{(?:jwt\.secret|internal\.token):', source.read_text()):
        raise SystemExit('Credential fallback in Java: ' + str(path))
    destination = target / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
print('PASS: source publication boundaries and credential configuration')
PY
"$GITLEAKS_BIN" dir "$SCAN_DIR" --redact=100 --report-format json --report-path .security-reports/secrets-current.json
"$GITLEAKS_BIN" git . --log-opts="--all" --redact=100 --report-format json --report-path .security-reports/secrets-history.json
git diff --check
printf '%s\n' 'PASS: source publication secret checks' 'NOT_A_DEPLOYMENT_CHECK: inspect SECURITY.md and run runtime/dependency checks separately'
