from django.shortcuts import render,redirect,get_object_or_404
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
import json
import re
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from django.http import JsonResponse, HttpResponse
import requests
from django.conf import settings
from django.contrib.auth import get_user_model, login, logout, authenticate
import jwt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST,require_http_methods
from django.db.models import Q
from django.utils import timezone
from users.models import Profile
from listings.models import Listing, ListingImage, ListingInvite, ListingResident
from article.models import LaunchSettings, default_launch_date
from django.core.paginator import Paginator

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.urls import reverse
from urllib.parse import urlencode
User = get_user_model()
DEBUG_MODE=True;


@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html')

def google_login(request):
    query = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    })
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return redirect(google_auth_url)


@require_http_methods(["GET"])
def launch_date_view(request):
    launch_settings, _ = LaunchSettings.objects.get_or_create(
        id=1,
        defaults={"launch_date": default_launch_date()},
    )

    return JsonResponse({
        "launch_date": launch_settings.launch_date.isoformat()
    })

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

    # Собираем избранные соседи текущего пользователя
    favorite_profile_ids = set()
    if request.user.is_authenticated:
        try:
            favorite_profile_ids = set(request.user.profile.favorite_profiles.values_list('id', flat=True))
        except Exception:
            favorite_profile_ids = set()

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
            "is_favorite": p.id in favorite_profile_ids,
        })

    return JsonResponse({
        "count": paginator.count,
        "pages": paginator.num_pages,
        "results": results,
    })

