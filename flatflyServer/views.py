from django.shortcuts import render,redirect,get_object_or_404
from django.views.decorators.csrf import csrf_exempt
import json
from django.http import JsonResponse
import requests
from django.conf import settings
from django.contrib.auth import get_user_model, login, logout, authenticate
import jwt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST,require_http_methods
from django.db.models import Q
from users.models import Profile
from listings.models import Listing, ListingImage
from django.core.paginator import Paginator

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.urls import reverse
User = get_user_model()
DEBUG_MODE=True;
google_auth_url="https://accounts.google.com/o/oauth2/v2/auth?client_id={0}&redirect_uri={1}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent".format(settings.GOOGLE_CLIENT_ID,settings.GOOGLE_REDIRECT_URI,)


def index(request):
    return render(request, 'index.html')

def google_login(request):
    return redirect(google_auth_url)

def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    user = request.user
    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })
def neighbours_list(request):
    qs = Profile.objects.all()

    # SEARCH
    search = request.GET.get("search")
    if search:
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(city__icontains=search) |
            Q(about__icontains=search) |
            Q(profession__icontains=search)
        )

    # BASIC FILTERS
    city = request.GET.get("city")
    if city:
        qs = qs.filter(city__icontains=city)

    gender = request.GET.get("gender")
    if gender and gender != "any":
        qs = qs.filter(gender=gender)

    age_from = request.GET.get("ageFrom")
    if age_from:
        qs = qs.filter(age__gte=age_from)

    age_to = request.GET.get("ageTo")
    if age_to:
        qs = qs.filter(age__lte=age_to)

    smoking = request.GET.get("smoking")
    if smoking:
        qs = qs.filter(smoking=smoking)

    alcohol = request.GET.get("alcohol")
    if alcohol:
        qs = qs.filter(alcohol=alcohol)

    sleep_schedule = request.GET.get("sleepSchedule")
    if sleep_schedule:
        qs = qs.filter(sleep_schedule=sleep_schedule)

    work_from_home = request.GET.get("workFromHome")
    if work_from_home:
        qs = qs.filter(work_from_home=work_from_home)

    # LANGUAGES (languages[]=cz&languages[]=en)
    languages = request.GET.getlist("languages[]")
    if languages:
        for lang in languages:
            qs = qs.filter(languages__icontains=lang)

    # STATUS
    verified = request.GET.get("verified")
    if verified in ["true", "false"]:
        qs = qs.filter(verified=(verified == "true"))

    looking = request.GET.get("looking_for_housing")
    if looking in ["true", "false"]:
        qs = qs.filter(looking_for_housing=(looking == "true"))

    # SORT
    qs = qs.order_by("-created_at")

    # PAGINATION
    page = int(request.GET.get("page", 1))
    paginator = Paginator(qs, 12)
    page_obj = paginator.get_page(page)

    results = []
    for p in page_obj:
        results.append({
            "id": p.id,
            "avatar": p.avatar.url if p.avatar else None,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "city": p.city,
            "languages": p.languages,
            "profession": p.profession,
            "about": p.about,
            "smoking": p.smoking,
            "alcohol": p.alcohol,
            "pets": p.pets,
            "sleep_schedule": p.sleep_schedule,
            "gamer": p.gamer,
            "work_from_home": p.work_from_home,
            "verified": p.verified,
            "looking_for_housing": p.looking_for_housing,
        })

    return JsonResponse({
        "count": paginator.count,
        "pages": paginator.num_pages,
        "results": results,
    })

@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    response = JsonResponse({"detail": "Logged out"})
    response.delete_cookie("sessionid")
    response.delete_cookie("csrftoken")
    return response
