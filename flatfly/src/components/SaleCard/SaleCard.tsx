import {Icon} from "@iconify/react";
import { Baby, Briefcase, CheckCircle2, ChevronLeft, ChevronRight, Cigarette, Clock, Gamepad2, Moon, PawPrint, PersonStanding, VenusAndMars, Wine } from "lucide-react";
import {useEffect, useMemo, useRef, useState} from "react";
import type SwiperCore from "swiper";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";

import {useLanguage} from "../../contexts/LanguageContext";
import {Link} from "react-router-dom";
import { getCsrfToken } from "../../utils/csrf";
import { getImageUrl } from "../../utils/defaultImage";

import "./SaleCard.css";

export type SaleCardTypes = {
    id?: string | number;
    type: "APARTMENT" | "ROOM" | "NEIGHBOUR" | "BYT" | "DUM";
    price?: number | string;
    currency?: string;
    utilitiesFee?: number | string;
    city?: string;
    address?: string;
    size?: string | number;
    rooms?: string;
    amenities?: string[];
    image?: string;
    /** До 4 превью URL; при 4 слайдах последний показывается размытым с призывом открыть объявление */
    images?: string[];
    name?: string;
    age?: number;
    // Инициализация состояния избранного с бэкенда
    is_favorite?: boolean;
    // Доп. поля для NEIGHBOUR
    from?: string;
    badges?: Array<
        string |
        {
            label: string;
            icon?:
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
        }
    >;
    ratingAverage?: number;
    ratingCount?: number;
    verified?: boolean;
    // Возможные старые поля (сохраняем в типе, но не используем)
    region?: string;
    title?: string;
    description?: string;
    is_active?: boolean;
    linkState?: unknown;
    matchPercentage?: number;
};

interface SaleCardProps extends SaleCardTypes {
    onRemoveFavorite?: (id: string | number) => void;
    /** Компактная сетка списков: фиксированные размеры по ширине окна */
    compactGrid?: boolean;
    /** Более плотные пропорции карточек соседей (десктоп-сетка 5 в ряд) */
    denseNeighbourDesktop?: boolean;
}

