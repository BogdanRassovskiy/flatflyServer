from django.contrib import admin, messages
from django.db import transaction
from django.utils import timezone

from .models import ListingFilterConfig, ListingFilterOptionConfig, CzechMunicipality, ListingReport, Listing

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
	list_display = ("id", "listing", "reporter", "listing_owner", "reason", "status", "created_at")
	list_filter = ("reason", "status", "strike_applied", "listing_deleted", "created_at")
	search_fields = ("listing__title", "reporter__username", "listing_owner__username", "details")
	readonly_fields = ("listing", "reporter", "listing_owner", "created_at", "reviewed_by", "reviewed_at", "strike_applied", "listing_deleted")
	actions = ("reject_reports", "confirm_delete_listing", "confirm_delete_listing_and_strike")

	@transaction.atomic
	def _resolve(self, report: ListingReport, moderator, with_strike: bool):
		listing_deleted = False
		if not report.listing_deleted and Listing.objects.filter(id=report.listing_id).exists():
			Listing.objects.filter(id=report.listing_id).delete()
			listing_deleted = True

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

	@admin.action(description="Подтвердить и удалить объявление")
	def confirm_delete_listing(self, request, queryset):
		count = 0
		for report in queryset.select_for_update():
			self._resolve(report, request.user, with_strike=False)
			count += 1
		self.message_user(request, f"Подтверждено и удалено объявлений: {count}.", level=messages.SUCCESS)

	@admin.action(description="Подтвердить, удалить объявление и дать 1 страйк")
	def confirm_delete_listing_and_strike(self, request, queryset):
		count = 0
		for report in queryset.select_for_update():
			self._resolve(report, request.user, with_strike=True)
			count += 1
		self.message_user(request, f"Подтверждено, удалено и выдан страйк: {count}.", level=messages.SUCCESS)
