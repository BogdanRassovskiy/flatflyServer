import FilterPanel from "../../components/FilterPanel/FilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getImageUrl } from "../../utils/defaultImage";

interface Listing {
  id: number;
  type: "APARTMENT" | "ROOM" | "NEIGHBOUR";
  title?: string;
  price: number | string;

  region?: string;
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
}

export default function RoomsPage() {
  const { t } = useLanguage();

  const [pagination, setPagination] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // минимальный фильтр, дальше расширишь
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
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
    amenities: [] as string[],
  });

  useEffect(() => {
    loadListings();
  }, [pagination, search, filters]);

  const loadListings = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      // обязательные
      params.append("page", String(pagination));
      params.append("type", "ROOM");

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
      setListings(data.results || data);

    } catch (e) {
      console.error("Listings loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900">
      <div className="w-full max-w-[1440px] px-5 flex flex-col items-center">
        <div className="w-full flex flex-col items-start my-[150px]">

          {/* Поиск */}
          <div className="w-full max-w-[450px] flex items-center h-12 relative mb-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 rounded-full border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] pl-8 pr-12 duration-300 focus:shadow-md outline-0"
              placeholder={t("header.searchPlaceholder")}
            />
            <div className="absolute right-4">
              <Search size={30} color="#C505EB" />
            </div>
          </div>

          <FilterPanel
            filters={filters}
            onChange={setFilters}
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
                  id={String(listing.id)}
                  price={Number(listing.price)}
                  address={listing.address || ""}
                  size={listing.size ? Number(listing.size) : undefined}
                  rooms={listing.rooms || ""}
                  badges={[]}
                  image={getImageUrl(listing.image)}
                  type={listing.type as "APARTMENT" | "ROOM" | "NEIGHBOUR"}
                  is_favorite={listing.is_favorite}
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
                  onClick={() => setPagination(index + 1)}
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
            <div className="flex items-center gap-1 text-black dark:text-white">
              <span className="text-lg font-semibold">Další</span>
              <ChevronRight strokeWidth={1.7} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}