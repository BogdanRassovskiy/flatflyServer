import {useState, useEffect, useMemo} from "react";
import {ChevronLeft, ChevronRight, Heart, Share2, MapPin, Bed, Square, MessageCircle, X} from "lucide-react";
import {Icon} from "@iconify/react";
import {useNavigate, useParams, useLocation} from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import {getCsrfToken} from "../../utils/csrf";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
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

const estimateDurationMinutes = (distanceKm: number): number => {
    const avgCitySpeedKmH = 40;
    return Math.max(1, Math.round((distanceKm / avgCitySpeedKmH) * 60));
};

type ListingType = "ROOM" | "NEIGHBOUR" | "APARTMENT";

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

                setListingData({
                    image: data.avatar || null,
                    images: data.avatar ? [data.avatar] : [],
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
        
        try {
            const isNeighbour = type === "NEIGHBOUR";
            const endpoint = isLike ? "/api/favorites/remove/" : "/api/favorites/add/";
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
            
            if (res.ok) {
                setIsLike(!isLike);
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
    } = listingData;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLike, setIsLike] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [messageStartLoading, setMessageStartLoading] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [removingFromHome, setRemovingFromHome] = useState(false);
    const [reviewRating, setReviewRating] = useState<number>(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);
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
    const [nearestStop, setNearestStop] = useState<{ dist: number; time: number } | null>(null);
    const [nearestShop, setNearestShop] = useState<{ dist: number; time: number } | null>(null);
    const [nearestHospital, setNearestHospital] = useState<{ dist: number; time: number } | null>(null);
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

    const handleContactClick = () => {
        if (!isAuthenticated) {
            router("/auth");
        }
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

    useEffect(() => {
        if (type !== "NEIGHBOUR") {
            return;
        }
        setReviewRating(typeof myRating === "number" ? myRating : 0);
        setReviewComment(myComment || "");
    }, [type, myRating, myComment]);

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
        if (!window.confirm(t("listing.confirmDelete"))) return;

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
            alert(error instanceof Error ? error.message : t("listing.actionFailed"));
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
            alert(error instanceof Error ? error.message : t("listing.actionFailed"));
        }
    };

    const handleCreateInvite = async () => {
        if (!id || type === "NEIGHBOUR") return;

        try {
            setCreatingInvite(true);
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
            const link = data.inviteUrl
                ? (data.inviteUrl.startsWith("http") ? data.inviteUrl : `${window.location.origin}${data.inviteUrl}`)
                : `${window.location.origin}/api/listings/invite/${token}/join/`;

            await navigator.clipboard.writeText(link);
            alert(t("profile.copied"));
        } catch (e) {
            alert(e instanceof Error ? e.message : t("profile.inviteFailed"));
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
        if (!window.confirm(t("listing.removeFromHomeConfirm"))) {
            return;
        }

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

            alert(t("listing.removedFromHomeSuccess"));
            setListingData((prev) => ({
                ...prev,
                canRemoveFromHome: false,
            }));
        } catch (error) {
            alert(error instanceof Error ? error.message : t("listing.actionFailed"));
        } finally {
            setRemovingFromHome(false);
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
                const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) {
                    setPoints([]);
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [endLat, endLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm));
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
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm));
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
                    if (Number.isFinite(routeDurationSeconds) && routeDurationSeconds > 0) {
                        setDurationMin(Math.max(1, Math.round(routeDurationSeconds / 60)));
                    } else {
                        setDurationMin(estimateDurationMinutes(distanceKm));
                    }
                } else {
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [endLat, endLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm));
                }
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setPoints([]);
                    const fallbackDistanceKm = haversineDistanceKm(sourcePoint, [numericGeoLat, numericGeoLng]);
                    setDistanceKm(fallbackDistanceKm);
                    setDurationMin(estimateDurationMinutes(fallbackDistanceKm));
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
    }, [hasCoordinates, universityPoint, workPoint, type, numericGeoLat, numericGeoLng]);

    useEffect(() => {
        if (!hasCoordinates || type === "NEIGHBOUR") return;
        const controller = new AbortController();
        const loadPoi = async () => {
            const lat = numericGeoLat;
            const lng = numericGeoLng;
            const query = `[out:json][timeout:15];
(
  node[highway=bus_stop](around:600,${lat},${lng});
  nwr[amenity=hospital](around:1500,${lat},${lng});
  nwr[amenity=clinic](around:1000,${lat},${lng});
  nwr[shop=supermarket](around:1000,${lat},${lng});
  node[railway=station](around:1500,${lat},${lng});
  node[railway=subway_entrance](around:1500,${lat},${lng});
  nwr[amenity=school](around:1000,${lat},${lng});
  node[railway=halt](around:3000,${lat},${lng});
);
out center;`;
            try {
                const res = await fetch("https://overpass-api.de/api/interpreter", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal,
                });
                if (!res.ok) return;
                const data = await res.json();
                const items: PoiItem[] = [];
                for (const el of (data.elements ?? [])) {
                    const tags: Record<string, string> = el.tags ?? {};
                    const elLat: number | undefined = el.lat ?? el.center?.lat;
                    const elLon: number | undefined = el.lon ?? el.center?.lon;
                    if (!elLat || !elLon) continue;
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
            } catch (e: unknown) {
                if ((e as { name?: string })?.name !== "AbortError") console.error("POI load failed", e);
            }
        };
        loadPoi();
        return () => controller.abort();
    }, [hasCoordinates, type, numericGeoLat, numericGeoLng]);

    useEffect(() => {
        if (!hasCoordinates || !poiItems.length) {
            setNearestStop(null);
            setNearestShop(null);
            setNearestHospital(null);
            return;
        }
        const listingLoc: [number, number] = [numericGeoLat, numericGeoLng];
        let stop_dist = Infinity, shop_dist = Infinity, hosp_dist = Infinity;
        for (const poi of poiItems) {
            const dist = haversineDistanceKm(listingLoc, [poi.lat, poi.lon]);
            if (poi.type === "bus_stop" && dist < stop_dist) stop_dist = dist;
            if (poi.type === "supermarket" && dist < shop_dist) shop_dist = dist;
            if (poi.type === "hospital" && dist < hosp_dist) hosp_dist = dist;
        }
        setNearestStop(stop_dist < Infinity ? { dist: stop_dist, time: estimateDurationMinutes(stop_dist) } : null);
        setNearestShop(shop_dist < Infinity ? { dist: shop_dist, time: estimateDurationMinutes(shop_dist) } : null);
        setNearestHospital(hosp_dist < Infinity ? { dist: hosp_dist, time: estimateDurationMinutes(hosp_dist) } : null);
    }, [poiItems, hasCoordinates, numericGeoLat, numericGeoLng]);

    const mapData = useMemo(() => {
        if (!hasCoordinates) {
            return null;
        }
        const openLink = `https://www.openstreetmap.org/?mlat=${numericGeoLat}&mlon=${numericGeoLng}#map=14/${numericGeoLat}/${numericGeoLng}`;
        const center: [number, number] = [numericGeoLat, numericGeoLng];
        return { openLink, center };
    }, [hasCoordinates, numericGeoLat, numericGeoLng]);

    return(
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-transparent pt-[100px]`}>
            
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>

                {/* Галерея изображений */}
                <div className={`w-full flex flex-col items-center gap-4 mb-8`}>
                    <div className={`w-full relative group`}>
                        {/* Главное изображение */}
                        <div className={`w-full h-[600px] max-[770px]:h-[300px] rounded-2xl overflow-hidden relative`}>
                            <div className={`relative w-full h-full overflow-hidden`}>
                                <div 
                                    className={`flex transition-transform duration-700 ease-in-out h-full will-change-transform`}
                                    style={{
                                        transform: `translateX(-${(currentImageIndex * 100) / allImages.length}%)`,
                                        width: `${allImages.length * 100}%`
                                    }}
                                >
                                    {allImages.map((img, index) => (
                                        <div 
                                            key={index}
                                            className={`flex-shrink-0 h-full cursor-pointer`}
                                            style={{ 
                                                width: `${100 / allImages.length}%`,
                                                minWidth: `${100 / allImages.length}%`
                                            }}
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            <img 
                                                src={img} 
                                                alt={`${title || address || name} - ${index + 1}`}
                                                className={`w-full h-full object-cover select-none pointer-events-none`}
                                                draggable={false}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Кнопки навигации */}
                            {allImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            prevImage();
                                        }}
                                        disabled={isTransitioning || allImages.length <= 1}
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full p-2 shadow-lg dark:shadow-gray-900/50 opacity-0 group-hover:opacity-100 duration-300 max-[770px]:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed z-10`}
                                        aria-label={t("listing.previousImage")}
                                    >
                                        <ChevronLeft size={24} color="#C505EB" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            nextImage();
                                        }}
                                        disabled={isTransitioning || allImages.length <= 1}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full p-2 shadow-lg dark:shadow-gray-900/50 opacity-0 group-hover:opacity-100 duration-300 max-[770px]:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed z-10`}
                                        aria-label={t("listing.nextImage")}
                                    >
                                        <ChevronRight size={24} color="#C505EB" />
                                    </button>
                                </>
                            )}

                            {/* Индикатор текущего изображения */}
                            {allImages.length > 1 && (
                                <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2`}>
                                    <span className={`text-white text-sm font-semibold`}>
                                        {currentImageIndex + 1} / {allImages.length}
                                    </span>
                                </div>
                            )}

                            {/* Кнопки действий */}
                            <div className={`absolute top-4 right-4 flex items-center gap-2`}>
                                <button
                                    onClick={handleToggleFavorite}
                                    className={`bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full p-2 shadow-lg dark:shadow-gray-900/50 duration-300`}
                                    aria-label={t("listing.addToFavorites")}
                                >
                                    <Heart 
                                        size={24} 
                                        color={isLike ? "#C505EB" : "#666666"}
                                        fill={isLike ? "#C505EB" : "none"}
                                    />
                                </button>
                                <button
                                    className={`bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full p-2 shadow-lg dark:shadow-gray-900/50 duration-300`}
                                    aria-label={t("listing.share")}
                                >
                                    <Share2 size={24} color="#C505EB" />
                                </button>
                            </div>
                        </div>

                        {/* Миниатюры (Превью) */}
                        {allImages.length > 1 && (
                            <div className={`w-full flex items-center justify-center gap-3 py-3 overflow-x-auto scroll-smooth px-2`}>
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
                                        disabled={isTransitioning || index === currentImageIndex}
                                        className={`flex-shrink-0 w-[100px] h-[70px] max-[770px]:w-[80px] max-[770px]:h-[56px] rounded-lg overflow-hidden border-2 transition-all duration-300 ease-in-out ${
                                            currentImageIndex === index 
                                                ? 'border-[#C505EB] scale-105 shadow-md ring-2 ring-[#C505EB] ring-opacity-50' 
                                                : 'border-[#E5E5E5] dark:border-gray-600 hover:border-[#C505EB] hover:scale-102'
                                        } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                </div>

                {/* Основной контент */}
                <div className={`w-full flex max-[770px]:flex-col gap-8 mb-12`}>
                    
                    {/* Левая колонка - Информация */}
                    <div className={`flex-1 flex flex-col gap-6`}>
                        
                        {/* Заголовок и цена */}
                        <div className={`flex flex-col gap-4`}>
                            <div className={`flex items-start justify-between max-[770px]:flex-col max-[770px]:gap-3`}>
                                <div className={`flex-1`}>
                                    <h1 className={`text-[40px] max-[770px]:text-[28px] font-extrabold text-[#333333] dark:text-white mb-2`}>
                                        {title || (type === "NEIGHBOUR" ? `${name}, ${age}` : `${rooms || "Byt"} ${size ? `${size} m²` : ""}`)}
                                    </h1>
                                    {address && (
                                        <div className={`flex items-center gap-2 text-[#666666] dark:text-gray-400`}>
                                            <MapPin size={20} color="#666666" />
                                            <span className={`text-lg max-[770px]:text-base`}>{address}</span>
                                        </div>
                                    )}
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
                        {type !== "NEIGHBOUR" && Array.isArray(residents) && residents.length > 0 && (
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

                        <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                            <h2 className={`text-[28px] max-[770px]:text-[22px] font-bold text-[#333333] dark:text-white mb-4`}>{t("listing.details")}</h2>
                            <div className={`grid grid-cols-2 max-[770px]:grid-cols-1 gap-4`}>
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
                                {type !== "NEIGHBOUR" && maxResidents && (
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
                                {type !== "NEIGHBOUR" && (city || region) && (
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
                                {type !== "NEIGHBOUR" && condition_state && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.condition")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getConditionStateLabel(condition_state)}</span>
                                        </div>
                                    </div>
                                )}
                                {type !== "NEIGHBOUR" && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.energyClass")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{energy_class || "-"}</span>
                                        </div>
                                    </div>
                                )}
                                {type !== "NEIGHBOUR" && rental_period && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.rentalPeriod")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getRentalPeriodLabel(rental_period)}</span>
                                        </div>
                                    </div>
                                )}
                                {type !== "NEIGHBOUR" && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("filter.preferredGender")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getPreferredGenderLabel(preferredGender)}</span>
                                        </div>
                                    </div>
                                )}
                                {type !== "NEIGHBOUR" && move_in_date && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Square size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.moveInDate")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{move_in_date}</span>
                                        </div>
                                    </div>
                                )}
                                {type !== "NEIGHBOUR" && Number(utilitiesFee || 0) > 0 && (
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
                                {type !== "NEIGHBOUR" && Number(deposit || 0) > 0 && (
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
                                {type === "NEIGHBOUR" && from && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <MapPin size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.origin")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{from}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && languages && languages.length > 0 && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <MapPin size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.languages.title") || "Languages"}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{languages.join(", ")}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && profession && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <MapPin size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.profession") || "Profession"}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{profession}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && smoking && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.smoking")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getLifestyleValueLabel(smoking)}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && alcohol && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.alcohol")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getLifestyleValueLabel(alcohol)}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && pets && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.pets")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{pets}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && sleep_schedule && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.sleepSchedule")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getLifestyleValueLabel(sleep_schedule)}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && gamer && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.gamer")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getLifestyleValueLabel(gamer)}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && work_from_home && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.workFromHome")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{getLifestyleValueLabel(work_from_home)}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && noise_tolerance && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.noiseTolerance") || "Noise tolerance"}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{noise_tolerance}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && (cleanliness !== undefined || introvert_extrovert !== undefined) && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.scores")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>
                                                {cleanliness !== undefined ? `${t("profile.cleanliness")}: ${cleanliness}/10` : ""}
                                                {cleanliness !== undefined && introvert_extrovert !== undefined ? " · " : ""}
                                                {introvert_extrovert !== undefined ? `${t("profile.introvertExtrovert")}: ${introvert_extrovert}/10` : ""}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && guests_parties && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.guestsParties") || "Guests/Parties"}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{guests_parties}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && (preferred_gender || preferred_age_range) && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("listing.preferences")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>
                                                {preferred_gender ? `${t("profile.preferredGender") || "Gender"}: ${preferred_gender}` : ""}
                                                {preferred_gender && preferred_age_range ? " · " : ""}
                                                {preferred_age_range ? `${t("profile.preferredAgeRange") || "Age"}: ${preferred_age_range}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && (verified !== undefined || looking_for_housing !== undefined) && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>{t("profile.sections.status")}</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{[
                                                verified ? t("badges.verified") : null,
                                                looking_for_housing ? t("badges.lookingForHousing") : null
                                            ].filter(Boolean).join(" · ")}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Инфраструктура */}
                        {type !== "NEIGHBOUR" && (
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

                        {type !== "NEIGHBOUR" && (
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

                        {type !== "NEIGHBOUR" && visibleAmenities.length > 0 && (
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

                        {type !== "NEIGHBOUR" && canManage && (
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
                                        onClick={handleDeleteListing}
                                        className={`px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 duration-300 font-semibold`}
                                    >
                                        {t("listing.delete")}
                                    </button>
                                </div>
                            </div>
                        )}

                        {type === "NEIGHBOUR" && canRemoveFromHome && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <button
                                    type="button"
                                    onClick={handleRemoveFromHome}
                                    disabled={removingFromHome}
                                    className={`px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 duration-300 font-semibold`}
                                >
                                    {removingFromHome ? t("loading") : t("listing.removeFromHome")}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Правая колонка - Контакты */}
                    <div className={`w-full max-[770px]:w-full min-[770px]:w-[400px] flex-shrink-0`}>
                        <div className={`sticky top-[120px] flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50`}>
                            <h3 className={`text-[24px] max-[770px]:text-[20px] font-bold text-[#333333] dark:text-white`}>{t("listing.contact")}</h3>
                            
                            {isAuthenticated ? (
                                <>
                                    {type === "NEIGHBOUR" && (
                                        <button
                                            onClick={handleWriteMessage}
                                            disabled={messageStartLoading}
                                            className={`w-full py-4 rounded-full bg-gradient-to-r from-[#C505EB] to-[#08D3E2] text-white text-xl font-bold hover:shadow-lg duration-300`}
                                        >
                                            {messageStartLoading ? t("loading") : t("listing.writeMessage")}
                                        </button>
                                    )}
                                </>
                            ) : (
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
                            )}

                            {type !== "NEIGHBOUR" && mapData && (
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
                                    <div className={`w-full h-[220px] max-[770px]:h-[210px] rounded-2xl overflow-hidden border border-[#E5E5E5] dark:border-gray-700`}>
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
                                            {poiItems.map((poi) => (
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
                                    {(universityPoint || workPoint) && (
                                        <div className={`mt-2 text-sm text-[#666666] dark:text-gray-400`}> 
                                            <p className={`font-semibold`}>{t("listing.distanceTitle")}</p>
                                            {universityPoint && (
                                                <p className={`mt-1`}>
                                                    {universityRouteLoading
                                                        ? t("listing.routeLoadingUniversity")
                                                        : `${t("listing.distanceToUniversity")}: ${Number(universityDistanceKm || 0).toFixed(1)} km (${Number(universityDurationMin || 0)} min)`}
                                                </p>
                                            )}
                                            {workPoint && (
                                                <p className={`mt-1`}>
                                                    {workRouteLoading
                                                        ? t("listing.routeLoadingWork")
                                                        : `${t("listing.distanceToWork")}: ${Number(workDistanceKm || 0).toFixed(1)} km (${Number(workDurationMin || 0)} min)`}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {type === "NEIGHBOUR" && (
                                <div className={`mt-2 pt-4 border-t border-[#E5E5E5] dark:border-gray-700`}>
                                    <h4 className={`text-[22px] max-[770px]:text-[18px] font-bold text-[#333333] dark:text-white mb-2`}>
                                        {t("listing.ratingAndReviews")}
                                    </h4>

                                    <div className={`flex items-center gap-2 mb-3`}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Icon
                                                key={`avg-${star}`}
                                                icon={getStarIcon(Number(ratingAverage || 0), star)}
                                                className={`w-[18px] h-[18px]`}
                                                style={{ color: star <= Math.ceil(Number(ratingAverage || 0)) ? "#F59E0B" : "#9CA3AF" }}
                                            />
                                        ))}
                                        <span className={`text-sm font-semibold text-[#666666] dark:text-gray-300`}>
                                            {(Number(ratingAverage || 0)).toFixed(1)} ({ratingCount || 0})
                                        </span>
                                    </div>

                                    {isAuthenticated && canReview && (
                                        <div className={`mb-4 p-3 rounded-xl bg-[#F9F9F9] dark:bg-gray-700`}>
                                            <span className={`text-sm font-semibold text-[#333333] dark:text-white`}>
                                                {t("listing.yourRating")}
                                            </span>
                                            <div className={`flex items-center gap-1 mt-2 mb-2`}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={`set-${star}`}
                                                        type="button"
                                                        onClick={() => setReviewRating(star)}
                                                        className={`p-0.5`}
                                                    >
                                                        <Icon
                                                            icon={star <= reviewRating ? "mdi:star" : "mdi:star-outline"}
                                                            className={`w-[22px] h-[22px]`}
                                                            style={{ color: star <= reviewRating ? "#F59E0B" : "#9CA3AF" }}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                rows={3}
                                                className={`w-full border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-0 focus:border-[#C505EB] duration-300`}
                                                placeholder={t("listing.commentPlaceholder")}
                                            />
                                            {reviewError && (
                                                <p className={`mt-2 text-sm text-red-600 dark:text-red-400`}>{reviewError}</p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSubmitReview}
                                                disabled={reviewSubmitting}
                                                className={`mt-3 w-full py-2 rounded-lg bg-[#C505EB] text-white font-semibold hover:bg-[#BA00F8] disabled:opacity-60 duration-300`}
                                            >
                                                {reviewSubmitting ? t("loading") : hasSubmittedReview ? t("listing.updateReview") : t("listing.submitReview")}
                                            </button>
                                        </div>
                                    )}

                                    {isAuthenticated && !canReview && (
                                        <p className={`mb-3 text-sm text-[#666666] dark:text-gray-400`}>
                                            {t("listing.onlyCoResidentsCanReview")}
                                        </p>
                                    )}

                                    <div className={`flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1`}>
                                        {(reviews || []).length > 0 ? (
                                            (reviews || []).map((review) => (
                                                <div key={review.id} className={`p-3 rounded-xl bg-[#F9F9F9] dark:bg-gray-700`}>
                                                    <div className={`flex items-center justify-between gap-2`}>
                                                        <span className={`text-sm font-semibold text-[#333333] dark:text-white`}>
                                                            {review.reviewerName}
                                                        </span>
                                                        <div className={`flex items-center gap-1`}>
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Icon
                                                                    key={`${review.id}-${star}`}
                                                                    icon={getStarIcon(Number(review.rating || 0), star)}
                                                                    className={`w-[14px] h-[14px]`}
                                                                    style={{ color: star <= Math.ceil(Number(review.rating || 0)) ? "#F59E0B" : "#9CA3AF" }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {review.comment && (
                                                        <p className={`mt-1 text-sm text-[#666666] dark:text-gray-300 whitespace-pre-line`}>
                                                            {review.comment}
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className={`text-sm text-[#666666] dark:text-gray-400`}>
                                                {t("listing.noReviewsYet")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>

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
