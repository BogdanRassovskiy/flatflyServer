import NeighboursFilterPanel from "../../components/FilterPanel/NeighboursFilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
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
  with_children?: boolean;
  with_disability?: boolean;
  pensioner?: boolean;

  verified: boolean;
  looking_for_housing: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  matchPercentage?: number;
  is_favorite?: boolean;
}
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
export default function NeighboursPage() {
  const { t } = useLanguage();

  const [pagination, setPagination] = useState(1);
  const [neighbours, setNeighbours] = useState<Neighbour[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  const defaultFilters: NeighbourFilterState = {
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
  };

  const [filters, setFilters] = useState<NeighbourFilterState>(() => {
    try {
      const savedFilters = localStorage.getItem("neighbourFilters");
      if (!savedFilters) {
        return defaultFilters;
      }
      const parsed = JSON.parse(savedFilters);
      return {
        ...defaultFilters,
        ...parsed,
        ratingMin: parsed?.ratingMin === "" || parsed?.ratingMin === undefined ? "0" : String(parsed.ratingMin),
      };
    } catch {
      return defaultFilters;
    }
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("neighbourFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    loadNeighbours();
  }, [pagination, filters]);

  const loadNeighbours = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", String(pagination));

      Object.entries(filters).forEach(([key, value]) => {
        if (key === "universityName") {
          return;
        }
        if (typeof value === "boolean") {
          if (value) {
            params.append(key, "true");
          }
          return;
        }
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

                // Функция для получения локализованного значения badge
                const getBadgeValue = (fieldName: string, value?: string | boolean): string | null => {
                  if (value === null || value === undefined || value === "") return null;
                  
                  if (typeof value === "boolean") {
                    return value ? t(`badges.${fieldName}`) : null;
                  }
                  
                  // Нормализуем значение
                  const normalizedValue = String(value).toLowerCase().replace(/\s+/g, "");
                  
                  // Если значение "no", не показываем плашку
                  if (normalizedValue === "no") return null;
                  
                  // Если значение "yes", показываем название характеристики
                  if (normalizedValue === "yes") {
                    return t(`badges.${fieldName}`);
                  }
                  
                  // Для остальных значений показываем локализованное значение
                  return t(`badges.${normalizedValue}`) || String(value);
                };

                // Собираем badges с учетом приоритета
                const potentialBadges: (string | null)[] = [
                  getBadgeValue("verified", n.verified),
                  getBadgeValue("lookingForHousing", n.looking_for_housing),
                  getBadgeValue(n.gender || "", n.gender),
                  getBadgeValue("smoking", n.smoking),
                  getBadgeValue("alcohol", n.alcohol),
                  getBadgeValue("pets", n.pets),
                  getBadgeValue("sleepSchedule", n.sleep_schedule),
                  getBadgeValue("gamer", n.gamer),
                  getBadgeValue("workFromHome", n.work_from_home),
                  getBadgeValue("withChildren", n.with_children),
                  getBadgeValue("withDisability", n.with_disability),
                  getBadgeValue("pensioner", n.pensioner),
                ];

                // Фильтруем null и ограничиваем до 6
                potentialBadges
                  .filter((b): b is string => b !== null)
                  .slice(0, 6)
                  .forEach(b => badges.push(b));

                return (
                  <SaleCard
                    key={n.id}
                    id={String(n.id)}
                    name={n.name}
                    age={n.age}
                    from={regionValueToLabel(n.city)}
                    image={getImageUrl(n.avatar)}
                    badges={badges}
                    ratingAverage={n.ratingAverage}
                    ratingCount={n.ratingCount}
                    matchPercentage={n.matchPercentage}
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