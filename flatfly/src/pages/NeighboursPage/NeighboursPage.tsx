import NeighboursFilterPanel from "../../components/FilterPanel/NeighboursFilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { regionValueToLabel } from "../../utils/regions";
import { getImageUrl } from "../../utils/defaultImage";
import NeighbourMobileListRow from "./NeighbourMobileListRow";

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

function buildNeighbourBadges(n: Neighbour, t: (key: string) => string): string[] {
  const getBadgeValue = (fieldName: string, value?: string | boolean): string | null => {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "boolean") {
      return value ? t(`badges.${fieldName}`) : null;
    }

    const normalizedValue = String(value).toLowerCase().replace(/\s+/g, "");
    if (normalizedValue === "no") return null;
    if (normalizedValue === "yes") {
      return t(`badges.${fieldName}`);
    }
    return t(`badges.${normalizedValue}`) || String(value);
  };

  const potentialBadges: (string | null)[] = [
    getBadgeValue("verified", n.verified),
    getBadgeValue(n.gender || "", n.gender),
    getBadgeValue("smoking", n.smoking),
    getBadgeValue("alcohol", n.alcohol),
    getBadgeValue("pets", n.pets),
    getBadgeValue("sleepSchedule", n.sleep_schedule),
    getBadgeValue("gamer", n.gamer),
    getBadgeValue("workFromHome", n.work_from_home),
    getBadgeValue("withChildren", n.with_children),
    getBadgeValue("withDisability", n.with_disability),
  ];

  return potentialBadges.filter((b): b is string => b !== null).slice(0, 6);
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
        gender: "",
        ratingMin: parsed?.ratingMin === "" || parsed?.ratingMin === undefined ? "0" : String(parsed.ratingMin),
      };
    } catch {
      return defaultFilters;
    }
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    // Don't persist gender: should be empty by default on page open.
    const { gender: _gender, ...persistable } = filters;
    localStorage.setItem("neighbourFilters", JSON.stringify(persistable));
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

  const handlePageChange = (nextPage: number) => {
    if (nextPage === pagination) return;
    setPagination(nextPage);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center interFont">
      <div className="w-full max-w-[1440px] px-6 sm:px-8 lg:px-12 xl:px-16 flex flex-col items-center">
        <div className="flex w-full max-[770px]:mt-[calc(100px+10px)] max-[770px]:mb-10 min-[771px]:my-[120px] flex-col items-start">

          <NeighboursFilterPanel
            filters={filters}
            onChange={setFilters}
          />

          {loading ? (
            <div className="mt-5 text-xl max-[770px]:mt-4 min-[771px]:mt-10">{t("neighboursPage.loading")}</div>
          ) : neighbours.length === 0 ? (
            <div className="mt-5 text-xl opacity-60 max-[770px]:mt-4 min-[771px]:mt-10">
              {t("neighboursPage.noResults")}
            </div>
          ) : (
            <>
              {/* Мобильный список: строки как в соцсетях — удобнее скроллить */}
              <div className="mx-auto mt-3 flex w-full max-w-lg min-[771px]:hidden flex-col rounded-2xl border border-gray-100 bg-white px-3 py-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                {neighbours.map((n) => (
                  <NeighbourMobileListRow
                    key={n.id}
                    id={n.id}
                    name={n.name}
                    avatar={n.avatar}
                    fromLabel={regionValueToLabel(n.city)}
                    age={n.age}
                    matchPercentage={n.matchPercentage}
                    ratingAverage={n.ratingAverage}
                    ratingCount={n.ratingCount}
                    initialFavorite={!!n.is_favorite}
                  />
                ))}
              </div>

              <div className="hidden min-[771px]:mt-6 min-[771px]:grid w-full justify-center justify-items-center gap-4 lg:gap-5 [grid-template-columns:repeat(auto-fill,220px)] lg:[grid-template-columns:repeat(auto-fill,228px)] xl:[grid-template-columns:repeat(auto-fill,236px)]">
                {neighbours.map((n) => {
                  const badges = buildNeighbourBadges(n, t);
                  return (
                    <SaleCard
                      key={n.id}
                      compactGrid
                      denseNeighbourDesktop
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
            </>
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