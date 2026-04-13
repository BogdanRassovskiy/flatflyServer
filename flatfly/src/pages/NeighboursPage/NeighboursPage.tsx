import NeighboursFilterPanel from "../../components/FilterPanel/NeighboursFilterPanel";
import SaleCard from "../../components/SaleCard/SaleCard";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { regionValueToLabel } from "../../utils/regions";
import { getImageUrl } from "../../utils/defaultImage";
import NeighbourMobileListRow, {
  type NeighbourTraitCell,
} from "./NeighbourMobileListRow";

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

function getNeighbourBadgeLabel(
  fieldName: string,
  value: string | boolean | undefined,
  t: (key: string) => string,
): string | null {
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
}

type NeighbourBadgeIcon =
  | "gamepad"
  | "moon"
  | "gender"
  | "alcohol"
  | "smoking"
  | "pets"
  | "work"
  | "children"
  | "accessibility"
  | "pensioner";

type NeighbourBadge = {
  label: string;
  icon?: NeighbourBadgeIcon;
};

function buildNeighbourBadges(n: Neighbour, t: (key: string) => string): NeighbourBadge[] {
  const rows: Array<{ label: string | null; icon?: NeighbourBadgeIcon }> = [
    { label: getNeighbourBadgeLabel(n.gender || "", n.gender, t), icon: "gender" },
    { label: getNeighbourBadgeLabel("smoking", n.smoking, t), icon: "smoking" },
    { label: getNeighbourBadgeLabel("alcohol", n.alcohol, t), icon: "alcohol" },
    { label: getNeighbourBadgeLabel("pets", n.pets, t), icon: "pets" },
    { label: getNeighbourBadgeLabel("sleepSchedule", n.sleep_schedule, t), icon: "moon" },
    { label: getNeighbourBadgeLabel("gamer", n.gamer, t), icon: "gamepad" },
    { label: getNeighbourBadgeLabel("workFromHome", n.work_from_home, t), icon: "work" },
    { label: getNeighbourBadgeLabel("withChildren", n.with_children, t), icon: "children" },
    { label: getNeighbourBadgeLabel("withDisability", n.with_disability, t), icon: "accessibility" },
    { label: getNeighbourBadgeLabel("pensioner", n.pensioner, t), icon: "pensioner" },
  ];

  return rows
    .filter((r): r is { label: string; icon?: NeighbourBadgeIcon } => r.label !== null)
    .slice(0, 6)
    .map((r) => ({ label: r.label, icon: r.icon }));
}

/** Характеристики для мобильных карточек (иконка + подпись), тот же порядок/фильтр, что и бейджи на ПК */
function buildNeighbourMobileTraits(n: Neighbour, t: (key: string) => string): NeighbourTraitCell[] {
  const cells: { icon: string; label: string | null }[] = [
    { icon: "mdi:check-decagram", label: getNeighbourBadgeLabel("verified", n.verified, t) },
    { icon: "mdi:home-search-outline", label: getNeighbourBadgeLabel("lookingForHousing", n.looking_for_housing, t) },
    { icon: "mdi:gender-male-female", label: getNeighbourBadgeLabel(n.gender || "", n.gender, t) },
    { icon: "mdi:smoking", label: getNeighbourBadgeLabel("smoking", n.smoking, t) },
    { icon: "mdi:glass-wine", label: getNeighbourBadgeLabel("alcohol", n.alcohol, t) },
    { icon: "mdi:paw", label: getNeighbourBadgeLabel("pets", n.pets, t) },
    { icon: "mdi:weather-night", label: getNeighbourBadgeLabel("sleepSchedule", n.sleep_schedule, t) },
    { icon: "mdi:gamepad-variant", label: getNeighbourBadgeLabel("gamer", n.gamer, t) },
    { icon: "mdi:laptop-macbook", label: getNeighbourBadgeLabel("workFromHome", n.work_from_home, t) },
    { icon: "mdi:human-child", label: getNeighbourBadgeLabel("withChildren", n.with_children, t) },
    { icon: "mdi:wheelchair-accessibility", label: getNeighbourBadgeLabel("withDisability", n.with_disability, t) },
    { icon: "mdi:account-clock", label: getNeighbourBadgeLabel("pensioner", n.pensioner, t) },
  ];
  return cells
    .filter((c): c is NeighbourTraitCell => Boolean(c.label))
    .slice(0, 6);
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
      <div className="flex w-full max-w-[1440px] flex-col items-center px-3 min-[771px]:px-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex w-full max-[770px]:mb-10 max-[770px]:mt-[calc(50px+10px)] min-[771px]:my-[120px] flex-col items-start">

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
              <div className="mx-auto mt-3 flex w-full max-w-lg min-[771px]:hidden flex-col gap-3 px-0.5">
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
                    traits={buildNeighbourMobileTraits(n, t)}
                  />
                ))}
              </div>

              <div className="hidden min-[771px]:mt-6 min-[771px]:grid w-full min-[771px]:mx-auto min-[771px]:max-w-[1120px] min-[771px]:grid-cols-4 justify-items-stretch gap-4 lg:gap-5">
                {neighbours.map((n) => {
                  const badges = buildNeighbourBadges(n, t);
                  return (
                    <SaleCard
                      key={n.id}
                      compactGrid
                      id={String(n.id)}
                      name={n.name}
                      age={n.age}
                      from={regionValueToLabel(n.city)}
                      image={getImageUrl(n.avatar)}
                      badges={badges}
                      verified={n.verified}
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