@csrf_exempt
def contact_view(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    name = data.get("name")
    email = data.get("email")
    message = data.get("message")

    if not name or not email or not message:
        return JsonResponse({"detail": "All fields are required"}, status=400)

    full_message = f"""
New contact message from FlatFly:

Name: {name}
Email: {email}

Message:
{message}
    """

    send_mail(
        subject="FlatFly – New Contact Message",
        message=full_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=["raymannn34@gmail.com"],  # твоя рабочая почта
        fail_silently=False,
    )

    return JsonResponse({"detail": "Message sent successfully"})
@csrf_exempt
def password_reset_request(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    email = request.POST.get("email")
    if not email:
        return JsonResponse({"detail": "Email is required"}, status=400)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # В целях безопасности не говорим, что пользователя нет
        return JsonResponse({
            "detail": "If an account with this email exists, a reset link was sent."
        })
    # Генерация токена
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = get_frontend_url(request)
    reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"
    send_mail(
        subject="Password reset",
        message=f"Click the link to reset your password:\n\n{reset_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
    return JsonResponse({
        "detail": "Password reset email sent"
    })
def get_frontend_url(request):
    origin = request.headers.get("Origin")
    if origin:
        return origin

    # fallback, если Origin нет (редко, но бывает)
    scheme = "https" if request.is_secure() else "http"
    host = request.get_host()
    return f"{scheme}://{host}"
@csrf_exempt
def password_reset_confirm(request, uidb64, token):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except:
        return JsonResponse({"detail": "Invalid link"}, status=400)
    if not default_token_generator.check_token(user, token):
        return JsonResponse({"detail": "Invalid or expired token"}, status=400)
    data = json.loads(request.body)
    password = data.get("password")
    if not password:
        return JsonResponse({"detail": "Password required"}, status=400)
    user.set_password(password)
    user.save()
    return JsonResponse({"status": "password_updated"})

@csrf_exempt
def register_view(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data = json.loads(request.body)

    name = data.get("name", "").strip()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    existing_user = User.objects.filter(email=email).first()
    if existing_user:
        profile = getattr(existing_user, "profile", None)

        if profile and profile.auth_provider == "google":
            return JsonResponse({
                "error": "This account was created using Google. Please log in with Google."
            }, status=400)

        return JsonResponse({
            "error": "User with this email already exists. Please log in."
        }, status=400)

    # создаём пользователя
    username = email.split("@")[0]
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    # профиль УЖЕ СОЗДАЛСЯ сигналом → просто получаем его
    profile = user.profile
    profile.name = name
    profile.auth_provider = "email"
    profile.save()

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return JsonResponse({
        "status": "registered",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": profile.name,
            "auth_provider": profile.auth_provider,
        }
    })
@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return JsonResponse({"error": "Email and password are required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=400)

    profile = user.profile

    # Если аккаунт Google
    if profile.auth_provider == "google":
        return JsonResponse({
            "error": "This account was created via Google. Please login with Google."
        }, status=400)

    # Проверяем пароль
    if not user.check_password(password):
        return JsonResponse({"error": "Invalid password"}, status=400)

    # Логиним
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return JsonResponse({
        "status": "logged_in",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": profile.name or user.first_name,
            "auth_provider": profile.auth_provider,
        }
    })

def listing_detail(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)

    main_image = listing.images.first()

    return JsonResponse({
        "id": listing.id,
        "type": listing.type,
        "title": listing.title,
        "description": listing.description,
        "price": str(listing.price),
        "address": listing.address,
        "size": listing.size,
        "rooms": listing.rooms,
        "beds": listing.beds,
        "badges": [],
        "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
        "images": [
            request.build_absolute_uri(img.image.url)
            for img in listing.images.all()
        ],
    })
@csrf_exempt
@require_http_methods(["GET", "POST"])
def listings_view(request):

    # =========================
    # СОЗДАНИЕ ОБЪЯВЛЕНИЯ
    # =========================
    if request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Not authenticated"}, status=401)

        data = json.loads(request.body)

        listing = Listing.objects.create(
            owner=request.user,
            type=data.get("type"),
            title=data.get("title"),
            description=data.get("description"),

            region=data.get("region"),
            address=data.get("address", ""),

            price=data.get("price"),
            rooms=data.get("rooms"),
            beds=data.get("beds"),
            size=data.get("size"),

            has_roommates=data.get("hasRoommates", False),
            rental_period=data.get("rentalPeriod", "long"),

            internet=data.get("internet", False),
            utilities_included=data.get("utilities", False),
            pets_allowed=data.get("petsAllowed", False),
            smoking_allowed=data.get("smokingAllowed", False),

            amenities=data.get("amenities", []),

            move_in_date=parse_date_safe(data.get("moveInDate")),
        )

        return JsonResponse({
            "id": listing.id,
            "status": "created"
        })


    # =========================
    # ПОЛУЧЕНИЕ СПИСКА
    # =========================
    qs = Listing.objects.all().order_by("-created_at")

    # Получаем фильтры
    search = request.GET.get("search")
    Type = request.GET.get("type")
    region = request.GET.get("region")
    min_price = request.GET.get("priceFrom")
    max_price = request.GET.get("priceTo")
    rooms = request.GET.get("rooms")
    listing_type = request.GET.get("propertyType")

    print(Type,listing_type,"<<<<")

    has_roommates = request.GET.get("hasRoommates")
    rental_period = request.GET.get("rentalPeriod")

    internet = request.GET.get("internet")
    utilities = request.GET.get("utilities")
    pets_allowed = request.GET.get("petsAllowed")
    smoking_allowed = request.GET.get("smokingAllowed")

    move_in_date = request.GET.get("moveInDate")
    amenities = request.GET.getlist("amenities[]")

    # ---- Фильтрация ----

    if listing_type:
        qs = qs.filter(type=listing_type)
    #if Type:
    #    qs = qs.filter(type=Type)
    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(description__icontains=search)
        )
    if region:
        qs = qs.filter(region__icontains=region)

    if min_price:
        qs = qs.filter(price__gte=min_price)

    if max_price:
        qs = qs.filter(price__lte=max_price)

    if rooms:
        qs = qs.filter(rooms=rooms)

    if has_roommates == "yes":
        qs = qs.filter(has_roommates=True)

    if rental_period:
        qs = qs.filter(rental_period=rental_period)

    if internet == "yes":
        qs = qs.filter(internet=True)

    if utilities == "yes":
        qs = qs.filter(utilities_included=True)

    if pets_allowed == "yes":
        qs = qs.filter(pets_allowed=True)

    if smoking_allowed == "yes":
        qs = qs.filter(smoking_allowed=True)

    if move_in_date:
        qs = qs.filter(move_in_date__lte=move_in_date)

    
    if amenities:
        qs = list(qs)  # превращаем QuerySet в список
        qs = [
            l for l in qs
            if all(a in l.amenities for a in amenities)
        ]

    # ---- Пагинация ----

    paginator = Paginator(qs, 9)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    results = []
    for listing in page_obj:
        main_image = listing.images.first()

        results.append({
            "id": listing.id,
            "type": listing.type,
            "title": listing.title,
            "price": str(listing.price),
            "region": listing.region,
            "address": listing.address,
            "size": listing.size,
            "rooms": listing.rooms,
            "beds": listing.beds,

            "hasRoommates": listing.has_roommates,
            "rentalPeriod": listing.rental_period,

            "internet": listing.internet,
            "utilities": listing.utilities_included,
            "petsAllowed": listing.pets_allowed,
            "smokingAllowed": listing.smoking_allowed,

            "amenities": listing.amenities,
            "moveInDate": listing.move_in_date,

            "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
        })

    return JsonResponse({
        "results": results,
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
    })


def parse_date_safe(value):
    """
    Безопасный парсер даты из строки YYYY-MM-DD
    """
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None
@csrf_exempt
@require_POST
def create_ad(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    data = json.loads(request.body)

    ad = Ad.objects.create(
        owner=request.user,
        type=data["type"],
        title=data["title"],
        description=data["description"],
        layout=data.get("layout", ""),
        beds=data.get("beds"),
        price=data["price"],
    )

    return JsonResponse({"id": ad.id})
@csrf_exempt
@require_POST
def upload_listing_image(request, listing_id):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    listing = get_object_or_404(Listing, id=listing_id, owner=request.user)

    if "image" not in request.FILES:
        return JsonResponse({"detail": "No image"}, status=400)

    img = ListingImage.objects.create(
        listing=listing,
        image=request.FILES["image"]
    )

    return JsonResponse({
        "id": img.id,
        "url": img.image.url
    })

@csrf_exempt
@require_POST
def upload_avatar(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    profile = request.user.profile
    profile.avatar = request.FILES["avatar"]
    profile.save()

    return JsonResponse({
        "detail": "Avatar uploaded",
        "avatar": profile.avatar.url
    })
@csrf_exempt
@require_http_methods(["GET", "POST"])
def profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "GET":

        return JsonResponse({
            "photo": profile.avatar.url if profile.avatar else "",
            "name": profile.name,
            "age": profile.age,
            "gender": profile.gender,
            "city": profile.city,
            "languages": profile.languages.split(",") if profile.languages else [],

            "profession": profile.profession,
            "about": profile.about,

            "smoking": profile.smoking,
            "alcohol": profile.alcohol,
            "sleepSchedule": profile.sleep_schedule,
            "noiseTolerance": profile.noise_tolerance,

            "gamer": profile.gamer,
            "workFromHome": profile.work_from_home,
            "pets": profile.pets,

            "cleanliness": profile.cleanliness,
            "introvertExtrovert": profile.introvert_extrovert,

            "guestsParties": profile.guests_parties,
            "preferredGender": profile.preferred_gender,
            "preferredAgeRange": profile.preferred_age_range,

            "verified": profile.verified,
            "lookingForHousing": profile.looking_for_housing,
        })

    # POST — обновляем ТОЛЬКО если поле пришло
    data = json.loads(request.body)

    for field, attr in [
        ("name", "name"),
        ("age", "age"),
        ("gender", "gender"),
        ("city", "city"),
        ("languages", "languages"),
        ("profession", "profession"),
        ("about", "about"),
        ("smoking", "smoking"),
        ("alcohol", "alcohol"),
        ("sleepSchedule", "sleep_schedule"),
        ("noiseTolerance", "noise_tolerance"),
        ("gamer", "gamer"),
        ("workFromHome", "work_from_home"),
        ("pets", "pets"),
        ("cleanliness", "cleanliness"),
        ("introvertExtrovert", "introvert_extrovert"),
        ("guestsParties", "guests_parties"),
        ("preferredGender", "preferred_gender"),
        ("preferredAgeRange", "preferred_age_range"),
        ("verified", "verified"),
        ("lookingForHousing", "looking_for_housing"),
    ]:
        if field in data:
            value = data[field]
            if field == "languages":
                value = ",".join(value)
            setattr(profile, attr, value)

    profile.save()
    return JsonResponse({"detail": "Profile updated"})


def apple_callback(request):
    code = request.GET.get("code")
    id_token = request.GET.get("id_token")

    if not id_token:
        return HttpResponse("No id_token from Apple", status=400)

    payload = jwt.decode(id_token, options={"verify_signature": False})

    apple_id = payload.get("sub")
    email = payload.get("email")  # может быть relay
    first_name = payload.get("name", {}).get("firstName", "")
    last_name = payload.get("name", {}).get("lastName", "")

    # Ищем по email
    user = None
    if email:
        user = User.objects.filter(email=email).first()

    if user:
        profile = user.profile

        # Если раньше был email, апгрейдим
        if profile.auth_provider == "email":
            profile.auth_provider = "apple"
            profile.save()
    else:
        user = User.objects.create_user(
            username=f"apple_{apple_id}",
            email=email or "",
            first_name=first_name,
            last_name=last_name,
        )

        profile = Profile.objects.create(
            user=user,
            auth_provider="apple",
            name=f"{first_name} {last_name}".strip()
        )

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return redirect("/apartments")
def google_callback(request):
    error = request.GET.get("error")
    redirect_uri = request.build_absolute_uri(reverse("google_callback"))
    if error:
        return HttpResponse(f"Google OAuth error: {error}")

    code = request.GET.get("code")
    if not code:
        return HttpResponse("No code received", status=400)

    # 1. Получаем token
    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
    )

    token_data = token_response.json()
    if "id_token" not in token_data:
        return HttpResponse("No id_token returned", status=400)

    # 2. Декодируем id_token
    payload = jwt.decode(token_data["id_token"], options={"verify_signature": False})

    email = payload.get("email")
    first_name = payload.get("given_name", "")
    last_name = payload.get("family_name", "")
    google_id = payload.get("sub")

    if not email:
        return HttpResponse("Google did not return email", status=400)

    # 3. Ищем пользователя по email
    user = User.objects.filter(email=email).first()

    if user:
        # Пользователь уже существует → это его аккаунт
        profile = user.profile

        # Обновляем provider
        profile.auth_provider = "google"
        profile.save()

    else:
        # Пользователя нет → создаём нового
        user = User.objects.create_user(
            username=google_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        profile = Profile.objects.create(
            user=user,
            auth_provider="google",
            name=f"{first_name} {last_name}".strip()
        )

    # 4. Логиним
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return redirect("/apartments")


# FAVORITES ENDPOINTS

@login_required
@require_http_methods(["POST"])
def add_to_favorites(request):
    """Добавить объявление в избранное"""
    try:
        data = json.loads(request.body)
        listing_id = data.get('listing_id')
        
        if not listing_id:
            return JsonResponse({"error": "listing_id is required"}, status=400)
        
        listing = get_object_or_404(Listing, id=listing_id)
        profile = request.user.profile
        profile.favorite_listings.add(listing)
        
        return JsonResponse({
            "success": True,
            "message": "Добавлено в избранное",
            "is_favorite": True
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def remove_from_favorites(request):
    """Удалить объявление из избранного"""
    try:
        data = json.loads(request.body)
        listing_id = data.get('listing_id')
        
        if not listing_id:
            return JsonResponse({"error": "listing_id is required"}, status=400)
        
        listing = get_object_or_404(Listing, id=listing_id)
        profile = request.user.profile
        profile.favorite_listings.remove(listing)
        
        return JsonResponse({
            "success": True,
            "message": "Удалено из избранного",
            "is_favorite": False
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_favorites(request):
    """Получить все избранные объявления пользователя"""
    try:
        profile = request.user.profile
        favorites = profile.favorite_listings.all()
        
        # Пагинация
        page = request.GET.get('page', 1)
        paginator = Paginator(favorites, 12)
        favorites_page = paginator.get_page(page)
        
        listings_data = []
        for listing in favorites_page:
            images = ListingImage.objects.filter(listing=listing)
            image_url = images.first().image.url if images.exists() else None
            
            listings_data.append({
                "id": listing.id,
                "title": listing.title,
                "description": listing.description,
                "price": str(listing.price),
                "room_type": listing.room_type,
                "city": listing.city,
                "region": listing.region,
                "area": listing.area,
                "image_url": image_url,
                "amenities": listing.amenities.split(',') if listing.amenities else [],
            })
        
        return JsonResponse({
            "success": True,
            "count": paginator.count,
            "page": page,
            "total_pages": paginator.num_pages,
            "listings": listings_data
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def is_favorite(request):
    """Проверить, находится ли объявление в избранном"""
    try:
        listing_id = request.GET.get('listing_id')
        if not listing_id:
            return JsonResponse({"error": "listing_id is required"}, status=400)
        
        profile = request.user.profile
        is_fav = profile.favorite_listings.filter(id=listing_id).exists()
        
        return JsonResponse({
            "listing_id": listing_id,
            "is_favorite": is_fav
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)







