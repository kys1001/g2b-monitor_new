#!/bin/bash
# OpenClaw 에이전트가 디스코드 답장(번호)을 처리할 때 호출하는 진입점.
# daily-digest.sh 와 같은 이유로 cwd/PATH 를 고정한다.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
exec npm run --silent notice -- "$@"
