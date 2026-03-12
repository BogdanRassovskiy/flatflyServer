import {Icon} from "@iconify/react";
import {useState, useRef, useEffect} from "react";
import {X} from "lucide-react";
import {useLanguage} from "../../contexts/LanguageContext";
import "./FilterPanel.css";

export interface FilterState {
      propertyType: string;
      region: string;
      priceFrom: string;
      priceTo: string;
      currency: string;
  sortBy: string;
      rooms: string;
      hasRoommates: string;
      rentalPeriod: string;
      conditionState: string;
      energyClass: string;
      internet: string;
      utilities: string;
      petsAllowed: string;
      smokingAllowed: string;
      moveInDate: string;
      amenities: string[];
      infrastructure: string[];
    }

export interface PriceHistogramBucket {
  from: number;
  to: number;
  count: number;
}

export interface PriceHistogram {
  min: number;
  max: number;
  total: number;
  max_count: number;
  buckets: PriceHistogramBucket[];
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  priceHistogram?: PriceHistogram | null;
}
export default function FilterPanel({ filters, onChange, priceHistogram }: FilterPanelProps) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const parsePriceNumber = (rawValue: string) => {
      if (!rawValue) {
        return null;
      }
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const histogramMin = Number.isFinite(priceHistogram?.min) ? Number(priceHistogram?.min) : 0;
    const histogramMax = Number.isFinite(priceHistogram?.max) ? Number(priceHistogram?.max) : 0;
    const currentFrom = parsePriceNumber(filters.priceFrom);
    const currentTo = parsePriceNumber(filters.priceTo);

    const sliderMinBase = Math.min(histogramMin, currentFrom ?? histogramMin);
    const sliderMin = Math.floor(Math.max(0, sliderMinBase));

    const sliderMaxCandidate = Math.max(histogramMax, currentTo ?? histogramMax, sliderMin + 1000);
    const sliderMax = Math.ceil(sliderMaxCandidate);
    const sliderSpan = Math.max(1, sliderMax - sliderMin);

    const normalizedFrom = Math.max(sliderMin, Math.min(currentFrom ?? sliderMin, sliderMax));
    const normalizedTo = Math.max(normalizedFrom, Math.min(currentTo ?? sliderMax, sliderMax));

    const selectedFromPercent = ((normalizedFrom - sliderMin) / sliderSpan) * 100;
    const selectedToPercent = ((normalizedTo - sliderMin) / sliderSpan) * 100;
    const histogramBars = Array.isArray(priceHistogram?.buckets) ? priceHistogram!.buckets : [];
    const histogramMaxCount = Math.max(1, Number(priceHistogram?.max_count || 0));
    const listingsInSelectedRange = histogramBars.reduce((sum, bucket) => {
      const intersectsSelectedRange = bucket.to >= normalizedFrom && bucket.from <= normalizedTo;
      return intersectsSelectedRange ? sum + Number(bucket.count || 0) : sum;
    }, 0);

    const formatPriceValue = (value: number | null, fallback = "") => {
      if (value === null) {
        return fallback;
      }
      return String(Math.round(value));
    };

    const applyPriceRange = (nextFrom: number | null, nextTo: number | null) => {
      let safeFrom = nextFrom;
      let safeTo = nextTo;

      if (safeFrom !== null) {
        safeFrom = Math.max(sliderMin, Math.min(Math.round(safeFrom), sliderMax));
      }
      if (safeTo !== null) {
        safeTo = Math.max(sliderMin, Math.min(Math.round(safeTo), sliderMax));
      }
      if (safeFrom !== null && safeTo !== null && safeFrom > safeTo) {
        safeTo = safeFrom;
      }

      onChange({
        ...filters,
        priceFrom: formatPriceValue(safeFrom),
        priceTo: formatPriceValue(safeTo),
      });
    };
    
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
        "BYT": t("filter.propertyTypeApartment"),
        "DUM": t("filter.propertyTypeHouse"),
        "NEIGHBOUR": t("filter.propertyTypeNeighbour"),
        "APARTMENT": t("filter.propertyTypeApartment"),
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

    const translateSortBy = (value: string) => {
      const map: Record<string, string> = {
        "price_asc": t("filter.sortPriceAsc"),
        "price_desc": t("filter.sortPriceDesc"),
        "date_desc": t("filter.sortDateDesc"),
        "date_asc": t("filter.sortDateAsc"),
      };
      return map[value] || value;
    };

    const translateInfrastructure = (key: string) => {
        const map: Record<string, string> = {
            "has_bus_stop": t("filter.infraBusStop"),
            "has_train_station": t("filter.infraTrainStation"),
            "has_metro": t("filter.infraMetro"),
            "has_post_office": t("filter.infraPostOffice"),
            "has_atm": t("filter.infraAtm"),
            "has_general_practitioner": t("filter.infraDoctor"),
            "has_vet": t("filter.infraVet"),
            "has_primary_school": t("filter.infraSchool"),
            "has_kindergarten": t("filter.infraKindergarten"),
            "has_supermarket": t("filter.infraSupermarket"),
            "has_small_shop": t("filter.infraShop"),
            "has_restaurant": t("filter.infraRestaurant"),
            "has_playground": t("filter.infraPlayground"),
        };
        return map[key] || key;
    };

    const clearSingleFilter = (key: keyof FilterState, optionKey?: string) => {
      if (key === "priceFrom" || key === "priceTo") {
        onChange({
          ...filters,
          priceFrom: "",
          priceTo: "",
        });
        return;
      }

      if (key === "amenities") {
        onChange({
          ...filters,
          amenities: optionKey ? filters.amenities.filter(item => item !== optionKey) : [],
        });
        return;
      }

      if (key === "infrastructure") {
        onChange({
          ...filters,
          infrastructure: optionKey ? filters.infrastructure.filter(item => item !== optionKey) : [],
        });
        return;
      }

      if (key === "sortBy") {
        onChange({
          ...filters,
          sortBy: "price_asc",
        });
        return;
      }

      onChange({
        ...filters,
        [key]: "",
      });
    };

    const RoomsCategories = [
      filters.propertyType && {
        id: `propertyType-${filters.propertyType}`,
        title: t("filter.propertyType"),
        subTitle: translatePropertyType(filters.propertyType),
        onRemove: () => clearSingleFilter("propertyType"),
      },

      filters.region && {
        id: `region-${filters.region}`,
        title: t("filter.region"),
        subTitle: translateRegion(filters.region),
        onRemove: () => clearSingleFilter("region"),
      },

      (filters.priceFrom || filters.priceTo) && {
        id: "price-range",
        title: t("filter.price"),
        subTitle: `${filters.priceFrom || "0"} – ${filters.priceTo || "∞"} ${filters.currency || "CZK"}`,
        onRemove: () => clearSingleFilter("priceFrom"),
      },

      filters.sortBy && filters.sortBy !== "price_asc" && {
        id: `sortBy-${filters.sortBy}`,
        title: t("filter.secondarySort"),
        subTitle: translateSortBy(filters.sortBy),
        onRemove: () => clearSingleFilter("sortBy"),
      },

      filters.rooms && {
        id: `rooms-${filters.rooms}`,
        title: t("filter.rooms"),
        subTitle: filters.rooms,
        onRemove: () => clearSingleFilter("rooms"),
      },

      filters.conditionState && {
        id: `condition-${filters.conditionState}`,
        title: t("filter.conditionState"),
        subTitle: filters.conditionState,
        onRemove: () => clearSingleFilter("conditionState"),
      },

      filters.energyClass && {
        id: `energy-${filters.energyClass}`,
        title: t("filter.energyClass"),
        subTitle: filters.energyClass,
        onRemove: () => clearSingleFilter("energyClass"),
      },

      filters.hasRoommates && {
        id: `roommates-${filters.hasRoommates}`,
        title: t("filter.hasRoommates"),
        subTitle: translateYesNo(filters.hasRoommates, "filter.hasRoommatesYes", "filter.hasRoommatesNo"),
        onRemove: () => clearSingleFilter("hasRoommates"),
      },

      filters.rentalPeriod && {
        id: `rental-${filters.rentalPeriod}`,
        title: t("filter.rentalPeriod"),
        subTitle: translateRentalPeriod(filters.rentalPeriod),
        onRemove: () => clearSingleFilter("rentalPeriod"),
      },

      filters.internet && {
        id: `internet-${filters.internet}`,
        title: t("filter.internet"),
        subTitle: translateYesNo(filters.internet, "filter.internetYes", "filter.internetNo"),
        onRemove: () => clearSingleFilter("internet"),
      },

      filters.utilities && {
        id: `utilities-${filters.utilities}`,
        title: t("filter.utilities"),
        subTitle: translateUtilities(filters.utilities),
        onRemove: () => clearSingleFilter("utilities"),
      },

      filters.petsAllowed && {
        id: `pets-${filters.petsAllowed}`,
        title: t("filter.petsAllowed"),
        subTitle: translateYesNo(filters.petsAllowed, "filter.petsAllowedYes", "filter.petsAllowedNo"),
        onRemove: () => clearSingleFilter("petsAllowed"),
      },

      filters.smokingAllowed && {
        id: `smoking-${filters.smokingAllowed}`,
        title: t("filter.smokingAllowed"),
        subTitle: translateYesNo(filters.smokingAllowed, "filter.smokingAllowedYes", "filter.smokingAllowedNo"),
        onRemove: () => clearSingleFilter("smokingAllowed"),
      },

      filters.moveInDate && {
        id: `moveInDate-${filters.moveInDate}`,
        title: t("filter.moveInDate"),
        subTitle: filters.moveInDate,
        onRemove: () => clearSingleFilter("moveInDate"),
      },
      ...filters.amenities.map((amenity) => ({
        id: `amenity-${amenity}`,
        title: t("filter.amenities"),
        subTitle: translateAmenity(amenity),
        onRemove: () => clearSingleFilter("amenities", amenity),
      })),

      ...filters.infrastructure.map((infra) => ({
        id: `infra-${infra}`,
        title: t("filter.infrastructure"),
        subTitle: translateInfrastructure(infra),
        onRemove: () => clearSingleFilter("infrastructure", infra),
      })),
    ].filter(Boolean) as { id: string; title: string; subTitle: string; onRemove: () => void }[];

    const propertyTypes = [
      {value: "ROOM", label: t("filter.propertyTypeRoom")},
      {value: "DUM", label: t("filter.propertyTypeHouse")},
      {value: "BYT", label: t("filter.propertyTypeApartment")},
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

    const conditionOptions = [
        {value: "NEW", label: t("filter.conditionNew")},
        {value: "EXCELLENT", label: t("filter.conditionExcellent")},
        {value: "VERY_GOOD", label: t("filter.conditionVeryGood")},
        {value: "GOOD", label: t("filter.conditionGood")},
        {value: "SATISFACTORY", label: t("filter.conditionSatisfactory")},
        {value: "NEEDS_RENOVATION", label: t("filter.conditionNeedsRenovation")},
        {value: "UNDER_RECONSTRUCTION", label: t("filter.conditionUnderReconstruction")},
        {value: "PROJECT", label: t("filter.conditionProject")},
    ];

    const energyClassOptions = [
        {value: "A", label: "A"},
        {value: "B", label: "B"},
        {value: "C", label: "C"},
        {value: "D", label: "D"},
        {value: "E", label: "E"},
        {value: "F", label: "F"},
        {value: "G", label: "G"},
    ];

    const currencyOptions = [
        {value: "CZK", label: "CZK"},
        {value: "EUR", label: "EUR"},
        {value: "USD", label: "USD"},
    ];

    const sortByOptions = [
      {value: "price_asc", label: t("filter.sortPriceAsc")},
      {value: "price_desc", label: t("filter.sortPriceDesc")},
      {value: "date_desc", label: t("filter.sortDateDesc")},
      {value: "date_asc", label: t("filter.sortDateAsc")},
    ];

    const infrastructureOptions = [
        {key: "has_bus_stop", label: t("filter.infraBusStop")},
        {key: "has_train_station", label: t("filter.infraTrainStation")},
        {key: "has_metro", label: t("filter.infraMetro")},
        {key: "has_post_office", label: t("filter.infraPostOffice")},
        {key: "has_atm", label: t("filter.infraAtm")},
        {key: "has_general_practitioner", label: t("filter.infraDoctor")},
        {key: "has_vet", label: t("filter.infraVet")},
        {key: "has_primary_school", label: t("filter.infraSchool")},
        {key: "has_kindergarten", label: t("filter.infraKindergarten")},
        {key: "has_supermarket", label: t("filter.infraSupermarket")},
        {key: "has_small_shop", label: t("filter.infraShop")},
        {key: "has_restaurant", label: t("filter.infraRestaurant")},
        {key: "has_playground", label: t("filter.infraPlayground")},
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

    const toggleInfrastructure = (infra: string) => {
      const newInfrastructure = filters.infrastructure.includes(infra)
        ? filters.infrastructure.filter(i => i !== infra)
        : [...filters.infrastructure, infra];

      onChange({
        ...filters,
        infrastructure: newInfrastructure,
      });
    };

    const handleReset = () => {
      onChange({
        propertyType: "",
        region: "",
        priceFrom: "",
        priceTo: "",
        currency: "CZK",
        sortBy: "price_asc",
        rooms: "",
        hasRoommates: "",
        rentalPeriod: "",
        conditionState: "",
        energyClass: "",
        internet: "",
        utilities: "",
        petsAllowed: "",
        smokingAllowed: "",
        moveInDate: "",
        amenities: [],
        infrastructure: [],
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
                        <button
                          key={value.id}
                          type="button"
                          onClick={value.onRemove}
                          className={`h-full flex-shrink-0 flex items-center justify-center gap-3 px-6 text-left cursor-pointer
                            hover:bg-[#F7F7F7] dark:hover:bg-gray-700/70 duration-200
                            ${index + 1 === RoomsCategories.length ? "" : "border-r border-[#E5E5E5] dark:border-gray-700"}`}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-[14px] text-black dark:text-white whitespace-nowrap">
                              {value.title}
                            </span>
                            <span className="font-semibold text-[11px] text-[#666666] dark:text-gray-400 whitespace-nowrap">
                              {value.subTitle}
                            </span>
                          </div>
                          <X size={12} className="text-[#8C8C8C] dark:text-gray-400" />
                        </button>
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
                    <button
                      key={value.id}
                      type="button"
                      onClick={value.onRemove}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left
                        hover:bg-[#F7F7F7] dark:hover:bg-gray-700/70 duration-200
                        ${index + 1 === RoomsCategories.length ? "" : "border-b border-[#E5E5E5] dark:border-gray-700"}`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm text-black dark:text-white">
                          {value.title}
                        </span>
                        <span className="font-semibold text-xs text-[#666666] dark:text-gray-400">
                          {value.subTitle}
                        </span>
                      </div>
                      <X size={12} className="text-[#8C8C8C] dark:text-gray-400 flex-shrink-0" />
                    </button>
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

                                    {/* Цена */}
                                    <div className={`flex flex-col gap-3 md:col-span-2`}>
                                      <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.price")}</label>

                                      <div className={`w-full rounded-2xl border border-[#E0E0E0] dark:border-gray-600 bg-[#F8FAFB] dark:bg-gray-900/60 px-4 py-4`}>
                                        <div className={`h-24 w-full flex items-end gap-[3px]`}> 
                                          {histogramBars.length > 0 ? (
                                            histogramBars.map((bucket, index) => {
                                              const heightPercent = Math.max(6, Math.round((bucket.count / histogramMaxCount) * 100));
                                              const isSelected = bucket.to >= normalizedFrom && bucket.from <= normalizedTo;

                                              return (
                                                <div
                                                  key={`bucket-${index}`}
                                                  className={`flex-1 rounded-t-md transition-all duration-300 ${isSelected ? "bg-[#2E97A0]" : "bg-[#D4DAE0] dark:bg-gray-700"}`}
                                                  style={{ height: `${heightPercent}%` }}
                                                  title={`${Math.round(bucket.from)} - ${Math.round(bucket.to)}: ${bucket.count}`}
                                                />
                                              );
                                            })
                                          ) : (
                                            <div className={`w-full h-full rounded-xl border border-dashed border-[#D4DAE0] dark:border-gray-700`} />
                                          )}
                                        </div>

                                        <div className={`mt-4 relative h-9`}>
                                          <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[6px] rounded-full bg-[#D4DAE0] dark:bg-gray-700`}>
                                            <div
                                              className={`absolute h-full rounded-full bg-[#2E97A0]`}
                                              style={{
                                                left: `${selectedFromPercent}%`,
                                                width: `${Math.max(2, selectedToPercent - selectedFromPercent)}%`,
                                              }}
                                            />
                                          </div>

                                          <input
                                            type="range"
                                            min={sliderMin}
                                            max={sliderMax}
                                            value={normalizedFrom}
                                            onChange={(e) => applyPriceRange(Number(e.target.value), normalizedTo)}
                                            className={`price-range-input z-20`}
                                          />
                                          <input
                                            type="range"
                                            min={sliderMin}
                                            max={sliderMax}
                                            value={normalizedTo}
                                            onChange={(e) => applyPriceRange(normalizedFrom, Number(e.target.value))}
                                            className={`price-range-input z-30`}
                                          />
                                        </div>

                                        <div className={`mt-2 flex justify-end`}>
                                          <div className={`px-3 py-1.5 rounded-full bg-[#2E97A0]/10 dark:bg-[#2E97A0]/20 border border-[#2E97A0]/25`}>
                                            <span className={`text-xs font-semibold text-[#1F6A70] dark:text-[#84d6dd]`}>
                                              {t("filter.foundInRange")}: {listingsInSelectedRange}
                                            </span>
                                          </div>
                                        </div>

                                        <div className={`mt-3 grid grid-cols-2 gap-3`}>
                                          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800`}>
                                            <span className={`text-sm font-semibold text-[#5F6A76] dark:text-gray-300`}>{t("filter.priceFrom")}</span>
                                            <input
                                              type="number"
                                              value={filters.priceFrom}
                                              onChange={(e) => applyPriceRange(parsePriceNumber(e.target.value), currentTo)}
                                              placeholder={t("filter.pricePlaceholder")}
                                              className={`w-full bg-transparent outline-0 text-black dark:text-white font-semibold`}
                                            />
                                          </div>
                                          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800`}>
                                            <span className={`text-sm font-semibold text-[#5F6A76] dark:text-gray-300`}>{t("filter.priceTo")}</span>
                                            <input
                                              type="number"
                                              value={filters.priceTo}
                                              onChange={(e) => applyPriceRange(currentFrom, parsePriceNumber(e.target.value))}
                                              placeholder={t("filter.pricePlaceholder")}
                                              className={`w-full bg-transparent outline-0 text-black dark:text-white font-semibold`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Валюта */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.currency")}</label>
                                        <select
                                            value={filters.currency || "CZK"}
                                            onChange={(e) => handleFilterChange("currency", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            {currencyOptions.map((curr) => (
                                                <option key={curr.value} value={curr.value}>{curr.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                        {/* Сортировка 2-3 уровня */}
                                        <div className={`flex flex-col gap-2`}>
                                          <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.secondarySort")}</label>
                                          <select
                                            value={filters.sortBy || "price_asc"}
                                            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                  focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                  focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                  outline-0 duration-300 transition-all bg-white text-black
                                                  hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                          >
                                            {sortByOptions.map((option) => (
                                              <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
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

                                    {/* Состояние */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.conditionState")}</label>
                                        <select
                                            value={filters.conditionState}
                                            onChange={(e) => handleFilterChange("conditionState", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            {conditionOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Энергетический класс */}
                                    <div className={`flex flex-col gap-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.energyClass")}</label>
                                        <select
                                            value={filters.energyClass}
                                            onChange={(e) => handleFilterChange("energyClass", e.target.value)}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                                        focus:border-[#999999] dark:focus:border-[#C505EB] 
                                                        focus:ring-2 focus:ring-[#C505EB]/20 dark:focus:ring-[#C505EB]/30
                                                        outline-0 duration-300 transition-all bg-white text-black
                                                        hover:border-[#C505EB]/50 dark:hover:border-[#C505EB]/50`}
                                        >
                                            <option value="">-</option>
                                            {energyClassOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
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

                                    {/* Инфраструктура */}
                                    <div className={`flex flex-col gap-2 md:col-span-2`}>
                                        <label className={`text-sm font-semibold text-black dark:text-white`}>{t("filter.infrastructure")}</label>
                                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-3`}>
                                            {infrastructureOptions.map((infra) => {
                                                const isChecked = filters.infrastructure.includes(infra.key);
                                                return (
                                                    <label 
                                                        key={infra.key} 
                                                        className={`flex items-center gap-3 p-3 rounded-xl border border-[#E0E0E0] dark:border-gray-600  overflow-hidden
                                                                 hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                                                 ${isChecked ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleInfrastructure(infra.key)}
                                                            className={`w-5 h-5 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                                                       cursor-pointer accent-[#C505EB]`}
                                                        />
                                                        <span className={`text-sm font-medium text-black dark:text-white`}>{infra.label}</span>
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
