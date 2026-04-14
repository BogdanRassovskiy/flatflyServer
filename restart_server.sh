#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

BOT_SCRIPT="telegram_flatfly_chatbot.py"
BOT_PID_FILE=".telegram_bot.pid"
BOT_LOG_FILE="telegram_bot.log"

if [ -f "$BOT_SCRIPT" ]; then
  if [ -f "$BOT_PID_FILE" ] && kill -0 "$(cat "$BOT_PID_FILE")" 2>/dev/null; then
    echo "Telegram bot already running with PID $(cat "$BOT_PID_FILE")"
  else
    rm -f "$BOT_PID_FILE"
    nohup python3 "$BOT_SCRIPT" > "$BOT_LOG_FILE" 2>&1 &
    echo $! > "$BOT_PID_FILE"
    echo "Started Telegram bot in background, PID $(cat "$BOT_PID_FILE")"
  fi
fi

python3 manage.py runserver 0.0.0.0:3003 --insecure
