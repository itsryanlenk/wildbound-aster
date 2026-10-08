#!/usr/bin/env python3
"""Rebuild the delivered native master using the supplied final captures."""
from pathlib import Path
import argparse,subprocess,sys
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--regenerate-score',action='store_true')
args=parser.parse_args()
def run(*command):subprocess.run(command,cwd=ROOT,check=True)
if args.regenerate_score or not (ROOT/'public/audio/orchestral-score.wav').exists():
    run(sys.executable,'compose-orchestral-score.py')
run(sys.executable,'build-audio.py')
run('node','render-trailer.mjs')
run(sys.executable,'finalize-video.py')
print('Native trailer master and poster rebuilt and verified.')
