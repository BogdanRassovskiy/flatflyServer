from django import forms
from django.contrib import admin, messages
from django.contrib.admin.helpers import ActionForm
from django.contrib.admin import SimpleListFilter
from django.db import transaction
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse
from django.urls.exceptions import NoReverseMatch
from django.utils import translation

from .models import ListingFilterConfig, ListingFilterOptionConfig, CzechMunicipality, ListingReport, Listing
from chats.models import Chat, Message, ModerationMessage
from chats.support_profile import get_or_create_flatfly_support_user, get_profile_locale
from flatflyServer.telegram_channel import delete_listing_from_channel


class ListingReportActionForm(ActionForm):
	apply_strike = forms.BooleanField(
		required=False,
		label="Apply strike to owner on confirm",
	)


def _t(ru: str, cs: str, en: str) -> str:
	lang = (translation.get_language() or "cs").split("-")[0]
	if lang == "ru":
		return ru
	if lang == "cs":
		return cs
	return en


def _reason_label(reason_code: str, locale: str) -> str:
	mapping = {
		"fraud": {"ru": "Мошенничество", "cs": "Podvod", "en": "Fraud"},
		"spam": {"ru": "Спам", "cs": "Spam", "en": "Spam"},
		"fake_listing": {"ru": "Фейковое объявление", "cs": "Falešný inzerát", "en": "Fake listing"},
		"inappropriate_content": {"ru": "Неприемлемый контент", "cs": "Nevhodný obsah", "en": "Inappropriate content"},
		"other": {"ru": "Другое", "cs": "Jiné", "en": "Other"},
	}
	lang = "ru" if locale == "ru" else ("cs" if locale == "cs" else "en")
	return mapping.get(reason_code, {}).get(lang, reason_code)


def _status_label(status_code: str, locale: str) -> str:
	mapping = {
		ListingReport.STATUS_PENDING: {"ru": "Ожидает", "cs": "Čeká", "en": "Pending"},
		ListingReport.STATUS_REJECTED: {"ru": "Отклонена", "cs": "Zamítnuto", "en": "Rejected"},
		ListingReport.STATUS_CONFIRMED_DELETE: {"ru": "Подтверждена (удалено объявление)", "cs": "Potvrzeno (inzerát odstraněn)", "en": "Confirmed (listing removed)"},
		ListingReport.STATUS_CONFIRMED_DELETE_STRIKE: {"ru": "Подтверждена (удалено объявление + страйк)", "cs": "Potvrzeno (inzerát odstraněn + strike)", "en": "Confirmed (listing removed + strike)"},
	}
	lang = "ru" if locale == "ru" else ("cs" if locale == "cs" else "en")
	return mapping.get(status_code, {}).get(lang, status_code)


class ListingReportReasonFilter(SimpleListFilter):
	title = "Reason"
	parameter_name = "reason"

	def lookups(self, request, model_admin):
		locale = (translation.get_language() or "cs").split("-")[0]
		return [(code, _reason_label(code, locale)) for code, _ in ListingReport.REASON_CHOICES]

	def queryset(self, request, queryset):
		if self.value():
			return queryset.filter(reason=self.value())
		return queryset


class ListingReportStatusFilter(SimpleListFilter):
	title = "Status"
	parameter_name = "status"

	def lookups(self, request, model_admin):
		locale = (translation.get_language() or "cs").split("-")[0]
		return [(code, _status_label(code, locale)) for code, _ in ListingReport.STATUS_CHOICES]

	def queryset(self, request, queryset):
		if self.value():
			return queryset.filter(status=self.value())
		return queryset

@admin.register(ListingFilterConfig)
class ListingFilterConfigAdmin(admin.ModelAdmin):
	list_display = ("id", "code", "name", "weight", "hard_filter", "relaxation_order", "enabled")
	list_filter = ("hard_filter", "enabled", "value_type")
	search_fields = ("code", "name")
	ordering = ("relaxation_order", "id")


@admin.register(CzechMunicipality)
class CzechMunicipalityAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "region_code", "municipality_type", "population", "source")
	list_filter = ("region_code", "municipality_type", "source")
	search_fields = ("name", "normalized_name", "code")
	ordering = ("name", "id")


@admin.register(ListingFilterOptionConfig)
class ListingFilterOptionConfigAdmin(admin.ModelAdmin):
	list_display = ("id", "parent_filter", "option_key", "name", "weight", "hard_filter", "relaxation_order", "enabled")
	list_filter = ("parent_filter", "hard_filter", "enabled")
	search_fields = ("option_key", "name", "description")
	ordering = ("parent_filter", "relaxation_order", "id")


