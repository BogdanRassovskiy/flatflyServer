from django import forms
from django.contrib import admin, messages
from django.contrib.admin.helpers import ActionForm
from django.db import transaction
from django.utils import timezone

from .models import ListingFilterConfig, ListingFilterOptionConfig, CzechMunicipality, ListingReport, Listing
from chats.models import Chat, Message, ModerationMessage
from flatflyServer.telegram_channel import delete_listing_from_channel


class ListingReportActionForm(ActionForm):
	apply_strike = forms.BooleanField(
		required=False,
		label="Дать страйк владельцу при подтверждении",
	)

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
	list_display = ("id", "listing", "reporter", "listing_owner", "reason", "status", "created_at")
	list_filter = ("reason", "status", "strike_applied", "listing_deleted", "created_at")
	search_fields = ("listing__title", "reporter__username", "listing_owner__username", "details")
	readonly_fields = ("listing", "reporter", "listing_owner", "created_at", "reviewed_by", "reviewed_at", "strike_applied", "listing_deleted")
	actions = ("reject_reports", "confirm_delete_listing")

	def _notify_listing_owner(self, listing_owner, report: ListingReport):
		support_user, _ = listing_owner.__class__.objects.get_or_create(
			username="support",
			defaults={
				"email": "support@flatfly.local",
				"is_staff": True,
				"is_active": True,
			},
		)
		chat = (
			Chat.objects
			.filter(participants=support_user)
			.filter(participants=listing_owner)
			.first()
		)
		if not chat:
			chat = Chat.objects.create()
			chat.participants.add(support_user, listing_owner)

		reason_label = report.get_reason_display() or report.reason
		text = (
			"Ваше объявление было удалено после проверки жалобы модератором. "
			f"Причина жалобы: {reason_label}."
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
		listing_deleted = False
		listing = Listing.objects.filter(id=report.listing_id).first()
		if listing and not report.listing_deleted and listing.is_active:
			delete_listing_from_channel(listing, clear_fields=True)
			listing.is_active = False
			listing.save(update_fields=["is_active"])
			listing_deleted = True
			self._notify_listing_owner(report.listing_owner, report)

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
		report.listing_deleted = report.listing_deleted or listing_deleted
		report.strike_applied = report.strike_applied or strike_applied
		report.save(update_fields=["status", "reviewed_by", "reviewed_at", "listing_deleted", "strike_applied"])

	@admin.action(description="Отклонить")
	def reject_reports(self, request, queryset):
		updated = queryset.update(
			status=ListingReport.STATUS_REJECTED,
			reviewed_by=request.user,
			reviewed_at=timezone.now(),
		)
		self.message_user(request, f"Отклонено жалоб: {updated}.", level=messages.INFO)

	@admin.action(description="Подтвердить (удалить объявление, страйк по галочке)")
	def confirm_delete_listing(self, request, queryset):
		with_strike = str(request.POST.get("apply_strike", "")).lower() in {"1", "true", "on", "yes"}
		count = 0
		for report in queryset.select_for_update():
			self._resolve(report, request.user, with_strike=with_strike)
			count += 1
		if with_strike:
			self.message_user(request, f"Подтверждено, удалено и выдан страйк: {count}.", level=messages.SUCCESS)
		else:
			self.message_user(request, f"Подтверждено и удалено объявлений: {count}.", level=messages.SUCCESS)
