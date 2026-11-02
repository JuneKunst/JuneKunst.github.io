"""Render the checked-in BEE learning diagrams against a clean source checkout.

Example: python3 _tools/update_bee_skills.py --repo-root /path/to/source --out-dir /tmp/bee-render
Publishing is a separate copy/commit step after all receipts pass.
"""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo-root', required=True, type=Path)
parser.add_argument('--out-dir', required=True, type=Path)
parser.add_argument('--archify', type=Path, default=Path.home()/'.agents/skills/archify/bin/archify.mjs')
args = parser.parse_args()
args.out_dir.mkdir(parents=True, exist_ok=True)
candidates = Path(__file__).resolve().parent/'bee-skills'
for candidate in sorted(candidates.glob('*.json')):
    data = json.loads(candidate.read_text())
    output = args.out_dir/data['meta']['output']
    run = subprocess.run(['node', str(args.archify), 'finalize', data['diagram_type'], str(candidate), str(output),
                          '--repo-root', str(args.repo_root), '--quality', data['meta']['quality_profile'],
                          '--out-dir', str(args.out_dir/(candidate.stem+'-review')), '--json'],
                         cwd=args.out_dir, capture_output=True, text=True)
    receipt = args.out_dir/(candidate.stem+'-result.json')
    receipt.write_text(run.stdout)
    if run.returncode:
        raise SystemExit(f'{candidate.name}: failed; inspect {receipt}\n{run.stderr}')
    result = json.loads(run.stdout)
    if not result.get('ok'):
        raise SystemExit(f'{candidate.name}: non-passing receipt {receipt}')
    print(f'{candidate.name}: pass')
