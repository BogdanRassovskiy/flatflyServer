from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Profile, ProfileCompletionWeight, ProfileRankingConfig, University, UniversityFaculty


class UniversityFacultyInline(admin.TabularInline):
    model = UniversityFaculty
    extra = 0
    fields = ("name", "city", "address", "latitude", "longitude", "source")


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Профиль'
    fk_name = 'user'
    
    # Поля для отображения в инлайне
    fields = (
        'avatar', 'name', 'phone', 'age', 'gender', 'city', 'university', 'faculty',
        'verified', 'looking_for_housing',
        'languages', 'profession', 'about',
        'smoking', 'alcohol', 'sleep_schedule', 'gamer', 'work_from_home', 'pets'
    )
    
    readonly_fields = ('created_at', 'updated_at')


class UserAdmin(BaseUserAdmin):
    """Кастомная админка для User с встроенным Profile"""
    inlines = (ProfileInline,)
    
    list_display = ('username', 'email', 'get_phone', 'get_verified', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'profile__verified', 'profile__looking_for_housing')
    search_fields = ('username', 'email', 'profile__name', 'profile__phone')
    
    actions = ['activate_users', 'deactivate_users', 'verify_users', 'unverify_users']
    
    def get_phone(self, obj):
        """Получить телефон из профиля"""
        return obj.profile.phone if hasattr(obj, 'profile') else '-'
    get_phone.short_description = 'Телефон'
    
    def get_verified(self, obj):
        """Получить статус верификации"""
        return obj.profile.verified if hasattr(obj, 'profile') else False
    get_verified.short_description = 'Верифицирован'
    get_verified.boolean = True
    
    def activate_users(self, request, queryset):
        """Разблокировать выбранных пользователей"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} пользователей разблокировано.')
    activate_users.short_description = 'Разблокировать выбранных пользователей'
    
    def deactivate_users(self, request, queryset):
        """Заблокировать выбранных пользователей"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} пользователей заблокировано.')
    deactivate_users.short_description = 'Заблокировать выбранных пользователей'
    
    def verify_users(self, request, queryset):
        """Верифицировать выбранных пользователей"""
        count = 0
        for user in queryset:
            if hasattr(user, 'profile'):
                user.profile.verified = True
                user.profile.save()
                count += 1
        self.message_user(request, f'{count} пользователей верифицировано.')
    verify_users.short_description = 'Верифицировать выбранных пользователей'
    
    def unverify_users(self, request, queryset):
        """Снять верификацию с выбранных пользователей"""
        count = 0
        for user in queryset:
            if hasattr(user, 'profile'):
                user.profile.verified = False
                user.profile.save()
                count += 1
        self.message_user(request, f'{count} пользователей лишено верификации.')
    unverify_users.short_description = 'Снять верификацию с выбранных пользователей'


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Админка для отдельного просмотра профилей"""
    list_display = (
        'get_username', 'name', 'phone', 'age', 'gender', 'city', 'university', 'faculty',
        'verified', 'looking_for_housing', 'get_is_active', 'created_at'
    )
    list_filter = ('verified', 'looking_for_housing', 'gender', 'city', 'auth_provider')
    search_fields = ('name', 'phone', 'user__email', 'user__username', 'city', 'profession')
    
    readonly_fields = ('created_at', 'updated_at', 'auth_provider')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'avatar', 'name', 'phone', 'age', 'gender', 'city', 'university', 'faculty')
        }),
        ('Статус', {
            'fields': ('verified', 'looking_for_housing', 'auth_provider')
        }),
        ('Профессия и языки', {
            'fields': ('profession', 'languages', 'about')
        }),
        ('Образ жизни', {
            'fields': (
                'smoking', 'alcohol', 'sleep_schedule', 'noise_tolerance',
                'gamer', 'work_from_home', 'pets', 'cleanliness', 
                'introvert_extrovert', 'guests_parties'
            )
        }),
        ('Предпочтения', {
            'fields': ('preferred_gender', 'preferred_age_range')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    actions = ['verify_profiles', 'unverify_profiles', 'mark_looking_for_housing', 'mark_not_looking']
    
    def get_username(self, obj):
        """Получить username пользователя"""
        return obj.user.username
    get_username.short_description = 'Username'
    get_username.admin_order_field = 'user__username'
    
    def get_is_active(self, obj):
        """Получить статус активности пользователя"""
        return obj.user.is_active
    get_is_active.short_description = 'Активен'
    get_is_active.boolean = True
    get_is_active.admin_order_field = 'user__is_active'
    
    def verify_profiles(self, request, queryset):
        """Верифицировать профили"""
        updated = queryset.update(verified=True)
        self.message_user(request, f'{updated} профилей верифицировано.')
    verify_profiles.short_description = 'Верифицировать выбранные профили'
    
    def unverify_profiles(self, request, queryset):
        """Снять верификацию"""
        updated = queryset.update(verified=False)
        self.message_user(request, f'{updated} профилей лишено верификации.')
    unverify_profiles.short_description = 'Снять верификацию'
    
    def mark_looking_for_housing(self, request, queryset):
        """Отметить как ищущих жилье"""
        updated = queryset.update(looking_for_housing=True)
        self.message_user(request, f'{updated} профилей отмечено как ищущие жилье.')
    mark_looking_for_housing.short_description = 'Отметить как ищущих жилье'
    
    def mark_not_looking(self, request, queryset):
        """Отметить как не ищущих жилье"""
        updated = queryset.update(looking_for_housing=False)
        self.message_user(request, f'{updated} профилей отмечено как не ищущие жилье.')
    mark_not_looking.short_description = 'Отметить как не ищущих жилье'


# Перерегистрируем User с кастомной админкой
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ("name", "short_name", "city", "address", "latitude", "longitude", "source")
    search_fields = ("name", "short_name", "city", "address")
    list_filter = ("source", "city")
    inlines = (UniversityFacultyInline,)


@admin.register(UniversityFaculty)
class UniversityFacultyAdmin(admin.ModelAdmin):
    list_display = ("name", "university", "city", "address", "latitude", "longitude", "source")
    search_fields = ("name", "university__name", "city", "address")
    list_filter = ("source", "city", "university")


@admin.register(ProfileCompletionWeight)
class ProfileCompletionWeightAdmin(admin.ModelAdmin):
    list_display = ("attribute_key", "label", "weight", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("attribute_key", "label")


@admin.register(ProfileRankingConfig)
class ProfileRankingConfigAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "weight", "hard_filter", "is_active", "updated_at")
    list_filter = ("hard_filter", "is_active")
    search_fields = ("code", "label")
