cd flatfly
npm run build
cd ..
python3 deploy.py
python3 manage.py collectstatic --noinput
python3 manage.py runserver --insecure