#!/usr/bin/env bash
# Start the Skyliner app: the local service, and your browser opens on the app by itself.
# SI-generated with Claude Sonnet 5.5 (2026-11-15), see docs/si-log.md. Needs uv (https://docs.astral.sh/uv/). Any extra arguments are ignored; use PORT=8001 ./start.sh to change the port.
cd "$(dirname "$0")" || exit 1
exec uv run --script implementation/server/app.py