export default function SaleCard({
    id,
    title,
    price,
    currency,
    city,
    region,
    address,
    amenities = [],
    image,
    images,
    type,
    name,
    age,
    from,
    badges = [],
    ratingAverage,
    ratingCount,
    verified = false,
    is_favorite,
    is_active = true,
    linkState,
    matchPercentage,
    onRemoveFavorite,
    compactGrid = false,
    denseNeighbourDesktop = false,
}: SaleCardProps) {
    const { t } = useLanguage();
    const cg = compactGrid;
    const [isLike, setLike] = useState(!!is_favorite);
    const [isProcessing, setProcessing] = useState(false);
    const [isVisited, setIsVisited] = useState(false);
    const [showFavoriteSuccess, setShowFavoriteSuccess] = useState(false);
    const favoriteSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saleSwiperRef = useRef<SwiperCore | null>(null);
    const [swiperAtStart, setSwiperAtStart] = useState(true);
    const [swiperAtEnd, setSwiperAtEnd] = useState(false);
    const VISITED_LISTINGS_STORAGE_KEY = "visitedListings";
    const normalizedType = (type === "BYT" || type === "DUM") ? "APARTMENT" : type;

    const listingGalleryUrls = useMemo(() => {
        if (normalizedType === "NEIGHBOUR") return [] as string[];
        const seen = new Set<string>();
        const out: string[] = [];
        const pushUnique = (raw: string | null | undefined) => {
            const u = getImageUrl(raw);
            if (seen.has(u)) return;
            seen.add(u);
            out.push(u);
        };
        if (images && images.length > 0) {
            for (const u of images) {
                pushUnique(u);
                if (out.length >= 4) break;
            }
            return out;
        }
        pushUnique(image);
        return out;
    }, [normalizedType, images, image]);

    const showListingSwiper =
        (normalizedType === "APARTMENT" || normalizedType === "ROOM") && listingGalleryUrls.length > 1;
    const fourthSlideTeaser = listingGalleryUrls.length >= 4;
    const listingHeroSrc =
        listingGalleryUrls[0] ?? getImageUrl(image);
    const parsedPrice = Number(price);
    const formattedPrice = Number.isFinite(parsedPrice)
        ? parsedPrice.toLocaleString("cs-CZ")
        : String(price || "");
    const currencyLabel = String(currency || "CZK").toUpperCase();
    const normalizedMatchPercentage = Number.isFinite(matchPercentage)
        ? Math.max(0, Math.min(100, Math.round(Number(matchPercentage))))
        : null;

    /** Единый ключ удобства (под варианты с бэкенда) */
    const canonicalAmenityKey = (raw: string) => {
        let k = String(raw || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");
        const aliases: Record<string, string> = {
            washingmachine: "washing_machine",
            airconditioning: "air_conditioning",
        };
        return aliases[k] || k;
    };

    const translateAmenity = (key: string) => {
        const c = canonicalAmenityKey(key);
        const map: Record<string, string> = {
            washing_machine: t("filter.amenityWashingMachine"),
            dishwasher: t("filter.amenityDishwasher"),
            microwave: t("filter.amenityMicrowave"),
            oven: t("filter.amenityOven"),
            refrigerator: t("filter.amenityRefrigerator"),
            tv: t("filter.amenityTV"),
            air_conditioning: t("filter.amenityAirConditioning"),
            heating: t("filter.amenityHeating"),
            balcony: t("filter.amenityBalcony"),
            parking: t("filter.amenityParking"),
            furnished: t("filter.amenityFurnished"),
            internet: t("filter.internet"),
        };
        return map[c] || key;
    };

    /** Иконки внизу карточки — не дублируем на фото */
    const AMENITY_ICON_ROW_ORDER = ["dishwasher", "balcony", "parking", "furnished"] as const;
    type AmenityIconKey = (typeof AMENITY_ICON_ROW_ORDER)[number];
    const AMENITY_ICON_ROW_SET = new Set<string>(AMENITY_ICON_ROW_ORDER);

    const AMENITY_ICON_META: Record<AmenityIconKey, { icon: string }> = {
        dishwasher: { icon: "mdi:dishwasher" },
        balcony: { icon: "mdi:balcony" },
        parking: { icon: "mdi:car" },
        furnished: { icon: "mdi:sofa-outline" },
    };

    /** Слишком «базовые» для бейджей на фото */
    const COMMON_AMENITY_HIDE_FROM_OVERLAY = new Set([
        "refrigerator",
        "internet",
        "washing_machine",
    ]);

    const amenityCanonicalSet = new Set(amenities.map((a) => canonicalAmenityKey(a)));

    const overlayAmenityRawList = (() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const raw of amenities) {
            const c = canonicalAmenityKey(raw);
            if (AMENITY_ICON_ROW_SET.has(c)) continue;
            if (COMMON_AMENITY_HIDE_FROM_OVERLAY.has(c)) continue;
            if (seen.has(c)) continue;
            seen.add(c);
            out.push(raw);
        }
        return out;
    })();

    const bottomIconAmenityKeys = AMENITY_ICON_ROW_ORDER.filter((k) => amenityCanonicalSet.has(k));

    // Поддерживать актуальность при изменении пропса
    useEffect(() => {
        setLike(!!is_favorite);
    }, [is_favorite]);

    useEffect(() => {
        const isListing = normalizedType === "APARTMENT" || normalizedType === "ROOM";
        if (!isListing || !id) {
            setIsVisited(false);
            return;
        }

        try {
            const raw = window.localStorage.getItem(VISITED_LISTINGS_STORAGE_KEY);
            const parsed: Array<string | number> = raw ? JSON.parse(raw) : [];
            const visited = Array.isArray(parsed) && parsed.some((entry) => String(entry) === String(id));
            setIsVisited(visited);
        } catch {
            setIsVisited(false);
        }
    }, [id, normalizedType]);

    useEffect(() => {
        return () => {
            if (favoriteSuccessTimerRef.current) {
                clearTimeout(favoriteSuccessTimerRef.current);
            }
        };
    }, []);

    const flashFavoriteAddedSuccess = () => {
        if (favoriteSuccessTimerRef.current) {
            clearTimeout(favoriteSuccessTimerRef.current);
        }
        setShowFavoriteSuccess(true);
        favoriteSuccessTimerRef.current = setTimeout(() => {
            setShowFavoriteSuccess(false);
            favoriteSuccessTimerRef.current = null;
        }, 2800);
    };

    // Обработать profile_id для соседей (если нужно отправить как сосед)
    const favoritePayload = () => {
        const payload: any = {};
        if (type === "NEIGHBOUR") {
            payload.profile_id = id;
        } else {
            payload.listing_id = id;
        }
        return payload;
    };

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isProcessing) return;
        
        const newState = !isLike;
        setLike(newState);
        setProcessing(true);

        if (!id) {
            setProcessing(false);
            setLike(!newState);
            return;
        }

        try {
            const endpoint = newState ? "/api/favorites/add/" : "/api/favorites/remove/";
            const payload = favoritePayload();
            
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                if (typeof data.is_favorite === "boolean") {
                    setLike(data.is_favorite);
                }
                const added =
                    newState === true &&
                    (typeof data.is_favorite !== "boolean" || data.is_favorite === true);
                if (added) {
                    flashFavoriteAddedSuccess();
                }
                if (newState === false && onRemoveFavorite) {
                    onRemoveFavorite(id);
                }
            } else {
                setLike(!newState); // Revert on error
            }
        } catch (err) {
            console.error("Error toggling favorite:", err);
            setLike(!newState); // Revert on error
        } finally {
            setProcessing(false);
        }
    };
    const getListingUrl = () => {
        if (!id) return null;
        switch (normalizedType) {
            case "APARTMENT":
                return `/apartments/${id}`;
            case "ROOM":
                return `/rooms/${id}`;
            case "NEIGHBOUR":
                return `/neighbours/${id}`;
            default:
                return null;
        }
    };

    const listingUrl = getListingUrl();
    const listingPriceClass = isVisited
        ? "text-gray-500 dark:text-gray-400"
        : "text-zinc-900 dark:text-zinc-100";
    const isMeaningful = (value?: string) => /[A-Za-zА-Яа-я0-9]/.test(String(value || "").trim());
    const getRegionLabel = (regionCode?: string) => {
        const code = String(regionCode || "").trim().toUpperCase();
        if (!code) return "";
        const translated = t(`listing.regions.${code}`);
        return translated !== `listing.regions.${code}` ? translated : code;
    };
    const listingLocation = [getRegionLabel(region), city, address]
        .map((value) => String(value || "").trim())
        .filter((value, index, array) => value && array.indexOf(value) === index)
        .join(", ");
    const listingMainTitle = isMeaningful(title)
        ? String(title).trim()
        : isMeaningful(address)
            ? String(address).trim()
            : "";
    /** Вторая строка: локация; если совпадает с заголовком — только регион + город */
    const listingAddressLine = (() => {
        const loc = listingLocation.trim();
        const tit = listingMainTitle.trim();
        if (!loc) return "";
        if (loc === tit) {
            const fallback = [getRegionLabel(region), city]
                .map((v) => String(v || "").trim())
                .filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(", ");
            return fallback || loc;
        }
        return loc;
    })();

    const markListingVisited = () => {
        const isListing = normalizedType === "APARTMENT" || normalizedType === "ROOM";
        if (!isListing || !id) return;

        try {
            const raw = window.localStorage.getItem(VISITED_LISTINGS_STORAGE_KEY);
            const parsed: Array<string | number> = raw ? JSON.parse(raw) : [];
            const existing = Array.isArray(parsed) ? parsed : [];
            const next = existing.some((entry) => String(entry) === String(id)) ? existing : [id, ...existing].slice(0, 300);
            window.localStorage.setItem(VISITED_LISTINGS_STORAGE_KEY, JSON.stringify(next));
            setIsVisited(true);
        } catch {
            setIsVisited(true);
        }
    };

    const listingBodyPadding = cg
        ? "py-1.5 px-2.5 sm:py-2 sm:px-3 max-[770px]:py-2 max-[770px]:px-3"
        : "py-3 px-4 max-[1220px]:py-2.5 max-[1220px]:px-3";
    const titleClass = `${
        cg
            ? "text-[14px] leading-tight sm:text-[15px] sm:leading-snug max-[770px]:line-clamp-1 max-[770px]:text-[15px]"
            : "text-lg max-[1220px]:text-base leading-snug"
    } font-semibold tracking-tight line-clamp-2 ${
        isVisited
            ? "text-purple-600/80 dark:text-purple-400/85"
            : "text-[#C505EB] dark:text-[#D946EF]"
    }`;
    const addressClass = `${
        cg
            ? "text-xs sm:text-[13px] max-[770px]:line-clamp-1"
            : "text-sm max-[1220px]:text-[13px]"
    } font-normal leading-relaxed line-clamp-2 ${
        isVisited ? "text-gray-500 dark:text-gray-400" : "text-zinc-600 dark:text-zinc-400"
    }`;
    const priceClass = `${
        cg
            ? "text-sm sm:text-[15px] max-[770px]:text-[15px]"
            : "text-lg max-[1220px]:text-base"
    } font-bold tabular-nums tracking-tight ${listingPriceClass}`;

    const ApartmentOrRoomBody = () => (
        <div
            className={`w-full flex flex-col items-stretch ${listingBodyPadding} ${cg ? "min-h-0 flex-1 gap-0.5 overflow-hidden" : "gap-1.5"}`}
        >
            <h3 className={`${titleClass} shrink-0 ${!listingMainTitle ? "opacity-60" : ""}`}>
                {listingMainTitle || "—"}
            </h3>
            {listingAddressLine ? (
                <p className={`${addressClass} shrink-0`}>{listingAddressLine}</p>
            ) : null}
            <p className={`${priceClass} shrink-0`}>
                {formattedPrice.trim() !== ""
                    ? [formattedPrice, currencyLabel].filter(Boolean).join(" ")
                    : "—"}
            </p>
            {bottomIconAmenityKeys.length > 0 ? (
                <div
                    className={`mt-auto flex flex-wrap items-center border-t border-zinc-200/80 dark:border-zinc-600/80 ${
                        cg
                            ? "gap-1 pt-1.5 max-[770px]:gap-1 max-[770px]:pt-1.5"
                            : "gap-2 pt-2.5 max-[1220px]:gap-1.5 max-[1220px]:pt-2"
                    }`}
                    aria-label={t("listing.amenities")}
                >
                    {bottomIconAmenityKeys.map((key) => {
                        const meta = AMENITY_ICON_META[key];
                        const label = translateAmenity(key);
                        return (
                            <span
                                key={key}
                                title={label}
                                className={`inline-flex items-center justify-center rounded-full bg-zinc-100 text-[#06B396] shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-700/80 dark:text-[#08E2BE] dark:ring-zinc-600/80 ${
                                    cg
                                        ? "h-7 w-7 sm:h-8 sm:w-8"
                                        : "h-9 w-9 max-[1220px]:h-8 max-[1220px]:w-8"
                                }`}
                            >
                                <Icon
                                    icon={meta.icon}
                                    className={
                                        cg
                                            ? "h-3.5 w-3.5 sm:h-4 sm:w-4"
                                            : "h-[18px] w-[18px] max-[1220px]:h-4 max-[1220px]:w-4"
                                    }
                                    aria-hidden
                                />
                                <span className="sr-only">{label}</span>
                            </span>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );

    const SaleCardTypeHandler = () => {
        switch (normalizedType) {
            case "ROOM":
            case "APARTMENT":
                return <ApartmentOrRoomBody />;
            case "NEIGHBOUR":
                const visibleBadges = cg ? badges.slice(0, 4) : badges;
                const renderBadgeIcon = (
                    icon?:
                        | "gamepad"
                        | "moon"
                        | "gender"
                        | "alcohol"
                        | "smoking"
                        | "pets"
                        | "work"
                        | "children"
                        | "accessibility"
                        | "pensioner",
                ) => {
                    if (!icon) return null;
                    const cls = cg ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-3.5 w-3.5";
                    if (icon === "gamepad") return <Gamepad2 className={cls} aria-hidden />;
                    if (icon === "moon") return <Moon className={cls} aria-hidden />;
                    if (icon === "gender") return <VenusAndMars className={cls} aria-hidden />;
                    if (icon === "smoking") return <Cigarette className={cls} aria-hidden />;
                    if (icon === "pets") return <PawPrint className={cls} aria-hidden />;
                    if (icon === "work") return <Briefcase className={cls} aria-hidden />;
                    if (icon === "children") return <Baby className={cls} aria-hidden />;
                    if (icon === "accessibility") return <PersonStanding className={cls} aria-hidden />;
                    if (icon === "pensioner") return <Clock className={cls} aria-hidden />;
                    return <Wine className={cls} aria-hidden />;
                };
                return (
                    <div
                        className={`w-full flex flex-col items-stretch ${listingBodyPadding} ${cg ? "min-h-0 flex-1 gap-0.5 overflow-hidden" : "gap-1.5"}`}
                    >
                        <h3 className={`${titleClass} shrink-0 flex flex-wrap gap-x-1.5 gap-y-0`}>
                            <span>{name}</span>
                            {verified ? (
                                <CheckCircle2 className="mt-[1px] h-4 w-4 text-emerald-500" aria-label={t("badges.verified")} />
                            ) : null}
                            {age != null ? (
                                <span className="font-medium text-zinc-500 dark:text-zinc-400">{age}</span>
                            ) : null}
                        </h3>
                        {from ? <p className={`${addressClass} shrink-0`}>{from}</p> : null}
                        {formattedPrice.trim() !== "" ? (
                            <p className={`${priceClass} shrink-0`}>
                                {[formattedPrice, currencyLabel].filter(Boolean).join(" ")}
                            </p>
                        ) : null}
                        {(ratingAverage != null || ratingCount != null) && (
                            <p className="shrink-0 text-xs font-medium tabular-nums text-amber-700/90 dark:text-amber-400/90">
                                {Number(ratingAverage || 0).toFixed(1)}
                                <span className="text-zinc-500 dark:text-zinc-500 font-normal"> / 5 · </span>
                                {Number(ratingCount || 0)}
                            </p>
                        )}
                        {visibleBadges.length > 0 ? (
                            <div
                                className={`flex flex-wrap items-center gap-1.5 ${cg ? "mt-1" : "mt-1 gap-2"}`}
                            >
                                {visibleBadges.map((value, index) => (
                                    <span
                                        key={index}
                                        className={`inline-flex max-w-full items-center gap-1 overflow-hidden rounded-md border border-zinc-400/60 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[#06B396] dark:border-zinc-500 dark:text-[#08E2BE] ${
                                            cg ? "text-[8px] sm:text-[9px]" : "text-[9px] max-[1220px]:text-[8px]"
                                        }`}
                                    >
                                        {typeof value === "string" ? null : renderBadgeIcon(value.icon)}
                                        <span className="min-w-0 max-w-[120px] truncate">
                                            {typeof value === "string" ? value : value.label}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                );
            default:
                return null;
        }
    };

    const cardShell = cg
        ? normalizedType === "NEIGHBOUR"
            ? denseNeighbourDesktop
                ? "h-[300px] w-[220px] max-w-full shrink-0 sm:h-[312px] sm:w-[220px] lg:h-[324px] lg:w-[228px] xl:h-[336px] xl:w-[236px] rounded-lg shadow-sm"
                : "h-[312px] w-[256px] max-w-full shrink-0 sm:h-[326px] sm:w-[272px] lg:h-[340px] lg:w-[288px] xl:h-[352px] xl:w-[300px] rounded-lg shadow-sm"
            : "h-[283px] w-[256px] max-w-full shrink-0 sm:h-[299px] sm:w-[272px] lg:h-[311px] lg:w-[288px] xl:h-[323px] xl:w-[300px] max-[770px]:h-auto max-[770px]:min-h-0 max-[770px]:w-full max-[770px]:max-w-none rounded-lg shadow-sm"
        : "w-full max-w-[384px] min-h-[380px] max-[1220px]:min-h-[300px] max-[770px]:max-w-none rounded-xl shadow-md";
    const imgFrame = cg
        ? normalizedType === "NEIGHBOUR"
            ? denseNeighbourDesktop
                ? "h-[160px] shrink-0 sm:h-[168px] lg:h-[176px] xl:h-[184px]"
                : "h-[168px] shrink-0 sm:h-[178px] lg:h-[190px] xl:h-[198px]"
            : "h-[128px] shrink-0 sm:h-[138px] lg:h-[148px] xl:h-[156px] max-[770px]:aspect-[4/3] max-[770px]:h-auto max-[770px]:w-full"
        : "h-[240px] max-[1220px]:h-[170px] max-[770px]:aspect-[4/3] max-[770px]:h-auto shrink-0";
    const topOverlayPad = cg ? "p-2 sm:p-2.5" : "p-3";
    const heartBtn = cg
        ? "h-9 w-9 sm:h-10 sm:w-10"
        : "h-12 w-12 max-[1220px]:h-10 max-[1220px]:w-10";
    const heartIconWh = cg ? 20 : 24;
    const heartIconCls = cg ? "sm:w-[22px] sm:h-[22px]" : "max-[1220px]:w-[20px] max-[1220px]:h-[20px]";
    const cardHover = listingUrl
        ? cg
            ? "cursor-pointer hover:shadow-md dark:hover:shadow-gray-900/55 hover:scale-[1.012] duration-300"
            : "cursor-pointer hover:shadow-xl dark:hover:shadow-gray-900/70 hover:scale-[1.02] duration-300"
        : "";

    const CardContent = (
        <div
            className={`${cardShell} flex flex-col items-stretch border interFont overflow-hidden relative dark:shadow-gray-900/50 ${cardHover} ${
            is_active
                ? "bg-white dark:bg-gray-800 border-[#E5E5E5] dark:border-gray-700"
                : "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500"
        }`}
        >
            {!is_active && (
                <div
                    className={`absolute z-20 rounded bg-black/70 font-semibold text-white ${cg ? "left-2 top-2 px-1.5 py-0.5 text-[9px]" : "left-3 top-3 px-2 py-1 text-[10px]"}`}
                >
                    {t("listing.deactivated")}
                </div>
            )}
            <div className={`relative flex w-full flex-col items-start overflow-hidden ${imgFrame}`}>
                {normalizedType === "NEIGHBOUR" ? (
                    <img
                        className="absolute left-0 top-0 h-full w-full object-cover"
                        src={getImageUrl(image)}
                        alt={address}
                    />
                ) : showListingSwiper ? (
                    <>
                        <Swiper
                            modules={[Pagination]}
                            slidesPerView={1}
                            spaceBetween={0}
                            pagination={{ clickable: true, dynamicBullets: true }}
                            preventClicks
                            preventClicksPropagation
                            className="sale-card-swiper absolute inset-0 h-full w-full"
                            aria-label={t("listing.photoGallery")}
                            onSwiper={(instance) => {
                                saleSwiperRef.current = instance;
                                setSwiperAtStart(instance.isBeginning);
                                setSwiperAtEnd(instance.isEnd);
                            }}
                            onSlideChange={(instance) => {
                                setSwiperAtStart(instance.isBeginning);
                                setSwiperAtEnd(instance.isEnd);
                            }}
                        >
                            {listingGalleryUrls.map((src, index) => (
                                <SwiperSlide key={`${String(id)}-${index}`}>
                                    <div className="relative h-full w-full">
                                        {fourthSlideTeaser && index === 3 ? (
                                            <>
                                                <img
                                                    src={src}
                                                    alt=""
                                                    className="absolute left-0 top-0 h-full w-full scale-[1.08] object-cover blur-md"
                                                    aria-hidden
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-2">
                                                    <p className="max-w-[12rem] text-center text-[10px] font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:max-w-[14rem] sm:text-[11px]">
                                                        {t("listing.morePhotosInDetail")}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <img
                                                className="absolute left-0 top-0 h-full w-full object-cover"
                                                src={src}
                                                alt={address}
                                            />
                                        )}
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                        <button
                            type="button"
                            className="sale-card-nav-btn sale-card-nav-btn--prev absolute z-[8] disabled:pointer-events-none"
                            style={{ width: 30, height: 30 }}
                            aria-label={t("listing.previousImage")}
                            disabled={swiperAtStart}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saleSwiperRef.current?.slidePrev();
                            }}
                        >
                            <ChevronLeft aria-hidden className="shrink-0 text-white" width={25} height={25} strokeWidth={2.35} />
                        </button>
                        <button
                            type="button"
                            className="sale-card-nav-btn sale-card-nav-btn--next absolute z-[8] disabled:pointer-events-none"
                            style={{ width: 30, height: 30 }}
                            aria-label={t("listing.nextImage")}
                            disabled={swiperAtEnd}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saleSwiperRef.current?.slideNext();
                            }}
                        >
                            <ChevronRight aria-hidden className="shrink-0 text-white" width={25} height={25} strokeWidth={2.35} />
                        </button>
                    </>
                ) : (
                    <img
                        className="absolute left-0 top-0 h-full w-full object-cover"
                        src={listingHeroSrc}
                        alt={address}
                    />
                )}
                <div
                    className={`pointer-events-none absolute left-0 top-0 z-[12] flex w-full flex-col items-start ${topOverlayPad}`}
                >
                    <div className={`flex w-full items-start justify-between`}>
                        {(normalizedType==="ROOM" || normalizedType==="APARTMENT" || normalizedType==="NEIGHBOUR")?
                            <div className={`flex flex-col items-start gap-2 sm:gap-3 max-[1220px]:gap-1 `}>
                                {normalizedMatchPercentage !== null && (
                                    <div className={`rounded bg-black/70 font-bold text-white ${cg ? "p-0.5 text-[9px] sm:text-[10px]" : "p-1 text-[10px] max-[1220px]:p-0.5 max-[1220px]:text-[6px]"}`}>
                                        Match {normalizedMatchPercentage}%
                                    </div>
                                )}
                                {overlayAmenityRawList.map((value, index) => (
                                    <div
                                        key={`${canonicalAmenityKey(value)}-${index}`}
                                        className={`rounded border border-[#06B396] bg-[#08E2BE] font-bold text-black ${cg ? "p-0.5 text-[9px] sm:text-[10px]" : "p-1 text-[10px] max-[1220px]:p-0.5 max-[1220px]:text-[6px]"}`}
                                    >
                                        {translateAmenity(value)}
                                    </div>
                                ))}
                            </div>
                            : <div></div> }
                        <button
                            type="button"
                            className={`pointer-events-auto z-10 flex ${heartBtn} shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#C505EB] text-white shadow-lg ring-2 ring-white/40 transition-colors duration-300 hover:bg-[#AA04CC] hover:ring-white/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C505EB] dark:ring-white/25 dark:hover:ring-white/40 ${
                                isProcessing ? "pointer-events-none opacity-70" : ""
                            }`}
                            onClick={toggleFavorite}
                            aria-label={isLike ? t("listing.removeFromFavorites") : t("listing.addToFavorites")}
                            aria-pressed={isLike}
                        >
                            <Icon
                                icon={isLike ? "mdi:heart" : "mdi:heart-outline"}
                                width={heartIconWh}
                                height={heartIconWh}
                                className={heartIconCls}
                                style={{ color: "#ffffff", transitionDuration: "0.3s" }}
                            />
                        </button>
                    </div>
                </div>

                {showFavoriteSuccess ? (
                    <div
                        className="pointer-events-none absolute inset-x-2 bottom-2 z-[25] flex justify-center max-[1220px]:inset-x-1.5 max-[1220px]:bottom-1.5"
                        role="status"
                        aria-live="polite"
                    >
                        <div
                            className="flex max-w-[min(100%,260px)] items-center gap-2.5 rounded-2xl border border-emerald-400/45 bg-white/92 px-3 py-2.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-300 dark:border-emerald-500/35 dark:bg-gray-950/92 max-[1220px]:gap-2 max-[1220px]:px-2.5 max-[1220px]:py-2"
                        >
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-[#06B396] text-white shadow-md ring-2 ring-white/50 dark:ring-white/20 max-[1220px]:h-7 max-[1220px]:w-7"
                                aria-hidden
                            >
                                <Icon icon="mdi:check-bold" className="h-[18px] w-[18px] max-[1220px]:h-4 max-[1220px]:w-4" />
                            </span>
                            <p className="text-left text-[13px] font-semibold leading-tight text-gray-900 dark:text-gray-50 max-[1220px]:text-xs">
                                {t("listing.favoriteAddedSuccess")}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
            <SaleCardTypeHandler/>
        </div>
    );

    if (listingUrl) {
        return (
            <Link
                to={listingUrl}
                state={linkState}
                onClick={markListingVisited}
                className={cg ? "contents" : undefined}
            >
                {CardContent}
            </Link>
        );
    }

    return CardContent;

}