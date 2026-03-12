from django.contrib import admin
from .models import ListingFilterConfig, ListingFilterOptionConfig, CzechMunicipality

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
