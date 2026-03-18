import {Icon} from "@iconify/react";
import {useState, useRef, useEffect} from "react";
import {X} from "lucide-react";
import {useLanguage} from "../../contexts/LanguageContext";
import { regionValueToLabel } from "../../utils/regions";
import "./NeighboursFilterPanel.css";




interface NeighbourFilterState {
    city: string;
    ageFrom: string;
    ageTo: string;
    ratingMin: string;
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
export default function NeighboursFilterPanel({ filters, onChange }: Props) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const universityAutocompleteRef = useRef<HTMLDivElement>(null);
    const [universityInput, setUniversityInput] = useState(filters.universityName || "");
    const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
    const [universitiesLoading, setUniversitiesLoading] = useState(false);
    const [universitySuggestions, setUniversitySuggestions] = useState<Array<{ id: number; name: string }>>([]);

    // Load user profile to set default gender
    useEffect(() => {
        const loadUserGender = async () => {
            try {
                const response = await fetch("/api/users/me/", {
                    credentials: "include",
                });
                if (response.ok) {
                    const data = await response.json();
                    // Set default gender filter to opposite of user's gender
                    if (data.gender && !filters.gender) {
                        const oppositeGender = data.gender === "male" ? "female" : "male";
                        onChange({
                            ...filters,
                            gender: oppositeGender,
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to load user profile:", error);
            }
        };
        loadUserGender();
    }, []);
    
    // Функции для перевода значений фильтров
    const translateGender = (value: string) => {
        const map: Record<string, string> = {
            "male": t("filter.neighbourGenderMale"),
            "female": t("filter.neighbourGenderFemale"),
            "other": t("filter.neighbourGenderOther"),
        };
        return map[value] || value;
    };

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

    const translateLanguage = (key: string) => {
        const map: Record<string, string> = {
            "cz": t("profile.languages.cz"),
            "en": t("profile.languages.en"),
            "ru": t("profile.languages.ru"),
            "de": t("profile.languages.de"),
            "sk": t("profile.languages.sk"),
        };
        return map[key.toLowerCase()] || key.toUpperCase();
    };

const NeighboursCategories = [
    filters.city && {
        title: t("filter.location"),
        subTitle: regionValueToLabel(filters.city),
    },

    filters.neighbourFrom && {
        title: t("filter.neighbourFrom"),
        subTitle: filters.neighbourFrom,
    },

    (filters.ageFrom || filters.ageTo) && {
        title: t("filter.neighbourAge"),
        subTitle: `${filters.ageFrom || "18"} - ${filters.ageTo || "100"}`,
    },

        Number(filters.ratingMin || "0") > 0 && {
                title: t("filter.neighbourMinRating"),
                subTitle: `${filters.ratingMin}+`,
        },

    filters.gender && {
        title: t("filter.neighbourGender"),
        subTitle: translateGender(filters.gender),
    },

    filters.smoking && {
        title: t("filter.neighbourSmoking"),
        subTitle: translateYesNo(filters.smoking, "filter.neighbourSmokingYes", "filter.neighbourSmokingNo"),
    },

    filters.alcohol && {
        title: t("filter.neighbourAlcohol"),
        subTitle: translateYesNo(filters.alcohol, "filter.neighbourAlcoholYes", "filter.neighbourAlcoholNo"),
    },

    filters.sleepSchedule && {
        title: t("filter.neighbourSleepSchedule"),
        subTitle: translateSleepSchedule(filters.sleepSchedule),
    },

        filters.universityName && {
                title: t("filter.neighbourUniversity"),
                subTitle: filters.universityName,
    },

        filters.excludeWithChildren && {
                title: t("filter.neighbourExcludeWithChildren"),
                subTitle: t("filter.active"),
        },

        filters.excludeWithDisability && {
                title: t("filter.neighbourExcludeWithDisability"),
                subTitle: t("filter.active"),
        },

    filters.workFromHome && {
        title: t("filter.neighbourWorkFromHome"),
        subTitle: translateYesNo(filters.workFromHome, "filter.neighbourWorkFromHomeYes", "filter.neighbourWorkFromHomeNo"),
    },

    filters.languages.length > 0 && {
        title: t("filter.neighbourLanguages"),
        subTitle: filters.languages.map(l => translateLanguage(l)).join(", "),
    },
].filter(Boolean) as { title: string; subTitle: string }[];

    const genderOptions = [
        {value: "male", label: t("filter.neighbourGenderMale")},
        {value: "female", label: t("filter.neighbourGenderFemale")},
        {value: "other", label: t("filter.neighbourGenderOther")},
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

    const clearFilterByKey = (key: string, arrayKey?: string) => {
        if (key === "languages" && arrayKey) {
            onChange({
                ...filters,
                languages: filters.languages.filter(l => l !== arrayKey),
            });
        } else if (key === "city") {
            onChange({ ...filters, city: "" });
        } else if (key === "ageFrom") {
            onChange({ ...filters, ageFrom: "", ageTo: "" });
        } else if (key === "ageTo") {
            onChange({ ...filters, ageTo: "" });
        } else if (key === "ratingMin") {
            onChange({ ...filters, ratingMin: "0" });
        } else if (key === "gender") {
            onChange({ ...filters, gender: "" });
        } else if (key === "smoking") {
            onChange({ ...filters, smoking: "" });
        } else if (key === "alcohol") {
            onChange({ ...filters, alcohol: "" });
        } else if (key === "sleepSchedule") {
            onChange({ ...filters, sleepSchedule: "" });
        } else if (key === "universityName") {
            setUniversityInput("");
            onChange({ ...filters, universityId: "", universityName: "" });
        } else if (key === "excludeWithChildren") {
            onChange({ ...filters, excludeWithChildren: false });
        } else if (key === "excludeWithDisability") {
            onChange({ ...filters, excludeWithDisability: false });
        } else if (key === "workFromHome") {
            onChange({ ...filters, workFromHome: "" });
        } else if (key === "neighbourFrom") {
            onChange({ ...filters, neighbourFrom: "" });
        }
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

    return(
        <div className={`w-full flex flex-col interFont`}>

            {/* Десктопная версия */}
            <div className="hidden min-[771px]:flex w-full h-[64px] items-center justify-between 
                border border-[#DDDDDD] dark:border-gray-600 rounded-full 
                shadow-md dark:shadow-gray-900/50 bg-white dark:bg-gray-800 overflow-hidden">

  <div
    className="flex items-center h-full py-2 overflow-x-auto overflow-y-hidden scroll-smooth"
  >
    {NeighboursCategories.map((value, index) => {
      let filterKey = "";
      if (value.title === t("filter.location")) filterKey = "city";
      else if (value.title === t("filter.neighbourFrom")) filterKey = "neighbourFrom";
      else if (value.title === t("filter.neighbourAge")) filterKey = "ageFrom";
      else if (value.title === t("filter.neighbourMinRating")) filterKey = "ratingMin";
      else if (value.title === t("filter.neighbourGender")) filterKey = "gender";
      else if (value.title === t("filter.neighbourSmoking")) filterKey = "smoking";
      else if (value.title === t("filter.neighbourAlcohol")) filterKey = "alcohol";
      else if (value.title === t("filter.neighbourSleepSchedule")) filterKey = "sleepSchedule";
      else if (value.title === t("filter.neighbourUniversity")) filterKey = "universityName";
      else if (value.title === t("filter.neighbourExcludeWithChildren")) filterKey = "excludeWithChildren";
      else if (value.title === t("filter.neighbourExcludeWithDisability")) filterKey = "excludeWithDisability";
      else if (value.title === t("filter.neighbourWorkFromHome")) filterKey = "workFromHome";
      else if (value.title === t("filter.neighbourLanguages")) filterKey = "languages";

      return (
        <div
          key={index}
          onClick={() => clearFilterByKey(filterKey)}
          className={`h-full flex-shrink-0 flex flex-col items-center justify-center px-6 gap-1 group
            ${index + 1 === NeighboursCategories.length ? "" : "border-r border-[#E5E5E5] dark:border-gray-700"}
            hover:bg-[#F5F5F5] dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200`}
          title="Click to remove filter"
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="font-bold text-[14px] text-black dark:text-white whitespace-nowrap">
                {value.title}
              </span>
              <span className="font-semibold text-[11px] text-[#666666] dark:text-gray-400 whitespace-nowrap">
                {value.subTitle}
              </span>
            </div>
            <div className="p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200">
              <X size={16} className="text-red-500" />
            </div>
          </div>
        </div>
      );
    })}
  </div>

  <button
    onClick={() => setIsModalOpen(true)}
    className="h-full flex items-center justify-center px-8 flex-shrink-0 gap-2 
               border-l border-[#E5E5E5] dark:border-gray-700 
               cursor-pointer hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-300"
  >
    <Icon icon="mage:filter" className="w-8 h-8" style={{ color: "#08E2BE" }} />
    <span className="text-xl text-[#C505EB] font-bold">
      {t("filter.filters")}
    </span>
  </button>
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
                                          className="w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0]
                                                     dark:border-gray-600 dark:bg-gray-800 dark:text-white
                                                     focus:border-[#999999] dark:focus:border-[#C505EB]
                                                     focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                     outline-0 duration-300 transition-all bg-white text-black
                                                     hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50"
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
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            {genderOptions.map((option) => (
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
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
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
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
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
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
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
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
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
