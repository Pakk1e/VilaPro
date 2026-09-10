#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../worlds"
python -m unittest discover tests
