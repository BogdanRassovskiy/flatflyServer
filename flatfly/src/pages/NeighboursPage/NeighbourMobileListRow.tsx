import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { getCsrfToken } from "../../utils/csrf";
import { getImageUrl } from "../../utils/defaultImage";

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
    <article className="flex gap-3 border-b border-gray-100 py-4 last:border-0 dark:border-zinc-800/90">
      <Link
        to={profilePath}
        className="shrink-0 touch-manipulation self-start active:opacity-90"
        aria-label={name}
      >
        <img
          src={getImageUrl(avatar)}
          alt=""
          className="h-[4.25rem] w-[4.25rem] rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <Link
            to={profilePath}
            className="block text-[15px] font-semibold leading-snug text-gray-900 dark:text-white"
          >
            <span>{name}</span>
            {age != null ? (
              <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                {age}
              </span>
            ) : null}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {match != null ? (
              <div className="flex shrink-0 -space-x-1.5 pr-0.5" aria-hidden>
                <span className="inline-block h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[#C505EB] to-[#08D3E2] ring-2 ring-white dark:ring-gray-900" />
                <span className="inline-block h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[#06A8B8] to-[#9E04C2] ring-2 ring-white opacity-90 dark:ring-gray-900" />
                <span className="inline-block h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[#BA00F8] to-[#08E2BE] ring-2 ring-white opacity-80 dark:ring-gray-900" />
              </div>
            ) : null}
            {subtitle ? (
              <p className="min-w-0 text-[13px] leading-snug text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={profilePath}
            className="flex min-w-0 flex-[1.4] touch-manipulation items-center justify-center rounded-lg bg-gradient-to-r from-[#C505EB] to-[#BA00F8] px-2 py-2.5 text-center text-[13px] font-semibold leading-tight text-white shadow-sm active:opacity-90"
          >
            {t("neighbours.openProfile")}
          </Link>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={isProcessing}
            className="flex min-w-0 flex-1 touch-manipulation items-center justify-center rounded-lg bg-gray-100 px-2 py-2.5 text-center text-[13px] font-semibold leading-tight text-gray-800 shadow-sm active:bg-gray-200 disabled:opacity-60 dark:bg-zinc-800 dark:text-gray-100 dark:active:bg-zinc-700"
          >
            {isLike ? t("neighbours.removeShort") : t("neighbours.saveShort")}
          </button>
        </div>
      </div>
    </article>
  );
}