@admin.register(ListingReport)
class ListingReportAdmin(admin.ModelAdmin):
	action_form = ListingReportActionForm
	list_display = ("id", "listing_link", "reporter", "listing_owner", "reason_localized", "status_localized", "created_at")
	list_filter = (ListingReportReasonFilter, ListingReportStatusFilter, "strike_applied", "listing_deleted", "created_at")
	search_fields = ("listing__title", "reporter__username", "listing_owner__username", "details")
	readonly_fields = ("listing_link", "reporter", "listing_owner", "details", "created_at", "reviewed_by", "reviewed_at", "strike_applied", "listing_deleted")
	fields = (
		"listing_link",
		"reporter",
		"listing_owner",
		"reason",
		"details",
		"status",
		"resolution_note",
		"strike_applied",
		"listing_deleted",
		"reviewed_by",
		"reviewed_at",
		"created_at",
	)
	actions = ("reject_reports", "confirm_delete_listing")

	def get_actions(self, request):
		actions = super().get_actions(request)
		if "reject_reports" in actions:
			func, name, _desc = actions["reject_reports"]
			actions["reject_reports"] = (func, name, _t("Отклонить", "Zamitnout", "Reject"))
		if "confirm_delete_listing" in actions:
			func, name, _desc = actions["confirm_delete_listing"]
			actions["confirm_delete_listing"] = (
				func,
				name,
				_t(
					"Подтвердить (удалить объявление, страйк по галочке)",
					"Potvrdit (odstranit inzerat, strike podle volby)",
					"Confirm (remove listing, optional strike)",
				),
			)
		return actions

	def listing_link(self, obj: ListingReport):
		listing = getattr(obj, "listing", None)
		if not listing:
			return _t("Объявление удалено", "Inzerát byl odstraněn", "Listing removed")
		listing_type = str(getattr(listing, "type", "") or "").upper()
		if listing_type == "NEIGHBOUR":
			public_prefix = "neighbours"
		elif listing_type == "ROOM":
			public_prefix = "rooms"
		else:
			public_prefix = "apartments"
		public_url = f"/{public_prefix}/{listing.id}"
		try:
			admin_url = reverse("admin:listings_listing_change", args=[listing.id])
		except NoReverseMatch:
			admin_url = ""
		if admin_url:
			return format_html(
				'<a href="{}" target="_blank" rel="noopener">#{}</a> · <a href="{}" target="_blank" rel="noopener">Открыть на сайте</a>',
				admin_url,
				listing.id,
				public_url,
			)
		return format_html(
			'#{0} · <a href="{1}" target="_blank" rel="noopener">Открыть на сайте</a>',
			listing.id,
			public_url,
		)
	listing_link.short_description = "Listing"

	@admin.display(description="Reason")
	def reason_localized(self, obj: ListingReport):
		locale = (translation.get_language() or "cs").split("-")[0]
		return _reason_label(obj.reason, locale)

	@admin.display(description="Status")
	def status_localized(self, obj: ListingReport):
		locale = (translation.get_language() or "cs").split("-")[0]
		return _status_label(obj.status, locale)

	def formfield_for_choice_field(self, db_field, request, **kwargs):
		locale = (translation.get_language() or "cs").split("-")[0]
		if db_field.name == "reason":
			kwargs["choices"] = [(code, _reason_label(code, locale)) for code, _ in ListingReport.REASON_CHOICES]
		elif db_field.name == "status":
			kwargs["choices"] = [(code, _status_label(code, locale)) for code, _ in ListingReport.STATUS_CHOICES]
		return super().formfield_for_choice_field(db_field, request, **kwargs)

	def save_model(self, request, obj, form, change):
		if not change:
			super().save_model(request, obj, form, change)
			return

		previous = ListingReport.objects.filter(pk=obj.pk).first()
		previous_status = previous.status if previous else None
		next_status = obj.status

		super().save_model(request, obj, form, change)

		if next_status in {ListingReport.STATUS_CONFIRMED_DELETE, ListingReport.STATUS_CONFIRMED_DELETE_STRIKE}:
			if previous_status != next_status:
				with_strike = next_status == ListingReport.STATUS_CONFIRMED_DELETE_STRIKE
				self._resolve(obj, request.user, with_strike=with_strike)
			return

		if next_status == ListingReport.STATUS_REJECTED and previous_status != ListingReport.STATUS_REJECTED:
			obj.reviewed_by = request.user
			obj.reviewed_at = timezone.now()
			obj.save(update_fields=["reviewed_by", "reviewed_at"])

	def _notify_listing_owner(self, listing_owner, report: ListingReport):
		support_user = get_or_create_flatfly_support_user()
		chat = (
			Chat.objects
			.filter(participants=support_user)
			.filter(participants=listing_owner)
			.first()
		)
		if not chat:
			chat = Chat.objects.create()
			chat.participants.add(support_user, listing_owner)

		locale = get_profile_locale(listing_owner)
		reason_label = _reason_label(report.reason, locale)
		with_strike = report.status == ListingReport.STATUS_CONFIRMED_DELETE_STRIKE
		if locale == "ru":
			text = (
				"Информационная служба FlatFly: ваше объявление удалено после проверки жалобы модератором. "
				f"Причина жалобы: {reason_label}. "
				f"{'Также начислен страйк.' if with_strike else ''}"
			)
		elif locale == "cs":
			text = (
				"FlatFly informační služba: váš inzerát byl po kontrole nahlášení moderátorem odstraněn. "
				f"Důvod nahlášení: {reason_label}. "
				f"{'Zároveň byl udělen strike.' if with_strike else ''}"
			)
		else:
			text = (
				"FlatFly information service: your listing was removed after moderator review of a report. "
				f"Report reason: {reason_label}. "
				f"{'A strike was also applied.' if with_strike else ''}"
			)
		msg = Message.objects.create(chat=chat, sender=support_user, text=text)
		ModerationMessage.objects.create(
			target_user=listing_owner,
			message=text,
			created_by=support_user,
			linked_chat=chat,
			linked_message=msg,
		)

	@transaction.atomic
	def _resolve(self, report: ListingReport, moderator, with_strike: bool):
		listing = Listing.objects.filter(id=report.listing_id).first()
		should_delete_listing = bool(listing and not report.listing_deleted)
		strike_applied = False
		if with_strike and not report.strike_applied:
			profile = getattr(report.listing_owner, "profile", None)
			if profile:
				profile.moderation_strikes = int(profile.moderation_strikes or 0) + 1
				profile.save(update_fields=["moderation_strikes"])
				strike_applied = True
				if profile.moderation_strikes >= 3 and report.listing_owner.is_active:
					report.listing_owner.is_active = False
					report.listing_owner.save(update_fields=["is_active"])

		report.status = ListingReport.STATUS_CONFIRMED_DELETE_STRIKE if with_strike else ListingReport.STATUS_CONFIRMED_DELETE
		report.reviewed_by = moderator
		report.reviewed_at = timezone.now()
		report.listing_deleted = report.listing_deleted or should_delete_listing
		report.strike_applied = report.strike_applied or strike_applied
		report.save(update_fields=["status", "reviewed_by", "reviewed_at", "listing_deleted", "strike_applied"])

		if should_delete_listing and listing:
			delete_listing_from_channel(listing, clear_fields=True)
			listing.delete()
			self._notify_listing_owner(report.listing_owner, report)

	@admin.action(description="Отклонить")
	def reject_reports(self, request, queryset):
		updated = queryset.update(
			status=ListingReport.STATUS_REJECTED,
			reviewed_by=request.user,
			reviewed_at=timezone.now(),
		)
		self.message_user(
			request,
			_t(f"Отклонено жалоб: {updated}.", f"Zamitnute reporty: {updated}.", f"Rejected reports: {updated}."),
			level=messages.INFO,
		)

	@admin.action(description="Подтвердить (удалить объявление, страйк по галочке)")
	def confirm_delete_listing(self, request, queryset):
		with_strike = str(request.POST.get("apply_strike", "")).lower() in {"1", "true", "on", "yes"}
		count = 0
		for report in queryset.select_for_update():
			self._resolve(report, request.user, with_strike=with_strike)
			count += 1
		if with_strike:
			self.message_user(
				request,
				_t(
					f"Подтверждено, удалено и выдан страйк: {count}.",
					f"Potvrzeno, odstraněno a strike udělen: {count}.",
					f"Confirmed, removed and strike applied: {count}.",
				),
				level=messages.SUCCESS,
			)
		else:
			self.message_user(
				request,
				_t(
					f"Подтверждено и удалено объявлений: {count}.",
					f"Potvrzeno a inzeráty odstraněny: {count}.",
					f"Confirmed and listings removed: {count}.",
				),
				level=messages.SUCCESS,
			)
