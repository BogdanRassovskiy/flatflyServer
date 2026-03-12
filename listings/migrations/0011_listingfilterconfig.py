from django.db import migrations, models


def seed_filter_configs(apps, schema_editor):
    ListingFilterConfig = apps.get_model("listings", "ListingFilterConfig")

    records = [
        {
            "code": "property_type",
            "name": "Тип недвижимости",
            "weight": 1.0,
            "hard_filter": True,
            "relaxation_order": 1,
            "enabled": True,
            "value_type": "choice",
            "description": "Фильтрация по типу объявления (DUM/BYT/NEIGHBOUR и т.д.)",
        },
        {
            "code": "region",
            "name": "Регион",
            "weight": 0.95,
            "hard_filter": True,
            "relaxation_order": 2,
            "enabled": True,
            "value_type": "choice",
            "description": "Регион Чехии из фиксированного списка",
        },
        {
            "code": "price_from",
            "name": "Цена от",
            "weight": 0.9,
            "hard_filter": True,
            "relaxation_order": 3,
            "enabled": True,
            "value_type": "number",
            "description": "Нижняя граница цены",
        },
        {
            "code": "price_to",
            "name": "Цена до",
            "weight": 0.9,
            "hard_filter": True,
            "relaxation_order": 4,
            "enabled": True,
            "value_type": "number",
            "description": "Верхняя граница цены",
        },
        {
            "code": "currency",
            "name": "Валюта",
            "weight": 0.7,
            "hard_filter": True,
            "relaxation_order": 5,
            "enabled": True,
            "value_type": "choice",
            "description": "Валюта цены (CZK/EUR/USD)",
        },
        {
            "code": "rooms",
            "name": "Количество комнат",
            "weight": 0.85,
            "hard_filter": True,
            "relaxation_order": 6,
            "enabled": True,
            "value_type": "choice",
            "description": "Количество комнат",
        },
        {
            "code": "has_roommates",
            "name": "Наличие соседей",
            "weight": 0.75,
            "hard_filter": True,
            "relaxation_order": 7,
            "enabled": True,
            "value_type": "boolean_choice",
            "description": "Есть ли текущие соседи",
        },
        {
            "code": "rental_period",
            "name": "Срок аренды",
            "weight": 0.8,
            "hard_filter": True,
            "relaxation_order": 8,
            "enabled": True,
            "value_type": "choice",
            "description": "Короткий/долгий срок",
        },
        {
            "code": "condition_state",
            "name": "Состояние объекта",
            "weight": 0.7,
            "hard_filter": True,
            "relaxation_order": 9,
            "enabled": True,
            "value_type": "choice",
            "description": "Состояние жилья",
        },
        {
            "code": "energy_class",
            "name": "Энергокласс",
            "weight": 0.55,
            "hard_filter": True,
            "relaxation_order": 10,
            "enabled": True,
            "value_type": "choice",
            "description": "Энергетический класс A-G",
        },
        {
            "code": "internet",
            "name": "Интернет",
            "weight": 0.6,
            "hard_filter": True,
            "relaxation_order": 11,
            "enabled": True,
            "value_type": "boolean_choice",
            "description": "Наличие интернета",
        },
        {
            "code": "utilities",
            "name": "Коммунальные включены / не включены",
            "weight": 0.7,
            "hard_filter": True,
            "relaxation_order": 12,
            "enabled": True,
            "value_type": "boolean_choice",
            "description": "Включены ли коммунальные платежи",
        },
        {
            "code": "pets_allowed",
            "name": "Можно с животными",
            "weight": 0.65,
            "hard_filter": True,
            "relaxation_order": 13,
            "enabled": True,
            "value_type": "boolean_choice",
            "description": "Разрешены домашние животные",
        },
        {
            "code": "smoking_allowed",
            "name": "Можно курить",
            "weight": 0.55,
            "hard_filter": True,
            "relaxation_order": 14,
            "enabled": True,
            "value_type": "boolean_choice",
            "description": "Разрешено курение",
        },
        {
            "code": "move_in_date",
            "name": "Дата заезда",
            "weight": 0.7,
            "hard_filter": True,
            "relaxation_order": 15,
            "enabled": True,
            "value_type": "date",
            "description": "Дата, с которой доступно заселение",
        },
        {
            "code": "amenities",
            "name": "Оснащение (amenities)",
            "weight": 0.8,
            "hard_filter": True,
            "relaxation_order": 16,
            "enabled": True,
            "value_type": "multi_choice",
            "description": "Список удобств/оснащения",
        },
        {
            "code": "infrastructure",
            "name": "Инфраструктура рядом",
            "weight": 0.75,
            "hard_filter": True,
            "relaxation_order": 17,
            "enabled": True,
            "value_type": "multi_choice",
            "description": "Инфраструктура вокруг объекта",
        },
    ]

    for payload in records:
        ListingFilterConfig.objects.update_or_create(
            code=payload["code"],
            defaults=payload,
        )


def unseed_filter_configs(apps, schema_editor):
    ListingFilterConfig = apps.get_model("listings", "ListingFilterConfig")
    ListingFilterConfig.objects.filter(
        code__in=[
            "property_type",
            "region",
            "price_from",
            "price_to",
            "currency",
            "rooms",
            "has_roommates",
            "rental_period",
            "condition_state",
            "energy_class",
            "internet",
            "utilities",
            "pets_allowed",
            "smoking_allowed",
            "move_in_date",
            "amenities",
            "infrastructure",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0010_listing_deposit"),
    ]

    operations = [
        migrations.CreateModel(
            name="ListingFilterConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("weight", models.FloatField(default=1.0)),
                ("hard_filter", models.BooleanField(default=True)),
                ("relaxation_order", models.PositiveSmallIntegerField(default=0)),
                ("enabled", models.BooleanField(default=True)),
                ("value_type", models.CharField(default="string", max_length=32)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["relaxation_order", "id"],
            },
        ),
        migrations.RunPython(seed_filter_configs, unseed_filter_configs),
    ]
