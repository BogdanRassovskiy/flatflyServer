from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView
from django.views.generic import RedirectView
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
import os
from . import views


urlpatterns = [
    path('admin', RedirectView.as_view(url='/admin/', permanent=True)),
    # админка (по желанию)
    path('admin/', admin.site.urls),
    # OAuth backend
    #path('accounts/', include('allauth.urls')),
    # Article API
    path('', include('article.urls')),
    path("api/me/", views.me, name="me"),
    path("api/logout/", views.logout_view, name="logout"),
    path("api/contact/", views.contact_view, name="contact_view"),
    path("api/auth/password-reset/", views.password_reset_request,name="password_reset_request"),
    path("api/auth/password-reset-confirm/<uidb64>/<token>/", views.password_reset_confirm,name="password_reset_confirm"),
    path("api/auth/register/", views.register_view,name="register_view"),
    path("api/auth/login/", views.login_view, name="login_view"),
    path("api/google_login/", views.google_login, name="google_login"),
    path("api/google_callback/", views.google_callback, name="google_callback"),
    path("api/profile/avatar/", views.upload_avatar, name="upload_avatar"),
    path("api/profile/cover/", views.upload_profile_cover, name="upload_profile_cover"),
    path("api/profile/gallery/<int:photo_id>/", views.profile_gallery_item, name="profile_gallery_item"),
    path("api/profile/gallery/", views.profile_gallery_add, name="profile_gallery_add"),
    path("api/profile/", views.profile_view, name="profile"),
    path("api/universities/", views.universities_list, name="universities_list"),
    path("api/universities/faculties/", views.university_faculties_list, name="university_faculties_list"),
    path("api/launch-date/", views.launch_date_view, name="launch_date"),
    path("api/team-members/", views.team_members_view, name="team_members"),
    path("api/listings/", views.listings_view, name="listings"),
    path("api/listings/<int:listing_id>/images/", views.upload_listing_image, name="upload_listing_image"),
    path("api/listings/<int:listing_id>/invite/", views.create_home_invite, name="create_home_invite"),
    path("api/listings/invite/<str:token>/join/", views.join_home_by_invite, name="join_home_by_invite"),
    path("api/listings/my-home/", views.my_home, name="my_home"),
    path("api/listings/leave-home/", views.leave_home, name="leave_home"),
    path("api/listings/remove-from-home/<int:profile_id>/", views.remove_from_home, name="remove_from_home"),
    path("api/listings/list", views.listings_view, name="listings_view"),
    path("api/municipalities/search", views.municipalities_search, name="municipalities_search"),
    path("api/streets/search", views.streets_search, name="streets_search"),
    path("api/geocode/reverse", views.reverse_geocode, name="reverse_geocode"),
    path("api/listings/<int:listing_id>/", views.listing_detail, name="listing_detail"),
    path("api/listings/<int:listing_id>/report/", views.report_listing, name="report_listing"),
    path("api/neighbours/list", views.neighbours_list, name="neighbours_list"),
    path("api/neighbours/<int:profile_id>/", views.neighbour_detail, name="neighbour_detail"),
    path("api/neighbours/<int:profile_id>/review/", views.submit_profile_review, name="submit_profile_review"),
    path("api/favorites/add/", views.add_to_favorites, name="add_to_favorites"),
    path("api/favorites/remove/", views.remove_from_favorites, name="remove_from_favorites"),
    path("api/favorites/", views.get_favorites, name="get_favorites"),
    path("api/favorites/is-favorite/", views.is_favorite, name="is_favorite"),

    # Чаты и сообщения
    path("api/", include("chats.urls")),
    # Алиасы для совместимости с фронтендом, который использует подчёркивание
    path("api/favorites/is_favorite/", views.is_favorite, name="is_favorite_underscore"),
    path("api/favorites/is_favorite", views.is_favorite, name="is_favorite_underscore_noslash"),

    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'static/assets')
    }),
    re_path(r'^fonts/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'static/fonts')
    }),

    # SPA — ТОЛЬКО для страниц
    re_path(
        r'^(?!static/|assets/|fonts/|media/|api/|admin/|favorites/)(?!admin/)', 
        TemplateView.as_view(template_name="index.html")
    ),


]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)