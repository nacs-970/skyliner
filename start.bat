@echo off
rem Start the Skyliner app: the local service, and your browser opens on the app by itself. SI-generated with Claude Sonnet 5.5 (2026-11-15), see docs/si-log.md. Needs uv (https://docs.astral.sh/uv/).
cd /d "%~dp0"
uv run --script implementation/server/app.py
