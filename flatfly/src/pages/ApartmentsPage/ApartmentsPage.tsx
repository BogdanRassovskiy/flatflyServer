import FilterPanel from "../../components/FilterPanel/FilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getImageUrl } from "../../utils/defaultImage";
import { rankListings } from "../../utils/listingRanking";
import type { FilterState } from "../../components/FilterPanel/FilterPanel";
import type { PriceHistogram } from "../../components/FilterPanel/FilterPanel";

interface Listing {
  id: number;
  type: "APARTMENT" | "ROOM" | "NEIGHBOUR";
  title?: string;
  price: number | string;
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

export default function ApartmentsPage() {
  const { t } = useLanguage();

  const STORAGE_KEY = "listingsState:LISTINGS";
  const defaultFilters: FilterState = {
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
  const [totalPages, setTotalPages] = useState(1);
  const [priceHistogram, setPriceHistogram] = useState<PriceHistogram | null>(null);

  const [search, setSearch] = useState(savedState?.search || "");
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPagination(1);
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
        search,
        filters,
      })
    );
  }, [STORAGE_KEY, pagination, search, filters]);

  useEffect(() => {
    loadListings();
  }, [pagination, search, filters]);

  const loadListings = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      
      
      // обязательные
      params.append("page", String(pagination));
      // поиск
      if (search) {
        params.append("search", search);
      }

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
      setListings(rankListings(data.results || data));
      setTotalPages(data.total_pages || 1);
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

          {/* Поиск */}
          <div className="w-full max-w-[450px] flex items-center h-12 relative mb-6">
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-12 rounded-full border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] pl-8 pr-12 duration-300 focus:shadow-md outline-0"
              placeholder={t("header.searchPlaceholder")}
            />
            <div className="absolute right-4">
              <Search size={30} color="#C505EB" />
            </div>
          </div>

          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            priceHistogram={priceHistogram}
          />

          {/* Карточки */}
          {loading ? (
            <div className="text-xl mt-10">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="text-xl mt-10 opacity-60">
              {t("No listings found")}
            </div>
          ) : (
            <div className="w-full grid grid-cols-3 max-[870px]:grid-cols-2 max-[580px]:grid-cols-1 gap-6 mt-[50px]">
              {listings.map((listing) => (
                <SaleCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={Number(listing.price)}
                  utilitiesFee={listing.utilitiesFee}
                  region={listing.region}
                  city={listing.city}
                  address={listing.address || ""}
                  size={listing.size ? Number(listing.size) : undefined}
                  rooms={listing.rooms || ""}
                  amenities={listing.amenities || []}
                  image={getImageUrl(listing.image)}
                  type={listing.type as any}
                  is_favorite={listing.is_favorite}
                  matchPercentage={listing.matchPercentage}
                />
              ))}
            </div>
          )}

          {/* Пагинация */}
          <div className="w-full flex flex-col items-center justify-center gap-1 mt-10">
            <div className="flex items-center justify-center gap-1 text-[#333333] dark:text-gray-300">
              {Array.from({ length: totalPages }).map((_, index) => (
                <div
                  key={index}
                  onClick={() => handlePageChange(index + 1)}
                  className={`flex items-center justify-center duration-300 cursor-pointer 
                              text-lg font-semibold w-8 h-8 rounded-full ${
                    index + 1 === pagination
                      ? "bg-[#C505EB] text-white"
                      : "hover:bg-[#C505EB]/10"
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>

            {pagination < totalPages && (
              <div
                onClick={() => handlePageChange(pagination + 1)}
                className="flex items-center gap-1 cursor-pointer text-black dark:text-white"
              >
                <span className="text-lg font-semibold">Další</span>
                <ChevronRight strokeWidth={1.7} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}