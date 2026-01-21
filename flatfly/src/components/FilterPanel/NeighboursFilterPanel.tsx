import {Icon} from "@iconify/react";
import {useState, useRef, useEffect} from "react";
import {X} from "lucide-react";
import {useLanguage} from "../../contexts/LanguageContext";
import { regionValueToLabel } from "../../utils/regions";




interface NeighbourFilterState {
    city: string;
    ageFrom: string;
    ageTo: string;
    gender: string;
    smoking: string;
    alcohol: string;
    sleepSchedule: string;
    profession: string;
    workFromHome: string;
    languages: string[];
    interests: string;
}
interface Props {
  filters: NeighbourFilterState;
  onChange: (filters: NeighbourFilterState) => void;
}
export default function NeighboursFilterPanel({ filters, onChange }: Props) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    
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

  (filters.ageFrom || filters.ageTo) && {
    title: t("filter.neighbourAge"),
    subTitle: `${filters.ageFrom || "0"} - ${filters.ageTo || "∞"}`,
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

  filters.profession && {
    title: t("filter.neighbourProfession"),
    subTitle: filters.profession,
  },

  filters.workFromHome && {
    title: t("filter.neighbourWorkFromHome"),
    subTitle: translateYesNo(filters.workFromHome, "filter.neighbourWorkFromHomeYes", "filter.neighbourWorkFromHomeNo"),
  },

  filters.languages.length > 0 && {
    title: t("filter.neighbourLanguages"),
    subTitle: filters.languages.map(l => translateLanguage(l)).join(", "),
  },

  filters.interests && {
    title: t("filter.neighbourInterests"),
    subTitle: filters.interests,
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

    const handleFilterChange = (key: keyof NeighbourFilterState, value: string | string[]) => {
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
      onChange({
        city: "",
        ageFrom: "",
        ageTo: "",
        gender: "",
        smoking: "",
        alcohol: "",
        sleepSchedule: "",
        profession: "",
        workFromHome: "",
        languages: [],
        interests: "",
      });
    };

    const handleApply = () => {
      setIsModalOpen(false);
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
    {NeighboursCategories.map((value, index) => (
      <div
        key={index}
        className={`h-full flex-shrink-0 flex flex-col items-center justify-center px-10
          ${index + 1 === NeighboursCategories.length ? "" : "border-r border-[#E5E5E5] dark:border-gray-700"}`}
      >
        <span className="font-bold text-[14px] text-black dark:text-white whitespace-nowrap">
          {value.title}
        </span>
        <span className="font-semibold text-[11px] text-[#666666] dark:text-gray-400 whitespace-nowrap">
          {value.subTitle}
        </span>
      </div>
    ))}
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

                                    {/* Возраст от */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourAge")} ({t("filter.neighbourAgeFrom")})</label>
                                        <input
                                            type="number"
                                            value={filters.ageFrom}
                                            onChange={(e) => handleFilterChange("ageFrom", e.target.value)}
                                            placeholder={t("filter.neighbourAgePlaceholder")}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        />
                                    </div>

                                    {/* Возраст до */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourAge")} ({t("filter.neighbourAgeTo")})</label>
                                        <input
                                            type="number"
                                            value={filters.ageTo}
                                            onChange={(e) => handleFilterChange("ageTo", e.target.value)}
                                            placeholder={t("filter.neighbourAgePlaceholder")}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        />
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

                                    {/* Профессия / Университет */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourProfession")}</label>
                                        <input
                                            type="text"
                                            value={filters.profession}
                                            onChange={(e) => handleFilterChange("profession", e.target.value)}
                                            placeholder={t("filter.neighbourProfessionPlaceholder")}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        />
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

                                    {/* Совпадение интересов */}
                                    <div className={`flex flex-col gap-2 md:col-span-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.neighbourInterests")}</label>
                                        <input
                                            type="text"
                                            value={filters.interests}
                                            onChange={(e) => handleFilterChange("interests", e.target.value)}
                                            placeholder={t("filter.neighbourInterestsPlaceholder")}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        />
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
