import FilterPanel from "../../components/FilterPanel/FilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getImageUrl } from "../../utils/defaultImage";
import type { FilterState } from "../../components/FilterPanel/FilterPanel";
import type { PriceHistogram } from "../../components/FilterPanel/FilterPanel";

interface Listing {
  id: number;
  type: "APARTMENT" | "ROOM" | "NEIGHBOUR";
  title?: string;
  price: number | string;
  currency?: string;
  utilitiesFee?: number | string;

  region?: string;
  city?: string;
  address?: string;
  size?: string;
  rooms?: string;
  beds?: number;

  hasRoommates?: boolean;
  rentalPeriod?: string;

  internet?: boolean;
  utilities?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;

  amenities?: string[];
  moveInDate?: string | null;

  image?: string | null;
  is_favorite?: boolean;
  matchPercentage?: number;
}

export default function RoomsPage() {
  const { t } = useLanguage();

  const STORAGE_KEY = "listingsState:ROOM";
  const defaultFilters: FilterState = {
    propertyType: "",
    region: "",
    priceFrom: "",
    priceTo: "",
    currency: "CZK",
    preferredGender: "",
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
  };

  const readSavedState = () => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return {
        pagination: typeof parsed?.pagination === "number" && parsed.pagination > 0 ? parsed.pagination : 1,
        search: typeof parsed?.search === "string" ? parsed.search : "",
        filters: {
          ...defaultFilters,
          ...(parsed?.filters || {}),
          amenities: Array.isArray(parsed?.filters?.amenities) ? parsed.filters.amenities : [],
          infrastructure: Array.isArray(parsed?.filters?.infrastructure) ? parsed.filters.infrastructure : [],
        } as FilterState,
      };
    } catch {
      return null;
    }
  };

  const savedState = readSavedState();

  const [pagination, setPagination] = useState(savedState?.pagination || 1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [priceHistogram, setPriceHistogram] = useState<PriceHistogram | null>(null);

  const [filters, setFilters] = useState<FilterState>(savedState?.filters || defaultFilters);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === pagination) {
      return;
    }
    setPagination(nextPage);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFiltersChange = (nextFilters: FilterState) => {
    setFilters(nextFilters);
    setPagination(1);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pagination,
        filters,
      })
    );
  }, [pagination, filters]);

  useEffect(() => {
    loadListings();
  }, [pagination, filters]);

  useEffect(() => {
    if (filters.preferredGender) {
      return;
    }

    let cancelled = false;
    const loadPreferredGenderFromProfile = async () => {
      try {
        const response = await fetch("/api/profile/", { credentials: "include" });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const profileGender = String(data?.gender || "").toLowerCase();
        if (!cancelled && (profileGender === "male" || profileGender === "female")) {
          setFilters((prev) => (prev.preferredGender ? prev : { ...prev, preferredGender: profileGender }));
        }
      } catch {
        // no-op: leave default when profile is unavailable
      }
    };

    loadPreferredGenderFromProfile();
    return () => {
      cancelled = true;
    };
  }, [filters.preferredGender]);

  const loadListings = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      // обязательные
      params.append("page", String(pagination));
      params.append("type", "ROOM");

      // остальные фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // для amenities[]
          value.forEach(v => {
            params.append(`${key}[]`, v);
          });
        } else if (value !== "" && value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const url = `/api/listings/list?${params.toString()}`;
      console.log("REQUEST:", url);

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to load listings: ${res.status}`);
      }

      const data = await res.json();
      setListings(data.results || data);
      setTotalCount(Number(data.total_count || 0));
      setPriceHistogram(data.price_histogram || null);

    } catch (e) {
      console.error("Listings loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-transparent">
      <div className="w-full max-w-[1440px] px-5 flex flex-col items-center">
        <div className="w-full flex flex-col items-start my-[150px]">

          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            priceHistogram={priceHistogram}
          />

          <div className="w-full mt-3 text-sm font-semibold text-[#666666] dark:text-gray-300">
            {t("filter.foundListingsCount")}: {totalCount}
          </div>

          {/* Карточки */}
          {loading ? (
            <div className="text-xl mt-10">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="text-xl mt-10 opacity-60">
              {t("No listings found")}
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-[50px]">
              {listings.map((listing) => (
                <SaleCard
                  key={listing.id}
                  id={String(listing.id)}
                  title={listing.title}
                  price={Number(listing.price)}
                  currency={listing.currency}
                  utilitiesFee={listing.utilitiesFee}
                  region={listing.region}
                  city={listing.city}
                  address={listing.address || ""}
                  size={listing.size ? Number(listing.size) : undefined}
                  rooms={listing.rooms || ""}
                  badges={[]}
                  image={getImageUrl(listing.image)}
                  type={listing.type as "APARTMENT" | "ROOM" | "NEIGHBOUR"}
                  is_favorite={listing.is_favorite}
                  matchPercentage={listing.matchPercentage}
                />
              ))}
            </div>
          )}

          {/* Пагинация */}
          <div className="w-full flex flex-col items-center justify-center gap-1 mt-10">
            <div className="flex items-center justify-center gap-1 text-[#333333] dark:text-gray-300">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  onClick={() => handlePageChange(index + 1)}
                  className={`flex items-center justify-center duration-300 cursor-pointer text-lg font-semibold w-8 h-8 rounded-full ${
                    index + 1 === pagination
                      ? "bg-[#C505EB] text-white"
                      : "hover:bg-[#C505EB]/10"
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            <div
              onClick={() => handlePageChange(pagination + 1)}
              className="flex items-center gap-1 text-black dark:text-white cursor-pointer"
            >
              <span className="text-lg font-semibold">Další</span>
              <ChevronRight strokeWidth={1.7} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}