@require_http_methods(["GET"])
def neighbour_detail(request, profile_id):
    profile = get_object_or_404(Profile, id=profile_id)

    is_favorite = False
    if request.user.is_authenticated:
        try:
            is_favorite = request.user.profile.favorite_profiles.filter(id=profile.id).exists()
        except Exception:
            is_favorite = False

    return JsonResponse({
        "id": profile.id,
        "name": profile.name,
        "phone": profile.phone,
        "age": profile.age,
        "gender": profile.gender,
        "city": profile.city,
        "languages": profile.languages.split(",") if profile.languages else [],
        "profession": profile.profession,
        "about": profile.about,
        "smoking": profile.smoking,
        "alcohol": profile.alcohol,
        "pets": profile.pets,
        "sleep_schedule": profile.sleep_schedule,
        "noise_tolerance": profile.noise_tolerance,
        "gamer": profile.gamer,
        "work_from_home": profile.work_from_home,
        "cleanliness": profile.cleanliness,
        "introvert_extrovert": profile.introvert_extrovert,
        "guests_parties": profile.guests_parties,
        "preferred_gender": profile.preferred_gender,
        "preferred_age_range": profile.preferred_age_range,
        "verified": profile.verified,
        "looking_for_housing": profile.looking_for_housing,
        "avatar": request.build_absolute_uri(profile.avatar.url) if profile.avatar else None,
        "is_favorite": is_favorite,
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

@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def listing_detail(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)

    if request.method in ["PUT", "PATCH", "DELETE"]:
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Not authenticated"}, status=401)

        profile, _ = Profile.objects.get_or_create(user=request.user)
        can_manage = listing.owner_id == request.user.id or ListingResident.objects.filter(listing=listing, profile=profile).exists()

        if not can_manage:
            return JsonResponse({"detail": "Forbidden"}, status=403)

        if request.method == "DELETE":
            listing.delete()
            return JsonResponse({"detail": "Deleted"})

        data = json.loads(request.body or "{}")
        editable_fields = {
            "title": "title",
            "description": "description",
            "region": "region",
            "city": "city",
            "address": "address",
            "price": "price",
            "rooms": "rooms",
            "size": "size",
            "moveInDate": "move_in_date",
            "move_in_date": "move_in_date",
            "maxResidents": "max_residents",
            "max_residents": "max_residents",
            "utilitiesFee": "utilities_fee",
            "utilities_fee": "utilities_fee",
            "utilitiesIncluded": "utilities_included",
            "utilities_included": "utilities_included",
        }

        for incoming_key, model_field in editable_fields.items():
            if incoming_key not in data:
                continue

            value = data[incoming_key]
            if model_field in ["rooms", "size", "max_residents"]:
                value = parse_int_value(value)
            elif model_field == "move_in_date":
                value = parse_date_safe(value)
            elif model_field == "utilities_fee":
                value = parse_decimal_value(value, Decimal("0"))

            setattr(listing, model_field, value)

        if listing.utilities_included:
            listing.utilities_fee = Decimal("0")

        listing.save()
        return JsonResponse({"detail": "Updated"})

    main_image = listing.images.first()

    # Признак избранного для текущего пользователя
    is_favorite = False
    if request.user.is_authenticated:
        try:
            is_favorite = request.user.profile.favorite_listings.filter(id=listing.id).exists()
        except Exception:
            is_favorite = False

    return JsonResponse({
        "id": listing.id,
        "type": listing.type,
        "title": listing.title,
        "description": listing.description,
        "price": str(listing.price),
        "currency": listing.currency,
        "region": listing.region,
        "city": listing.city,
        "address": listing.address,
        "size": listing.size,
        "rooms": listing.rooms,
        "beds": listing.beds,
        "condition_state": listing.condition_state,
        "rental_period": listing.rental_period,
        "move_in_date": listing.move_in_date.isoformat() if listing.move_in_date else None,
        "amenities": listing.amenities or [],
        "internet": listing.internet,
        "utilities_included": listing.utilities_included,
        "pets_allowed": listing.pets_allowed,
        "smoking_allowed": listing.smoking_allowed,
        "has_roommates": listing.has_roommates,
        "has_video": listing.has_video,
        "has_3d_tour": listing.has_3d_tour,
        "has_floorplan": listing.has_floorplan,
        "maxResidents": listing.max_residents,
        "utilitiesFee": str(listing.utilities_fee),
        "residentsCount": listing.residents.count(),
        "badges": [],
        "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
        "images": [
            request.build_absolute_uri(img.image.url)
            for img in listing.images.all()
        ],
        "is_favorite": is_favorite,
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

        data = json.loads(request.body or "{}")

        profile, _ = Profile.objects.get_or_create(user=request.user)

        if ListingResident.objects.filter(profile=profile).exclude(listing__owner=request.user).exists():
            return JsonResponse({"detail": "You already belong to a home"}, status=400)

        role_raw = data.get("creatorRole", data.get("role"))
        role = str(role_raw).upper() if role_raw is not None else ""
        if role not in ["OWNER", "NEIGHBOUR"]:
            return JsonResponse({"detail": "Creator role must be OWNER or NEIGHBOUR"}, status=400)

        owner_user = request.user if role == "OWNER" else None

        region_value = data.get("region")
        if not region_value or region_value in ["ALL", "ALL_CR"]:
            return JsonResponse({"detail": "Region is required"}, status=400)

        rooms_value = parse_int_value(data.get("rooms"))
        size_value = parse_int_value(data.get("size"))

        if rooms_value is None and isinstance(data.get("rooms"), str):
            raw_rooms = data.get("rooms", "")
            if re.search(r"m\s*2|m²|\bм\b|\bm\b", raw_rooms.lower()) and size_value is None:
                size_value = parse_int_value(raw_rooms)

        max_residents_value = parse_int_value(data.get("maxResidents"))
        if max_residents_value is None:
            max_residents_value = 1
        max_residents_value = max(1, min(6, max_residents_value))

        utilities_included_value = bool(
            data.get("utilitiesIncluded", data.get("utilities_included", data.get("utilities", False)))
        )
        utilities_fee_value = parse_decimal_value(
            data.get("utilitiesFee", data.get("utilities_fee", 0)),
            Decimal("0"),
        )
        if utilities_included_value:
            utilities_fee_value = Decimal("0")

        listing = Listing.objects.create(
            owner=owner_user,
            type=data.get("type") or data.get("property_type") or "APARTMENT",
            title=data.get("title"),
            description=data.get("description"),

            region=region_value,
            city=data.get("city", ""),
            address=data.get("address", ""),

            price=data.get("price"),
            currency=data.get("currency", "CZK"),
            rooms=rooms_value,
            beds=parse_int_value(data.get("beds")),
            size=size_value,

            has_roommates=bool(data.get("hasRoommates", data.get("has_roommates", False))),
            rental_period=(data.get("rentalPeriod") or data.get("rental_period") or "LONG").upper(),

            internet=bool(data.get("internet", False)),
            utilities_included=utilities_included_value,
            pets_allowed=bool(data.get("petsAllowed", data.get("pets_allowed", False))),
            smoking_allowed=bool(data.get("smokingAllowed", data.get("smoking_allowed", False))),

            amenities=data.get("amenities", []),

            move_in_date=parse_date_safe(data.get("moveInDate") or data.get("move_in_date")),
            condition_state=data.get("conditionState") or data.get("condition_state") or None,
            energy_class=data.get("energyClass") or data.get("energy_class") or None,

            has_bus_stop=bool(data.get("hasBusStop", data.get("has_bus_stop", False))),
            has_train_station=bool(data.get("hasTrainStation", data.get("has_train_station", False))),
            has_metro=bool(data.get("hasMetro", data.get("has_metro", False))),
            has_post_office=bool(data.get("hasPostOffice", data.get("has_post_office", False))),
            has_atm=bool(data.get("hasAtm", data.get("has_atm", False))),
            has_general_practitioner=bool(data.get("hasGeneralPractitioner", data.get("has_general_practitioner", False))),
            has_vet=bool(data.get("hasVet", data.get("has_vet", False))),
            has_primary_school=bool(data.get("hasPrimarySchool", data.get("has_primary_school", False))),
            has_kindergarten=bool(data.get("hasKindergarten", data.get("has_kindergarten", False))),
            has_supermarket=bool(data.get("hasSupermarket", data.get("has_supermarket", False))),
            has_small_shop=bool(data.get("hasSmallShop", data.get("has_small_shop", False))),
            has_restaurant=bool(data.get("hasRestaurant", data.get("has_restaurant", False))),
            has_playground=bool(data.get("hasPlayground", data.get("has_playground", False))),

            max_residents=max_residents_value,
            utilities_fee=utilities_fee_value,
        )

        ListingResident.objects.create(listing=listing, profile=profile)

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

    # Собираем избранные id для текущего пользователя (если залогинен)
    favorite_ids = set()
    if request.user.is_authenticated:
        try:
            favorite_ids = set(request.user.profile.favorite_listings.values_list('id', flat=True))
        except Exception:
            favorite_ids = set()

    results = []
    for listing in page_obj:
        main_image = listing.images.first()

        results.append({
            "id": listing.id,
            "type": listing.type,
            "title": listing.title,
            "price": str(listing.price),
            "utilitiesFee": str(listing.utilities_fee),
            "region": listing.region,
            "address": listing.address,
            "size": listing.size,
            "rooms": listing.rooms,
            "beds": listing.beds,
            "maxResidents": listing.max_residents,
            "residentsCount": listing.residents.count(),

            "hasRoommates": listing.has_roommates,
            "rentalPeriod": listing.rental_period,

            "internet": listing.internet,
            "utilities": listing.utilities_included,
            "petsAllowed": listing.pets_allowed,
            "smokingAllowed": listing.smoking_allowed,

            "amenities": listing.amenities,
            "moveInDate": listing.move_in_date,

            "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
            "is_favorite": listing.id in favorite_ids,
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


def parse_int_value(value):
    if value is None or value == "":
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if not match:
            return None
        return int(match.group(0))
    return None


def parse_decimal_value(value, fallback=Decimal("0")):
    if value is None or value == "":
        return fallback
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, TypeError, ValueError):
        return fallback


@login_required
@require_POST
def create_home_invite(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)
    profile, _ = Profile.objects.get_or_create(user=request.user)

    is_resident = ListingResident.objects.filter(listing=listing, profile=profile).exists()
    if not is_resident:
        return JsonResponse({"detail": "Only residents can create invite"}, status=403)

    invite = ListingInvite.objects.create(
        listing=listing,
        token=uuid.uuid4().hex,
        created_by=profile,
        expires_at=timezone.now() + timedelta(days=7),
    )
    return JsonResponse({
        "token": invite.token,
        "inviteUrl": f"/api/listings/invite/{invite.token}/join/",
        "expiresAt": invite.expires_at.isoformat(),
    })


@login_required
@require_http_methods(["GET", "POST"])
def join_home_by_invite(request, token):
    invite = get_object_or_404(ListingInvite, token=token)

    if not invite.is_active:
        return JsonResponse({"detail": "Invite inactive"}, status=400)
    if invite.expires_at <= timezone.now():
        return JsonResponse({"detail": "Invite expired"}, status=400)

    profile, _ = Profile.objects.get_or_create(user=request.user)

    if ListingResident.objects.filter(profile=profile).exclude(listing=invite.listing).exists():
        return JsonResponse({"detail": "Already resident in another home"}, status=400)

    if ListingResident.objects.filter(listing=invite.listing, profile=profile).exists():
        return JsonResponse({"detail": "Already joined"}, status=200)

    current_count = ListingResident.objects.filter(listing=invite.listing).count()
    if current_count >= invite.listing.max_residents:
        return JsonResponse({"detail": "Home is full"}, status=400)

    ListingResident.objects.create(listing=invite.listing, profile=profile)
    invite.accepted_by = profile
    invite.accepted_at = timezone.now()
    invite.is_active = False
    invite.save(update_fields=["accepted_by", "accepted_at", "is_active"])

    return JsonResponse({"detail": "Joined", "listingId": invite.listing_id})


@login_required
@require_http_methods(["GET"])
def my_home(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    resident = ListingResident.objects.select_related("listing").filter(profile=profile).first()
    if not resident:
        return JsonResponse({"detail": "Not in home", "listing": None})

    listing = resident.listing
    main_image = listing.images.first()
    residents = ListingResident.objects.filter(listing=listing).select_related("profile__user")

    return JsonResponse({
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "type": listing.type,
            "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
            "address": listing.address,
            "region": listing.region,
            "maxResidents": listing.max_residents,
            "residentsCount": residents.count(),
        },
        "residents": [
            {
                "profileId": r.profile_id,
                "name": r.profile.name or r.profile.user.username,
                "userId": r.profile.user_id,
                "avatar": request.build_absolute_uri(r.profile.avatar.url) if r.profile.avatar else None,
            }
            for r in residents
        ],
    })


@login_required
@require_POST
def leave_home(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    resident = ListingResident.objects.select_related("listing").filter(profile=profile).first()

    if not resident:
        return JsonResponse({"detail": "Not in any home"}, status=404)

    listing = resident.listing
    total_residents = ListingResident.objects.filter(listing=listing).count()
    if total_residents <= 1:
        return JsonResponse({"detail": "Cannot leave as sole resident"}, status=400)

    resident.delete()
    return JsonResponse({"detail": "Left home"})
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

    listing = get_object_or_404(Listing, id=listing_id)
    profile, _ = Profile.objects.get_or_create(user=request.user)
    can_manage = listing.owner_id == request.user.id or ListingResident.objects.filter(listing=listing, profile=profile).exists()
    if not can_manage:
        return JsonResponse({"detail": "Forbidden"}, status=403)

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
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
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
    """Добавить объявление или соседа в избранное"""
    try:
        data = json.loads(request.body)
        listing_id = data.get('listing_id')
        profile_id = data.get('profile_id')  # для соседей
        
        if listing_id:
            listing = get_object_or_404(Listing, id=listing_id)
            profile = request.user.profile
            profile.favorite_listings.add(listing)
        elif profile_id:
            fav_profile = get_object_or_404(Profile, id=profile_id)
            profile = request.user.profile
            profile.favorite_profiles.add(fav_profile)
        else:
            return JsonResponse({"error": "listing_id or profile_id is required"}, status=400)
        
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
    """Удалить объявление или соседа из избранного"""
    try:
        data = json.loads(request.body)
        listing_id = data.get('listing_id')
        profile_id = data.get('profile_id')  # для соседей
        
        if listing_id:
            listing = get_object_or_404(Listing, id=listing_id)
            profile = request.user.profile
            profile.favorite_listings.remove(listing)
        elif profile_id:
            fav_profile = get_object_or_404(Profile, id=profile_id)
            profile = request.user.profile
            profile.favorite_profiles.remove(fav_profile)
        else:
            return JsonResponse({"error": "listing_id or profile_id is required"}, status=400)
        
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
    """Получить все избранные объявления и соседей пользователя"""
    try:
        profile = request.user.profile
        listings = list(profile.favorite_listings.all())
        neighbors = list(profile.favorite_profiles.all())
        
        # Объединяем оба типа в один список
        all_favorites = []
        
        # Добавляем объявления
        for listing in listings:
            images = ListingImage.objects.filter(listing=listing)
            image_url = images.first().image.url if images.exists() else None
            all_favorites.append({
                "id": listing.id,
                "type": "LISTING",
                "title": listing.title,
                "description": listing.description,
                "price": str(listing.price),
                "room_type": listing.type,
                "city": listing.address,
                "region": listing.region,
                "area": listing.size,
                "image_url": image_url,
                "amenities": listing.amenities or [],
                "is_favorite": True,
            })
        
        # Добавляем соседей
        for neighbor in neighbors:
            all_favorites.append({
                "id": neighbor.id,
                "type": "NEIGHBOUR",
                "name": neighbor.name,
                "age": neighbor.age,
                "city": neighbor.city,
                "image_url": neighbor.avatar.url if neighbor.avatar else None,
                "verified": neighbor.verified,
                "looking_for_housing": neighbor.looking_for_housing,
                "is_favorite": True,
            })
        
        # Пагинация
        page = int(request.GET.get('page', 1))
        paginator = Paginator(all_favorites, 12)
        favorites_page = paginator.get_page(page)
        
        return JsonResponse({
            "success": True,
            "count": paginator.count,
            "page": page,
            "total_pages": paginator.num_pages,
            "listings": list(favorites_page),
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def is_favorite(request):
    """Проверить, находится ли объявление или сосед в избранном"""
    try:
        listing_id = request.GET.get('listing_id')
        profile_id = request.GET.get('profile_id')
        
        profile = request.user.profile
        is_fav = False
        
        if listing_id:
            is_fav = profile.favorite_listings.filter(id=listing_id).exists()
        elif profile_id:
            is_fav = profile.favorite_profiles.filter(id=profile_id).exists()
        else:
            return JsonResponse({"error": "listing_id or profile_id is required"}, status=400)
        
        return JsonResponse({
            "is_favorite": is_fav
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)







