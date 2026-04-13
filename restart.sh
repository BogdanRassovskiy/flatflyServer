cd "$(dirname "$0")"

# Автокоммит при перезапуске; в сообщении коммита — дата и время
git add -A
git commit -m "restart $(date '+%Y-%m-%d %H:%M:%S')" || true

cd flatfly
npm run build
cd ..
python3 deploy.py
python3 manage.py collectstatic --noinput
python3 manage.py runserver --insecure