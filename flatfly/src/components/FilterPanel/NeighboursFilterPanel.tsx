import {Icon} from "@iconify/react";
import { useState, useRef, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { regionValueToLabel } from "../../utils/regions";
import "./FilterPanel.css";
import "./NeighboursFilterPanel.css";




interface NeighbourFilterState {
    city: string;
    ageFrom: string;
    ageTo: string;
    ratingMin: string;
    verified: string;
    gender: string;
    smoking: string;
    alcohol: string;
    sleepSchedule: string;
    universityId: string;
    universityName: string;
    excludeWithChildren: boolean;
    excludeWithDisability: boolean;
    workFromHome: string;
    languages: string[];
    interests: string;
    neighbourFrom: string;
}
interface Props {
  filters: NeighbourFilterState;
  onChange: (filters: NeighbourFilterState) => void;
}

type NeighbourPinnedKey = "region" | "age" | "alcohol" | "sleep";

export default function NeighboursFilterPanel({ filters, onChange }: Props) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pinnedOpen, setPinnedOpen] = useState<NeighbourPinnedKey | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const pinnedBarRef = useRef<HTMLDivElement>(null);
    const universityAutocompleteRef = useRef<HTMLDivElement>(null);
    const [universityInput, setUniversityInput] = useState(filters.universityName || "");
    const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
    const [universitiesLoading, setUniversitiesLoading] = useState(false);
    const [universitySuggestions, setUniversitySuggestions] = useState<Array<{ id: number; name: string }>>([]);
    
    // Функции для перевода значений фильтров
    const translateYesNo = (value: string, yesKey: string, noKey: string) => {
        if (value === "yes") return t(yesKey);
        if (value === "no") return t(noKey);
        return value;
    };

    const translateSleepSchedule = (value: string) => {
        const map: Record<string, string> = {
            "early": t("filter.neighbourSleepScheduleEarly"),
            "late": t("filter.neighbourSleepScheduleLate"),
        };
        return map[value] || value;
    };

    const genderOptions = [
        {value: "male", label: t("filter.neighbourGenderMale")},
        {value: "female", label: t("filter.neighbourGenderFemale")},
        {value: "other", label: t("filter.neighbourGenderOther")},
    ];
    const verifiedOptions = [
        { value: "true", label: t("filter.neighbourVerifiedYes") },
        { value: "false", label: t("filter.neighbourVerifiedNo") },
    ];

    const smokingOptions = [
        {value: "yes", label: t("filter.neighbourSmokingYes")},
        {value: "no", label: t("filter.neighbourSmokingNo")},
    ];

    const alcoholOptions = [
        {value: "yes", label: t("filter.neighbourAlcoholYes")},
        {value: "no", label: t("filter.neighbourAlcoholNo")},
    ];

    const sleepScheduleOptions = [
        {value: "early", label: t("filter.neighbourSleepScheduleEarly")},
        {value: "late", label: t("filter.neighbourSleepScheduleLate")},
    ];

    const workFromHomeOptions = [
        {value: "yes", label: t("filter.neighbourWorkFromHomeYes")},
        {value: "no", label: t("filter.neighbourWorkFromHomeNo")},
    ];

    const languageOptions = [
        {key: "cz", label: t("profile.languages.cz")},
        {key: "en", label: t("profile.languages.en")},
        {key: "ru", label: t("profile.languages.ru")},
        {key: "de", label: t("profile.languages.de")},
        {key: "sk", label: t("profile.languages.sk")},
    ];
    const neighbourModalSelectClass =
        "flatfly-form-select w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 text-black transition-all duration-300 outline-none hover:border-[#C505EB]/50 focus:border-[#999999] focus:ring-2 focus:ring-[#C505EB]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-[#C505EB]/50 dark:focus:border-[#C505EB] dark:focus:ring-[#C505EB]/30";

    const CZECH_REGIONS = [
      { value: "PRAGUE", label: "Praha" },
      { value: "STREDOCESKY", label: "Středočeský kraj" },
      { value: "JIHOCESKY", label: "Jihočeský kraj" },
      { value: "PLZENSKY", label: "Plzeňský kraj" },
      { value: "KARLOVARSKY", label: "Karlovarský kraj" },
      { value: "USTECKY", label: "Ústecký kraj" },
      { value: "LIBERECKY", label: "Liberecký kraj" },
      { value: "KRALOVEHRADECKY", label: "Královéhradecký kraj" },
      { value: "PARDUBICKY", label: "Pardubický kraj" },
      { value: "VYSOCINA", label: "Vysočina" },
      { value: "JIHOMORAVSKY", label: "Jihomoravský kraj" },
      { value: "OLOMOUCKY", label: "Olomoucký kraj" },
      { value: "ZLINSKY", label: "Zlínský kraj" },
      { value: "MORAVSKOSLEZSKY", label: "Moravskoslezský kraj" },
    ];
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsModalOpen(false);
            }
            if (universityAutocompleteRef.current && !universityAutocompleteRef.current.contains(event.target as Node)) {
                setUniversityDropdownOpen(false);
            }
        };

        if (isModalOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    useEffect(() => {
        if (!pinnedOpen) {
            return;
        }
        const close = (event: MouseEvent | TouchEvent) => {
            if (pinnedBarRef.current && !pinnedBarRef.current.contains(event.target as Node)) {
                setPinnedOpen(null);
            }
        };
        document.addEventListener("mousedown", close);
        document.addEventListener("touchstart", close);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("touchstart", close);
        };
    }, [pinnedOpen]);

    useEffect(() => {
        const text = universityInput.trim();
        if (!universityDropdownOpen || text.length < 2) {
            setUniversitySuggestions([]);
            setUniversitiesLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setUniversitiesLoading(true);
                const params = new URLSearchParams({ q: text });
                const response = await fetch(`/api/universities/?${params.toString()}`, {
                    credentials: "include",
                    signal: controller.signal,
                });
                if (!response.ok) {
                    setUniversitySuggestions([]);
                    return;
                }
                const payload = await response.json();
                const rows = Array.isArray(payload?.results) ? payload.results : [];
                setUniversitySuggestions(
                    rows
                        .map((item: any) => ({
                            id: Number(item.id),
                            name: String(item.name || "").trim(),
                        }))
                        .filter((item: { id: number; name: string }) => item.id > 0 && item.name)
                );
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setUniversitySuggestions([]);
                }
            } finally {
                setUniversitiesLoading(false);
            }
        }, 220);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [universityInput, universityDropdownOpen]);

    const handleFilterChange = (key: keyof NeighbourFilterState, value: string | string[]) => {
      onChange({
        ...filters,
        [key]: value,
      });
    };

    const parseAgeNumber = (rawValue: string) => {
        if (!rawValue) {
            return null;
        }
        const parsed = Number(rawValue);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const ageSliderMin = 18;
    const ageSliderMax = 100;
    const ageSliderSpan = Math.max(1, ageSliderMax - ageSliderMin);

    const currentAgeFrom = parseAgeNumber(filters.ageFrom);
    const currentAgeTo = parseAgeNumber(filters.ageTo);

    const normalizedAgeFrom = Math.max(ageSliderMin, Math.min(currentAgeFrom ?? ageSliderMin, ageSliderMax));
    const normalizedAgeTo = Math.max(normalizedAgeFrom, Math.min(currentAgeTo ?? ageSliderMax, ageSliderMax));

    const selectedAgeFromPercent = ((normalizedAgeFrom - ageSliderMin) / ageSliderSpan) * 100;
    const selectedAgeToPercent = ((normalizedAgeTo - ageSliderMin) / ageSliderSpan) * 100;

    const formatAgeValue = (value: number | null, fallback = "") => {
        if (value === null) {
            return fallback;
        }
        return String(Math.round(value));
    };

    const applyAgeRange = (nextFrom: number | null, nextTo: number | null) => {
        let safeFrom = nextFrom;
        let safeTo = nextTo;

        if (safeFrom !== null) {
            safeFrom = Math.max(ageSliderMin, Math.min(Math.round(safeFrom), ageSliderMax));
        }
        if (safeTo !== null) {
            safeTo = Math.max(ageSliderMin, Math.min(Math.round(safeTo), ageSliderMax));
        }
        if (safeFrom !== null && safeTo !== null && safeFrom > safeTo) {
            safeTo = safeFrom;
        }

        onChange({
            ...filters,
            ageFrom: formatAgeValue(safeFrom),
            ageTo: formatAgeValue(safeTo),
      });
    };

        const handleBooleanFilterChange = (key: keyof NeighbourFilterState, value: boolean) => {
            onChange({
                ...filters,
                [key]: value,
            });
        };

    const toggleLanguage = (language: string) => {
      onChange({
        ...filters,
        languages: filters.languages.includes(language)
          ? filters.languages.filter(l => l !== language)
          : [...filters.languages, language],
      });
    };

    const handleReset = () => {
            setUniversityInput("");
            setUniversityDropdownOpen(false);
            setUniversitySuggestions([]);
      onChange({
        city: "",
        ageFrom: "",
        ageTo: "",
            ratingMin: "0",
        verified: "",
        gender: "",
        smoking: "",
        alcohol: "",
        sleepSchedule: "",
                universityId: "",
                universityName: "",
                excludeWithChildren: false,
                excludeWithDisability: false,
        workFromHome: "",
        languages: [],
                interests: "",
            neighbourFrom: "",
      });
    };

    const handleApply = () => {
            if (universityInput.trim() && !filters.universityId) {
                setUniversityInput("");
                onChange({
                    ...filters,
                    universityName: "",
                });
            }
      setIsModalOpen(false);
    };

        const handleUniversitySuggestionSelect = (suggestion: { id: number; name: string }) => {
            setUniversityInput(suggestion.name);
            onChange({
                ...filters,
                universityId: String(suggestion.id),
                universityName: suggestion.name,
            });
            setUniversityDropdownOpen(false);
        };

    const openConfigureModal = () => {
        setPinnedOpen(null);
        setIsModalOpen(true);
    };

    const pinnedOrder: NeighbourPinnedKey[] = ["region", "age", "alcohol", "sleep"];

    const pinnedTitle = (key: NeighbourPinnedKey) => {
        if (key === "region") return t("filter.region");
        if (key === "age") return t("filter.neighbourAge");
        if (key === "alcohol") return t("filter.neighbourAlcohol");
        return t("filter.neighbourSleepSchedule");
    };

    const pinnedSummary = (key: NeighbourPinnedKey) => {
        if (key === "region") {
            return filters.city ? regionValueToLabel(filters.city) : "—";
        }
        if (key === "age") {
            if (!filters.ageFrom && !filters.ageTo) return "—";
            return `${normalizedAgeFrom} – ${normalizedAgeTo}`;
        }
        if (key === "alcohol") {
            return filters.alcohol
                ? translateYesNo(filters.alcohol, "filter.neighbourAlcoholYes", "filter.neighbourAlcoholNo")
                : "—";
        }
        return filters.sleepSchedule ? translateSleepSchedule(filters.sleepSchedule) : "—";
    };

    const pinnedHasValue = (key: NeighbourPinnedKey) => {
        if (key === "region") return Boolean(filters.city);
        if (key === "age") return Boolean(filters.ageFrom || filters.ageTo);
        if (key === "alcohol") return Boolean(filters.alcohol);
        return Boolean(filters.sleepSchedule);
    };

    const clearPinned = (key: NeighbourPinnedKey, e: ReactMouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setPinnedOpen(null);
        if (key === "region") {
            onChange({ ...filters, city: "" });
        } else if (key === "age") {
            onChange({ ...filters, ageFrom: "", ageTo: "" });
        } else if (key === "alcohol") {
            onChange({ ...filters, alcohol: "" });
        } else {
            onChange({ ...filters, sleepSchedule: "" });
        }
    };

    const togglePinnedKey = (key: NeighbourPinnedKey) => {
        setPinnedOpen((prev) => (prev === key ? null : key));
    };

    const renderPinnedAgeDropdownBody = () => (
        <div className="flex flex-col gap-3">
            <div className="text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                {normalizedAgeFrom} – {normalizedAgeTo}
            </div>
            <div className="relative h-9">
                <div className="absolute left-0 right-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#D4DAE0] dark:bg-gray-700">
                    <div
                        className="absolute h-full rounded-full bg-[#C505EB]"
                        style={{
                            left: `${selectedAgeFromPercent}%`,
                            width: `${Math.max(2, selectedAgeToPercent - selectedAgeFromPercent)}%`,
                        }}
                    />
                </div>
                <input
                    type="range"
                    min={ageSliderMin}
                    max={ageSliderMax}
                    value={normalizedAgeFrom}
                    onChange={(e) => applyAgeRange(Number(e.target.value), normalizedAgeTo)}
                    className="age-range-input z-20"
                />
                <input
                    type="range"
                    min={ageSliderMin}
                    max={ageSliderMax}
                    value={normalizedAgeTo}
                    onChange={(e) => applyAgeRange(normalizedAgeFrom, Number(e.target.value))}
                    className="age-range-input z-30"
                />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span>18</span>
                <span>100</span>
            </div>
        </div>
    );

    const pinnedSelectOptionClass = (active: boolean) =>
        `flatfly-select-option-btn rounded-xl ${active ? "flatfly-select-option-btn--active" : ""}`;

    const renderPinnedSelectDropdownBody = (key: Exclude<NeighbourPinnedKey, "age">) => {
        if (key === "region") {
            return (
                <div className="max-h-72 overflow-y-auto py-1">
                    <button
                        type="button"
                        className={pinnedSelectOptionClass(!filters.city)}
                        onClick={() => {
                            handleFilterChange("city", "");
                            setPinnedOpen(null);
                        }}
                    >
                        {t("-")}
                    </button>
                    {CZECH_REGIONS.map((region) => (
                        <button
                            key={region.value}
                            type="button"
                            className={pinnedSelectOptionClass(filters.city === region.value)}
                            onClick={() => {
                                handleFilterChange("city", region.value);
                                setPinnedOpen(null);
                            }}
                        >
                            {region.label}
                        </button>
                    ))}
                </div>
            );
        }
        if (key === "alcohol") {
            return (
                <div className="py-1">
                    <button
                        type="button"
                        className={pinnedSelectOptionClass(!filters.alcohol)}
                        onClick={() => {
                            handleFilterChange("alcohol", "");
                            setPinnedOpen(null);
                        }}
                    >
                        —
                    </button>
                    {alcoholOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={pinnedSelectOptionClass(filters.alcohol === option.value)}
                            onClick={() => {
                                handleFilterChange("alcohol", option.value);
                                setPinnedOpen(null);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            );
        }
        return (
            <div className="py-1">
                <button
                    type="button"
                    className={pinnedSelectOptionClass(!filters.sleepSchedule)}
                    onClick={() => {
                        handleFilterChange("sleepSchedule", "");
                        setPinnedOpen(null);
                    }}
                >
                    —
                </button>
                {sleepScheduleOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={pinnedSelectOptionClass(filters.sleepSchedule === option.value)}
                        onClick={() => {
                            handleFilterChange("sleepSchedule", option.value);
                            setPinnedOpen(null);
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderPinnedCell = (key: NeighbourPinnedKey, pinIndex: number) => {
        const isFirstPin = pinIndex === 0;
        const segmentBg = "bg-white dark:bg-zinc-900";

        if (key !== "age") {
            const selectKey = key as Exclude<NeighbourPinnedKey, "age">;
            const isOpen = pinnedOpen === key;
            const triggerRing = isOpen ? "ring-1 ring-inset ring-[#C505EB]/20 dark:ring-[#C505EB]/30" : "";
            const triggerClass = [
                "filter-panel-segment-trigger relative z-[2] flex h-full min-h-[56px] w-full flex-col items-center justify-center gap-0.5 py-2.5 px-3.5 text-center outline-none transition-[background-color,box-shadow] duration-200 ease-out",
                segmentBg,
                isOpen
                    ? "bg-[#C505EB]/[0.07] dark:bg-[#C505EB]/12"
                    : "hover:bg-zinc-50/90 dark:hover:bg-zinc-800/55",
                triggerRing,
                pinnedHasValue(key) ? "pr-14" : "pr-10",
                isFirstPin ? "rounded-l-full" : "",
            ].join(" ");

            const shellClass = `relative min-h-[56px] min-w-0 flex-1 ${segmentBg} ${isFirstPin ? "rounded-l-full" : ""}`;

            return (
                <div key={key} className={shellClass}>
                    <button type="button" onClick={() => togglePinnedKey(key)} className={triggerClass} aria-expanded={isOpen}>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {pinnedTitle(key)}
                        </span>
                        <span
                            className={`line-clamp-2 text-center text-[13px] font-semibold leading-snug transition-colors duration-200 ${
                                pinnedHasValue(key) ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                            }`}
                        >
                            {pinnedSummary(key)}
                        </span>
                        <ChevronDown
                            size={15}
                            strokeWidth={2.25}
                            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-transform duration-200 ease-out dark:text-zinc-500 ${isOpen ? "rotate-180 text-[#C505EB]" : ""}`}
                        />
                    </button>
                    {pinnedHasValue(key) ? (
                        <button
                            type="button"
                            onClick={(e) => clearPinned(key, e)}
                            className="absolute right-8 top-1/2 z-[3] -translate-y-1/2 rounded-full p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                            aria-label={t("filter.clearPinned")}
                        >
                            <X size={12} strokeWidth={2.5} />
                        </button>
                    ) : null}
                    {isOpen ? (
                        <div
                            className="filter-panel-dropdown absolute left-0 top-[calc(100%+8px)] z-[150] w-[min(calc(100vw-2rem),22rem)] rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)] ring-1 ring-zinc-900/[0.04] dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/[0.06]"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {renderPinnedSelectDropdownBody(selectKey)}
                        </div>
                    ) : null}
                </div>
            );
        }

        const isOpen = pinnedOpen === "age";
        const triggerRing = isOpen ? "ring-1 ring-inset ring-[#C505EB]/20 dark:ring-[#C505EB]/30" : "";

        const triggerClass = [
            "filter-panel-segment-trigger flex h-full min-h-[56px] w-full flex-col items-center justify-center gap-0.5 py-2.5 px-3.5 text-center outline-none transition-[background-color,box-shadow] duration-200 ease-out",
            segmentBg,
            isOpen
                ? "bg-[#C505EB]/[0.07] dark:bg-[#C505EB]/12"
                : "hover:bg-zinc-50/90 dark:hover:bg-zinc-800/55",
            triggerRing,
            pinnedHasValue(key) ? "pr-14" : "pr-10",
            isFirstPin ? "rounded-l-full" : "",
        ].join(" ");

        const ageShellClass = `relative min-h-[56px] min-w-0 flex-1 ${segmentBg} ${isFirstPin ? "rounded-l-full" : ""}`;

        return (
            <div key={key} className={ageShellClass}>
                <button type="button" onClick={() => togglePinnedKey("age")} className={triggerClass}>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {pinnedTitle(key)}
                    </span>
                    <span
                        className={`line-clamp-2 text-center text-[13px] font-semibold leading-snug transition-colors duration-200 ${
                            pinnedHasValue(key)
                                ? "text-zinc-900 dark:text-zinc-100"
                                : "text-zinc-400 dark:text-zinc-500"
                        }`}
                    >
                        {pinnedSummary(key)}
                    </span>
                    <ChevronDown
                        size={15}
                        strokeWidth={2.25}
                        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-transform duration-200 ease-out dark:text-zinc-500 ${isOpen ? "rotate-180 text-[#C505EB]" : ""}`}
                    />
                </button>
                {pinnedHasValue(key) ? (
                    <button
                        type="button"
                        onClick={(e) => clearPinned(key, e)}
                        className="absolute right-8 top-1/2 z-[1] -translate-y-1/2 rounded-full p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                        aria-label={t("filter.clearPinned")}
                    >
                        <X size={12} strokeWidth={2.5} />
                    </button>
                ) : null}
                {isOpen ? (
                    <div
                        className="filter-panel-dropdown absolute left-0 top-[calc(100%+8px)] z-[150] w-[min(calc(100vw-2rem),28rem)] rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)] ring-1 ring-zinc-900/[0.04] dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/[0.06]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {renderPinnedAgeDropdownBody()}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div ref={pinnedBarRef} className="interFont flex w-full flex-col gap-2.5">
            <div className="hidden min-[771px]:mx-auto min-[771px]:flex min-[771px]:max-w-[1120px] w-full flex-col gap-2.5">
                <div className="flex min-h-[60px] w-full items-stretch rounded-full bg-zinc-200/75 p-px shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] ring-1 ring-zinc-900/[0.04] dark:bg-zinc-700/80 dark:ring-white/[0.06] dark:shadow-[0_4px_28px_-8px_rgba(0,0,0,0.45)]">
                    <div className="flex min-h-[58px] min-w-0 flex-1 gap-px rounded-l-full bg-zinc-200/75 dark:bg-zinc-700/80">
                        {pinnedOrder.map((k, i) => renderPinnedCell(k, i))}
                    </div>
                    <button
                        type="button"
                        onClick={openConfigureModal}
                        className="flex min-h-[58px] shrink-0 items-center justify-center gap-2 rounded-r-full bg-white px-5 pl-4 text-[#C505EB] transition-[background-color,box-shadow,color] duration-200 ease-out hover:bg-gradient-to-br hover:from-[#C505EB]/[0.08] hover:to-[#08E2BE]/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(197,5,235,0.15)] dark:bg-zinc-900 dark:hover:from-[#C505EB]/15 dark:hover:to-[#08E2BE]/10"
                    >
                        <Icon icon="mage:filter" className="h-7 w-7 shrink-0" style={{ color: "#08E2BE" }} />
                        <span className="line-clamp-2 max-w-[min(220px,32vw)] text-left text-sm font-bold leading-tight tracking-tight sm:max-w-[280px] sm:text-base">
                            {t("filter.filters")}
                        </span>
                    </button>
                </div>

                {/* Secondary chip row is intentionally hidden by request */}
  </div>

            <div className="flex min-[771px]:hidden w-full flex-col gap-2.5">
  <button
                    type="button"
                    onClick={openConfigureModal}
                    className="flex w-full touch-manipulation items-center justify-center gap-2.5 rounded-full bg-zinc-200/75 p-px shadow-sm ring-1 ring-zinc-900/[0.04] transition-transform duration-200 ease-out active:scale-[0.99] dark:bg-zinc-700/80 dark:ring-white/[0.06]"
                >
                    <span className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-[#C505EB] transition-[background-color,box-shadow] duration-200 ease-out hover:bg-gradient-to-br hover:from-[#C505EB]/[0.06] hover:to-[#08E2BE]/[0.05] dark:bg-zinc-900 dark:hover:from-[#C505EB]/12 dark:hover:to-[#08E2BE]/8">
                        <Icon icon="mage:filter" className="h-6 w-6 shrink-0" style={{ color: "#08E2BE" }} />
                        <span className="text-base font-bold tracking-tight">{t("filter.filters")}</span>
    </span>
  </button>

                {/* Secondary chip grid is intentionally hidden by request */}
</div>

            {/* Модальное окно фильтров */}
            {isModalOpen && (
                <>
                    {/* Overlay */}
                    <div 
                        className={`fixed inset-0 bg-black bg-opacity-50 z-[200] transition-opacity duration-300`}
                        onClick={() => setIsModalOpen(false)}
                    />
                    
                    {/* Modal */}
                    <div 
                        ref={modalRef}
                        className={`fixed inset-0 z-[201] flex items-center justify-center p-4 max-[770px]:p-2`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] dark:border-gray-700`}>
                                <h2 className={`text-2xl font-bold text-black dark:text-white`}>{t("filter.filters")}</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className={`p-2 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-300`}
                                >
                                    <X size={24} className={`text-gray-700 dark:text-gray-300`} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className={`flex-1 overflow-y-auto px-6 py-4`}>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
                                    {/* Город */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.city")}</label>
                                        <select
                                          value={filters.city}
                                          onChange={(e) => handleFilterChange("city", e.target.value)}
                                          className={neighbourModalSelectClass}
                                        >
                                          <option value="">{t("-")}</option>
                                          {CZECH_REGIONS.map(region => (
                                            <option key={region.value} value={region.value}>
                                              {region.label}
                                            </option>
                                          ))}
                                        </select>
                                    </div>

                                    {/* Возраст (dual range) */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>
                                            {t("filter.neighbourAge")}: <span className={`text-[#C505EB]`}>{`${normalizedAgeFrom} – ${normalizedAgeTo}`}</span>
                                        </label>
                                        <div className={`flex flex-col gap-3`}>
                                            <div className={`relative h-9`}>
                                                <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700`}>
                                                    <div
                                                        className={`absolute h-full rounded-full bg-[#C505EB]`}
                                                        style={{
                                                            left: `${selectedAgeFromPercent}%`,
                                                            width: `${Math.max(2, selectedAgeToPercent - selectedAgeFromPercent)}%`,
                                                        }}
                                        />
                                    </div>

                                        <input
                                                    type="range"
                                                    min={ageSliderMin}
                                                    max={ageSliderMax}
                                                    value={normalizedAgeFrom}
                                                    onChange={(e) => applyAgeRange(Number(e.target.value), normalizedAgeTo)}
                                                    className="age-range-input z-20"
                                                />
                                                <input
                                                    type="range"
                                                    min={ageSliderMin}
                                                    max={ageSliderMax}
                                                    value={normalizedAgeTo}
                                                    onChange={(e) => applyAgeRange(normalizedAgeFrom, Number(e.target.value))}
                                                    className="age-range-input z-30"
                                                />
                                            </div>

                                            <div className={`flex justify-between text-xs text-gray-500 dark:text-gray-400`}>
                                                <span>18</span>
                                                <span>100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Минимальный рейтинг */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>
                                            {t("filter.neighbourMinRating")}: <span className={`text-[#C505EB]`}>{`${Number(filters.ratingMin || "0")}+`}</span>
                                        </label>
                                        <div className={`flex flex-col gap-3`}>
                                            <div className={`relative h-9`}>
                                                <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700`}>
                                                    <div
                                                        className={`absolute h-full rounded-full bg-[#C505EB] rounded-full`}
                                                        style={{
                                                            width: `${(Number(filters.ratingMin || "0") / 5) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="5"
                                                    step="1"
                                                    value={Number(filters.ratingMin || "0")}
                                            onChange={(e) => handleFilterChange("ratingMin", e.target.value)}
                                                    className="age-range-input z-20"
                                                />
                                            </div>
                                            <div className={`flex justify-between text-xs text-gray-500 dark:text-gray-400`}>
                                                {Array.from({ length: 6 }, (_, index) => (
                                                    <span key={index}>{index}+</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Пол */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourGender")}</label>
                                        <select
                                            value={filters.gender}
                                            onChange={(e) => handleFilterChange("gender", e.target.value)}
                                            className={neighbourModalSelectClass}
                                        >
                                            <option value="">-</option>
                                            {genderOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Статус верификации */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourVerifiedStatus")}</label>
                                        <select
                                            value={filters.verified}
                                            onChange={(e) => handleFilterChange("verified", e.target.value)}
                                            className={neighbourModalSelectClass}
                                        >
                                            <option value="">-</option>
                                            {verifiedOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Курение */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourSmoking")}</label>
                                        <select
                                            value={filters.smoking}
                                            onChange={(e) => handleFilterChange("smoking", e.target.value)}
                                            className={neighbourModalSelectClass}
                                        >
                                            <option value="">-</option>
                                            {smokingOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Алкоголь */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourAlcohol")}</label>
                                        <select
                                            value={filters.alcohol}
                                            onChange={(e) => handleFilterChange("alcohol", e.target.value)}
                                            className={neighbourModalSelectClass}
                                        >
                                            <option value="">-</option>
                                            {alcoholOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Режим сна */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourSleepSchedule")}</label>
                                        <select
                                            value={filters.sleepSchedule}
                                            onChange={(e) => handleFilterChange("sleepSchedule", e.target.value)}
                                            className={neighbourModalSelectClass}
                                        >
                                            <option value="">-</option>
                                            {sleepScheduleOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                                                        {/* Университет */}
                                                                        <div ref={universityAutocompleteRef} className={`flex flex-col gap-2 relative`}>
                                                                                <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourUniversity")}</label>
                                                                                <input
                                                                                        type="text"
                                                                                        value={universityInput}
                                                                                        onFocus={() => setUniversityDropdownOpen(true)}
                                                                                        onChange={(e) => {
                                                                                                const nextValue = e.target.value;
                                                                                                setUniversityInput(nextValue);
                                                                                                if (filters.universityId || filters.universityName) {
                                                                                                        onChange({
                                                                                                                ...filters,
                                                                                                                universityId: "",
                                                                                                                universityName: "",
                                                                                                        });
                                                                                                }
                                                                                                setUniversityDropdownOpen(true);
                                                                                        }}
                                                                                        placeholder={t("profile.universityPlaceholder")}
                                                                                        className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                                                                                focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                                                                                focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                                                                                outline-0 duration-300 transition-all bg-white text-black
                                                                                                                hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                                                                />

                                                                                {universityDropdownOpen && (
                                                                                    <div className={`absolute z-20 top-full mt-1 w-full rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden`}>
                                                                                        {universitiesLoading ? (
                                                                                            <div className={`px-4 py-3 text-sm text-[#666666] dark:text-gray-300`}>{t("profile.loadingUniversities")}</div>
                                                                                        ) : universityInput.trim().length < 2 ? (
                                                                                            <div className={`px-4 py-3 text-sm text-[#666666] dark:text-gray-300`}>{t("profile.universityPlaceholder")}</div>
                                                                                        ) : universitySuggestions.length === 0 ? (
                                                                                            <div className={`px-4 py-3 text-sm text-[#666666] dark:text-gray-300`}>{t("profile.universityNoResults")}</div>
                                                                                        ) : (
                                                                                            <div className={`max-h-56 overflow-y-auto`}>
                                                                                                {universitySuggestions.map((item) => (
                                                                                                    <button
                                                                                                        key={item.id}
                                                                                                        type="button"
                                                                                                        onClick={() => handleUniversitySuggestionSelect(item)}
                                                                                                        className={`w-full text-left px-4 py-2.5 text-sm text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-200`}
                                                                                                    >
                                                                                                        {item.name}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {universityInput.trim() && !filters.universityId && (
                                                                                    <div className={`text-xs text-[#C505EB] font-medium`}>
                                                                                        {t("profile.selectUniversityFromList")}
                                                                                    </div>
                                                                                )}
                                    </div>

                                    {/* Удалённая работа */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourWorkFromHome")}</label>
                                        <select
                                            value={filters.workFromHome}
                                            onChange={(e) => handleFilterChange("workFromHome", e.target.value)}
                                            className={neighbourModalSelectClass}
                                        >
                                            <option value="">-</option>
                                            {workFromHomeOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Исключение категорий */}
                                    <div className={`flex flex-col gap-2 md:col-span-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourExcludeStatuses")}</label>
                                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3`}>
                                            <label className={`flex items-center gap-3 p-3 rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:border-[#C505EB]/60`}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.excludeWithChildren}
                                                    onChange={(e) => handleBooleanFilterChange("excludeWithChildren", e.target.checked)}
                                                    className={`w-5 h-5 accent-[#C505EB]`}
                                                />
                                                <span className={`text-sm font-medium text-black dark:text-white`}>{t("filter.neighbourExcludeWithChildren")}</span>
                                            </label>

                                            <label className={`flex items-center gap-3 p-3 rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:border-[#C505EB]/60`}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.excludeWithDisability}
                                                    onChange={(e) => handleBooleanFilterChange("excludeWithDisability", e.target.checked)}
                                                    className={`w-5 h-5 accent-[#C505EB]`}
                                                />
                                                <span className={`text-sm font-medium text-black dark:text-white`}>{t("filter.neighbourExcludeWithDisability")}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Языки общения */}
                                    <div className={`flex flex-col gap-2 md:col-span-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourLanguages")}</label>
                                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-3`}>
                                            {languageOptions.map((lang) => {
                                                const isChecked = filters.languages.includes(lang.key);
                                                return (
                                                    <label 
                                                        key={lang.key} 
                                                        className={`flex items-center gap-3 p-3 rounded-xl border border-[#E0E0E0] dark:border-gray-600 
                                                                 hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                                                 ${isChecked ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleLanguage(lang.key)}
                                                            className={`w-5 h-5 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                                                       cursor-pointer accent-[#C505EB]`}
                                                        />
                                                        <span className={`text-sm font-medium text-black dark:text-white`}>{lang.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Footer */}
                            <div className={`flex items-center justify-between px-6 py-4 border-t border-[#E5E5E5] dark:border-gray-700 gap-4`}>
                                <button
                                    onClick={handleReset}
                                    className={`px-6 py-2 rounded-lg border border-[#DDDDDD] dark:border-gray-600 text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-300 font-semibold`}
                                >
                                    {t("filter.resetFilters")}
                                </button>
                                <button
                                    onClick={handleApply}
                                    className={`px-6 py-2 rounded-lg bg-gradient-to-r from-[#C505EB] to-[#BA00F8] text-white hover:from-[#BA00F8] hover:to-[#C505EB] duration-300 font-semibold`}
                                >
                                    {t("filter.applyFilters")}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
