from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db.models import QuerySet


@dataclass
class NeighbourRankingConfig:
    code: str
    label: str
    weight: float
    hard_filter: bool
    is_active: bool = True


DEFAULT_NEIGHBOUR_RANKING_CONFIGS = [
    NeighbourRankingConfig("city", "City", 6.0, True),
    NeighbourRankingConfig("gender", "Gender", 6.0, True),
    NeighbourRankingConfig("age_range", "Age Range", 6.0, True),
    NeighbourRankingConfig("smoking", "Smoking", 4.0, False),
    NeighbourRankingConfig("alcohol", "Alcohol", 4.0, False),
    NeighbourRankingConfig("sleep_schedule", "Sleep Schedule", 4.0, False),
    NeighbourRankingConfig("work_from_home", "Work From Home", 4.0, False),
    NeighbourRankingConfig("languages", "Languages", 5.0, False),
    NeighbourRankingConfig("profession", "Profession", 3.0, False),
    NeighbourRankingConfig("interests", "Interests", 2.0, False),
    NeighbourRankingConfig("verified", "Verified", 5.0, False),
    NeighbourRankingConfig("looking_for_housing", "Looking For Housing", 3.0, True),
    NeighbourRankingConfig("rating_min", "Minimum Rating", 1.0, True),
]


def normalize_neighbour_ranking_configs(config_rows: list[Any]) -> list[NeighbourRankingConfig]:
    configs: list[NeighbourRankingConfig] = []
    for row in config_rows:
        code = str(getattr(row, "code", "") or "").strip()
        if not code:
            continue

        try:
            weight = float(getattr(row, "weight", 0) or 0)
        except (TypeError, ValueError):
            weight = 0.0

        configs.append(
            NeighbourRankingConfig(
                code=code,
                label=str(getattr(row, "label", code) or code).strip() or code,
                weight=max(0.0, weight),
                hard_filter=bool(getattr(row, "hard_filter", False)),
                is_active=bool(getattr(row, "is_active", True)),
            )
        )

    if configs:
        return [cfg for cfg in configs if cfg.is_active]

    return [cfg for cfg in DEFAULT_NEIGHBOUR_RANKING_CONFIGS if cfg.is_active]


def parse_neighbour_filters(request) -> dict[str, Any]:
    def _clean_text(value: Any) -> str:
        return str(value or "").strip()

    def _clean_bool(value: Any) -> bool | None:
        text = _clean_text(value).lower()
        if text in {"true", "1", "yes"}:
            return True
        if text in {"false", "0", "no"}:
            return False
        return None

    def _clean_int(value: Any) -> int | None:
        text = _clean_text(value)
        if not text:
            return None
        try:
            return int(text)
        except ValueError:
            return None

    def _clean_float(value: Any) -> float | None:
        text = _clean_text(value)
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None

    age_from = _clean_int(request.GET.get("ageFrom"))
    age_to = _clean_int(request.GET.get("ageTo"))

    return {
        "city": _clean_text(request.GET.get("city")),
        "gender": _clean_text(request.GET.get("gender")).lower(),
        "age_range": {"from": age_from, "to": age_to},
        "smoking": _clean_text(request.GET.get("smoking")).lower(),
        "alcohol": _clean_text(request.GET.get("alcohol")).lower(),
        "sleep_schedule": _clean_text(request.GET.get("sleepSchedule")).lower(),
        "work_from_home": _clean_text(request.GET.get("workFromHome")).lower(),
        "profession": _clean_text(request.GET.get("profession")).lower(),
        "interests": _clean_text(request.GET.get("interests")).lower(),
        "languages": [str(item).strip().lower() for item in request.GET.getlist("languages[]") if str(item).strip()],
        "verified": _clean_bool(request.GET.get("verified")),
        "looking_for_housing": _clean_bool(request.GET.get("looking_for_housing")),
        "rating_min": _clean_float(request.GET.get("ratingMin")),
    }


