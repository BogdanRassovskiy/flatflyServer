import NeighboursFilterPanel from "../../components/FilterPanel/NeighboursFilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { regionValueToLabel } from "../../utils/regions";
import { getImageUrl } from "../../utils/defaultImage";

interface Neighbour {
  id: number;
  avatar?: string | null;
  name: string;
  age?: number;
  gender?: string;

  city?: string;
  smoking?: string;
  alcohol?: string;
  pets?: string;
  sleep_schedule?: string;
  gamer?: string;
  work_from_home?: string;

  verified: boolean;
  looking_for_housing: boolean;
  is_favorite?: boolean;
}
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
export default function NeighboursPage() {
  const { t } = useLanguage();

  const [pagination, setPagination] = useState(1);
  const [neighbours, setNeighbours] = useState<Neighbour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<NeighbourFilterState>({
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

  useEffect(() => {
    loadNeighbours();
  }, [pagination, search, filters]);

  const loadNeighbours = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", String(pagination));

      if (search) {
        params.append("search", search);
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v));
        } else if (value !== "" && value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const url = `/api/neighbours/list?${params.toString()}`;
      console.log("REQUEST:", url);

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = await res.json();
      setNeighbours(data.results || data);
      setTotalPages(data.total_pages || 1);
    } catch (e) {
      console.error("Neighbours loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center interFont">
      <div className="w-full max-w-[1440px] px-5 flex flex-col items-center">
        <div className="w-full flex flex-col items-start my-[150px]">

          {/* Поиск */}
          <div className="w-full max-w-[450px] flex items-center h-12 relative mb-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 rounded-full border pl-8 pr-12"
              placeholder={t("Search people")}
            />
            <div className="absolute right-4">
              <Search size={30} color="#C505EB" />
            </div>
          </div>

          <NeighboursFilterPanel
            filters={filters}
            onChange={setFilters}
          />

          {loading ? (
            <div className="text-xl mt-10">Loading...</div>
          ) : neighbours.length === 0 ? (
            <div className="text-xl mt-10 opacity-60">
              {t("No neighbours found")}
            </div>
          ) : (
            <div className="w-full grid grid-cols-3 gap-6 mt-[50px]">
              {neighbours.map((n) => {
                const badges: string[] = [];

                const addBadge = (value?: string | boolean, label?: string) => {
                  if (value === null || value === undefined || value === "") return;
                  if (typeof value === "boolean") {
                    if (value) badges.push(label || "");
                  } else {
                    badges.push(label ? `${label}: ${value}` : value);
                  }
                };

                addBadge(n.verified, "Verified");
                addBadge(n.looking_for_housing, "Looking for housing");
                addBadge(n.gender, "Gender");
                addBadge(n.smoking, "Smoking");
                addBadge(n.alcohol, "Alcohol");
                addBadge(n.pets, "Pets");
                addBadge(n.sleep_schedule, "Sleep");
                addBadge(n.gamer, "Gamer");
                addBadge(n.work_from_home, "Work from home");

                return (
                  <SaleCard
                    key={n.id}
                    id={String(n.id)}
                    name={n.name}
                    age={n.age}
                    from={regionValueToLabel(n.city)}
                    image={getImageUrl(n.avatar)}
                    badges={badges}
                    type="NEIGHBOUR"
                    is_favorite={n.is_favorite}
                  />
                );
              })}
            </div>
          )}

          {/* Пагинация */}
          <div className="w-full flex flex-col items-center justify-center gap-1 mt-10">
            <div className="flex items-center justify-center gap-1 text-[#333333] dark:text-gray-300">
              {Array.from({ length: totalPages }).map((_, index) => (
                <div
                  key={index}
                  onClick={() => setPagination(index + 1)}
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
                onClick={() => setPagination(pagination + 1)}
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