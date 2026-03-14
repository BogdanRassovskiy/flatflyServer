import {Icon} from "@iconify/react";
import {useEffect, useState} from "react";

import {useLanguage} from "../../contexts/LanguageContext";
import {Link} from "react-router-dom";
import { getCsrfToken } from "../../utils/csrf";
import { getImageUrl } from "../../utils/defaultImage";

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
    name?: string;
    age?: number;
    // Инициализация состояния избранного с бэкенда
    is_favorite?: boolean;
    // Доп. поля для NEIGHBOUR
    from?: string;
    badges?: string[];
    ratingAverage?: number;
    ratingCount?: number;
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
    type,
    name,
    age,
    from,
    badges = [],
    ratingAverage,
    ratingCount,
    is_favorite,
    is_active = true,
    linkState,
    matchPercentage,
    onRemoveFavorite
}: SaleCardProps) {
    const { t } = useLanguage();
    const [isLike, setLike] = useState(!!is_favorite);
    const [isProcessing, setProcessing] = useState(false);
    const [isVisited, setIsVisited] = useState(false);
    const VISITED_LISTINGS_STORAGE_KEY = "visitedListings";
    const normalizedType = (type === "BYT" || type === "DUM") ? "APARTMENT" : type;
    const parsedPrice = Number(price);
    const formattedPrice = Number.isFinite(parsedPrice)
        ? parsedPrice.toLocaleString("cs-CZ")
        : String(price || "");
    const currencyLabel = String(currency || "CZK").toUpperCase();
    const normalizedMatchPercentage = Number.isFinite(matchPercentage)
        ? Math.max(0, Math.min(100, Math.round(Number(matchPercentage))))
        : null;

    const translateAmenity = (key: string) => {
        const normalized = String(key || "").trim().toLowerCase();
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
        };
        return map[normalized] || key;
    };

    const getStarIcon = (value: number, starIndex: number) => {
        if (value >= starIndex) return "mdi:star";
        if (value >= starIndex - 0.5) return "mdi:star-half-full";
        return "mdi:star-outline";
    };

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
        
        if (!id) return;

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
    const listingTextClass = isVisited ? "text-gray-500 dark:text-gray-400" : "text-black dark:text-gray-200";
    const listingPriceClass = isVisited ? "text-gray-500 dark:text-gray-400" : "text-[#666666] dark:text-gray-300";
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

    const SaleCardTypeHandler = ()=>{
        switch (normalizedType) {
            case "ROOM":
                return(
                    <div className={`w-full h-full flex flex-col items-start py-1.5 px-3 gap-1`}>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="mdi:home-outline" className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[18px] max-[1220px]:text-[12px] font-bold ${listingTextClass} truncate`}>{listingMainTitle}</span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="ph:hand-coins-light" style={{color: `#666666`}} className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`} />
                            <span className={`text-[16px] max-[1220px]:text-[10px] font-semibold ${listingPriceClass}`}>
                                {formattedPrice} {currencyLabel}
                            </span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="qlementine-icons:location-16" className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[16px] max-[1220px]:text-[10px] font-semibold ${listingTextClass}`}>{listingLocation}</span>
                        </div>
                    </div>
                );
            case "NEIGHBOUR":
                return (
                    <div className={`w-full h-full flex flex-col items-start py-1.5 px-8 gap-1`}>
                        <div className={`w-full flex items-center justify-between text-[22px] font-semibold max-[1220px]:text-[18px]`}>
                            <div className={`flex items-center gap-1 text-black dark:text-white`}>
                                <span>{name},</span>
                                <span>{age}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[#333333] dark:text-gray-300`}>
                                <Icon icon="qlementine-icons:location-16" className={`w-[20px] h-[20px] -translate-y-0.5 max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                                <span>{from}</span>
                            </div>
                        </div>
                        <div className={`flex items-center gap-1 text-[#666666] dark:text-gray-300`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Icon
                                    key={`card-rating-${id}-${star}`}
                                    icon={getStarIcon(Number(ratingAverage || 0), star)}
                                    className={`w-[14px] h-[14px]`}
                                    style={{ color: "#F59E0B" }}
                                />
                            ))}
                            <span className={`text-[12px] font-semibold`}>
                                {(Number(ratingAverage || 0)).toFixed(1)} ({Number(ratingCount || 0)})
                            </span>
                        </div>
                        <div className={`w-full flex flex-wrap items-center justify-center content-center gap-4 mt-2`}>
                            {badges.map((value, index)=>
                                <div key={index} className={`p-1 max-[1220px]:p-0.5 rounded border border-[#666666] dark:border-gray-500 text-[10px] max-[1220px]:text-[6px] text-[#08E2BE] dark:text-[#08E2BE] font-bold`}>
                                    {value}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case "APARTMENT":
                return(
                    <div className={`w-full h-full flex flex-col items-start py-1.5 px-3 gap-1`}>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="mdi:home-outline" className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[18px] max-[1220px]:text-[12px] font-bold ${listingTextClass} truncate`}>{listingMainTitle}</span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="ph:hand-coins-light" style={{color: `#666666`}} className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`} />
                            <span className={`text-[16px] max-[1220px]:text-[10px] font-semibold ${listingPriceClass}`}>
                                {formattedPrice} {currencyLabel}
                            </span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="qlementine-icons:location-16" className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[16px] max-[1220px]:text-[10px] font-semibold ${listingTextClass}`}>{listingLocation}</span>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const CardContent = (
        <div className={`flex flex-col items-center max-[1220px]:w-[254px] max-[1220px]:h-[290px] w-[384px] h-[420px] rounded-xl shadow-md dark:shadow-gray-900/50 border interFont overflow-hidden relative ${
            is_active
                ? "bg-white dark:bg-gray-800 border-[#E5E5E5] dark:border-gray-700"
                : "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500"
        } ${listingUrl ? 'cursor-pointer hover:shadow-xl dark:hover:shadow-gray-900/70 hover:scale-[1.02] duration-300' : ''}`}>
            {!is_active && (
                <div className={`absolute top-3 left-3 z-20 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-semibold`}>
                    {t("listing.deactivated")}
                </div>
            )}
            <div className={`w-full h-[282px] max-[1220px]:h-[182px] flex-shrink-0 flex flex-col items-start overflow-hidden relative`}>
                <img className={`w-full h-full object-cover absolute top-0 left-0 ${!is_active ? 'grayscale' : ''}`} src={getImageUrl(image)} alt={address}/>
                <div className={`w-full flex flex-col items-start p-3 absolute top-0 left-0`}>
                    <div className={`w-full flex items-start justify-between`}>
                        {(normalizedType==="ROOM" || normalizedType==="APARTMENT" || normalizedType==="NEIGHBOUR")?
                            <div className={`flex flex-col items-start gap-3 max-[1220px]:gap-1 `}>
                                {normalizedMatchPercentage !== null && (
                                    <div className={`p-1 max-[1220px]:p-0.5 rounded bg-black/70 text-white text-[10px] max-[1220px]:text-[6px] font-bold`}>
                                        Match {normalizedMatchPercentage}%
                                    </div>
                                )}
                                {amenities.map((value, index)=>
                                    <div key={index} className={`p-1 max-[1220px]:p-0.5 rounded bg-[#08E2BE] border border-[#06B396] text-black text-[10px] max-[1220px]:text-[6px] font-bold`}>
                                        {translateAmenity(value)}
                                    </div>
                                )}
                            </div>
                            : <div></div> }
                        <div 
                            className={`cursor-pointer z-10 ${isProcessing ? 'pointer-events-none opacity-70' : ''}`} 
                            onClick={toggleFavorite}
                        >
                            <Icon
                                icon={isLike ? "mdi:heart" : "mdi:heart-outline"}
                                width="24"
                                height="24"
                                style={{color: isLike ? `#C505EB` : `#ffffff`, transitionDuration: `0.3s`}}
                            />
                        </div>
                    </div>
                </div>

            </div>
            <SaleCardTypeHandler/>
        </div>
    );

    if (listingUrl) {
        return (
            <Link to={listingUrl} state={linkState} onClick={markListingVisited}>
                {CardContent}
            </Link>
        );
    }

    return CardContent;

}