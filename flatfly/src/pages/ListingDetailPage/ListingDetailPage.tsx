import {useState, useEffect} from "react";
import {ChevronLeft, ChevronRight, Heart, Share2, MapPin, Bed, Square, Phone, Mail, X} from "lucide-react";
import {Link, useNavigate, useParams, useLocation} from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
//import {ApartmentList, RoomsList, NeighboursList} from "../../data/mockData";
//import type {ApartmentItem, RoomItem, NeighbourItem} from "../../data/mockData";

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
    
    // Состояние для данных листинга
    const [listingData, setListingData] = useState<{
        price?: number;
        address?: string;
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
        contactPhone?: string;
        contactEmail?: string;
        smoking?: string;
        alcohol?: string;
        pets?: string;
        sleep_schedule?: string;
        gamer?: string;
        work_from_home?: string;
        verified?: boolean;
        looking_for_housing?: boolean;
        languages?: string[];
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
                const neighbourBadges: string[] = [];
                if (data.verified) neighbourBadges.push("Verified");
                if (data.looking_for_housing) neighbourBadges.push("Looking for housing");
                if (data.gender) neighbourBadges.push(`Gender: ${data.gender}`);
                if (data.smoking) neighbourBadges.push(`Smoking: ${data.smoking}`);
                if (data.alcohol) neighbourBadges.push(`Alcohol: ${data.alcohol}`);
                if (data.pets) neighbourBadges.push(`Pets: ${data.pets}`);
                if (data.sleep_schedule) neighbourBadges.push(`Sleep: ${data.sleep_schedule}`);
                if (data.gamer) neighbourBadges.push(`Gamer: ${data.gamer}`);
                if (data.work_from_home) neighbourBadges.push(`Work from home: ${data.work_from_home}`);

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
                    smoking: data.smoking,
                    alcohol: data.alcohol,
                    pets: data.pets,
                    sleep_schedule: data.sleep_schedule,
                    gamer: data.gamer,
                    work_from_home: data.work_from_home,
                    verified: data.verified,
                    looking_for_housing: data.looking_for_housing,
                    languages: data.languages,
                });
                return;
            }

            // Объявления
            setListingData({
                price: data.price,
                address: data.address,
                size: data.size,
                rooms: data.rooms,
                image: data.images?.[0] || null,
                images: data.images || [],
                badges: data.badges || [],
                title: data.title,
                description: data.description,
                beds: data.beds,
                name: data.name,
                age: data.age,
                from: data.from,
                contactPhone: data.contact_phone,
                contactEmail: data.contact_email,
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
    const {
        price,
        address,
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
        contactPhone,
        contactEmail,
        smoking,
        alcohol,
        pets,
        sleep_schedule,
        gamer,
        work_from_home,
        verified,
        looking_for_housing,
        languages,
    } = listingData;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLike, setIsLike] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    return(
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900 pt-[100px]`}>
            
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>

                {/* Кнопка назад */}
                <div className={`w-full flex items-start mt-8 mb-4`}>
                    <Link 
                        to={type === "APARTMENT" ? "/apartments" : type === "ROOM" ? "/rooms" : "/neighbours"}
                        className={`flex items-center gap-2 text-[#C505EB] hover:text-[#BA00F8] duration-300 font-semibold`}
                    >
                        <ChevronLeft size={20} />
                        <span>{t("listing.back")}</span>
                    </Link>
                </div>

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
                                    onClick={() => setIsLike(!isLike)}
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
                                            {price.toLocaleString('cs-CZ')} Kč
                                        </span>
                                        <span className={`text-[18px] max-[770px]:text-base text-[#666666]`}>{t("listing.perMonth")}</span>
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
                                {type === "NEIGHBOUR" && smoking && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Smoking</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{smoking}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && alcohol && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Alcohol</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{alcohol}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && pets && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Pets</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{pets}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && sleep_schedule && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Sleep schedule</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{sleep_schedule}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && gamer && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Gamer</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{gamer}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && work_from_home && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Work from home</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{work_from_home}</span>
                                        </div>
                                    </div>
                                )}
                                {type === "NEIGHBOUR" && (verified !== undefined || looking_for_housing !== undefined) && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-800`}>
                                        <Bed size={24} color="#C505EB" />
                                        <div className={`flex flex-col`}>
                                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>Status</span>
                                            <span className={`text-lg font-bold text-black dark:text-white`}>{[
                                                verified ? "Verified" : null,
                                                looking_for_housing ? "Looking for housing" : null
                                            ].filter(Boolean).join(" · ")}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Описание */}
                        {description && (
                            <div className={`w-full border-t border-[#E5E5E5] dark:border-gray-700 pt-6`}>
                                <h2 className={`text-[28px] max-[770px]:text-[22px] font-bold text-[#333333] dark:text-white mb-4`}>{t("listing.description")}</h2>
                                <p className={`text-lg max-[770px]:text-base text-[#666666] dark:text-gray-400 leading-relaxed whitespace-pre-line`}>
                                    {description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Правая колонка - Контакты */}
                    <div className={`w-full max-[770px]:w-full min-[770px]:w-[400px] flex-shrink-0`}>
                        <div className={`sticky top-[120px] flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50`}>
                            <h3 className={`text-[24px] max-[770px]:text-[20px] font-bold text-[#333333] dark:text-white`}>{t("listing.contact")}</h3>
                            
                            {isAuthenticated ? (
                                <>
                                    {contactPhone && (
                                        <a 
                                            href={`tel:${contactPhone}`}
                                            className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-700 hover:bg-[#F5F5F5] dark:hover:bg-gray-600 duration-300`}
                                        >
                                            <Phone size={24} color="#C505EB" />
                                            <span className={`text-lg font-semibold text-[#333333] dark:text-white`}>{contactPhone}</span>
                                        </a>
                                    )}

                                    {contactEmail && (
                                        <a 
                                            href={`mailto:${contactEmail}`}
                                            className={`flex items-center gap-3 p-4 rounded-xl bg-[#F9F9F9] dark:bg-gray-700 hover:bg-[#F5F5F5] dark:hover:bg-gray-600 duration-300`}
                                        >
                                            <Mail size={24} color="#C505EB" />
                                            <span className={`text-lg font-semibold text-[#333333] dark:text-white`}>{contactEmail}</span>
                                        </a>
                                    )}

                                    <button className={`w-full mt-4 py-4 rounded-full bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] text-white text-xl font-bold hover:shadow-lg duration-300`}>
                                        {t("listing.sendMessage")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className={`flex flex-col items-center justify-center gap-4 p-6 rounded-xl bg-[#F9F9F9] dark:bg-gray-700`}>
                                        <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-[#C505EB]/10`}>
                                            <Phone size={32} color="#C505EB" />
                                        </div>
                                        <p className={`text-center text-lg font-semibold text-[#333333] dark:text-white`}>
                                            {t("listing.loginToViewContacts")}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handleContactClick}
                                        className={`w-full mt-4 py-4 rounded-full bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] text-white text-xl font-bold hover:shadow-lg duration-300`}
                                    >
                                        {t("listing.loginToContact")}
                                    </button>
                                </>
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