def apply_neighbour_hard_filters(qs: QuerySet, filters: dict[str, Any], configs: list[NeighbourRankingConfig]) -> QuerySet:
    for config in configs:
        if not config.hard_filter:
            continue

        code = config.code
        expected = filters.get(code)
        if expected in (None, "", []):
            continue

        if code == "city":
            qs = qs.filter(city__icontains=str(expected))
        elif code == "gender":
            if expected != "any":
                qs = qs.filter(gender=expected)
        elif code == "age_range":
            age_from = expected.get("from") if isinstance(expected, dict) else None
            age_to = expected.get("to") if isinstance(expected, dict) else None
            if age_from is not None:
                qs = qs.filter(age__gte=age_from)
            if age_to is not None:
                qs = qs.filter(age__lte=age_to)
        elif code == "smoking":
            qs = qs.filter(smoking=expected)
        elif code == "alcohol":
            qs = qs.filter(alcohol=expected)
        elif code == "sleep_schedule":
            qs = qs.filter(sleep_schedule=expected)
        elif code == "work_from_home":
            qs = qs.filter(work_from_home=expected)
        elif code == "languages":
            for lang in expected:
                qs = qs.filter(languages__icontains=lang)
        elif code == "profession":
            qs = qs.filter(profession__icontains=expected)
        elif code == "interests":
            qs = qs.filter(about__icontains=expected)
        elif code == "verified":
            qs = qs.filter(verified=bool(expected))
        elif code == "looking_for_housing":
            qs = qs.filter(looking_for_housing=bool(expected))
        elif code == "rating_min":
            qs = qs.filter(rating_average__gte=float(expected))

    return qs


def _safe_text(value: Any) -> str:
    return str(value or "").strip().lower()


def calculate_neighbour_relevance(profile, filters: dict[str, Any], configs: list[NeighbourRankingConfig]) -> tuple[float, int]:
    matched_weight = 0.0
    total_weight = 0.0

    profile_languages = [lang.strip().lower() for lang in str(profile.languages or "").split(",") if lang.strip()]

    for config in configs:
        expected = filters.get(config.code)
        if expected in (None, "", []):
            continue

        weight = float(config.weight or 0)
        if weight <= 0:
            continue

        ratio = None

        if config.code == "city":
            ratio = 1.0 if _safe_text(expected) in _safe_text(profile.city) else 0.0
        elif config.code == "gender":
            ratio = 1.0 if _safe_text(profile.gender) == _safe_text(expected) else 0.0
        elif config.code == "age_range":
            ratio = 1.0
            age_value = profile.age
            if age_value is None:
                ratio = 0.0
            elif isinstance(expected, dict):
                age_from = expected.get("from")
                age_to = expected.get("to")
                if age_from is not None and age_value < age_from:
                    ratio = 0.0
                if age_to is not None and age_value > age_to:
                    ratio = 0.0
        elif config.code == "smoking":
            ratio = 1.0 if _safe_text(profile.smoking) == _safe_text(expected) else 0.0
        elif config.code == "alcohol":
            ratio = 1.0 if _safe_text(profile.alcohol) == _safe_text(expected) else 0.0
        elif config.code == "sleep_schedule":
            ratio = 1.0 if _safe_text(profile.sleep_schedule) == _safe_text(expected) else 0.0
        elif config.code == "work_from_home":
            ratio = 1.0 if _safe_text(profile.work_from_home) == _safe_text(expected) else 0.0
        elif config.code == "profession":
            ratio = 1.0 if _safe_text(expected) in _safe_text(profile.profession) else 0.0
        elif config.code == "interests":
            haystack = " ".join([
                _safe_text(profile.about),
                _safe_text(profile.profession),
                _safe_text(profile.pets),
                _safe_text(profile.noise_tolerance),
            ])
            ratio = 1.0 if _safe_text(expected) in haystack else 0.0
        elif config.code == "languages":
            requested = [_safe_text(lang) for lang in expected if _safe_text(lang)]
            if requested:
                matched = sum(1 for lang in requested if lang in profile_languages)
                ratio = matched / len(requested)
            else:
                ratio = 0.0
        elif config.code == "verified":
            ratio = 1.0 if bool(profile.verified) == bool(expected) else 0.0
        elif config.code == "looking_for_housing":
            ratio = 1.0 if bool(profile.looking_for_housing) == bool(expected) else 0.0
        elif config.code == "rating_min":
            rating_average = float(getattr(profile, "rating_average", 0) or 0)
            ratio = 1.0 if rating_average >= float(expected) else 0.0

        if ratio is None:
            continue

        ratio = max(0.0, min(1.0, float(ratio)))
        total_weight += weight
        matched_weight += weight * ratio

    if total_weight <= 0:
        return 0.0, 100

    percent = int(round((matched_weight / total_weight) * 100))
    return matched_weight, max(0, min(100, percent))
