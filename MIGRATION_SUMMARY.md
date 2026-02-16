# Резюме миграции модели Listing

## Дата: 3 февраля 2026 г.

## Файл миграции
`listings/migrations/0004_remove_listing_size_remove_listing_type_listing_city_and_more.py`

## Основные изменения

### 1. Тип и предложение
- **Удалено**: `type` (CharField)
- **Добавлено**: `property_type` (CharField) с расширенными choices:
  - `BYT` - Byt (квартира)
  - `DUM` - Dům (дом)
  - `APARTMENT` - Apartment (сохранено для обратной совместимости)
  - `ROOM` - Room
  - `NEIGHBOUR` - Neighbour
- **Default**: APARTMENT

### 2. Локация
- **Добавлено**:
  - `country` (CharField, default="CZ")
  - `city` (CharField, blank=True) - municipality
  - `geo_lat` (DecimalField, nullable) - широта
  - `geo_lng` (DecimalField, nullable) - долгота
- **Сохранено**:
  - `region` (CharField) - с choices регионов Чехии
  - `address` (CharField) - address_text

### 3. Инфраструктура в okolí (POI flags) - 13 новых булевых полей
- `has_bus_stop` - автобусная остановка
- `has_train_station` - ж/д станция
- `has_metro` - метро
- `has_post_office` - почта
- `has_atm` - банкомат
- `has_general_practitioner` - терапевт
- `has_vet` - ветеринар
- `has_primary_school` - начальная школа
- `has_kindergarten` - детский сад
- `has_supermarket` - супермаркет
- `has_small_shop` - маленький магазин
- `has_restaurant` - ресторан
- `has_playground` - детская площадка

### 4. Состояние объекта
- **Добавлено**: `condition_state` (CharField, nullable) с choices:
  - `VELMI_DOBRY` - Velmi dobrý
  - `DOBRY` - Dobrý
  - `SPATNY` - Špatný
  - `NOVOSTAVBA` - Novostavba
  - `VE_VYSTAVBE` - Ve výstavbě
  - `PRED_REKONSTRUKCI` - Před rekonstrukcí
  - `V_REKONSTRUKCI` - V rekonstrukci
  - `PO_REKONSTRUKCI` - Po rekonstrukci

### 5. Площади и цена
- **Удалено**: `size` (IntegerField)
- **Добавлено**: 
  - `usable_area` (IntegerField, nullable) - полезная площадь в м²
  - `currency` (CharField, default="CZK") с choices: CZK, EUR, USD
- **Сохранено**:
  - `price` (DecimalField)

### 6. Энергетика
- **Добавлено**: `energy_class` (CharField, nullable) с choices от A до G

### 7. Медиа-контент
- **Добавлено**:
  - `has_video` (BooleanField) - наличие видео
  - `has_3d_tour` (BooleanField) - наличие 3D-тура
  - `has_floorplan` (BooleanField) - наличие поэтажного плана

## Сохраненные поля (не изменены)

- `owner` (ForeignKey)
- `title` (CharField)
- `description` (TextField)
- `rooms` (IntegerField)
- `beds` (IntegerField)
- `has_roommates` (BooleanField)
- `rental_period` (CharField)
- `internet` (BooleanField)
- `utilities_included` (BooleanField)
- `pets_allowed` (BooleanField)
- `smoking_allowed` (BooleanField)
- `move_in_date` (DateField)
- `amenities` (JSONField)
- `created_at` (DateTimeField)

## Примечания по фильтрации

### Параметры из спецификации, которые реализуются на уровне запросов (не в модели):
- `usable_area_min` / `usable_area_max` - фильтрация по `usable_area`
- `price_min` / `price_max` - фильтрация по `price`
- `search_radius_km` - геопоиск с использованием `geo_lat` и `geo_lng`
- `fulltext_query` - полнотекстовый поиск по `title` и `description`
- `photo_category` - фильтрация фотографий (реализуется через модель `ListingImage`)

## Следующие шаги

1. **Обновить API views** для поддержки новых полей фильтрации
2. **Обновить сериализаторы** (если используется DRF)
3. **Обновить фронтенд** для работы с новыми полями
4. **Добавить индексы** для полей, по которым будет фильтрация (geo_lat, geo_lng, property_type, и т.д.)
5. **Обновить админ-панель** для отображения новых полей
6. **Создать скрипты** для заполнения POI данных (has_bus_stop, etc.) с использованием геосервисов

## Рекомендации по производительности

Рассмотрите добавление индексов для часто используемых фильтров:

```python
class Meta:
    indexes = [
        models.Index(fields=['property_type', 'region']),
        models.Index(fields=['geo_lat', 'geo_lng']),
        models.Index(fields=['price', 'usable_area']),
        models.Index(fields=['condition_state']),
    ]
```
