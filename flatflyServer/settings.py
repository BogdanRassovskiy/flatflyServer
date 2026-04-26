import os
from dotenv import load_dotenv
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
#BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.2/howto/deployment/checklist/

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-only-key"
    else:
        raise ImproperlyConfigured("The SECRET_KEY setting must not be empty.")





ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        "https://flatfly.eu,https://www.flatfly.eu",
    ).split(",")
    if origin.strip()
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if not DEBUG:
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True

GOOGLE_CLIENT_ID="382119089928-1jj9i247ccga761fkcbr4pq7m42kqhdg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

TELEGRAM_BOT_TOKEN = os.getenv(
    "TELEGRAM_CHAT_BOT_TOKEN",
    os.getenv("BOT_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", "8777443271:AAGkYChHYTs5DyDpqKcrhc0zOKWq68mH7_w")),
)
TELEGRAM_CHAT_BOT_USERNAME = os.getenv("TELEGRAM_CHAT_BOT_USERNAME", "")
TELEGRAM_LINK_SECRET = os.getenv("LINK_SECRET", SECRET_KEY or "")
TELEGRAM_CHANNEL_CHAT_ID = os.getenv("TELEGRAM_CHANNEL_CHAT_ID", "-1003759647230")
LISTING_PUBLIC_BASE_URL = os.getenv("LISTING_PUBLIC_BASE_URL", "https://flatfly.eu")
AUTH_REDIRECT_BASE_URL = os.getenv("AUTH_REDIRECT_BASE_URL", "")

# Google OAuth redirect URI (по умолчанию на прод-домен)
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "https://flatfly.eu/api/google_callback/",
)

if not DEBUG and "localhost" in GOOGLE_REDIRECT_URI:
    GOOGLE_REDIRECT_URI = "https://flatfly.eu/api/google_callback/"


EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp-relay.brevo.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() == "true"
# Prefer FlatFly-specific names so a shared server .env does not collide with other apps.
EMAIL_HOST_USER = os.getenv("FLATFLY_SMTP_USER", "") or os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("FLATFLY_SMTP_PASSWORD", "") or os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "FlatFly <no-reply@flatfly.local>")

EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = int(os.getenv("EMAIL_VERIFICATION_TOKEN_TTL_MINUTES", "60"))
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = int(os.getenv("EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", "60"))
EMAIL_VERIFICATION_DAILY_LIMIT = int(os.getenv("EMAIL_VERIFICATION_DAILY_LIMIT", "10"))

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = "email"

# Application definition

INSTALLED_APPS = [
    #google auth
    #'ads',
    'article',
    'listings',
    'users',
    'chats',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'flatflyServer.middleware.SplitSessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    #google auth
    'allauth.account.middleware.AccountMiddleware',
]

# Separate cookie for Django admin session to avoid mixing auth state
# with the regular app/API session in the same browser.
ADMIN_SESSION_COOKIE_NAME = os.getenv("ADMIN_SESSION_COOKIE_NAME", "admin_sessionid")

# We intentionally use custom session middleware that isolates admin and app
# sessions into separate cookies. Silence admin's strict middleware-path check.
SILENCED_SYSTEM_CHECKS = ["admin.E410"]

ROOT_URLCONF = 'flatflyServer.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'flatflyServer.wsgi.application'


# Database
# https://docs.djangoproject.com/en/2.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/2.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/2.2/topics/i18n/

LANGUAGE_CODE = 'cs'

LANGUAGES = [
    ("cs", "Cestina"),
    ("ru", "Russian"),
]

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

LOCALE_PATHS = [
    os.path.join(BASE_DIR, "locale"),
]


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.2/howto/static-files/
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")


STATIC_URL = '/static/'
#STATICFILES_DIRS = [
#    'static',
#]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static')
]
