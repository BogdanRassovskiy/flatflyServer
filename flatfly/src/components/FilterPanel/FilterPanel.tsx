import {Icon} from "@iconify/react";
import {useState, useRef, useEffect} from "react";
import {X} from "lucide-react";
import {useLanguage} from "../../contexts/LanguageContext";

export interface FilterState {
      propertyType: string;
      region: string;
      priceFrom: string;
      priceTo: string;
      rooms: string;
      hasRoommates: string;
      rentalPeriod: string;
      internet: string;
      utilities: string;
      petsAllowed: string;
      smokingAllowed: string;
      moveInDate: string;
      amenities: string[];
    }

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}
export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    
    const regions = [
      { value: "", label: "-" },
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
    
    // Функции для перевода значений фильтров
    const translatePropertyType = (value: string) => {
        const map: Record<string, string> = {
            "ROOM": t("filter.propertyTypeRoom"),
            "APARTMENT": t("filter.propertyTypeApartment"),
            "HOUSE": t("filter.propertyTypeHouse"),
        };
        return map[value] || value;
    };

    const translateRegion = (value: string) => {
        const region = regions.find(r => r.value === value);
        return region ? region.label : value;
    };

    const translateYesNo = (value: string, yesKey: string, noKey: string) => {
        if (value === "yes") return t(yesKey);
        if (value === "no") return t(noKey);
        return value;
    };

    const translateRentalPeriod = (value: string) => {
        const map: Record<string, string> = {
            "SHORT": t("filter.rentalPeriodShort"),
            "LONG": t("filter.rentalPeriodLong"),
            "": t("filter.rentalPeriodFlexible"),
        };
        return map[value] || value;
    };

    const translateUtilities = (value: string) => {
        if (value === "yes") return t("filter.utilitiesIncluded");
        if (value === "not") return t("filter.utilitiesNotIncluded");
        return value;
    };

    const translateAmenity = (key: string) => {
        const map: Record<string, string> = {
            "washing_machine": t("filter.amenityWashingMachine"),
            "dishwasher": t("filter.amenityDishwasher"),
            "microwave": t("filter.amenityMicrowave"),
            "oven": t("filter.amenityOven"),
            "refrigerator": t("filter.amenityRefrigerator"),
            "tv": t("filter.amenityTV"),
            "air_conditioning": t("filter.amenityAirConditioning"),
            "heating": t("filter.amenityHeating"),
            "balcony": t("filter.amenityBalcony"),
            "parking": t("filter.amenityParking"),
            "furnished": t("filter.amenityFurnished"),
        };
        return map[key] || key;
    };

    const RoomsCategories = [
      filters.propertyType && {
        title: t("filter.propertyType"),
        subTitle: translatePropertyType(filters.propertyType),
      },

      filters.region && {
        title: t("filter.region"),
        subTitle: translateRegion(filters.region),
      },

      (filters.priceFrom || filters.priceTo) && {
        title: t("filter.price"),
        subTitle: `${filters.priceFrom || "0"} – ${filters.priceTo || "∞"}`,
      },

      filters.rooms && {
        title: t("filter.rooms"),
        subTitle: filters.rooms,
      },

      filters.hasRoommates && {
        title: t("filter.hasRoommates"),
        subTitle: translateYesNo(filters.hasRoommates, "filter.hasRoommatesYes", "filter.hasRoommatesNo"),
      },

      filters.rentalPeriod && {
        title: t("filter.rentalPeriod"),
        subTitle: translateRentalPeriod(filters.rentalPeriod),
      },

      filters.internet && {
        title: t("filter.internet"),
        subTitle: translateYesNo(filters.internet, "filter.internetYes", "filter.internetNo"),
      },

      filters.utilities && {
        title: t("filter.utilities"),
        subTitle: translateUtilities(filters.utilities),
      },

      filters.petsAllowed && {
        title: t("filter.petsAllowed"),
        subTitle: translateYesNo(filters.petsAllowed, "filter.petsAllowedYes", "filter.petsAllowedNo"),
      },

      filters.smokingAllowed && {
        title: t("filter.smokingAllowed"),
        subTitle: translateYesNo(filters.smokingAllowed, "filter.smokingAllowedYes", "filter.smokingAllowedNo"),
      },

      filters.moveInDate && {
        title: t("filter.moveInDate"),
        subTitle: filters.moveInDate,
      },

      filters.amenities.length > 0 && {
        title: t("filter.amenities"),
        subTitle: filters.amenities.map(a => translateAmenity(a)).join(", "),
      },
    ].filter(Boolean) as { title: string; subTitle: string }[];

    const propertyTypes = [
        {value: "ROOM", label: t("filter.propertyTypeRoom")},
        {value: "APARTMENT", label: t("filter.propertyTypeApartment")},
        {value: "HOUSE", label: t("filter.propertyTypeHouse")},
    ];

    const roomOptions = ["1", "2", "3", "4", "5+"];
    const yesNoOptions = [
        {value: "yes", label: t("filter.hasRoommatesYes")},
        {value: "no", label: t("filter.hasRoommatesNo")},
    ];

    const rentalPeriods = [
        {value: "SHORT", label: t("filter.rentalPeriodShort")},
        {value: "LONG", label: t("filter.rentalPeriodLong")},
        {value: "", label: t("filter.rentalPeriodFlexible")},
    ];

    const amenitiesOptions = [
        {key: "washing_machine", label: t("filter.amenityWashingMachine")},
        {key: "dishwasher", label: t("filter.amenityDishwasher")},
        {key: "microwave", label: t("filter.amenityMicrowave")},
        {key: "oven", label: t("filter.amenityOven")},
        {key: "refrigerator", label: t("filter.amenityRefrigerator")},
        {key: "tv", label: t("filter.amenityTV")},
        {key: "air_conditioning", label: t("filter.amenityAirConditioning")},
        {key: "heating", label: t("filter.amenityHeating")},
        {key: "balcony", label: t("filter.amenityBalcony")},
        {key: "parking", label: t("filter.amenityParking")},
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

    const handleFilterChange = (key: keyof FilterState, value: string | string[]) => {
      onChange({
        ...filters,
        [key]: value,
      });
    };

    const toggleAmenity = (amenity: string) => {
      const newAmenities = filters.amenities.includes(amenity)
        ? filters.amenities.filter(a => a !== amenity)
        : [...filters.amenities, amenity];

      onChange({
        ...filters,
        amenities: newAmenities,
      });
    };

    const handleReset = () => {
      onChange({
        propertyType: "",
        region: "",
        priceFrom: "",
        priceTo: "",
        rooms: "",
        hasRoommates: "",
        rentalPeriod: "",
        internet: "",
        utilities: "",
        petsAllowed: "",
        smokingAllowed: "",
        moveInDate: "",
        amenities: [],
      });
    };

    const handleApply = () => {
      console.log("Applied filters:", filters);
      setIsModalOpen(false);
    };

    return(
        <div className={`w-full flex flex-col interFont`}>

            {/* Десктопная версия */}
            <div className="hidden min-[771px]:flex w-full h-[64px] items-center justify-between
                border border-[#DDDDDD] dark:border-gray-600 rounded-full
                shadow-md dark:shadow-gray-900/50 bg-white dark:bg-gray-800 overflow-hidden">

                  <div className="flex items-center h-full py-2 overflow-x-auto overflow-y-hidden scroll-smooth">
                    {RoomsCategories.length === 0 ? (
                      <div className="px-6 text-sm text-gray-400 italic">
                        {t("")}
                      </div>
                    ) : (
                      RoomsCategories.map((value, index) => (
                        <div
                          key={index}
                          className={`h-full flex-shrink-0 flex flex-col items-center justify-center px-10
                            ${index + 1 === RoomsCategories.length ? "" : "border-r border-[#E5E5E5] dark:border-gray-700"}`}
                        >
                          <span className="font-bold text-[14px] text-black dark:text-white whitespace-nowrap">
                            {value.title}
                          </span>
                          <span className="font-semibold text-[11px] text-[#666666] dark:text-gray-400 whitespace-nowrap">
                            {value.subTitle}
                          </span>
                        </div>
                      ))
                    )}
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

            {/* Мобильная версия с разделительными линиями */}
            <div className="flex max-[770px]:flex min-[771px]:hidden w-full flex-col
                border border-[#DDDDDD] dark:border-gray-600 rounded-xl
                shadow-md dark:shadow-gray-900/50 bg-white dark:bg-gray-800 overflow-hidden">

              <div className="flex flex-col">
                {RoomsCategories.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">
                    {t("")}
                  </div>
                ) : (
                  RoomsCategories.map((value, index) => (
                    <div
                      key={index}
                      className={`flex flex-col items-start px-4 py-3
                        ${index + 1 === RoomsCategories.length ? "" : "border-b border-[#E5E5E5] dark:border-gray-700"}`}
                    >
                      <span className="font-bold text-sm text-black dark:text-white">
                        {value.title}
                      </span>
                      <span className="font-semibold text-xs text-[#666666] dark:text-gray-400">
                        {value.subTitle}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center px-4 py-3 gap-2
                           border-t border-[#E5E5E5] dark:border-gray-700
                           cursor-pointer hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-300"
              >
                <Icon icon="mage:filter" className="w-6 h-6" style={{ color: "#08E2BE" }} />
                <span className="text-lg text-[#C505EB] font-bold">
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
                                    {/* Город / Район */}
                                    <div className={`flex flex-col gap-2`}>
                                      <label className={`text-sm font-semibold text-black dark:text-white`}>
                                        {t("filter.region")}
                                      </label>

                                      <select
                                        value={filters.region}
                                        onChange={(e) => handleFilterChange("region", e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] 
                                                    dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                    focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                    focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                    outline-0 duration-300 transition-all bg-white text-black
                                                    hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                      >
                                        {regions.map(region => (
                                          <option key={region.value} value={region.value}>
                                            {region.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Тип жилья */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.propertyType")}</label>
                                        <select
                                            value={filters.propertyType}
                                            onChange={(e) => handleFilterChange("propertyType", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">{t("filter.propertyValue")}</option>
                                            {propertyTypes.map((type) => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Цена от */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.price")} ({t("filter.priceFrom")})</label>
                                        <input
                                            type="number"
                                            value={filters.priceFrom}
                                            onChange={(e) => handleFilterChange("priceFrom", e.target.value)}
                                            placeholder={t("filter.pricePlaceholder")}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        />
                                    </div>

                                    {/* Цена до */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.price")} ({t("filter.priceTo")})</label>
                                        <input
                                            type="number"
                                            value={filters.priceTo}
                                            onChange={(e) => handleFilterChange("priceTo", e.target.value)}
                                            placeholder={t("filter.pricePlaceholder")}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        />
                                    </div>

                                    {/* Количество комнат */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.rooms")}</label>
                                        <select
                                            value={filters.rooms}
                                            onChange={(e) => handleFilterChange("rooms", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">{t("filter.roomsPlaceholder")}</option>
                                            {roomOptions.map((room) => (
                                                <option key={room} value={room}>{room}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Наличие соседей */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.hasRoommates")}</label>
                                        <select
                                            value={filters.hasRoommates}
                                            onChange={(e) => handleFilterChange("hasRoommates", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            {yesNoOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Срок аренды */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.rentalPeriod")}</label>
                                        <select
                                            value={filters.rentalPeriod}
                                            onChange={(e) => handleFilterChange("rentalPeriod", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            {rentalPeriods.map((period) => (
                                                <option key={period.value} value={period.value}>{period.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Интернет */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.internet")}</label>
                                        <select
                                            value={filters.internet}
                                            onChange={(e) => handleFilterChange("internet", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            <option value="yes">{t("filter.internetYes")}</option>
                                            <option value="no">{t("filter.internetNo")}</option>
                                        </select>
                                    </div>

                                    {/* Коммунальные услуги */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.utilities")}</label>
                                        <select
                                            value={filters.utilities}
                                            onChange={(e) => handleFilterChange("utilities", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            <option value="yes">{t("filter.utilitiesIncluded")}</option>
                                            <option value="not">{t("filter.utilitiesNotIncluded")}</option>
                                        </select>
                                    </div>

                                    {/* Разрешены животные */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.petsAllowed")}</label>
                                        <select
                                            value={filters.petsAllowed}
                                            onChange={(e) => handleFilterChange("petsAllowed", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            <option value="yes">{t("filter.petsAllowedYes")}</option>
                                            <option value="no">{t("filter.petsAllowedNo")}</option>
                                        </select>
                                    </div>

                                    {/* Разрешено курение */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.smokingAllowed")}</label>
                                        <select
                                            value={filters.smokingAllowed}
                                            onChange={(e) => handleFilterChange("smokingAllowed", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            <option value="yes">{t("filter.smokingAllowedYes")}</option>
                                            <option value="no">{t("filter.smokingAllowedNo")}</option>
                                        </select>
                                    </div>

                                    {/* Дата заселения */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.moveInDate")}</label>
                                        <input
                                            type="date"
                                            value={filters.moveInDate}
                                            onChange={(e) => handleFilterChange("moveInDate", e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] dark:focus:border-[#C505EB] outline-0 duration-300`}
                                        />
                                    </div>

                                    {/* Оснащение */}
                                    <div className={`flex flex-col gap-2 md:col-span-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.amenities")}</label>
                                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-3`}>
                                            {amenitiesOptions.map((amenity) => {
                                                const isChecked = filters.amenities.includes(amenity.key);
                                                return (
                                                    <label 
                                                        key={amenity.key} 
                                                        className={`flex items-center gap-3 p-3 rounded-xl border border-[#E0E0E0] dark:border-gray-600  overflow-hidden
                                                                 hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                                                 ${isChecked ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleAmenity(amenity.key)}
                                                            className={`w-5 h-5 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                                                       cursor-pointer accent-[#C505EB]`}
                                                        />
                                                        <span className={`text-sm font-medium text-black dark:text-white`}>{amenity.label}</span>
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
