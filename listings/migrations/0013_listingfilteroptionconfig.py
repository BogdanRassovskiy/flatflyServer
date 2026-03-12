from django.db import migrations, models


def seed_option_configs(apps, schema_editor):
    ListingFilterConfig = apps.get_model("listings", "ListingFilterConfig")
    ListingFilterOptionConfig = apps.get_model("listings", "ListingFilterOptionConfig")

    amenities_filter = ListingFilterConfig.objects.filter(code="amenities").first()
    infra_filter = ListingFilterConfig.objects.filter(code="infrastructure").first()

    if amenities_filter:
        amenities = [
            ("washing_machine", "Стиральная машина", 0.7, False, 1),
            ("dishwasher", "Посудомоечная машина", 0.55, False, 2),
            ("microwave", "Микроволновка", 0.35, False, 3),
            ("oven", "Духовка", 0.45, False, 4),
            ("refrigerator", "Холодильник", 0.55, False, 5),
            ("tv", "Телевизор", 0.25, False, 6),
            ("air_conditioning", "Кондиционер", 0.45, False, 7),
            ("heating", "Отопление", 0.65, False, 8),
            ("balcony", "Балкон", 0.6, False, 9),
            ("parking", "Парковка", 0.6, False, 10),
            ("furnished", "Меблированная", 0.5, False, 11),
        ]
        for option_key, name, weight, hard_filter, order in amenities:
            ListingFilterOptionConfig.objects.update_or_create(
                parent_filter=amenities_filter,
                option_key=option_key,
                defaults={
                    "name": name,
                    "weight": weight,
                    "hard_filter": hard_filter,
                    "relaxation_order": order,
                    "enabled": True,
                    "description": f"Вес для удобства {option_key}",
                },
            )

    if infra_filter:
        infrastructure = [
            ("has_bus_stop", "Автобусная остановка", 0.5, False, 1),
            ("has_train_station", "Железнодорожная станция", 0.45, False, 2),
            ("has_metro", "Метро", 0.6, False, 3),
            ("has_post_office", "Почта", 0.25, False, 4),
            ("has_atm", "Банкомат", 0.3, False, 5),
            ("has_general_practitioner", "Врач общей практики", 0.45, False, 6),
            ("has_vet", "Ветеринар", 0.25, False, 7),
            ("has_primary_school", "Начальная школа", 0.5, False, 8),
            ("has_kindergarten", "Детский сад", 0.45, False, 9),
            ("has_supermarket", "Супермаркет", 0.55, False, 10),
            ("has_small_shop", "Магазин", 0.35, False, 11),
            ("has_restaurant", "Ресторан", 0.25, False, 12),
            ("has_playground", "Детская площадка", 0.35, False, 13),
        ]
        for option_key, name, weight, hard_filter, order in infrastructure:
            ListingFilterOptionConfig.objects.update_or_create(
                parent_filter=infra_filter,
                option_key=option_key,
                defaults={
                    "name": name,
                    "weight": weight,
                    "hard_filter": hard_filter,
                    "relaxation_order": order,
                    "enabled": True,
                    "description": f"Вес для инфраструктуры {option_key}",
                },
            )


def unseed_option_configs(apps, schema_editor):
    ListingFilterOptionConfig = apps.get_model("listings", "ListingFilterOptionConfig")
    ListingFilterOptionConfig.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0012_czechmunicipality"),
    ]

    operations = [
        migrations.CreateModel(
            name="ListingFilterOptionConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("option_key", models.CharField(max_length=128)),
                ("name", models.CharField(max_length=255)),
                ("weight", models.FloatField(default=0.5)),
                ("hard_filter", models.BooleanField(default=False)),
                ("relaxation_order", models.PositiveSmallIntegerField(default=0)),
                ("enabled", models.BooleanField(default=True)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "parent_filter",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="option_configs", to="listings.listingfilterconfig"),
                ),
            ],
            options={"ordering": ["parent_filter", "relaxation_order", "id"]},
        ),
        migrations.AddConstraint(
            model_name="listingfilteroptionconfig",
            constraint=models.UniqueConstraint(fields=("parent_filter", "option_key"), name="uniq_filter_option_key"),
        ),
        migrations.RunPython(seed_option_configs, unseed_option_configs),
    ]
