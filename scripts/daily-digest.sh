#!/bin/bash
# OpenClaw cron에서 호출하는 진입점.
# db.ts가 process.cwd() 기준으로 data/g2b.db 를 잡고 npm script가 .env.local 을
# 상대경로로 읽으므로, 반드시 프로젝트 루트에서 실행해야 한다.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# npm/node를 PATH에서 못 찾는 비로그인 환경 대비
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

exec npm run --silent digest -- "$@"
