#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Автокоммит при перезапуске; в сообщении коммита — дата и время
git add -A
git commit -m "restart $(date '+%Y-%m-%d %H:%M:%S')" || true

cd flatfly
npm run build
cd ..
python3 deploy.py
python3 manage.py collectstatic --noinput

# Запуск Telegram-бота в отдельном фоне (не блокирует runserver)
BOT_SCRIPT="telegram_flatfly_chatbot.py"
BOT_PID_FILE=".telegram_bot.pid"
BOT_LOG_FILE="telegram_bot.log"

if [ -f "$BOT_SCRIPT" ]; then
  if [ -f "$BOT_PID_FILE" ] && kill -0 "$(cat "$BOT_PID_FILE")" 2>/dev/null; then
    echo "Telegram bot already running with PID $(cat "$BOT_PID_FILE")"
  else
    # Чистим устаревший pid-файл и поднимаем новый процесс
    rm -f "$BOT_PID_FILE"
    nohup python3 "$BOT_SCRIPT" > "$BOT_LOG_FILE" 2>&1 &
    echo $! > "$BOT_PID_FILE"
    echo "Started Telegram bot in background, PID $(cat "$BOT_PID_FILE")"
  fi
fi

python3 manage.py runserver --insecure