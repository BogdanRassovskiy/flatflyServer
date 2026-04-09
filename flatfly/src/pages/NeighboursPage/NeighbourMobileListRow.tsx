import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getCsrfToken } from "../../utils/csrf";
import { getImageUrl } from "../../utils/defaultImage";

export type NeighbourTraitCell = { icon: string; label: string };

export type NeighbourMobileListRowProps = {
  id: number;
  name: string;
  avatar?: string | null;
  fromLabel: string;
  age?: number;
  matchPercentage?: number;
  ratingAverage?: number;
  ratingCount?: number;
  initialFavorite: boolean;
  traits: NeighbourTraitCell[];
};

export default function NeighbourMobileListRow({
  id,
  name,
  avatar,
  fromLabel,
  age,
  matchPercentage,
  ratingAverage,
  ratingCount,
  initialFavorite,
  traits,
}: NeighbourMobileListRowProps) {
  const { t } = useLanguage();
  const [isLike, setLike] = useState(!!initialFavorite);
  const [isProcessing, setProcessing] = useState(false);

  useEffect(() => {
    setLike(!!initialFavorite);
  }, [initialFavorite]);

  const match =
    matchPercentage != null && Number.isFinite(Number(matchPercentage))
      ? Math.max(0, Math.min(100, Math.round(Number(matchPercentage))))
      : null;

  const toggleFavorite = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;

    const next = !isLike;
    setLike(next);
    setProcessing(true);

    try {
      const endpoint = next ? "/api/favorites/add/" : "/api/favorites/remove/";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ profile_id: id }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.is_favorite === "boolean") {
        setLike(data.is_favorite);
      } else if (!response.ok) {
        setLike(!next);
      }
    } catch {
      setLike(!next);
    } finally {
      setProcessing(false);
    }
  };

  const profilePath = `/neighbours/${id}`;
  const subtitleParts: string[] = [];
  if (fromLabel.trim()) subtitleParts.push(fromLabel.trim());
  if (match != null) subtitleParts.push(`${match}% ${t("neighbours.matchHint")}`);
  if (match == null && (ratingCount ?? 0) > 0 && ratingAverage != null) {
    subtitleParts.push(
      `${Number(ratingAverage).toFixed(1)} ★ · ${Number(ratingCount)}`
    );
  }
  const subtitle = subtitleParts.join(" · ");

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-zinc-200/95 bg-white p-3 shadow-md ring-1 ring-black/[0.04] dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/[0.06]"
    >
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={isProcessing}
        aria-label={isLike ? t("listing.removeFromFavorites") : t("listing.addToFavorites")}
        aria-pressed={isLike}
        className={`absolute right-2 top-2 z-10 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-[#C505EB] shadow-sm backdrop-blur-sm transition-colors duration-200 hover:bg-[#C505EB]/10 active:scale-[0.96] disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800/95 dark:hover:bg-[#C505EB]/20`}
      >
        <Icon
          icon={isLike ? "mdi:heart" : "mdi:heart-outline"}
          width={22}
          height={22}
          style={{ color: "#C505EB" }}
          aria-hidden
        />
      </button>

      <div className="flex gap-3 pr-11">
        <Link
          to={profilePath}
          className="shrink-0 touch-manipulation self-start active:opacity-90"
          aria-label={`${t("neighbours.openProfile")}: ${name}`}
        >
          <img
            src={getImageUrl(avatar)}
            alt=""
            className="h-[4.25rem] w-[4.25rem] rounded-full object-cover ring-2 ring-zinc-200/80 dark:ring-zinc-600"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
              <span>{name}</span>
              {age != null ? (
                <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                  {age}
                </span>
              ) : null}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {match != null ? (
                <div className="flex shrink-0 -space-x-1.5 pr-0.5" aria-hidden>
                  <span className="inline-block h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[#C505EB] to-[#08D3E2] ring-2 ring-white dark:ring-gray-900" />
                  <span className="inline-block h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[#06A8B8] to-[#9E04C2] opacity-90 ring-2 ring-white dark:ring-gray-900" />
                  <span className="inline-block h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[#BA00F8] to-[#08E2BE] opacity-80 ring-2 ring-white dark:ring-gray-900" />
                </div>
              ) : null}
              {subtitle ? (
                <p className="min-w-0 text-[13px] leading-snug text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {traits.length > 0 ? (
            <ul className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1.5" role="list">
              {traits.map((trait, index) => (
                <li
                  key={`${trait.icon}-${index}`}
                  className="flex min-w-0 items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/95 px-2 py-1 dark:border-zinc-600/80 dark:bg-zinc-800/60"
                >
                  <Icon
                    icon={trait.icon}
                    className="h-3.5 w-3.5 shrink-0 text-[#06B396] dark:text-[#08E2BE]"
                    aria-hidden
                  />
                  <span className="min-w-0 text-[11px] font-medium leading-tight text-zinc-700 line-clamp-2 dark:text-zinc-200">
                    {trait.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
