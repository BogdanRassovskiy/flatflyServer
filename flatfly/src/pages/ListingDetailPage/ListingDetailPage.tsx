import {useState, useEffect, useMemo, useRef, type ReactNode} from "react";
import {ChevronLeft, ChevronRight, Heart, Share2, MapPin, Bed, Square, MessageCircle, X, Layers, CheckCircle2} from "lucide-react";
import {Icon} from "@iconify/react";
import {useNavigate, useParams, useLocation, Link} from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import {getCsrfToken} from "../../utils/csrf";
import {getImageUrl} from "../../utils/defaultImage";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
//import {ApartmentList, RoomsList, NeighboursList} from "../../data/mockData";
//import type {ApartmentItem, RoomItem, NeighbourItem} from "../../data/mockData";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const createPinIcon = (bgColor: string, svgPath: string) =>
    L.divIcon({
        className: "",
        html: `<div style="width:30px;height:30px;border-radius:9999px;background:${bgColor};display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.28)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="${svgPath}"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });

const listingPinIcon = createPinIcon("#08D3E2", "M12 3l8 7h-2v9h-4v-6H10v6H6v-9H4l8-7z");
const universityPinIcon = createPinIcon("#C505EB", "M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm0 13L5 12.18V15l7 3.82L19 15v-2.82L12 16z");
const workPinIcon = createPinIcon("#06B396", "M10 4h4v2h5a1 1 0 0 1 1 1v3H4V7a1 1 0 0 1 1-1h5V4zm-6 7h16v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7z");

const createPoiIcon = (bgColor: string, svgPath: string) =>
    L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:9999px;background:${bgColor};display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.22)"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="${svgPath}"/></svg></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });

const POI_ICONS = {
    bus_stop:      createPoiIcon("#F97316", "M12 2C7.58 2 4 2.5 4 6v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zm-3.5 15c-.83 0-1.5-.67-1.5-1.5S7.67 14 8.5 14s1.5.67 1.5 1.5S9.33 17 8.5 17zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6 10V6h12v4H6z"),
    hospital:      createPoiIcon("#EF4444", "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"),
    supermarket:   createPoiIcon("#3B82F6", "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM5.21 6H21l-1.54 8.32c-.12.63-.67 1.08-1.31 1.08H8.53c-.64 0-1.19-.45-1.31-1.08L5.21 6zM2 2h2.27l.94 2H21v2H4.21L3.27 4H2V2z"),
    metro:         createPoiIcon("#6366F1", "M4 15.5v2h16v-2l-2-7h-3l-3 6-3-6H6l-2 7zm7-11c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm4 0c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm4 0c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z"),
    school:        createPoiIcon("#EAB308", "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"),
    train_station: createPoiIcon("#6B7280", "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zm-2 14H8v-2h2v2zm4 0h-2v-2h2v2zm2-4H8V8h8v4zm0-6H8V4h8v2z"),
} as const;

interface PoiItem {
    id: number;
    lat: number;
    lon: number;
    type: keyof typeof POI_ICONS;
    name: string;
}

const haversineDistanceKm = (from: [number, number], to: [number, number]): number => {
    const [lat1, lng1] = from;
    const [lat2, lng2] = to;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
};

type RouteMode = "walking" | "driving" | "bus";

const estimateDurationMinutes = (distanceKm: number, mode: RouteMode): number => {
    const avgSpeedByMode: Record<RouteMode, number> = {
        walking: 5,
        driving: 40,
        bus: 22,
    };
    const waitMinutes = mode === "bus" ? 5 : 0;
    return Math.max(1, Math.round((distanceKm / avgSpeedByMode[mode]) * 60) + waitMinutes);
};

const getOsrmProfile = (mode: RouteMode): "walking" | "driving" => {
    if (mode === "bus") {
        return "driving";
    }
    return mode;
};

function MapRecenterController({ center, trigger }: { center: [number, number]; trigger: number }) {
    const map = useMap();

    useEffect(() => {
        if (trigger > 0) {
            map.flyTo(center, Math.max(map.getZoom(), 13), {
                animate: true,
                duration: 0.8,
            });
        }
    }, [center, map, trigger]);

    return null;
}

function NeighbourFbRow({ label, value }: { label: string; value: ReactNode }) {
    if (value === null || value === undefined || value === "") return null;
    return (
        <div className="border-b border-zinc-200 py-3 last:border-b-0 dark:border-gray-700">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
            <div className="mt-0.5 text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{value}</div>
        </div>
    );
}

function NeighbourFbCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {title ? (
                <h2 className="border-b border-zinc-200 px-4 py-3 text-[17px] font-bold tracking-tight text-zinc-900 dark:border-gray-700 dark:text-white">
                    {title}
                </h2>
            ) : null}
            <div className="px-4 py-3">{children}</div>
        </section>
    );
}

type ListingType = "ROOM" | "NEIGHBOUR" | "APARTMENT";
type ListingReportReason = "fraud" | "spam" | "fake_listing" | "inappropriate_content" | "other";
type ListingConfirmAction = "delete_listing" | "remove_from_home";
type ListingToastKind = "success" | "error";

const listingGalleryHeight =
    "min-h-[200px] h-[220px] min-[480px]:h-[260px] min-[900px]:h-[300px]";

/** Коллаж до 5 фото: крупное слева + сетка справа как на sreality; последняя плитка — «все фото» если их больше */
function ListingImageCollage({
    images,
    totalCount,
    altPrefix,
    onCellClick,
    viewAllLabel,
}: {
    images: string[];
    totalCount: number;
    altPrefix: string;
    onCellClick: (index: number) => void;
    viewAllLabel: string;
}) {
    const frame = "w-full rounded-2xl bg-zinc-200/90 p-1 dark:bg-zinc-800";
    const tile = "relative min-h-0 min-w-0 overflow-hidden rounded-xl bg-zinc-300/80 dark:bg-zinc-700/80";

    const renderImg = (src: string, idx: number) => (
        <img
            src={src}
            alt={`${altPrefix} – ${idx + 1}`}
            className="h-full w-full object-cover"
            draggable={false}
        />
    );

    const n = images.length;
    if (n === 0) return null;

    if (n === 1) {
        return (
            <div className={frame}>
                <button
                    type="button"
                    onClick={() => onCellClick(0)}
                    className={`relative block w-full overflow-hidden rounded-xl ${listingGalleryHeight}`}
                >
                    {renderImg(images[0], 0)}
                </button>
            </div>
        );
    }

    if (n === 2) {
        return (
            <div className={frame}>
                <div className={`grid h-full grid-cols-2 gap-1 ${listingGalleryHeight}`}>
                    {[0, 1].map((i) => (
                        <button key={i} type="button" onClick={() => onCellClick(i)} className={tile}>
                            {renderImg(images[i], i)}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (n === 3) {
        return (
            <div className={frame}>
                <div className={`grid grid-cols-2 grid-rows-2 gap-1 ${listingGalleryHeight}`}>
                    <button
                        type="button"
                        onClick={() => onCellClick(0)}
                        className={`${tile} col-start-1 row-span-2 row-start-1`}
                    >
                        {renderImg(images[0], 0)}
                    </button>
                    <button type="button" onClick={() => onCellClick(1)} className={tile}>
                        {renderImg(images[1], 1)}
                    </button>
                    <button type="button" onClick={() => onCellClick(2)} className={tile}>
                        {renderImg(images[2], 2)}
                    </button>
                </div>
            </div>
        );
    }

    if (n === 4) {
        return (
            <div className={frame}>
                <div className={`grid grid-cols-2 grid-rows-2 gap-1 ${listingGalleryHeight}`}>
                    {[0, 1, 2, 3].map((i) => (
                        <button key={i} type="button" onClick={() => onCellClick(i)} className={tile}>
                            {renderImg(images[i], i)}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const moreOnLast = totalCount > 5;
    return (
        <div className={frame}>
            <div className={`grid grid-cols-2 grid-rows-2 gap-1 ${listingGalleryHeight}`}>
                <button
                    type="button"
                    onClick={() => onCellClick(0)}
                    className={`${tile} col-start-1 row-span-2 row-start-1`}
                >
                    {renderImg(images[0], 0)}
                </button>
                <div className="col-start-2 row-span-2 row-start-1 grid min-h-0 grid-cols-2 grid-rows-2 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                        <button key={i} type="button" onClick={() => onCellClick(i)} className={tile}>
                            {renderImg(images[i], i)}
                            {moreOnLast && i === 4 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 px-1.5">
                                    <Layers className="text-white drop-shadow-md" size={22} strokeWidth={2} aria-hidden />
                                    <span className="text-center text-[10px] font-semibold leading-tight text-white drop-shadow-md min-[480px]:text-[11px]">
                                        {viewAllLabel}
                                    </span>
                                </div>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ListingDetailPage() {
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();
    const router = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    
    // Определяем тип листинга на основе пути
    const getListingType = (): ListingType => {
        if (location.pathname.includes('/rooms/')) return "ROOM";
        if (location.pathname.includes('/neighbours/')) return "NEIGHBOUR";
        if (location.pathname.includes('/apartments/')) return "APARTMENT";
        return "ROOM"; // по умолчанию
    };
    
    const type = getListingType();

    const getRegionLabel = (regionCode?: string) => {
        const code = String(regionCode || "").trim().toUpperCase();
        if (!code) return "";

        const translated = t(`listing.regions.${code}`);
        return translated !== `listing.regions.${code}` ? translated : code;
    };
    
    // Состояние для данных листинга
    const [listingData, setListingData] = useState<{
        price?: number | string;
        address?: string;
        city?: string;
        region?: string;
        geo_lat?: number | string | null;
        geo_lng?: number | string | null;
        size?: number;
        rooms?: string;
        image?: string | null;
        images: string[];
        badges: string[];
        name?: string;
        age?: number;
        from?: string;
        title?: string;
        description?: string;
        beds?: number;
        maxResidents?: number;
        residentsCount?: number;
        contactPhone?: string;
        contactEmail?: string;
        contactInstagram?: string;
        contactFacebook?: string;
        profession?: string;
        noise_tolerance?: string;
        cleanliness?: number;
        introvert_extrovert?: number;
        guests_parties?: string;
        preferred_gender?: string;
        preferred_age_range?: string;
        smoking?: string;
        alcohol?: string;
        pets?: string;
        sleep_schedule?: string;
        gamer?: string;
        work_from_home?: string;
        verified?: boolean;
        looking_for_housing?: boolean;
        languages?: string[];
        currency?: string;
        deposit?: string | number;
        rental_period?: string;
        move_in_date?: string;
        preferredGender?: string;
        amenities?: string[];
        internet?: boolean;
        utilities_included?: boolean;
        utilitiesFee?: string | number;
        pets_allowed?: boolean;
        smoking_allowed?: boolean;
        has_roommates?: boolean;
        has_video?: boolean;
        has_3d_tour?: boolean;
        has_floorplan?: boolean;
        condition_state?: string;
        energy_class?: string;
        has_bus_stop?: boolean;
        has_train_station?: boolean;
        has_metro?: boolean;
        has_post_office?: boolean;
        has_atm?: boolean;
        has_general_practitioner?: boolean;
        has_vet?: boolean;
        has_primary_school?: boolean;
        has_kindergarten?: boolean;
        has_supermarket?: boolean;
        has_small_shop?: boolean;
        has_restaurant?: boolean;
        has_playground?: boolean;
        canManage?: boolean;
        isActive?: boolean;
        canRemoveFromHome?: boolean;
        ratingAverage?: number;
        ratingCount?: number;
        canReview?: boolean;
        myRating?: number | null;
        myComment?: string;
        reviews?: Array<{
            id: number;
            rating: number;
            comment: string;
            reviewerId: number;
            reviewerName: string;
            reviewerAvatar?: string | null;
            updatedAt: string;
        }>;
        neighbourUserId?: number;
        coverPhoto?: string | null;
        profileGallery?: Array<{ id: number; url: string; caption: string }>;
        coResidents?: Array<{ id: number; name: string; avatar?: string | null; age?: number | null }>;
        residents?: Array<{
            profileId: number;
            name: string;
            avatar?: string | null;
        }>;
    }>({
        image: "/placeholder-image.jpg",
        images: [],
        badges: [],
    });
    
    // Загрузка данных листинга из mockData
    /*
    useEffect(() => {
        if (!id) return;
        
        let foundItem: ApartmentItem | RoomItem | NeighbourItem | undefined;
        
        // Ищем элемент в соответствующем массиве

        switch (type) {
            case "APARTMENT":
                foundItem = ApartmentList.find(item => item.id === id);
                if (foundItem) {
                    const apt = foundItem as ApartmentItem;
                    setListingData({
                        price: apt.price,
                        address: apt.address,
                        size: apt.size,
                        rooms: apt.rooms,
                        image: apt.image,
                        images: apt.images,
                        badges: apt.badges,
                        title: apt.title,
                        description: apt.description,
                        beds: apt.beds,
                        contactPhone: apt.contactPhone,
                        contactEmail: apt.contactEmail,
                    });
                }
                break;
            case "ROOM":
                foundItem = RoomsList.find(item => item.id === id);
                if (foundItem) {
                    const room = foundItem as RoomItem;
                    setListingData({
                        price: room.price,
                        address: room.address,
                        size: room.size,
                        image: room.image,
                        images: room.images,
                        badges: room.badges,
                        title: room.title,
                        description: room.description,
                        beds: room.beds,
                        contactPhone: room.contactPhone,
                        contactEmail: room.contactEmail,
                    });
                }
                break;
            case "NEIGHBOUR":
                foundItem = NeighboursList.find(item => item.id === id);
                if (foundItem) {
                    const neighbour = foundItem as NeighbourItem;
                    setListingData({
                        name: neighbour.name,
                        age: neighbour.age,
                        from: neighbour.from,
                        image: neighbour.image,
                        images: neighbour.images,
                        badges: neighbour.badges,
                        title: neighbour.title,
                        description: neighbour.description,
                        contactPhone: neighbour.contactPhone,
                        contactEmail: neighbour.contactEmail,
                    });
                }
                break;
        }
        
        // Если элемент не найден, перенаправляем на список
        if (!foundItem) {
            const redirectPath = type === "APARTMENT" ? "/apartments" : type === "ROOM" ? "/rooms" : "/neighbours";
            router(redirectPath);
        }
    }, [id, type, router]);
    */
    useEffect(() => {
  if (!id) return;

    const loadListing = async () => {
        try {
            const isNeighbour = type === "NEIGHBOUR";
            const endpoint = isNeighbour ? `/api/neighbours/${id}/` : `/api/listings/${id}/`;
            const res = await fetch(endpoint, {
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error("Listing not found");
            }

            const data = await res.json();

            if (isNeighbour) {
                const translateBadgeValue = (value?: string) => {
                    if (!value) return "";
                    const normalized = String(value).toLowerCase().replace(/\s+/g, "");
                    const translated = t(`badges.${normalized}`);
                    return translated !== `badges.${normalized}` ? translated : value;
                };

                const neighbourBadges: string[] = [];
                if (data.verified) neighbourBadges.push(t("badges.verified"));
                if (data.looking_for_housing) neighbourBadges.push(t("badges.lookingForHousing"));
                if (data.gender) neighbourBadges.push(`${t("profile.gender")}: ${translateBadgeValue(data.gender)}`);
                if (data.smoking) neighbourBadges.push(`${t("profile.smoking")}: ${translateBadgeValue(data.smoking)}`);
                if (data.alcohol) neighbourBadges.push(`${t("profile.alcohol")}: ${translateBadgeValue(data.alcohol)}`);
                if (data.pets) neighbourBadges.push(`${t("profile.pets")}: ${translateBadgeValue(data.pets)}`);
                if (data.sleep_schedule) neighbourBadges.push(`${t("profile.sleepSchedule")}: ${translateBadgeValue(data.sleep_schedule)}`);
                if (data.gamer) neighbourBadges.push(`${t("profile.gamer")}: ${translateBadgeValue(data.gamer)}`);
                if (data.work_from_home) neighbourBadges.push(`${t("profile.workFromHome")}: ${translateBadgeValue(data.work_from_home)}`);

                const galRaw = Array.isArray(data.gallery) ? data.gallery : [];
                const profileGallery = galRaw
                    .map((g: { id?: number; url?: string; caption?: string }) => ({
                        id: Number(g.id),
                        url: String(g.url || ""),
                        caption: String(g.caption || "").slice(0, 200),
                    }))
                    .filter((g: { url: string }) => Boolean(g.url));
                const avatarUrl = data.avatar || null;
                const albumUrls: string[] = [];
                if (avatarUrl) albumUrls.push(avatarUrl);
                for (const g of profileGallery) {
                    if (g.url && !albumUrls.includes(g.url)) albumUrls.push(g.url);
                }
                const coResidentsRaw = Array.isArray(data.coResidents) ? data.coResidents : [];
                const coResidents = coResidentsRaw.map(
                    (r: { id?: number; name?: string; avatar?: string | null; age?: number | null }) => ({
                        id: Number(r.id),
                        name: String(r.name || "").trim() || "?",
                        avatar: r.avatar || null,
                        age: r.age ?? null,
                    }),
                );

                setListingData({
                    image: avatarUrl,
                    images: albumUrls.length > 0 ? albumUrls : avatarUrl ? [avatarUrl] : [],
                    coverPhoto: data.coverPhoto || null,
                    profileGallery,
                    coResidents,
                    badges: neighbourBadges,
                    name: data.name,
                    age: data.age,
                    from: data.city,
                    address: data.city,
                    title: data.name,
                    description: data.about,
                    profession: data.profession,
                    smoking: data.smoking,
                    alcohol: data.alcohol,
                    pets: data.pets,
                    sleep_schedule: data.sleep_schedule,
                    noise_tolerance: data.noise_tolerance,
                    gamer: data.gamer,
                    work_from_home: data.work_from_home,
                    cleanliness: data.cleanliness,
                    introvert_extrovert: data.introvert_extrovert,
                    guests_parties: data.guests_parties,
                    preferred_gender: data.preferred_gender,
                    preferred_age_range: data.preferred_age_range,
                    verified: data.verified,
                    looking_for_housing: data.looking_for_housing,
                    languages: data.languages,
                    canRemoveFromHome: Boolean(data.canRemoveFromHome),
                    ratingAverage: Number(data.ratingAverage || 0),
                    ratingCount: Number(data.ratingCount || 0),
                    canReview: Boolean(data.canReview),
                    myRating: typeof data.myRating === "number" ? data.myRating : null,
                    myComment: data.myComment || "",
                    reviews: Array.isArray(data.reviews) ? data.reviews : [],
                    neighbourUserId: typeof data.userId === "number" ? data.userId : undefined,
                    contactPhone: data.phone,
                    contactEmail: data.email,
                    contactInstagram: data.instagram,
                    contactFacebook: data.facebook,
                });
                return;
            }

            // Объявления
            setListingData({
                price: data.price,
                address: data.address,
                city: data.city,
                region: data.region,
                geo_lat: data.geo_lat,
                geo_lng: data.geo_lng,
                size: data.size,
                rooms: data.rooms,
                image: data.images?.[0] || null,
                images: data.images || [],
                badges: data.badges || [],
                title: data.title,
                description: data.description,
                beds: data.beds,
                maxResidents: data.maxResidents,
                residentsCount: data.residentsCount,
                residents: data.residents || [],
                name: data.name,
                age: data.age,
                from: data.from,
                contactPhone: data.contact_phone,
                contactEmail: data.contact_email,
                contactInstagram: data.contact_instagram,
                contactFacebook: data.contact_facebook,
                currency: data.currency,
                deposit: data.deposit,
                rental_period: data.rental_period,
                move_in_date: data.move_in_date,
                preferredGender: String(data.preferredGender || data.preferred_gender || "any"),
                amenities: data.amenities || [],
                internet: data.internet,
                utilities_included: data.utilities_included,
                utilitiesFee: data.utilitiesFee,
                pets_allowed: data.pets_allowed,
                smoking_allowed: data.smoking_allowed,
                has_roommates: data.has_roommates,
                has_video: data.has_video,
                has_3d_tour: data.has_3d_tour,
                has_floorplan: data.has_floorplan,
                condition_state: data.condition_state,
                energy_class: data.energy_class,
                canManage: Boolean(data.canManage),
                isActive: data.isActive !== false,
                has_bus_stop: data.has_bus_stop,
                has_train_station: data.has_train_station,
                has_metro: data.has_metro,
                has_post_office: data.has_post_office,
                has_atm: data.has_atm,
                has_general_practitioner: data.has_general_practitioner,
                has_vet: data.has_vet,
                has_primary_school: data.has_primary_school,
                has_kindergarten: data.has_kindergarten,
                has_supermarket: data.has_supermarket,
                has_small_shop: data.has_small_shop,
                has_restaurant: data.has_restaurant,
                has_playground: data.has_playground,
            });

        } catch (err) {
            console.error("Listing loading failed:", err);
            const redirectPath =
                type === "APARTMENT"
                    ? "/apartments"
                    : type === "ROOM"
                    ? "/rooms"
                    : "/neighbours";
            router(redirectPath);
        }
    };

  loadListing();
}, [id, type, router]);

    // Проверка статуса избранного
    useEffect(() => {
        if (!id || !isAuthenticated) return;
        
        const checkFavoriteStatus = async () => {
            try {
                const isNeighbour = type === "NEIGHBOUR";
                const param = isNeighbour ? `profile_id=${id}` : `listing_id=${id}`;
                const res = await fetch(`/api/favorites/is-favorite/?${param}`, {
                    credentials: "include",
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setIsLike(data.is_favorite || false);
                }
            } catch (err) {
                console.error("Failed to check favorite status:", err);
            }
        };
        
        checkFavoriteStatus();
    }, [id, type, isAuthenticated]);

    // Обработчик добавления/удаления из избранного
    const handleToggleFavorite = async () => {
        if (!isAuthenticated) {
            router("/auth");
            return;
        }

        const wasLiked = isLike;
        
        try {
            const isNeighbour = type === "NEIGHBOUR";
            const endpoint = wasLiked ? "/api/favorites/remove/" : "/api/favorites/add/";
            const body = isNeighbour ? { profile_id: id } : { listing_id: id };
            
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                credentials: "include",
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => ({}));
            
            if (res.ok) {
                if (typeof data.is_favorite === "boolean") {
                    setIsLike(data.is_favorite);
                } else {
                    setIsLike(!wasLiked);
                }
                const added =
                    !wasLiked &&
                    (typeof data.is_favorite !== "boolean" || data.is_favorite === true);
                if (added) {
                    showToast(t("listing.favoriteAddedSuccess"), "success", true);
                }
            } else {
                console.error("Failed to toggle favorite");
            }
        } catch (err) {
            console.error("Error toggling favorite:", err);
        }
    };
    
    const {
        price,
        address,
        city,
        region,
        geo_lat,
        geo_lng,
        size,
        rooms,
        image,
        images = [],
        badges,
        name,
        age,
        from,
        title,
        description,
        beds,
        maxResidents,
        residentsCount,
        contactPhone,
        contactEmail,
        contactInstagram,
        contactFacebook,
        profession,
        noise_tolerance,
        cleanliness,
        introvert_extrovert,
        guests_parties,
        preferred_gender,
        preferred_age_range,
        smoking,
        alcohol,
        pets,
        sleep_schedule,
        gamer,
        work_from_home,
        verified,
        looking_for_housing,
        languages,
        currency,
        deposit,
        rental_period,
        move_in_date,
        preferredGender,
        amenities,
        internet,
        utilities_included,
        utilitiesFee,
        pets_allowed,
        smoking_allowed,
        has_roommates,
        has_video,
        has_3d_tour,
        has_floorplan,
        condition_state,
        energy_class,
        has_bus_stop,
        has_train_station,
        has_metro,
        has_post_office,
        has_atm,
        has_general_practitioner,
        has_vet,
        has_primary_school,
        has_kindergarten,
        has_supermarket,
        has_small_shop,
        has_restaurant,
        has_playground,
        canManage,
        isActive,
        canRemoveFromHome,
        ratingAverage,
        ratingCount,
        canReview,
        myRating,
        myComment,
        reviews,
        neighbourUserId,
        residents,
        coverPhoto,
        profileGallery = [],
        coResidents = [],
    } = listingData;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLike, setIsLike] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [messageStartLoading, setMessageStartLoading] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [isInviteQrModalOpen, setIsInviteQrModalOpen] = useState(false);
    const [inviteQrLink, setInviteQrLink] = useState("");
    const [removingFromHome, setRemovingFromHome] = useState(false);
    const [reviewRating, setReviewRating] = useState<number>(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [neighbourLeftTab, setNeighbourLeftTab] = useState<"info" | "reviews">("info");
    const [universityPoint, setUniversityPoint] = useState<[number, number] | null>(null);
    const [workPoint, setWorkPoint] = useState<[number, number] | null>(null);
    const [universityRoutePoints, setUniversityRoutePoints] = useState<Array<[number, number]>>([]);
    const [workRoutePoints, setWorkRoutePoints] = useState<Array<[number, number]>>([]);
    const [universityRouteLoading, setUniversityRouteLoading] = useState(false);
    const [workRouteLoading, setWorkRouteLoading] = useState(false);
    const [universityDistanceKm, setUniversityDistanceKm] = useState<number | null>(null);
    const [workDistanceKm, setWorkDistanceKm] = useState<number | null>(null);
    const [universityDurationMin, setUniversityDurationMin] = useState<number | null>(null);
    const [workDurationMin, setWorkDurationMin] = useState<number | null>(null);
    const [poiItems, setPoiItems] = useState<PoiItem[]>([]);
    const [nearestPoiItems, setNearestPoiItems] = useState<PoiItem[]>([]);
    const [nearestStop, setNearestStop] = useState<{ dist: number; time: number } | null>(null);
    const [nearestShop, setNearestShop] = useState<{ dist: number; time: number } | null>(null);
    const [nearestHospital, setNearestHospital] = useState<{ dist: number; time: number } | null>(null);
    const [routeMode, setRouteMode] = useState<RouteMode>("walking");
    const [mapRecenterTrigger, setMapRecenterTrigger] = useState(0);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState<ListingReportReason>("fraud");
    const [reportDetails, setReportDetails] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [confirmAction, setConfirmAction] = useState<ListingConfirmAction | null>(null);
    const [toast, setToast] = useState<{
        kind: ListingToastKind;
        message: string;
        rich?: boolean;
    } | null>(null);
    const toastTimeoutRef = useRef<number | null>(null);
    const hasSubmittedReview = typeof myRating === "number" && myRating >= 1;
    const safeImages = (images || []).filter((img): img is string => Boolean(img));
    const fallbackImage = image || undefined;
    const allImages = safeImages.length > 0
        ? safeImages
        : fallbackImage
            ? [fallbackImage]
            : ["/placeholder-image.jpg"];

    // Если id отсутствует, перенаправляем на список
    useEffect(() => {
        if (!id) {
            const redirectPath = type === "APARTMENT" ? "/apartments" : type === "ROOM" ? "/rooms" : "/neighbours";
            router(redirectPath);
        }
    }, [id, type, router]);

    useEffect(() => {
        setNeighbourLeftTab("info");
    }, [id]);

    const handleContactClick = () => {
        if (!isAuthenticated) {
            router("/auth");
        }
    };

    const handleOpenListingReport = () => {
        if (!isAuthenticated) {
            router("/auth");
            return;
        }
        setIsReportModalOpen(true);
    };

    const showToast = (message: string, kind: ListingToastKind = "success", rich = false) => {
        if (toastTimeoutRef.current !== null) {
            window.clearTimeout(toastTimeoutRef.current);
        }
        setToast({ kind, message, rich: Boolean(rich) });
        toastTimeoutRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimeoutRef.current = null;
        }, rich ? 3000 : 2600);
    };

    const handleWriteMessage = async () => {
        if (!isAuthenticated) {
            router("/auth");
            return;
        }

        if (messageStartLoading) {
            return;
        }

        try {
            setMessageStartLoading(true);

            let targetUserId = neighbourUserId;

            if ((!targetUserId || targetUserId <= 0) && id) {
                const profileResponse = await fetch(`/api/neighbours/${id}/`, {
                    credentials: "include",
                });
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    if (typeof profileData?.userId === "number") {
                        targetUserId = profileData.userId;
                    }
                }
            }

            if (!targetUserId || targetUserId <= 0) {
                router(`/messenger?user=${neighbourUserId ?? ""}&profile=${id ?? ""}`);
                return;
            }

            router(`/messenger?user=${targetUserId}&profile=${id ?? ""}`);
        } catch (error) {
            console.error("Failed to open messenger draft", error);
            router(`/messenger?user=${neighbourUserId ?? ""}&profile=${id ?? ""}`);
        } finally {
            setMessageStartLoading(false);
        }
    };

    const handleSubmitListingReport = async () => {
        if (!id || !isAuthenticated || reportSubmitting) return;
        try {
            setReportSubmitting(true);
            const response = await fetch(`/api/listings/${id}/report/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                body: JSON.stringify({
                    reason: reportReason,
                    details: reportDetails,
                }),
            });
            if (!response.ok) {
                throw new Error("Failed to send listing report");
            }
            setIsReportModalOpen(false);
            setReportDetails("");
            setReportReason("fraud");
            showToast(t("listing.reportSuccess"), "success");
        } catch (error) {
            console.error(error);
            showToast(t("listing.reportFailed"), "error");
        } finally {
            setReportSubmitting(false);
        }
    };

    useEffect(() => {
        if (type !== "NEIGHBOUR") {
            return;
        }
        setReviewRating(typeof myRating === "number" ? myRating : 0);
        setReviewComment(myComment || "");
    }, [type, myRating, myComment]);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current !== null) {
                window.clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmitReview = async () => {
        if (!id || type !== "NEIGHBOUR") return;
        if (!isAuthenticated) {
            router("/auth");
            return;
        }
        if (reviewRating < 1 || reviewRating > 5) {
            setReviewError(t("listing.selectRating"));
            return;
        }

        try {
            setReviewSubmitting(true);
            setReviewError(null);
            const response = await fetch(`/api/neighbours/${id}/review/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                body: JSON.stringify({
                    rating: reviewRating,
                    comment: reviewComment,
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.detail || t("listing.reviewFailed"));
            }

            setReviewComment("");
            setReviewRating(0);

            const refreshResponse = await fetch(`/api/neighbours/${id}/`, {
                credentials: "include",
            });
            if (refreshResponse.ok) {
                const refreshed = await refreshResponse.json();
                setListingData((prev) => ({
                    ...prev,
                    ratingAverage: Number(refreshed.ratingAverage || 0),
                    ratingCount: Number(refreshed.ratingCount || 0),
                    canReview: Boolean(refreshed.canReview),
                    reviews: Array.isArray(refreshed.reviews) ? refreshed.reviews : [],
                }));
            }
        } catch (error) {
            setReviewError(error instanceof Error ? error.message : t("listing.reviewFailed"));
        } finally {
            setReviewSubmitting(false);
        }
    };

    const getStarIcon = (value: number, starIndex: number) => {
        if (value >= starIndex) return "mdi:star";
        if (value >= starIndex - 0.5) return "mdi:star-half-full";
        return "mdi:star-outline";
    };

    const nextImage = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
        setTimeout(() => setIsTransitioning(false), 700);
    };

    const prevImage = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
        setTimeout(() => setIsTransitioning(false), 700);
    };

    const goToImage = (index: number) => {
        if (index !== currentImageIndex && !isTransitioning) {
            setIsTransitioning(true);
            setCurrentImageIndex(index);
            setTimeout(() => setIsTransitioning(false), 700);
        }
    };

    const handleDeleteListing = async () => {
        if (!id || type === "NEIGHBOUR") return;

        try {
            const res = await fetch(`/api/listings/${id}/`, {
                method: "DELETE",
                headers: {
                    "X-CSRFToken": getCsrfToken(),
                },
                credentials: "include",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || t("listing.actionFailed"));
            }

            router(type === "ROOM" ? "/rooms" : "/apartments");
        } catch (error) {
            showToast(error instanceof Error ? error.message : t("listing.actionFailed"), "error");
        }
    };

    const handleToggleActive = async () => {
        if (!id || type === "NEIGHBOUR") return;

        try {
            const nextActive = !Boolean(isActive);
            const res = await fetch(`/api/listings/${id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                credentials: "include",
                body: JSON.stringify({ isActive: nextActive }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || t("listing.actionFailed"));
            }

            setListingData((prev) => ({
                ...prev,
                isActive: nextActive,
            }));
        } catch (error) {
            showToast(error instanceof Error ? error.message : t("listing.actionFailed"), "error");
        }
    };

    const createInviteLink = async (): Promise<string> => {
        if (!id || type === "NEIGHBOUR") {
            throw new Error(t("profile.inviteFailed"));
        }

        const res = await fetch(`/api/listings/${id}/invite/`, {
            method: "POST",
            credentials: "include",
            headers: {
                "X-CSRFToken": getCsrfToken(),
            },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.detail || t("profile.inviteFailed"));
        }

        const token = data.token;
        return data.inviteUrl
            ? (data.inviteUrl.startsWith("http") ? data.inviteUrl : `${window.location.origin}${data.inviteUrl}`)
            : `${window.location.origin}/api/listings/invite/${token}/join/`;
    };

    const handleCreateInvite = async () => {
        try {
            setCreatingInvite(true);
            const link = await createInviteLink();
            await navigator.clipboard.writeText(link);
            showToast(t("profile.copied"), "success");
        } catch (e) {
            showToast(e instanceof Error ? e.message : t("profile.inviteFailed"), "error");
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleInviteByQr = async () => {
        try {
            setCreatingInvite(true);
            const link = await createInviteLink();
            setInviteQrLink(link);
            setIsInviteQrModalOpen(true);
        } catch (e) {
            showToast(e instanceof Error ? e.message : t("profile.inviteFailed"), "error");
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleEditListing = async () => {
        if (!id || type === "NEIGHBOUR") return;
        router(`/add?editListingId=${id}`);
    };

    const handleRemoveFromHome = async () => {
        if (!id || type !== "NEIGHBOUR") return;

        try {
            setRemovingFromHome(true);
            const res = await fetch(`/api/listings/remove-from-home/${id}/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "X-CSRFToken": getCsrfToken(),
                },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || t("listing.actionFailed"));
            }

            showToast(t("listing.removedFromHomeSuccess"), "success");
            setListingData((prev) => ({
                ...prev,
                canRemoveFromHome: false,
            }));
        } catch (error) {
            showToast(error instanceof Error ? error.message : t("listing.actionFailed"), "error");
        } finally {
            setRemovingFromHome(false);
        }
    };

    const handleConfirmProceed = async () => {
        const action = confirmAction;
        setConfirmAction(null);
        if (action === "delete_listing") {
            await handleDeleteListing();
            return;
        }
        if (action === "remove_from_home") {
            await handleRemoveFromHome();
        }
    };

    // Закрытие модального окна по Escape и блокировка скролла
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };

        if (isModalOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    const getConditionStateLabel = (value?: string) => {
        if (!value) return "";
        const map: Record<string, string> = {
            VELMI_DOBRY: t("filter.conditionVeryGood"),
            DOBRY: t("filter.conditionGood"),
            SPATNY: t("filter.conditionSatisfactory"),
            NOVOSTAVBA: t("filter.conditionNew"),
            VE_VYSTAVBE: t("filter.conditionProject"),
            PRED_REKONSTRUKCI: t("filter.conditionNeedsRenovation"),
            V_REKONSTRUKCI: t("filter.conditionUnderReconstruction"),
            PO_REKONSTRUKCI: t("filter.conditionExcellent"),
        };
        return map[value] || value;
    };

    const getRentalPeriodLabel = (value?: string) => {
        if (!value) return "";
        const map: Record<string, string> = {
            SHORT: t("filter.rentalPeriodShort"),
            LONG: t("filter.rentalPeriodLong"),
            BOTH: t("filter.rentalPeriodFlexible"),
        };
        return map[value] || value;
    };

    const getPreferredGenderLabel = (value?: string) => {
        const normalized = String(value || "").toLowerCase();
        if (normalized === "male") return t("filter.preferredGenderMale");
        if (normalized === "female") return t("filter.preferredGenderFemale");
        return t("filter.preferredGenderAny");
    };

    const getLifestyleValueLabel = (value?: string) => {
        if (!value) return "";
        const normalized = value.replace(/\s+/g, "");
        return t(`badges.${normalized}`) !== `badges.${normalized}` ? t(`badges.${normalized}`) : value;
    };

    const getAmenityLabel = (amenity?: string) => {
        if (!amenity) return "";
        const normalized = amenity.trim().toLowerCase();
        const map: Record<string, string> = {
            internet: t("filter.internet"),
            balcony: t("filter.amenityBalcony"),
            parking: t("filter.amenityParking"),
            furnished: t("filter.amenityFurnished"),
            dishwasher: t("filter.amenityDishwasher"),
            washingmachine: t("filter.amenityWashingMachine"),
            microwave: t("filter.amenityMicrowave"),
            oven: t("filter.amenityOven"),
            refrigerator: t("filter.amenityRefrigerator"),
            tv: t("filter.amenityTV"),
            airconditioning: t("filter.amenityAirConditioning"),
            heating: t("filter.amenityHeating"),
        };
        return map[normalized] || amenity;
    };

    const getRouteModeLabel = (mode: RouteMode) => {
        if (mode === "walking") return t("listing.routeModeWalking");
        if (mode === "driving") return t("listing.routeModeDriving");
        return t("listing.routeModeBus");
    };

    const normalizedAmenities = (amenities || [])
        .map((amenity) => String(amenity || "").trim())
        .filter((amenity) => amenity.length > 0);
    const hasInternetAmenity = normalizedAmenities.some((amenity) => amenity.toLowerCase() === "internet");
    const shouldShowInternet = Boolean(internet) || hasInternetAmenity;
    const visibleAmenities = normalizedAmenities.filter((amenity) => amenity.toLowerCase() !== "internet");

    const numericGeoLat = Number(geo_lat);
    const numericGeoLng = Number(geo_lng);
    const hasCoordinates = Number.isFinite(numericGeoLat) && Number.isFinite(numericGeoLng);

    useEffect(() => {
        if (!isAuthenticated || type === "NEIGHBOUR") {
            setUniversityPoint(null);
            setWorkPoint(null);
            return;
        }

        let cancelled = false;
        const loadProfilePoints = async () => {
            try {
                const response = await fetch("/api/profile/", { credentials: "include" });
                if (!response.ok) {
                    if (!cancelled) {
                        setUniversityPoint(null);
                        setWorkPoint(null);
                    }
                    return;
                }

                const data = await response.json();
                const universityIdRaw = data?.universityId;
                const hasUniversitySelected = universityIdRaw !== null && universityIdRaw !== undefined && universityIdRaw !== "" && universityIdRaw !== 0 && universityIdRaw !== "0";
                const universityLat = Number(data?.universityLat);
                const universityLng = Number(data?.universityLng);
                const workLat = Number(data?.locationLat);
                const workLng = Number(data?.locationLng);

                if (!cancelled) {
                    if (hasUniversitySelected && Number.isFinite(universityLat) && Number.isFinite(universityLng)) {
                        setUniversityPoint([universityLat, universityLng]);
                    } else {
                        setUniversityPoint(null);
                    }

                    if (Number.isFinite(workLat) && Number.isFinite(workLng)) {
                        setWorkPoint([workLat, workLng]);
                    } else {
                        setWorkPoint(null);
                    }
                }
            } catch {
                if (!cancelled) {
                    setUniversityPoint(null);
                    setWorkPoint(null);
                }
            }
        };

        loadProfilePoints();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, type]);

    useEffect(() => {
        if (!hasCoordinates || type === "NEIGHBOUR") {
            setUniversityRoutePoints([]);
            setWorkRoutePoints([]);
            setUniversityRouteLoading(false);
            setWorkRouteLoading(false);
            setUniversityDistanceKm(null);
            setWorkDistanceKm(null);
            setUniversityDurationMin(null);
            setWorkDurationMin(null);
            return;
        }

        const controller = new AbortController();
        const fetchRoute = async (
            sourcePoint: [number, number],
            setLoading: (value: boolean) => void,
            setPoints: (points: Array<[number, number]>) => void,
            setDistanceKm: (value: number | null) => void,
            setDurationMin: (value: number | null) => void
        ) => {
            try {
                setLoading(true);
                const [startLat, startLng] = sourcePoint;
                const endLat = numericGeoLat;
                const endLng = numericGeoLng;
                const routeProfile = getOsrmProfile(routeMode);
                const url = `https://router.project-osrm.org/route/v1/${routeProfile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) {
                    setPoints([]);
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [endLat, endLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm, routeMode));
                    return;
                }

                const payload = await response.json();
                const routeDistanceMeters = Number(payload?.routes?.[0]?.distance);
                const routeDurationSeconds = Number(payload?.routes?.[0]?.duration);
                const coordinates = payload?.routes?.[0]?.geometry?.coordinates;
                if (!Array.isArray(coordinates)) {
                    setPoints([]);
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [endLat, endLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm, routeMode));
                    return;
                }

                const mapped = coordinates
                    .map((pair: any) => {
                        const lng = Number(pair?.[0]);
                        const lat = Number(pair?.[1]);
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                            return null;
                        }
                        return [lat, lng] as [number, number];
                    })
                    .filter((point: [number, number] | null): point is [number, number] => point !== null);

                setPoints(mapped);
                if (Number.isFinite(routeDistanceMeters) && routeDistanceMeters > 0) {
                    const distanceKm = routeDistanceMeters / 1000;
                    setDistanceKm(distanceKm);
                    if (routeMode === "driving" && Number.isFinite(routeDurationSeconds) && routeDurationSeconds > 0) {
                        setDurationMin(Math.max(1, Math.round(routeDurationSeconds / 60)));
                    } else {
                        setDurationMin(estimateDurationMinutes(distanceKm, routeMode));
                    }
                } else {
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [endLat, endLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm, routeMode));
                }
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setPoints([]);
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [numericGeoLat, numericGeoLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm, routeMode));
                }
            } finally {
                setLoading(false);
            }
        };

        if (universityPoint) {
            fetchRoute(universityPoint, setUniversityRouteLoading, setUniversityRoutePoints, setUniversityDistanceKm, setUniversityDurationMin);
        } else {
            setUniversityRoutePoints([]);
            setUniversityRouteLoading(false);
            setUniversityDistanceKm(null);
            setUniversityDurationMin(null);
        }

        if (workPoint) {
            fetchRoute(workPoint, setWorkRouteLoading, setWorkRoutePoints, setWorkDistanceKm, setWorkDurationMin);
        } else {
            setWorkRoutePoints([]);
            setWorkRouteLoading(false);
            setWorkDistanceKm(null);
            setWorkDurationMin(null);
        }

        return () => controller.abort();
    }, [hasCoordinates, universityPoint, workPoint, type, numericGeoLat, numericGeoLng, routeMode]);

    useEffect(() => {
        if (!hasCoordinates || type === "NEIGHBOUR") {
            setPoiItems([]);
            return;
        }

        const controller = new AbortController();
        const overpassEndpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
        ];

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const loadPoi = async () => {
            const lat = numericGeoLat;
            const lng = numericGeoLng;
            const query = `[out:json][timeout:25];
(
    node[highway=bus_stop](around:10000,${lat},${lng});
    nwr[amenity=hospital](around:10000,${lat},${lng});
    nwr[amenity=clinic](around:10000,${lat},${lng});
    nwr[shop=supermarket](around:10000,${lat},${lng});
  node[railway=station](around:1500,${lat},${lng});
  node[railway=subway_entrance](around:1500,${lat},${lng});
  nwr[amenity=school](around:1000,${lat},${lng});
  node[railway=halt](around:3000,${lat},${lng});
);
out center;`;

            for (const endpoint of overpassEndpoints) {
                for (let attempt = 1; attempt <= 2; attempt++) {
                    try {
                        const res = await fetch(endpoint, {
                            method: "POST",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: `data=${encodeURIComponent(query)}`,
                            signal: controller.signal,
                        });

                        if (!res.ok) {
                            if (attempt < 2) {
                                await sleep(300 * attempt);
                            }
                            continue;
                        }

                        const data = await res.json();
                        const items: PoiItem[] = [];

                        for (const el of (data.elements ?? [])) {
                            const tags: Record<string, string> = el.tags ?? {};
                            const elLat = Number(el.lat ?? el.center?.lat);
                            const elLon = Number(el.lon ?? el.center?.lon);
                            if (!Number.isFinite(elLat) || !Number.isFinite(elLon)) continue;

                            let poiType: keyof typeof POI_ICONS | null = null;
                            if (tags.highway === "bus_stop") {
                                poiType = "bus_stop";
                            } else if (tags.amenity === "hospital" || tags.amenity === "clinic") {
                                poiType = "hospital";
                            } else if (tags.shop === "supermarket") {
                                poiType = "supermarket";
                            } else if (tags.railway === "station" && tags.station === "subway") {
                                poiType = "metro";
                            } else if (tags.railway === "subway_entrance") {
                                poiType = "metro";
                            } else if (tags.amenity === "school") {
                                poiType = "school";
                            } else if (tags.railway === "station" || tags.railway === "halt") {
                                poiType = "train_station";
                            }

                            if (poiType) {
                                items.push({ id: el.id, lat: elLat, lon: elLon, type: poiType, name: tags.name ?? tags["name:cs"] ?? "" });
                            }
                        }

                        setPoiItems(items);
                        return;
                    } catch (e: unknown) {
                        if ((e as { name?: string })?.name === "AbortError") {
                            return;
                        }
                        if (attempt < 2) {
                            await sleep(300 * attempt);
                        }
                    }
                }
            }

            setPoiItems([]);
        };

        loadPoi();
        return () => controller.abort();
    }, [hasCoordinates, type, numericGeoLat, numericGeoLng]);

    useEffect(() => {
        if (!hasCoordinates || !poiItems.length) {
            setNearestStop(null);
            setNearestShop(null);
            setNearestHospital(null);
            setNearestPoiItems([]);
            return;
        }
        const listingLoc: [number, number] = [numericGeoLat, numericGeoLng];
        let stop_dist = Infinity, shop_dist = Infinity, hosp_dist = Infinity;
        let nearestStopPoi: PoiItem | null = null;
        let nearestShopPoi: PoiItem | null = null;
        let nearestHospitalPoi: PoiItem | null = null;
        for (const poi of poiItems) {
            const dist = haversineDistanceKm(listingLoc, [poi.lat, poi.lon]);
            if (poi.type === "bus_stop" && dist < stop_dist) {
                stop_dist = dist;
                nearestStopPoi = poi;
            }
            if (poi.type === "supermarket" && dist < shop_dist) {
                shop_dist = dist;
                nearestShopPoi = poi;
            }
            if (poi.type === "hospital" && dist < hosp_dist) {
                hosp_dist = dist;
                nearestHospitalPoi = poi;
            }
        }
        setNearestStop(stop_dist < Infinity ? { dist: stop_dist, time: estimateDurationMinutes(stop_dist, routeMode) } : null);
        setNearestShop(shop_dist < Infinity ? { dist: shop_dist, time: estimateDurationMinutes(shop_dist, routeMode) } : null);
        setNearestHospital(hosp_dist < Infinity ? { dist: hosp_dist, time: estimateDurationMinutes(hosp_dist, routeMode) } : null);
        setNearestPoiItems([nearestStopPoi, nearestShopPoi, nearestHospitalPoi].filter((poi): poi is PoiItem => Boolean(poi)));
    }, [poiItems, hasCoordinates, numericGeoLat, numericGeoLng, routeMode]);

    const mapData = useMemo(() => {
        if (!hasCoordinates) {
            return null;
        }
        const openLink = `https://www.openstreetmap.org/?mlat=${numericGeoLat}&mlon=${numericGeoLng}#map=14/${numericGeoLat}/${numericGeoLng}`;
        const center: [number, number] = [numericGeoLat, numericGeoLng];
        return { openLink, center };
    }, [hasCoordinates, numericGeoLat, numericGeoLng]);

    return(
        <div
            className={`interFont flex min-h-screen w-full flex-col items-center bg-transparent text-black dark:text-white ${
                type === "NEIGHBOUR"
                    ? "pt-[124px] sm:pt-[132px] min-[770px]:pt-[140px]"
                    : "pt-[100px]"
            }`}
        >
            
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>

                {/* Галерея / шапка профиля соседа в стиле «обложка + аватар» */}
                <div className="mb-8 flex w-full flex-col items-center gap-4">
                    <div className={`relative w-full ${type === "NEIGHBOUR" ? "" : "group"}`}>
                        {type === "NEIGHBOUR" ? (
                            <>
                                <div className="w-full overflow-hidden rounded-2xl bg-zinc-200 shadow-md ring-1 ring-zinc-200/90 dark:bg-gray-900 dark:ring-gray-700">
                                    <div className="relative h-[140px] w-full min-[480px]:h-[180px] min-[900px]:h-[220px] bg-gradient-to-br from-[#C505EB]/25 via-zinc-200 to-[#08E2BE]/20 dark:from-[#C505EB]/15 dark:via-zinc-800 dark:to-[#08E2BE]/12">
                                        {coverPhoto ? (
                                            <img
                                                src={getImageUrl(coverPhoto)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : null}
                                        <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
                                            <button
                                                type="button"
                                                onClick={handleToggleFavorite}
                                                className="rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800"
                                                aria-label={t("listing.addToFavorites")}
                                            >
                                                <Heart
                                                    size={22}
                                                    color={isLike ? "#C505EB" : "#666666"}
                                                    fill={isLike ? "#C505EB" : "none"}
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800"
                                                aria-label={t("listing.share")}
                                            >
                                                <Share2 size={22} color="#C505EB" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative px-4 pb-5 pt-0 max-[770px]:px-3">
                                        <div className="relative -mt-12 flex flex-col gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:gap-6">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCurrentImageIndex(0);
                                                    setIsModalOpen(true);
                                                }}
                                                className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white dark:bg-zinc-800 dark:ring-zinc-900 sm:h-[128px] sm:w-[128px]"
                                        >
                                            <img 
                                                    src={getImageUrl(image)}
                                                    alt={String(name || "Profile")}
                                                    className="h-full w-full object-cover"
                                                draggable={false}
                                            />
                                            </button>
                                            <div className="min-w-0 flex-1 pb-0.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h1 className="text-2xl font-extrabold tracking-tight text-[#333333] dark:text-white sm:text-3xl md:text-[34px]">
                                                        {name}
                                                        {age != null ? `, ${age}` : ""}
                                                    </h1>
                                                    {verified ? (
                                                        <CheckCircle2
                                                            className="h-6 w-6 shrink-0 text-[#2E97A0]"
                                                            aria-label={t("badges.verified")}
                                                        />
                                                    ) : null}
                                        </div>
                                                {from ? (
                                                    <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                                                        {from}
                                                    </p>
                                                ) : null}
                                                {coResidents.length > 0 ? (
                                                    <div className="mt-3">
                                                        <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                                                            {t("profile.coResidents")}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {coResidents.map((r) => (
                                                                <Link
                                                                    key={r.id}
                                                                    to={`/neighbours/${r.id}`}
                                                                    className="flex items-center gap-2 rounded-full border border-zinc-200/90 bg-zinc-50 py-1 pl-1 pr-3 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
                                                                >
                                                                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-xs font-bold dark:bg-zinc-700">
                                                                        {r.avatar ? (
                                                                            <img
                                                                                src={r.avatar}
                                                                                alt=""
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            (r.name || "?").charAt(0).toUpperCase()
                                                                        )}
                                                                    </span>
                                                                    <span className="max-w-[11rem] truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                                                        {r.name}
                                                                        {r.age != null ? `, ${r.age}` : ""}
                                                                    </span>
                                                                </Link>
                                    ))}
                                </div>
                            </div>
                                                ) : null}
                                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                                    {isAuthenticated ? (
                                    <button
                                        type="button"
                                                            onClick={handleWriteMessage}
                                                            disabled={messageStartLoading}
                                                            className="rounded-lg bg-[#C505EB] px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#BA00F8] disabled:opacity-60 dark:shadow-none"
                                                        >
                                                            {messageStartLoading ? t("loading") : t("listing.writeMessage")}
                                    </button>
                                                    ) : (
                                    <button
                                        type="button"
                                                            onClick={handleContactClick}
                                                            className="rounded-lg bg-[#C505EB] px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#BA00F8] dark:shadow-none"
                                                        >
                                                            {t("listing.writeMessage")}
                                    </button>
                                                    )}
                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <ListingImageCollage
                                    images={allImages.slice(0, 5)}
                                    totalCount={allImages.length}
                                    altPrefix={String(title || address || name || "Listing")}
                                    onCellClick={(i) => {
                                        setCurrentImageIndex(i);
                                        setIsModalOpen(true);
                                    }}
                                    viewAllLabel={t("listing.viewAllPhotos").replace(
                                        "{count}",
                                        String(allImages.length),
                                    )}
                                />
                                <div className="absolute right-3 top-3 z-10 flex items-center gap-2 min-[900px]:right-4 min-[900px]:top-4">
                                <button
                                        type="button"
                                    onClick={handleToggleFavorite}
                                        className="rounded-full bg-white/85 p-2 shadow-lg transition-colors duration-300 hover:bg-white dark:bg-gray-800/85 dark:hover:bg-gray-800 dark:shadow-gray-900/50"
                                    aria-label={t("listing.addToFavorites")}
                                >
                                    <Heart 
                                        size={24} 
                                        color={isLike ? "#C505EB" : "#666666"}
                                        fill={isLike ? "#C505EB" : "none"}
                                    />
                                </button>
                                <button
                                        type="button"
                                        className="rounded-full bg-white/85 p-2 shadow-lg transition-colors duration-300 hover:bg-white dark:bg-gray-800/85 dark:hover:bg-gray-800 dark:shadow-gray-900/50"
                                    aria-label={t("listing.share")}
                                >
                                    <Share2 size={24} color="#C505EB" />
                                </button>
                                </div>
                            </>
                        )}
                            </div>
                        </div>

                {/* Основной контент */}
                <div
                    className={
                        type === "NEIGHBOUR"
                            ? "mb-12 flex w-full flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start"
                            : "mb-12 flex w-full max-[770px]:flex-col gap-8"
                    }
                >
                    {type === "NEIGHBOUR" ? (
                        <>
                            <aside className="flex w-full shrink-0 flex-col gap-2 min-[900px]:w-[380px]">
                                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                    <div className="flex border-b border-zinc-200 dark:border-gray-700" role="tablist" aria-label={t("profile.neighbourSidebarTabs")}>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={neighbourLeftTab === "info"}
                                            onClick={() => setNeighbourLeftTab("info")}
                                            className={`min-h-[48px] flex-1 px-3 py-3 text-center text-[15px] font-semibold transition-colors ${
                                                neighbourLeftTab === "info"
                                                    ? "border-b-[3px] border-[#C505EB] text-[#C505EB] dark:border-[#D946EF] dark:text-[#D946EF]"
                                                    : "border-b-[3px] border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                                            }`}
                                        >
                                            {t("profile.information")}
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={neighbourLeftTab === "reviews"}
                                            onClick={() => setNeighbourLeftTab("reviews")}
                                            className={`min-h-[48px] flex-1 px-3 py-3 text-center text-[15px] font-semibold transition-colors ${
                                                neighbourLeftTab === "reviews"
                                                    ? "border-b-[3px] border-[#C505EB] text-[#C505EB] dark:border-[#D946EF] dark:text-[#D946EF]"
                                                    : "border-b-[3px] border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                                            }`}
                                        >
                                            {t("listing.ratingAndReviews")}
                                        </button>
                                    </div>
                                </section>
                                <section className={`overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 ${neighbourLeftTab === "info" ? "" : "hidden"}`}>
                                    <div className="px-4 py-3">
                                        {description ? (
                                            <p className="whitespace-pre-line text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                                                {description}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                {t("profile.aboutPlaceholder")}
                                            </p>
                                        )}
                                        {badges.length > 0 ? (
                                            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                                {badges.map((badge, index) => (
                                                    <span
                                                        key={index}
                                                        className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                                    >
                                                        {badge}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        {(contactPhone || contactEmail || contactInstagram || contactFacebook) && (
                                            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                                                    <MessageCircle size={18} className="text-zinc-500" />
                                                    {t("listing.contact")}
                                                </div>
                                                {contactPhone ? (
                                                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                                                            {t("messenger.contactsMessagePhone")}:
                                                        </span>{" "}
                                                        {contactPhone}
                                                    </div>
                                                ) : null}
                                                {contactEmail ? (
                                                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                                                            {t("messenger.contactsMessageEmail")}:
                                                        </span>{" "}
                                                        {contactEmail}
                                                    </div>
                                                ) : null}
                                                {contactInstagram ? (
                                                    <div className="break-all text-sm text-zinc-700 dark:text-zinc-300">
                                                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                                                            {t("profile.instagram")}:
                                                        </span>{" "}
                                                        {contactInstagram}
                                                    </div>
                                                ) : null}
                                                {contactFacebook ? (
                                                    <div className="break-all text-sm text-zinc-700 dark:text-zinc-300">
                                                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                                                            {t("profile.facebook")}:
                                                        </span>{" "}
                                                        {contactFacebook}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                        <div className="mt-4 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                                            <NeighbourFbRow label={t("listing.origin")} value={from || null} />
                                            <NeighbourFbRow
                                                label={t("profile.languages.title")}
                                                value={languages && languages.length > 0 ? languages.join(", ") : null}
                                            />
                                            <NeighbourFbRow label={t("profile.profession")} value={profession || null} />
                                            <NeighbourFbRow
                                                label={t("profile.smoking")}
                                                value={smoking ? getLifestyleValueLabel(smoking) : null}
                                            />
                                            <NeighbourFbRow
                                                label={t("profile.alcohol")}
                                                value={alcohol ? getLifestyleValueLabel(alcohol) : null}
                                            />
                                            <NeighbourFbRow label={t("profile.pets")} value={pets || null} />
                                            <NeighbourFbRow
                                                label={t("profile.sleepSchedule")}
                                                value={sleep_schedule ? getLifestyleValueLabel(sleep_schedule) : null}
                                            />
                                            <NeighbourFbRow
                                                label={t("profile.gamer")}
                                                value={gamer ? getLifestyleValueLabel(gamer) : null}
                                            />
                                            <NeighbourFbRow
                                                label={t("profile.workFromHome")}
                                                value={work_from_home ? getLifestyleValueLabel(work_from_home) : null}
                                            />
                                            <NeighbourFbRow label={t("profile.noiseTolerance")} value={noise_tolerance || null} />
                                            <NeighbourFbRow
                                                label={t("listing.scores")}
                                                value={
                                                    cleanliness !== undefined || introvert_extrovert !== undefined
                                                        ? [
                                                              cleanliness !== undefined
                                                                  ? `${t("profile.cleanliness")}: ${cleanliness}/10`
                                                                  : null,
                                                              introvert_extrovert !== undefined
                                                                  ? `${t("profile.introvertExtrovert")}: ${introvert_extrovert}/10`
                                                                  : null,
                                                          ]
                                                              .filter(Boolean)
                                                              .join(" · ")
                                                        : null
                                                }
                                            />
                                            <NeighbourFbRow label={t("profile.guestsParties")} value={guests_parties || null} />
                                            <NeighbourFbRow
                                                label={t("listing.preferences")}
                                                value={
                                                    preferred_gender || preferred_age_range
                                                        ? [
                                                              preferred_gender
                                                                  ? `${t("profile.preferredGender")}: ${preferred_gender}`
                                                                  : null,
                                                              preferred_age_range
                                                                  ? `${t("profile.preferredAgeRange")}: ${preferred_age_range}`
                                                                  : null,
                                                          ]
                                                              .filter(Boolean)
                                                              .join(" · ")
                                                        : null
                                                }
                                            />
                                            <NeighbourFbRow
                                                label={t("profile.sections.status")}
                                                value={
                                                    [verified ? t("badges.verified") : null, looking_for_housing ? t("badges.lookingForHousing") : null]
                                                        .filter(Boolean)
                                                        .join(" · ") || null
                                                }
                                            />
                                        </div>
                                    </div>
                                </section>
                                <div className={neighbourLeftTab === "reviews" ? "" : "hidden"}>
                                <NeighbourFbCard title="">
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Icon
                                                key={`avg-${star}`}
                                                icon={getStarIcon(Number(ratingAverage || 0), star)}
                                                className="h-[18px] w-[18px]"
                                                style={{ color: star <= Math.ceil(Number(ratingAverage || 0)) ? "#F59E0B" : "#9CA3AF" }}
                                            />
                                        ))}
                                        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                                            {(Number(ratingAverage || 0)).toFixed(1)} ({ratingCount || 0})
                                        </span>
                                    </div>
                                    {isAuthenticated && canReview && (
                                        <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/80">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{t("listing.yourRating")}</span>
                                            <div className="mt-2 mb-2 flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={`set-${star}`}
                                                        type="button"
                                                        onClick={() => setReviewRating(star)}
                                                        className="p-0.5"
                                                    >
                                                        <Icon
                                                            icon={star <= reviewRating ? "mdi:star" : "mdi:star-outline"}
                                                            className="h-[22px] w-[22px]"
                                                            style={{ color: star <= reviewRating ? "#F59E0B" : "#9CA3AF" }}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                rows={3}
                                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-0 duration-300 focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                                placeholder={t("listing.commentPlaceholder")}
                                            />
                                            {reviewError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{reviewError}</p> : null}
                                            <button
                                                type="button"
                                                onClick={handleSubmitReview}
                                                disabled={reviewSubmitting}
                                                className="mt-3 w-full rounded-lg bg-[#C505EB] py-2 font-semibold text-white duration-300 hover:bg-[#BA00F8] disabled:opacity-60"
                                            >
                                                {reviewSubmitting ? t("loading") : hasSubmittedReview ? t("listing.updateReview") : t("listing.submitReview")}
                                            </button>
                            </div>
                        )}
                                    {isAuthenticated && !canReview ? (
                                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t("listing.onlyCoResidentsCanReview")}</p>
                                    ) : null}
                                    <div className="mt-4 flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
                                        {(reviews || []).length > 0 ? (
                                            (reviews || []).map((review) => (
                                                <div key={review.id} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/80">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{review.reviewerName}</span>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Icon
                                                                    key={`${review.id}-${star}`}
                                                                    icon={getStarIcon(Number(review.rating || 0), star)}
                                                                    className="h-[14px] w-[14px]"
                                                                    style={{ color: star <= Math.ceil(Number(review.rating || 0)) ? "#F59E0B" : "#9CA3AF" }}
                                                                />
                                                            ))}
                    </div>
                </div>
                                                    {review.comment ? (
                                                        <p className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">{review.comment}</p>
                                                    ) : null}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("listing.noReviewsYet")}</p>
                                        )}
                                    </div>
                                </NeighbourFbCard>
                                </div>
                            </aside>
                            <div className="flex min-w-0 flex-1 flex-col gap-4">
                                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                    <div className="border-b border-zinc-200 px-4 py-3 text-[15px] font-semibold text-[#C505EB] dark:border-gray-700 dark:text-[#D946EF]">
                                        {t("profile.gallery.title")}
                                        {profileGallery.length > 0 ? (
                                            <span className="ml-1.5 tabular-nums text-xs font-bold opacity-80">
                                                ({profileGallery.length})
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="px-4 py-3">
                                        {profileGallery.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                                                {profileGallery.map((item) => {
                                                    const gi = allImages.findIndex((u) => u === item.url);
                                                    const openIdx = gi >= 0 ? gi : 0;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCurrentImageIndex(openIdx);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="relative aspect-square overflow-hidden rounded-md bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#C505EB] dark:bg-zinc-800"
                                                        >
                                                            <img
                                                                src={getImageUrl(item.url)}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                {`${String(name || "Этот пользователь")} пока что не сделал ни одной публикации`}
                                            </p>
                                        )}
                                    </div>
                                </section>
                                {canRemoveFromHome ? (
                                    <div className="rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/40 dark:bg-gray-900">
                                        <button
                                            type="button"
                                            onClick={() => setConfirmAction("remove_from_home")}
                                            disabled={removingFromHome}
                                            className="w-full rounded-lg bg-red-600 py-3 font-semibold text-white duration-300 hover:bg-red-700 disabled:opacity-60"
                                        >
                                            {removingFromHome ? t("loading") : t("listing.removeFromHome")}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <>
                    {/* Левая колонка - Информация */}
                    <div className={`flex-1 flex flex-col gap-6`}>
                        
                        {/* Заголовок и цена */}
                        <div className={`flex flex-col gap-4`}>
                            <div className={`flex items-start justify-between max-[770px]:flex-col max-[770px]:gap-3`}>
                                <div className={`flex-1`}>
                                    <>
                                    <h1 className={`text-[40px] max-[770px]:text-[28px] font-extrabold text-[#333333] dark:text-white mb-2`}>
                                            {title || `${rooms || "Byt"} ${size ? `${size} m²` : ""}`}
                                    </h1>
                                    {address && (
                                        <div className={`flex items-center gap-2 text-[#666666] dark:text-gray-400`}>
                                            <MapPin size={20} color="#666666" />
                                            <span className={`text-lg max-[770px]:text-base`}>{address}</span>
                                        </div>
                                    )}
                                    </>
                                </div>
                                {price && (
                                    <div className={`flex flex-col items-end max-[770px]:items-start`}>
                                        <span className={`text-[36px] max-[770px]:text-[28px] font-extrabold text-[#C505EB]`}>
                                            {Number(price).toLocaleString('cs-CZ')} {currency || "CZK"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Badges */}
                            {badges.length > 0 && (
                                <div className={`flex flex-wrap items-center gap-2`}>
                                    {badges.map((badge, index) => (
                                        <div 
                                            key={index}
                                            className={`px-4 py-2 rounded-full bg-[#08E2BE] border border-[#06B396] text-black text-sm max-[770px]:text-xs font-bold`}
                                        >
                                            {badge}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Детали */}
                        {Array.isArray(residents) && residents.length > 0 && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[24px] max-[770px]:text-[20px] font-bold text-[#333333] dark:text-white mb-4`}>
                                    {t("profile.residents")}
                                </h2>
                                <div className={`flex flex-wrap items-center gap-3`}>
                                    {residents.map((resident) => (
                                        <button
                                            key={resident.profileId}
                                            type="button"
                                            onClick={() => router(`/neighbours/${resident.profileId}`)}
                                            className={`w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm hover:scale-105 hover:ring-2 hover:ring-[#C505EB]/40 transition-all duration-200`}
                                            title={resident.name}
                                            aria-label={resident.name}
                                        >
                                            {resident.avatar ? (
                                                <img
                                                    src={resident.avatar}
                                                    alt={resident.name}
                                                    className={`w-full h-full object-cover`}
                                                />
                                            ) : (
                                                <div className={`w-full h-full bg-[#C505EB]/15 text-[#C505EB] text-xs font-bold flex items-center justify-center`}>
                                                    {(resident.name || "?").charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-3`}>
                            <h2 className={`text-[22px] max-[770px]:text-[18px] font-bold text-[#333333] dark:text-white mb-2.5`}>{t("listing.details")}</h2>
                            <div
                                className={`grid grid-cols-2 min-[1200px]:grid-cols-3 min-[1500px]:grid-cols-4 max-[770px]:grid-cols-1 gap-2.5
                                    [&>div]:px-2.5 [&>div]:py-2 [&>div]:gap-2 [&>div]:rounded-lg
                                    [&>div>svg]:w-4 [&>div>svg]:h-4
                                    [&>div>div>span:first-child]:text-xs
                                    [&>div>div>span:last-child]:text-sm`}
                            >
                                {size && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.area")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{size} m²</span>
                                        </div>
                                    </div>
                                )}
                                {rooms && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.layout")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{rooms}</span>
                                        </div>
                                    </div>
                                )}
                                {beds && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.beds")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{beds}</span>
                                        </div>
                                    </div>
                                )}
                                {maxResidents && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.maxResidents")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>
                                                {residentsCount ?? 0} / {maxResidents}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {(city || region) && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <MapPin size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.location")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>
                                                {city && region
                                                    ? `${city}, ${getRegionLabel(region)}`
                                                    : (city || getRegionLabel(region))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {condition_state && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.condition")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getConditionStateLabel(condition_state)}</span>
                                        </div>
                                    </div>
                                )}
                                {(
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.energyClass")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{energy_class || "-"}</span>
                                        </div>
                                    </div>
                                )}
                                {rental_period && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.rentalPeriod")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getRentalPeriodLabel(rental_period)}</span>
                                        </div>
                                    </div>
                                )}
                                {(
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("filter.preferredGender")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getPreferredGenderLabel(preferredGender)}</span>
                                        </div>
                                    </div>
                                )}
                                {move_in_date && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.moveInDate")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{move_in_date}</span>
                                        </div>
                                    </div>
                                )}
                                {Number(utilitiesFee || 0) > 0 && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.utilitiesFee")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>
                                                {Number(utilitiesFee || 0).toLocaleString("cs-CZ")} {currency || "CZK"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {Number(deposit || 0) > 0 && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.deposit")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>
                                                {Number(deposit || 0).toLocaleString("cs-CZ")} {currency || "CZK"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Инфраструктура */}
                        {(
                            has_bus_stop || has_train_station || has_metro || has_post_office || 
                            has_atm || has_general_practitioner || has_vet || has_primary_school || 
                            has_kindergarten || has_supermarket || has_small_shop || has_restaurant || 
                            has_playground
                        ) && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[28px] max-[770px]:text-[22px] font-bold text-[#333333] dark:text-white mb-4`}>{t("listing.infrastructure")}</h2>
                                <div className={`flex flex-wrap gap-3`}>
                                    {has_bus_stop && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasBusStop")}
                                        </div>
                                    )}
                                    {has_train_station && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasTrainStation")}
                                        </div>
                                    )}
                                    {has_metro && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasMetro")}
                                        </div>
                                    )}
                                    {has_post_office && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasPostOffice")}
                                        </div>
                                    )}
                                    {has_atm && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasAtm")}
                                        </div>
                                    )}
                                    {has_general_practitioner && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasGeneralPractitioner")}
                                        </div>
                                    )}
                                    {has_vet && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasVet")}
                                        </div>
                                    )}
                                    {has_primary_school && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasPrimarySchool")}
                                        </div>
                                    )}
                                    {has_kindergarten && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasKindergarten")}
                                        </div>
                                    )}
                                    {has_supermarket && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasSupermarket")}
                                        </div>
                                    )}
                                    {has_small_shop && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasSmallShop")}
                                        </div>
                                    )}
                                    {has_restaurant && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasRestaurant")}
                                        </div>
                                    )}
                                    {has_playground && (
                                        <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {t("listing.hasPlayground")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {(
                            shouldShowInternet || utilities_included || pets_allowed || smoking_allowed || has_roommates || has_video || has_3d_tour || has_floorplan
                        ) && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[28px] max-[770px]:text-[22px] font-bold text-[#333333] dark:text-white mb-4`}>{t("listing.conditions")}</h2>
                                <div className={`flex flex-wrap gap-3`}>
                                    {shouldShowInternet && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("filter.internet")}</div>}
                                    {utilities_included && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("filter.utilitiesIncluded")}</div>}
                                    {pets_allowed && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("filter.petsAllowed")}</div>}
                                    {smoking_allowed && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("filter.smokingAllowed")}</div>}
                                    {has_roommates && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("filter.hasRoommates")}</div>}
                                    {has_video && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("listing.video")}</div>}
                                    {has_3d_tour && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("listing.tour3d")}</div>}
                                    {has_floorplan && <div className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>{t("listing.floorplan")}</div>}
                                </div>
                            </div>
                        )}

                        {visibleAmenities.length > 0 && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[28px] max-[770px]:text-[22px] font-bold text-[#333333] dark:text-white mb-4`}>{t("listing.amenities")}</h2>
                                <div className={`flex flex-wrap gap-3`}>
                                    {visibleAmenities.map((amenity, index) => (
                                        <div key={`${amenity}-${index}`} className={`px-4 py-2 rounded-full bg-[#08E2BE]/10 border border-[#06B396] text-[#06B396] text-sm font-semibold`}>
                                            {getAmenityLabel(amenity)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Описание */}
                        {description && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[28px] max-[770px]:text-[22px] font-bold text-[#333333] dark:text-white mb-4`}>{t("listing.description")}</h2>
                                <p className={`text-lg max-[770px]:text-base text-[#666666] dark:text-gray-400 leading-relaxed whitespace-pre-line`}>
                                    {description}
                                </p>
                            </div>
                        )}

                        {canManage && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[24px] max-[770px]:text-[20px] font-bold text-[#333333] dark:text-white mb-4`}>
                                    {t("listing.manageActions")}
                                </h2>
                                <div className={`flex max-[770px]:flex-col gap-3`}>
                                    <button
                                        type="button"
                                        onClick={handleCreateInvite}
                                        disabled={creatingInvite}
                                        className={`px-6 py-3 rounded-lg bg-[#C505EB] text-white hover:bg-[#BA00F8] disabled:opacity-60 duration-300 font-semibold`}
                                    >
                                        {creatingInvite ? t("profile.creatingInvite") : t("profile.invite")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleInviteByQr}
                                        disabled={creatingInvite}
                                        className={`px-6 py-3 rounded-lg border border-[#C505EB] text-[#C505EB] hover:bg-[#C505EB]/10 disabled:opacity-60 duration-300 font-semibold`}
                                    >
                                        {t("profile.inviteByQr")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleEditListing}
                                        className={`px-6 py-3 rounded-lg bg-[#C505EB] text-white hover:bg-[#BA00F8] duration-300 font-semibold`}
                                    >
                                        {t("listing.edit")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleToggleActive}
                                        className={`px-6 py-3 rounded-lg bg-[#08D3E2] text-white hover:opacity-90 duration-300 font-semibold`}
                                    >
                                        {isActive ? t("listing.deactivate") : t("listing.activate")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction("delete_listing")}
                                        className={`px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 duration-300 font-semibold`}
                                    >
                                        {t("listing.delete")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Правая колонка - Контакты */}
                    <div className={`w-full max-[770px]:w-full min-[770px]:w-[400px] flex-shrink-0`}>
                        <div className={`sticky top-[120px] flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50`}>
                            <h3 className={`text-[24px] max-[770px]:text-[20px] font-bold text-[#333333] dark:text-white`}>{t("listing.contact")}</h3>
                            
                            {!isAuthenticated ? (
                                <>
                                    <div className={`flex flex-col items-center justify-center gap-4 p-6 rounded-xl bg-[#F9F9F9] dark:bg-gray-700`}>
                                        <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-[#C505EB]/10`}>
                                            <MessageCircle size={32} color="#C505EB" />
                                        </div>
                                        <p className={`text-center text-lg font-semibold text-[#333333] dark:text-white`}>
                                            {t("listing.loginToContact")}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handleContactClick}
                                        className={`w-full mt-4 py-4 rounded-full bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] text-white text-xl font-bold hover:shadow-lg duration-300`}
                                    >
                                        {t("listing.writeMessage")}
                                    </button>
                                </>
                            ) : null}

                            {(contactPhone || contactEmail || contactInstagram || contactFacebook) && (
                                <div className={`mt-2 pt-4 border-t border-[#E5E5E5] dark:border-gray-700 space-y-2`}>
                                    {contactPhone && (
                                        <div className={`text-sm text-[#333333] dark:text-gray-200`}>
                                            <span className={`font-semibold`}>{t("messenger.contactsMessagePhone")}:</span> {contactPhone}
                                        </div>
                                    )}
                                    {contactEmail && (
                                        <div className={`text-sm text-[#333333] dark:text-gray-200`}>
                                            <span className={`font-semibold`}>{t("messenger.contactsMessageEmail")}:</span> {contactEmail}
                                        </div>
                                    )}
                                    {contactInstagram && (
                                        <div className={`text-sm text-[#333333] dark:text-gray-200 break-all`}>
                                            <span className={`font-semibold`}>{t("profile.instagram")}:</span> {contactInstagram}
                                        </div>
                                    )}
                                    {contactFacebook && (
                                        <div className={`text-sm text-[#333333] dark:text-gray-200 break-all`}>
                                            <span className={`font-semibold`}>{t("profile.facebook")}:</span> {contactFacebook}
                                        </div>
                                    )}
                                </div>
                            )}

                            {mapData && (
                                <div className={`mt-2 pt-4 border-t border-[#E5E5E5] dark:border-gray-700`}>
                                    <div className={`flex items-center justify-between mb-3 gap-3`}>
                                        <h4 className={`text-[22px] max-[770px]:text-[18px] font-bold text-[#333333] dark:text-white`}>
                                            {t("listing.mapTitle")}
                                        </h4>
                                        <a
                                            href={mapData.openLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`text-sm font-semibold text-[#C505EB] hover:underline whitespace-nowrap`}
                                        >
                                            {t("listing.openMap")}
                                        </a>
                                    </div>
                                    <div className={`relative w-full h-[220px] max-[770px]:h-[210px] rounded-2xl overflow-hidden border border-[#E5E5E5] dark:border-gray-700`}>
                                        <button
                                            type="button"
                                            onClick={() => setMapRecenterTrigger((value) => value + 1)}
                                            className={`absolute bottom-3 right-3 z-[500] px-3 py-2 rounded-xl bg-white/95 dark:bg-gray-900/95 border border-[#E5E5E5] dark:border-gray-700 shadow-md text-xs font-semibold text-[#333333] dark:text-white hover:border-[#C505EB] transition-colors duration-200`}
                                        >
                                            {t("listing.backToHome")}
                                        </button>
                                        <MapContainer
                                            center={mapData.center}
                                            zoom={13}
                                            className={`w-full h-full`}
                                            scrollWheelZoom={true}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                referrerPolicy="origin"
                                            />
                                            <MapRecenterController center={mapData.center} trigger={mapRecenterTrigger} />
                                            <Marker position={[numericGeoLat, numericGeoLng]} icon={listingPinIcon}>
                                                <Tooltip direction="top" offset={[0, -12]}>{t("listing.pointListing")}</Tooltip>
                                            </Marker>
                                            {universityPoint && (
                                                <Marker position={universityPoint} icon={universityPinIcon}>
                                                    <Tooltip direction="top" offset={[0, -12]}>{t("listing.pointUniversity")}</Tooltip>
                                                </Marker>
                                            )}
                                            {workPoint && (
                                                <Marker position={workPoint} icon={workPinIcon}>
                                                    <Tooltip direction="top" offset={[0, -12]}>{t("listing.pointWork")}</Tooltip>
                                                </Marker>
                                            )}

                                            {universityRoutePoints.length > 1 && (
                                                <>
                                                    <Polyline positions={universityRoutePoints} pathOptions={{ color: "#C505EB", weight: 8, opacity: 0.22 }} />
                                                    <Polyline positions={universityRoutePoints} pathOptions={{ color: "#C505EB", weight: 4, opacity: 0.9 }} />
                                                </>
                                            )}
                                            {universityRoutePoints.length <= 1 && universityPoint && !universityRouteLoading && (
                                                <Polyline positions={[universityPoint, [numericGeoLat, numericGeoLng]]} pathOptions={{ color: "#C505EB", weight: 3, opacity: 0.7, dashArray: "8 8" }} />
                                            )}

                                            {workRoutePoints.length > 1 && (
                                                <>
                                                    <Polyline positions={workRoutePoints} pathOptions={{ color: "#06B396", weight: 8, opacity: 0.18 }} />
                                                    <Polyline positions={workRoutePoints} pathOptions={{ color: "#06B396", weight: 4, opacity: 0.9 }} />
                                                </>
                                            )}
                                            {workRoutePoints.length <= 1 && workPoint && !workRouteLoading && (
                                                <Polyline positions={[workPoint, [numericGeoLat, numericGeoLng]]} pathOptions={{ color: "#06B396", weight: 3, opacity: 0.7, dashArray: "8 8" }} />
                                            )}
                                            {nearestPoiItems.map((poi) => (
                                                <Marker
                                                    key={`poi-${poi.type}-${poi.id}`}
                                                    position={[poi.lat, poi.lon]}
                                                    icon={POI_ICONS[poi.type]}
                                                >
                                                    <Tooltip direction="top" offset={[0, -5]}>
                                                        {poi.name || poi.type.replace("_", " ")}
                                                    </Tooltip>
                                                </Marker>
                                            ))}
                                        </MapContainer>
                                    </div>
                                    <div className={`mt-4 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 bg-[#F9F9F9] dark:bg-gray-800 p-3`}>
                                        <p className={`text-sm font-semibold text-[#333333] dark:text-white mb-3`}>
                                            {t("listing.routeModeTitle")}
                                        </p>
                                        <div className={`grid grid-cols-3 gap-2`}>
                                            {(["walking", "driving", "bus"] as RouteMode[]).map((mode) => {
                                                const isActive = routeMode === mode;
                                                return (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setRouteMode(mode)}
                                                        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                                                            isActive
                                                                ? "bg-[#C505EB] text-white border-[#C505EB] shadow-sm"
                                                                : "bg-white dark:bg-gray-900 text-[#333333] dark:text-white border-[#E5E5E5] dark:border-gray-700 hover:border-[#C505EB]"
                                                        }`}
                                                    >
                                                        {getRouteModeLabel(mode)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {(universityPoint || workPoint) && (
                                        <div className={`mt-3`}>
                                            <p className={`text-sm font-semibold text-[#333333] dark:text-white mb-2`}>
                                                {t("listing.distanceTitle")} {getRouteModeLabel(routeMode).toLowerCase()}
                                            </p>
                                            <div className={`flex flex-col gap-2`}>
                                                {universityPoint && (
                                                    <div className={`rounded-xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5`}>
                                                        <p className={`text-sm font-medium text-[#666666] dark:text-gray-300`}>
                                                            {t("listing.distanceToUniversity")}
                                                        </p>
                                                        {universityRouteLoading ? (
                                                            <p className={`text-sm text-[#666666] dark:text-gray-400 mt-1`}>
                                                                {t("listing.routeLoading")} {getRouteModeLabel(routeMode).toLowerCase()}...
                                                            </p>
                                                        ) : (
                                                            <div className={`mt-2 flex items-center gap-2`}>
                                                                <span className={`px-2.5 py-1 rounded-full bg-[#C505EB]/10 text-[#C505EB] text-xs font-bold`}>
                                                                    {Number(universityDistanceKm || 0).toFixed(1)} km
                                                                </span>
                                                                <span className={`px-2.5 py-1 rounded-full bg-[#08D3E2]/10 text-[#08A7B8] text-xs font-bold`}>
                                                                    {Number(universityDurationMin || 0)} min
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {workPoint && (
                                                    <div className={`rounded-xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5`}>
                                                        <p className={`text-sm font-medium text-[#666666] dark:text-gray-300`}>
                                                            {t("listing.distanceToWork")}
                                                        </p>
                                                        {workRouteLoading ? (
                                                            <p className={`text-sm text-[#666666] dark:text-gray-400 mt-1`}>
                                                                {t("listing.routeLoading")} {getRouteModeLabel(routeMode).toLowerCase()}...
                                                            </p>
                                                        ) : (
                                                            <div className={`mt-2 flex items-center gap-2`}>
                                                                <span className={`px-2.5 py-1 rounded-full bg-[#C505EB]/10 text-[#C505EB] text-xs font-bold`}>
                                                                    {Number(workDistanceKm || 0).toFixed(1)} km
                                                                </span>
                                                                <span className={`px-2.5 py-1 rounded-full bg-[#08D3E2]/10 text-[#08A7B8] text-xs font-bold`}>
                                                                    {Number(workDurationMin || 0)} min
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {(nearestStop || nearestShop || nearestHospital) && (
                                        <div className={`mt-4 pt-4 border-t border-[#E5E5E5] dark:border-gray-700`}>
                                            <p className={`font-semibold text-[#333333] dark:text-white mb-3`}>{t("listing.nearbyServices") || "Nearby Services"}</p>
                                            <div className={`flex flex-col gap-2 text-sm text-[#666666] dark:text-gray-400`}>
                                                {nearestStop && (
                                                    <p><span className={`font-medium`}>{t("listing.nearestBusStop") || "Nearest Bus Stop"}:</span> <span className={`font-semibold text-[#333333] dark:text-white`}>{nearestStop.dist.toFixed(1)} km ({nearestStop.time} min)</span></p>
                                                )}
                                                {nearestShop && (
                                                    <p><span className={`font-medium`}>{t("listing.nearestShop") || "Nearest Shop"}:</span> <span className={`font-semibold text-[#333333] dark:text-white`}>{nearestShop.dist.toFixed(1)} km ({nearestShop.time} min)</span></p>
                                                )}
                                                {nearestHospital && (
                                                    <p><span className={`font-medium`}>{t("listing.nearestHospital") || "Nearest Hospital"}:</span> <span className={`font-semibold text-[#333333] dark:text-white`}>{nearestHospital.dist.toFixed(1)} km ({nearestHospital.time} min)</span></p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                                    </div>
                        {(
                            <button
                                onClick={handleOpenListingReport}
                                className={`mt-4 w-full py-3 rounded-full border border-red-400 text-red-600 text-base font-bold hover:bg-red-50 duration-300 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/20`}
                            >
                                {t("listing.reportListing")}
                            </button>
                        )}
                    </div>
                    </>
                    )}

                </div>

            </div>

            {confirmAction && (
                <div className="fixed inset-0 z-[1290] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(event) => event.stopPropagation()}>
                        <h3 className="mb-3 text-xl font-bold text-[#333333] dark:text-white">
                            {confirmAction === "delete_listing" ? t("listing.delete") : t("listing.removeFromHome")}
                        </h3>
                        <p className="mb-5 text-sm text-[#666666] dark:text-gray-300">
                            {confirmAction === "delete_listing" ? t("listing.confirmDelete") : t("listing.removeFromHomeConfirm")}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                onClick={() => setConfirmAction(null)}
                            >
                                {t("messenger.cancel")}
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                onClick={() => {
                                    void handleConfirmProceed();
                                }}
                            >
                                {confirmAction === "delete_listing" ? t("listing.delete") : t("listing.removeFromHome")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isReportModalOpen && (
                <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(event) => event.stopPropagation()}>
                        <h3 className="mb-3 text-xl font-bold text-[#333333] dark:text-white">{t("listing.reportListing")}</h3>
                        <select
                            value={reportReason}
                            onChange={(event) => setReportReason(event.target.value as ListingReportReason)}
                            className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        >
                            <option value="fraud">{t("listing.reportReasonFraud")}</option>
                            <option value="spam">{t("listing.reportReasonSpam")}</option>
                            <option value="fake_listing">{t("listing.reportReasonFake")}</option>
                            <option value="inappropriate_content">{t("listing.reportReasonInappropriate")}</option>
                            <option value="other">{t("listing.reportReasonOther")}</option>
                        </select>
                        <textarea
                            value={reportDetails}
                            onChange={(event) => setReportDetails(event.target.value)}
                            rows={4}
                            className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            placeholder={t("listing.reportDetailsPlaceholder")}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                onClick={() => setIsReportModalOpen(false)}
                                disabled={reportSubmitting}
                            >
                                {t("messenger.cancel")}
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                onClick={() => {
                                    void handleSubmitListingReport();
                                }}
                                disabled={reportSubmitting}
                            >
                                {reportSubmitting ? t("loading") : t("listing.sendReport")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isInviteQrModalOpen && (
                <div className="fixed inset-0 z-[1310] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setIsInviteQrModalOpen(false)}
                        aria-label={t("profile.closeQrModal")}
                    />
                    <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => setIsInviteQrModalOpen(false)}
                            className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label={t("profile.closeQrModal")}
                        >
                            <X size={18} />
                        </button>
                        <h3 className="mb-2 text-lg font-semibold text-[#333333] dark:text-white">
                            {t("profile.inviteByQr")}
                        </h3>
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                            {t("profile.scanQrHint")}
                        </p>
                        <div className="mx-auto h-64 w-64 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(inviteQrLink)}`}
                                alt={t("profile.inviteByQr")}
                                className="h-full w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div className="pointer-events-none fixed bottom-6 right-6 z-[1310] max-[520px]:left-4 max-[520px]:right-4">
                    {toast.rich && toast.kind === "success" ? (
                        <div
                            className="flex max-w-[min(100vw-2rem,320px)] items-center gap-3 rounded-2xl border border-emerald-400/45 bg-white/95 px-4 py-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-300 dark:border-emerald-500/35 dark:bg-gray-950/95"
                            role="status"
                            aria-live="polite"
                        >
                            <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-[#06B396] text-white shadow-md ring-2 ring-white/50 dark:ring-white/20"
                                aria-hidden
                            >
                                <Icon icon="mdi:check-bold" className="h-[18px] w-[18px]" />
                            </span>
                            <p className="text-left text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50">
                        {toast.message}
                            </p>
                    </div>
                    ) : (
                        <div
                            className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.kind === "success" ? "bg-emerald-600" : "bg-red-600"}`}
                        >
                            {toast.message}
                        </div>
                    )}
                </div>
            )}

            {/* Модальное окно для полноэкранного просмотра */}
            {isModalOpen && (
                <div 
                    className={`fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-in fade-in duration-300`}
                    onClick={(e) => {
                        // Закрываем модальное окно только при клике на фон (черный край)
                        if (e.target === e.currentTarget) {
                            setIsModalOpen(false);
                        }
                    }}
                >
                    {/* Кнопка закрытия */}
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className={`absolute top-4 right-4 z-[10000] bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all duration-300`}
                        aria-label={t("listing.close")}
                    >
                        <X size={32} color="#ffffff" />
                    </button>

                    {/* Контейнер изображения */}
                    <div 
                        className={`relative w-full h-full flex items-center justify-center p-4`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Главное изображение в модальном окне */}
                        <div className={`relative w-full max-w-7xl h-full max-h-[90vh] flex items-center justify-center overflow-hidden`}>
                            {allImages.map((img, index) => (
                                <div 
                                    key={index}
                                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out`}
                                    style={{ 
                                        opacity: index === currentImageIndex ? 1 : 0,
                                        pointerEvents: index === currentImageIndex ? 'auto' : 'none',
                                        zIndex: index === currentImageIndex ? 1 : 0
                                    }}
                                >
                                    <img 
                                        src={img} 
                                        alt={`${title || address || name} - ${index + 1}`}
                                        className={`max-w-full max-h-full object-contain select-none pointer-events-none`}
                                        draggable={false}
                                    />
                                </div>
                            ))}

                            {/* Кнопки навигации в модальном окне */}
                            {allImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            prevImage();
                                        }}
                                        disabled={isTransitioning || allImages.length <= 1}
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10 transition-all duration-300`}
                                        aria-label={t("listing.previousImage")}
                                    >
                                        <ChevronLeft size={32} color="#ffffff" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            nextImage();
                                        }}
                                        disabled={isTransitioning || allImages.length <= 1}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10 transition-all duration-300`}
                                        aria-label={t("listing.nextImage")}
                                    >
                                        <ChevronRight size={32} color="#ffffff" />
                                    </button>
                                </>
                            )}

                            {/* Индикатор в модальном окне */}
                            {allImages.length > 1 && (
                                <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-6 py-3`}>
                                    <span className={`text-white text-lg font-semibold`}>
                                        {currentImageIndex + 1} / {allImages.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Превью в модальном окне */}
                    {allImages.length > 1 && (
                        <div 
                            className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 bg-black/50 rounded-2xl backdrop-blur-sm max-w-[90vw] overflow-x-auto scroll-smooth z-[10001]`}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        >
                            {allImages.map((img, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isTransitioning && index !== currentImageIndex) {
                                            goToImage(index);
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isTransitioning && index !== currentImageIndex) {
                                            goToImage(index);
                                        }
                                    }}
                                    disabled={isTransitioning || index === currentImageIndex}
                                    className={`flex-shrink-0 w-[80px] h-[60px] max-[770px]:w-[70px] max-[770px]:h-[52px] min-[770px]:min-w-[80px] min-[770px]:min-h-[60px] rounded-lg overflow-hidden border-2 transition-all duration-300 ease-in-out touch-manipulation ${
                                        currentImageIndex === index 
                                            ? 'border-white scale-110 shadow-lg' 
                                            : 'border-white/30 hover:border-white/60 hover:scale-105 active:scale-95'
                                    } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    <img 
                                        src={img} 
                                        alt={`Obrázek ${index + 1}`}
                                        className={`w-full h-full object-cover transition-opacity duration-300 select-none pointer-events-none`}
                                        draggable={false}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>
    );

}
