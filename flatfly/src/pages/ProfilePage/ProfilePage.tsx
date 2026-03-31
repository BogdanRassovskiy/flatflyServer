import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { User, Camera, Save, CheckCircle, ChevronLeft, ChevronRight, Heart, X, Crown } from "lucide-react";
import { Icon } from "@iconify/react";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getCsrfToken } from "../../utils/csrf";
import SaleCard from "../../components/SaleCard/SaleCard";
import { getImageUrl } from "../../utils/defaultImage";
import MapPicker from "../../components/MapPicker/MapPicker";

interface ProfileData {
    // Основная информация
    photo: string;
    name: string;
    phone: string;
    age: string;
    gender: string;
    city: string;
    locationRegion: string;
    locationCity: string;
    locationAddress: string;
    locationLat: number | null;
    locationLng: number | null;
    languages: string[];
    universityId: number | null;
    facultyId: number | null;
    universityName: string;
    facultyName: string;
    profession: string;
    instagram: string;
    facebook: string;
    about: string;
    
    // Социальные параметры
    smoking: string;
    alcohol: string;
    sleepSchedule: string;
    noiseTolerance: string;
    gamer: string;
    workFromHome: string;
    pets: string;
    cleanliness: number;
    introvertExtrovert: number;
    guestsParties: string;
    preferredGender: string;
    preferredAgeRange: string;
    
    // Статус профиля
    verified: boolean;
    lookingForHousing: boolean;
    withChildren: boolean;
    withDisability: boolean;
}

interface ProfileCompletionData {
    percentage: number;
    filledWeight: number;
    totalWeight: number;
    missingFields: string[];
    missingFieldKeys: string[];
    missingCount: number;
    totalFields: number;
}

const normalizeNoiseTolerance = (value: unknown): string => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return "5";
    }
    const clamped = Math.min(10, Math.max(1, Math.round(parsed)));
    return String(clamped);
};

export default function ProfilePage() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [activeSection, setActiveSection] = useState<"basic" | "social" | "status" | "favorites" | "myListings" | "myHome">("basic");
    const [isSaving, setIsSaving] = useState(false);
    const [isTogglingVerified, setIsTogglingVerified] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveErrorMessage, setSaveErrorMessage] = useState("");
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [addressInput, setAddressInput] = useState("");
    const [addressSuggestions, setAddressSuggestions] = useState<Array<{
        key: string;
        type: "city" | "street";
        label: string;
        city: string;
        region: string;
        street?: string;
        latitude?: number | null;
        longitude?: number | null;
    }>>([]);
    const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
    const [addressLoading, setAddressLoading] = useState(false);
    const addressAutocompleteRef = useRef<HTMLDivElement>(null);
    const [universityInput, setUniversityInput] = useState("");
    const [universitySuggestions, setUniversitySuggestions] = useState<Array<{ id: number; name: string }>>([]);
    const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
    const [universitiesLoading, setUniversitiesLoading] = useState(false);
    const [showUniversityFields, setShowUniversityFields] = useState(false);
    const universityAutocompleteRef = useRef<HTMLDivElement>(null);
    const [facultyInput, setFacultyInput] = useState("");
    const [facultySuggestions, setFacultySuggestions] = useState<Array<{ id: number; name: string }>>([]);
    const [facultyDropdownOpen, setFacultyDropdownOpen] = useState(false);
    const [facultiesLoading, setFacultiesLoading] = useState(false);
    const facultyAutocompleteRef = useRef<HTMLDivElement>(null);
    const [profileCompletion, setProfileCompletion] = useState<ProfileCompletionData>({
        percentage: 0,
        filledWeight: 0,
        totalWeight: 0,
        missingFields: [],
        missingFieldKeys: [],
        missingCount: 0,
        totalFields: 0,
    });
    
    const [profileData, setProfileData] = useState<ProfileData>({
        photo: "",
        name: user?.name || "",
        phone: "",
        age: "",
        gender: "",
        city: "",
        locationRegion: "",
        locationCity: "",
        locationAddress: "",
        locationLat: null,
        locationLng: null,
        languages: [],
        universityId: null,
        facultyId: null,
        universityName: "",
        facultyName: "",
        profession: "",
        instagram: "",
        facebook: "",
        about: "",
        smoking: "",
        alcohol: "",
        sleepSchedule: "",
        noiseTolerance: "5",
        gamer: "",
        workFromHome: "",
        pets: "",
        cleanliness: 5,
        introvertExtrovert: 5,
        guestsParties: "",
        preferredGender: "",
        preferredAgeRange: "",
        verified: false,
        lookingForHousing: true,
        withChildren: false,
        withDisability: false,
    });
    const CZECH_REGIONS = [
      { value: "PRAGUE", label: "Praha" },
      { value: "STREDOCESKY", label: "Středočeský kraj" },
      { value: "JIHOCESKY", label: "Jihočeský kraj" },
      { value: "PLZENSKY", label: "Plzeňský kraj" },
      { value: "KARLOVARSKY", label: "Karlovarský kraj" },
      { value: "USTECKY", label: "Ústecký kraj" },
      { value: "LIBERECKY", label: "Liberecký kraj" },
      { value: "KRALOVEHRADECKY", label: "Královéhradecký kraj" },
      { value: "PARDUBICKY", label: "Pardubický kraj" },
      { value: "VYSOCINA", label: "Vysočina" },
      { value: "JIHOMORAVSKY", label: "Jihomoravský kraj" },
      { value: "OLOMOUCKY", label: "Olomoucký kraj" },
      { value: "ZLINSKY", label: "Zlínský kraj" },
      { value: "MORAVSKOSLEZSKY", label: "Moravskoslezský kraj" },
    ];
    useEffect(() => {
      fetch("/api/profile/", {
        credentials: "include",
      })
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then(data => {
          setProfileData(prev => ({
            ...prev,
            ...data,
                        noiseTolerance: normalizeNoiseTolerance(data.noiseTolerance),
            locationRegion: String(data.locationRegion || ""),
            locationCity: String(data.locationCity || ""),
            locationAddress: String(data.locationAddress || ""),
            locationLat: typeof data.locationLat === "number" ? data.locationLat : null,
            locationLng: typeof data.locationLng === "number" ? data.locationLng : null,
          }));

          const loadedCity = String(data.locationCity || "").trim();
          const loadedAddress = String(data.locationAddress || "").trim();
          if (loadedAddress && loadedCity) {
              setAddressInput(`${loadedAddress}, ${loadedCity}`);
          } else {
              setAddressInput(loadedAddress || loadedCity);
          }

                    const loadedUniversityName = String(data.universityName || "").trim();
                    const loadedFacultyName = String(data.facultyName || "").trim();
                    setUniversityInput(loadedUniversityName);
                    setFacultyInput(loadedFacultyName);
                    if (
                        loadedUniversityName ||
                        loadedFacultyName ||
                        data.universityId ||
                        data.facultyId
                    ) {
                        setShowUniversityFields(true);
                    }

                    if (data.profileCompletion) {
                        setProfileCompletion({
                            percentage: Number(data.profileCompletion.percentage) || 0,
                            filledWeight: Number(data.profileCompletion.filledWeight) || 0,
                            totalWeight: Number(data.profileCompletion.totalWeight) || 0,
                            missingFields: Array.isArray(data.profileCompletion.missingFields) ? data.profileCompletion.missingFields : [],
                            missingFieldKeys: Array.isArray(data.profileCompletion.missingFieldKeys) ? data.profileCompletion.missingFieldKeys : [],
                            missingCount: Number(data.profileCompletion.missingCount) || 0,
                            totalFields: Number(data.profileCompletion.totalFields) || 0,
                        });
                    }
        })
        .catch(() => {
          console.log("Profile not loaded");
        });
    }, []);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (addressAutocompleteRef.current && !addressAutocompleteRef.current.contains(event.target as Node)) {
                setAddressDropdownOpen(false);
            }
            if (universityAutocompleteRef.current && !universityAutocompleteRef.current.contains(event.target as Node)) {
                setUniversityDropdownOpen(false);
            }
            if (facultyAutocompleteRef.current && !facultyAutocompleteRef.current.contains(event.target as Node)) {
                setFacultyDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    useEffect(() => {
        const text = universityInput.trim();
        if (!universityDropdownOpen || text.length < 2) {
            setUniversitySuggestions([]);
            setUniversitiesLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setUniversitiesLoading(true);
                const params = new URLSearchParams({ q: text });
                const response = await fetch(`/api/universities/?${params.toString()}`, {
                    credentials: "include",
                    signal: controller.signal,
                });
                if (!response.ok) {
                    setUniversitySuggestions([]);
                    return;
                }
                const payload = await response.json();
                const rows = Array.isArray(payload?.results) ? payload.results : [];
                setUniversitySuggestions(
                    rows.map((item: any) => ({
                        id: Number(item.id),
                        name: String(item.name || "").trim(),
                    })).filter((item: { id: number; name: string }) => item.id > 0 && item.name)
                );
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setUniversitySuggestions([]);
                }
            } finally {
                setUniversitiesLoading(false);
            }
        }, 220);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [universityInput, universityDropdownOpen]);

    useEffect(() => {
        const universityId = profileData.universityId;
        const text = facultyInput.trim();

        if (!universityId || !facultyDropdownOpen) {
            setFacultySuggestions([]);
            setFacultiesLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setFacultiesLoading(true);
                const params = new URLSearchParams({ universityId: String(universityId) });
                if (text) {
                    params.set("q", text);
                }
                const response = await fetch(`/api/universities/faculties/?${params.toString()}`, {
                    credentials: "include",
                    signal: controller.signal,
                });
                if (!response.ok) {
                    setFacultySuggestions([]);
                    return;
                }
                const payload = await response.json();
                const rows = Array.isArray(payload?.results) ? payload.results : [];
                setFacultySuggestions(
                    rows.map((item: any) => ({
                        id: Number(item.id),
                        name: String(item.name || "").trim(),
                    })).filter((item: { id: number; name: string }) => item.id > 0 && item.name)
                );
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setFacultySuggestions([]);
                }
            } finally {
                setFacultiesLoading(false);
            }
        }, 220);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [facultyInput, facultyDropdownOpen, profileData.universityId]);

    useEffect(() => {
        const text = addressInput.trim();
        if (!showAddressPicker || text.length < 2) {
            setAddressSuggestions([]);
            setAddressLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setAddressLoading(true);

                const cityParams = new URLSearchParams({ q: text, limit: "8" });
                const cityResponse = await fetch(`/api/municipalities/search?${cityParams.toString()}`, {
                    credentials: "include",
                    signal: controller.signal,
                });

                let citySuggestions: Array<any> = [];
                if (cityResponse.ok) {
                    const cityData = await cityResponse.json();
                    citySuggestions = Array.isArray(cityData?.results) ? cityData.results : [];
                }

                const selectedCity = profileData.locationCity || "";
                const regionCode = profileData.locationRegion || "";
                let streetSuggestions: Array<any> = [];

                if (selectedCity) {
                    const streetParams = new URLSearchParams({ q: text, city: selectedCity, limit: "8" });
                    if (regionCode) {
                        streetParams.set("region", regionCode);
                    }
                    const streetResponse = await fetch(`/api/streets/search?${streetParams.toString()}`, {
                        credentials: "include",
                        signal: controller.signal,
                    });
                    if (streetResponse.ok) {
                        const streetData = await streetResponse.json();
                        streetSuggestions = Array.isArray(streetData?.results) ? streetData.results : [];
                    }
                }

                const mappedCities = citySuggestions.map((item: any) => ({
                    key: `city-${item.name}-${item.region_code}`,
                    type: "city" as const,
                    label: `${item.name}, ${item.region_code}`,
                    city: item.name,
                    region: item.region_code || "",
                    latitude: typeof item.latitude === "number" ? item.latitude : null,
                    longitude: typeof item.longitude === "number" ? item.longitude : null,
                }));

                const mappedStreets = streetSuggestions.map((item: any) => ({
                    key: `street-${item.name}-${item.city_name}-${item.region_code}`,
                    type: "street" as const,
                    label: `${item.name}, ${item.city_name}`,
                    city: item.city_name || "",
                    region: item.region_code || "",
                    street: item.name,
                    latitude: typeof item.latitude === "number" ? item.latitude : null,
                    longitude: typeof item.longitude === "number" ? item.longitude : null,
                }));

                setAddressSuggestions([...mappedStreets, ...mappedCities]);
                setAddressDropdownOpen(true);
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    setAddressSuggestions([]);
                }
            } finally {
                setAddressLoading(false);
            }
        }, 220);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [addressInput, showAddressPicker, profileData.locationCity, profileData.locationRegion]);
    const availableLanguages = [
        { code: "cz", label: t("profile.languages.cz") || "Čeština" },
        { code: "en", label: t("profile.languages.en") || "English" },
        { code: "ru", label: t("profile.languages.ru") || "Русский" },
        { code: "de", label: t("profile.languages.de") || "Deutsch" },
        { code: "sk", label: t("profile.languages.sk") || "Slovenčina" },
    ];

    const sections: Array<{ key: "basic" | "social" | "status" | "favorites" | "myListings" | "myHome"; label: string }> = [
        { key: "basic", label: t("profile.sections.basic") },
        { key: "social", label: t("profile.sections.social") },
        { key: "status", label: t("profile.sections.status") },
        { key: "favorites", label: t("favorites") },
        { key: "myListings", label: t("profile.sections.myListings") },
        { key: "myHome", label: t("profile.sections.myHome") },
    ];

    const currentSectionIndex = sections.findIndex(s => s.key === activeSection);
    const canGoPrevious = currentSectionIndex > 0;
    const canGoNext = currentSectionIndex < sections.length - 1;

    const handlePrevious = () => {
        if (canGoPrevious) {
            setActiveSection(sections[currentSectionIndex - 1].key);
        }
    };

    const handleNext = () => {
        if (canGoNext) {
            setActiveSection(sections[currentSectionIndex + 1].key);
        }
    };

    // Favorites state within profile
    type FavoriteListing = {
        id: number;
        type: "LISTING" | "NEIGHBOUR";
        // LISTING поля
        title?: string;
        description?: string;
        price?: string | number;
        room_type?: "APARTMENT" | "ROOM";
        city?: string;
        region?: string;
        area?: string | number;
        amenities?: string[];
        // NEIGHBOUR поля
        name?: string;
        age?: number;
        verified?: boolean;
        looking_for_housing?: boolean;
        // Общее
        image_url?: string | null;
        is_favorite?: boolean;
        is_active?: boolean;
    };
    const [favListings, setFavListings] = useState<FavoriteListing[]>([]);
    const [favLoading, setFavLoading] = useState(false);
    const [favError, setFavError] = useState<string | null>(null);
    const [favPage, setFavPage] = useState(1);
    const [favTotalPages, setFavTotalPages] = useState(1);

    // My Listings state
    const [myListings, setMyListings] = useState<FavoriteListing[]>([]);
    const [myListingsLoading, setMyListingsLoading] = useState(false);
    const [myListingsError, setMyListingsError] = useState<string | null>(null);
    const [myListingsPage, setMyListingsPage] = useState(1);
    const [myListingsTotalPages, setMyListingsTotalPages] = useState(1);

    const [myHomeData, setMyHomeData] = useState<any>(null);
    const [myHomeLoading, setMyHomeLoading] = useState(false);
    const [myHomeError, setMyHomeError] = useState<string | null>(null);
    const [leavingHome, setLeavingHome] = useState(false);
    const [isLeaveHomeModalOpen, setIsLeaveHomeModalOpen] = useState(false);
    const [leaveHomeErrorMessage, setLeaveHomeErrorMessage] = useState<string | null>(null);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [inviteQrLink, setInviteQrLink] = useState("");
    const [showJoinedHomeNotice, setShowJoinedHomeNotice] = useState(false);

    // Активируем нужную вкладку, если пришли с хэшем или параметром ?tab
    useEffect(() => {
        const hash = (location.hash || "").replace('#', '').toLowerCase();
        const params = new URLSearchParams(location.search);
        const tab = (params.get("tab") || "").toLowerCase();
        const target = hash || tab;
        const normalizedTarget = target === "favourites" ? "favorites" : target;
        const validSections: Array<"basic" | "social" | "status" | "favorites" | "myListings" | "myHome"> = ["basic", "social", "status", "favorites", "myListings", "myHome"];

        if (validSections.includes(normalizedTarget as typeof validSections[number])) {
            const sectionKey = normalizedTarget as typeof validSections[number];
            setActiveSection(sectionKey);
            if (sectionKey === "favorites") {
                setFavPage(1);
            }
            if (sectionKey === "myListings") {
                setMyListingsPage(1);
            }
        }

        if (!hash && !tab) {
            const returnTab = window.sessionStorage.getItem("profileReturnTab");
            if (returnTab === "myListings") {
                setActiveSection("myListings");
                setMyListingsPage(1);
                window.sessionStorage.removeItem("profileReturnTab");
            }
        }
    }, [location.hash, location.search]);

    useEffect(() => {
        const state = location.state as { profileTab?: string } | null;
        const rawStateTab = (state?.profileTab || "").toLowerCase();
        const stateTab = rawStateTab === "mylistings" ? "myListings" : rawStateTab;
        const validSections: Array<"basic" | "social" | "status" | "favorites" | "myListings" | "myHome"> = ["basic", "social", "status", "favorites", "myListings", "myHome"];
        if (validSections.includes(stateTab as typeof validSections[number])) {
            setActiveSection(stateTab as typeof validSections[number]);
            if (stateTab === "myListings") {
                setMyListingsPage(1);
            }
        }
    }, [location.state]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const joined = params.get("joined");
        const joinedSuccessfully = joined === "1" || joined === "true";

        setShowJoinedHomeNotice((prev) => prev || joinedSuccessfully);

        if (joinedSuccessfully) {
            params.delete("joined");
            const nextQuery = params.toString();
            navigate(`${location.pathname}${nextQuery ? `?${nextQuery}` : ""}${location.hash}`, { replace: true });
        }
    }, [location.search, location.pathname, location.hash, navigate]);

    const fetchFavorites = async (page = 1) => {
        if (!user) return;
        try {
            setFavLoading(true);
            const res = await fetch(`/api/favorites/?page=${page}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to load favorites");
            const data = await res.json();
            setFavListings(data.listings || []);
            setFavTotalPages(data.total_pages || 1);
            setFavError(null);
        } catch (e) {
            setFavError(e instanceof Error ? e.message : "Error loading favorites");
            setFavListings([]);
        } finally {
            setFavLoading(false);
        }
    };

    const fetchMyListings = async (page = 1) => {
        if (!user) return;
        try {
            setMyListingsLoading(true);
            const res = await fetch(`/api/listings/?owner=me&page=${page}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to load my listings");
            const data = await res.json();
            // Transform data to match FavoriteListing type
            const listings = (data.results || []).map((listing: any) => {
                const normalizedRoomType = ["APARTMENT", "BYT", "DUM"].includes(String(listing.type || listing.property_type || "").toUpperCase())
                    ? "APARTMENT"
                    : "ROOM";

                return {
                    id: listing.id,
                    type: "LISTING" as const,
                    title: listing.title,
                    description: listing.description,
                    price: listing.price,
                    room_type: normalizedRoomType,
                    city: listing.city,
                    region: listing.region,
                    area: listing.usable_area,
                    amenities: listing.amenities || [],
                    image_url: listing.image || null,
                    is_favorite: listing.is_favorite || false,
                    is_active: listing.isActive !== false,
                };
            });
            setMyListings(listings);
            setMyListingsTotalPages(data.total_pages || 1);
            setMyListingsError(null);
        } catch (e) {
            setMyListingsError(e instanceof Error ? e.message : "Error loading my listings");
            setMyListings([]);
        } finally {
            setMyListingsLoading(false);
        }
    };

    const fetchMyHome = async () => {
        if (!user) return;
        try {
            setMyHomeLoading(true);
            const res = await fetch(`/api/listings/my-home/`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to load my home");
            const data = await res.json();
            setMyHomeData(data);
            setMyHomeError(null);
        } catch (e) {
            setMyHomeError(e instanceof Error ? e.message : "Error loading my home");
            setMyHomeData(null);
        } finally {
            setMyHomeLoading(false);
        }
    };

    const handleLeaveHome = async () => {
        try {
            setLeavingHome(true);
            setLeaveHomeErrorMessage(null);
            const res = await fetch(`/api/listings/leave-home/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "X-CSRFToken": getCsrfToken(),
                },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || t("profile.leaveHomeFailed"));
            }

            await fetchMyHome();
            await fetchMyListings(1);
            setIsLeaveHomeModalOpen(false);
        } catch (e) {
            setLeaveHomeErrorMessage(e instanceof Error ? e.message : t("profile.leaveHomeFailed"));
        } finally {
            setLeavingHome(false);
        }
    };

    const createInviteLink = async (): Promise<string> => {
        if (!myHomeData?.listing?.id) {
            throw new Error(t("profile.inviteFailed"));
        }
        const res = await fetch(`/api/listings/${myHomeData.listing.id}/invite/`, {
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
            setInviteError(null);
            const link = await createInviteLink();
            await navigator.clipboard.writeText(link);
            setInviteFeedback(t("profile.copied"));
        } catch (e) {
            setInviteError(e instanceof Error ? e.message : t("profile.inviteFailed"));
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleInviteByQr = async () => {
        try {
            setCreatingInvite(true);
            setInviteError(null);
            const link = await createInviteLink();
            setInviteQrLink(link);
            setIsQrModalOpen(true);
        } catch (e) {
            setInviteError(e instanceof Error ? e.message : t("profile.inviteFailed"));
        } finally {
            setCreatingInvite(false);
        }
    };

    const getMyHomeListingUrl = (listing: any) => {
        if (!listing) return "/apartments";
        const listingType = String(listing.type || "").toUpperCase();
        if (listingType === "ROOM") {
            return `/rooms/${listing.id}`;
        }
        if (listingType === "NEIGHBOUR") {
            return `/neighbours/${listing.id}`;
        }
        return `/apartments/${listing.id}`;
    };

    const getInitials = (name: string) => {
        return (name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || "")
            .join("") || "?";
    };

    const handleMyListingsCardClick = () => {
        window.sessionStorage.setItem("profileReturnTab", "myListings");
    };

    useEffect(() => {
        if (activeSection === "favorites") {
            fetchFavorites(favPage);
        }
        if (activeSection === "myListings") {
            fetchMyListings(myListingsPage);
        }
        if (activeSection === "myHome") {
            fetchMyHome();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, favPage, myListingsPage]);

    const convertToSaleCardType = (favorite: FavoriteListing) => {
        if (favorite.type === "NEIGHBOUR") {
            return {
                id: favorite.id,
                type: "NEIGHBOUR" as const,
                name: favorite.name,
                age: favorite.age,
                from: favorite.city,
                image: getImageUrl(favorite.image_url),
                badges: [
                    ...(favorite.verified ? [t("badges.verified")] : []),
                    ...(favorite.looking_for_housing ? [t("badges.lookingForHousing")] : []),
                ],
                is_favorite: favorite.is_favorite ?? false,
            };
        }
        return {
            id: favorite.id,
            type: (favorite.room_type === "APARTMENT" ? "APARTMENT" : "ROOM") as "APARTMENT" | "ROOM" | "NEIGHBOUR",
            price: favorite.price,
            image: getImageUrl(favorite.image_url),
            title: favorite.title,
            region: favorite.region,
            address: favorite.city,
            size: favorite.area?.toString() || "N/A",
            amenities: favorite.amenities,
            is_favorite: favorite.is_favorite ?? false,
            is_active: favorite.is_active ?? true,
        };
    };

    const handleRemoveFavorite = async (favoriteId: number, type?: string) => {
        try {
            const isNeighbor = type === "NEIGHBOUR";
            const response = await fetch("/api/favorites/remove/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                credentials: "include",
                body: JSON.stringify({ 
                    ...(isNeighbor ? { profile_id: favoriteId } : { listing_id: favoriteId })
                }),
            });
            if (response.ok) {
                setFavListings(favListings.filter(l => l.id !== favoriteId));
            }
        } catch (err) {
            console.error("Error removing favorite:", err);
        }
    };

    const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // превью как раньше
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);

      // реальная отправка
      const formData = new FormData();
      formData.append("avatar", file);

      try {
                const response = await fetch("/api/profile/avatar/", {
          method: "POST",
          credentials: "include",
                    headers: {
                        "X-CSRFToken": getCsrfToken(),
                    },
                    body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        console.log("Avatar uploaded:", data.avatar);

      } catch (err) {
        console.error("Avatar upload error:", err);
        alert(t("profile.errorUploadingAvatar"));
      }
    };

    const toggleLanguage = (langCode: string) => {
        setProfileData(prev => ({
            ...prev,
            languages: prev.languages.includes(langCode)
                ? prev.languages.filter(l => l !== langCode)
                : [...prev.languages, langCode]
        }));
    };

    const handleAddressSuggestionSelect = (suggestion: {
        type: "city" | "street";
        label: string;
        city: string;
        region: string;
        street?: string;
        latitude?: number | null;
        longitude?: number | null;
    }) => {
        if (suggestion.type === "city") {
            setProfileData(prev => ({
                ...prev,
                locationCity: suggestion.city,
                locationRegion: suggestion.region || prev.locationRegion,
            }));
            setAddressInput(suggestion.label);
        } else {
            const street = suggestion.street || "";
            const city = suggestion.city || "";
            setProfileData(prev => ({
                ...prev,
                locationAddress: street,
                locationCity: city,
                locationRegion: suggestion.region || prev.locationRegion,
                locationLat: typeof suggestion.latitude === "number" ? suggestion.latitude : prev.locationLat,
                locationLng: typeof suggestion.longitude === "number" ? suggestion.longitude : prev.locationLng,
            }));
            setAddressInput(suggestion.label);
        }
        setAddressDropdownOpen(false);
    };

    const handleUniversitySuggestionSelect = (suggestion: { id: number; name: string }) => {
        setProfileData(prev => ({
            ...prev,
            universityId: suggestion.id,
            universityName: suggestion.name,
            facultyId: null,
            facultyName: "",
        }));
        setUniversityInput(suggestion.name);
        setFacultyInput("");
        setUniversityDropdownOpen(false);
        setFacultySuggestions([]);
    };

    const handleFacultySuggestionSelect = (suggestion: { id: number; name: string }) => {
        setProfileData(prev => ({
            ...prev,
            facultyId: suggestion.id,
            facultyName: suggestion.name,
        }));
        setFacultyInput(suggestion.name);
        setFacultyDropdownOpen(false);
    };

    const handleMapPointChange = async (lat: number, lng: number) => {
        setProfileData(prev => ({ ...prev, locationLat: lat, locationLng: lng }));

        try {
            const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
            const response = await fetch(`/api/geocode/reverse?${params.toString()}`, {
                credentials: "include",
            });
            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const street = String(data.address || "").trim();
            const city = String(data.city || "").trim();
            const region = String(data.region_code || "").trim();
            const combined = [street, city].filter(Boolean).join(", ");

            setProfileData(prev => ({
                ...prev,
                locationAddress: street || prev.locationAddress,
                locationCity: city || prev.locationCity,
                locationRegion: region || prev.locationRegion,
                locationLat: lat,
                locationLng: lng,
            }));

            if (combined) {
                setAddressInput(combined);
            }
        } catch {
            // No-op: map click still updates coordinates even if reverse geocoding fails.
        }
    };

    const handleSave = async () => {
        console.log("HANDLE SAVE CLICKED");
        console.log("PROFILE DATA:", profileData);

      try {
        setIsSaving(true);
        setSaveErrorMessage("");

                const response = await fetch("/api/profile/", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
                        "X-CSRFToken": getCsrfToken(),
          },
          body: JSON.stringify({
            ...profileData,
            //languages: profileData.languages.join(","), // для Django CharField
          }),
        });

        if (!response.ok) {
          let detail = "";
          try {
            const payload = await response.json();
            detail = String(payload?.detail || payload?.error || "").trim();
          } catch {
            detail = "";
          }

          if (response.status === 401) {
            throw new Error(t("profile.errorNotAuthenticated"));
          }

          if (detail === "Invalid JSON") {
            throw new Error(t("profile.errorInvalidFormData"));
          }
          if (detail === "Invalid university") {
            throw new Error(t("profile.errorInvalidUniversity"));
          }
          if (detail === "University must be selected before faculty") {
            throw new Error(t("profile.errorUniversityRequiredForFaculty"));
          }
          if (detail === "Invalid faculty for selected university") {
            throw new Error(t("profile.errorInvalidFaculty"));
          }
          if (detail) {
            throw new Error(detail);
          }
          throw new Error(t("profile.errorSavingProfile"));
        }

                const responseData = await response.json();
                if (responseData?.profileCompletion) {
                        setProfileCompletion({
                                percentage: Number(responseData.profileCompletion.percentage) || 0,
                                filledWeight: Number(responseData.profileCompletion.filledWeight) || 0,
                                totalWeight: Number(responseData.profileCompletion.totalWeight) || 0,
                            missingFields: Array.isArray(responseData.profileCompletion.missingFields) ? responseData.profileCompletion.missingFields : [],
                                missingFieldKeys: Array.isArray(responseData.profileCompletion.missingFieldKeys) ? responseData.profileCompletion.missingFieldKeys : [],
                            missingCount: Number(responseData.profileCompletion.missingCount) || 0,
                            totalFields: Number(responseData.profileCompletion.totalFields) || 0,
                        });
                }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setSaveErrorMessage("");

      } catch (err) {
        console.error("Save error:", err);
        const message = err instanceof Error ? err.message : t("profile.errorSavingProfile");
        setSaveErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    };

    const handleToggleVerified = async () => {
        if (isTogglingVerified) {
            return;
        }

        const nextVerified = !profileData.verified;

        try {
            setIsTogglingVerified(true);

            const response = await fetch("/api/profile/", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                },
                body: JSON.stringify({ verified: nextVerified }),
            });

            if (!response.ok) {
                throw new Error("Verified status update failed");
            }

            const responseData = await response.json();
            setProfileData(prev => ({ ...prev, verified: nextVerified }));

            if (responseData?.profileCompletion) {
                setProfileCompletion({
                    percentage: Number(responseData.profileCompletion.percentage) || 0,
                    filledWeight: Number(responseData.profileCompletion.filledWeight) || 0,
                    totalWeight: Number(responseData.profileCompletion.totalWeight) || 0,
                    missingFields: Array.isArray(responseData.profileCompletion.missingFields) ? responseData.profileCompletion.missingFields : [],
                    missingFieldKeys: Array.isArray(responseData.profileCompletion.missingFieldKeys) ? responseData.profileCompletion.missingFieldKeys : [],
                    missingCount: Number(responseData.profileCompletion.missingCount) || 0,
                    totalFields: Number(responseData.profileCompletion.totalFields) || 0,
                });
            }
        } catch (err) {
            console.error("Verified toggle error:", err);
            alert(t("profile.errorSavingProfile"));
        } finally {
            setIsTogglingVerified(false);
        }
    };

    const mapCenter: [number, number] =
        profileData.locationLat !== null && profileData.locationLng !== null
            ? [profileData.locationLat, profileData.locationLng]
            : [50.0755, 14.4378];

    const mapPoint: [number, number] | null =
        profileData.locationLat !== null && profileData.locationLng !== null
            ? [profileData.locationLat, profileData.locationLng]
            : null;

    const completionPercent = Math.max(0, Math.min(100, Math.round(profileCompletion.percentage || 0)));
    const completionRadius = 58;
    const completionCircumference = 2 * Math.PI * completionRadius;
    const completionOffset = completionCircumference - (completionPercent / 100) * completionCircumference;

    return (
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-transparent pt-[150px] max-[770px]:pt-[120px] pb-[90px] max-[770px]:pb-[60px]`}>
            <div className={`w-full max-w-[1200px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-4`}>
                
                {/* Header */}
                <div className={`mb-6 max-[770px]:mb-4`}>
                    <h1 className={`text-[48px] max-[1024px]:text-[40px] max-[770px]:text-[28px] font-bold mb-2 max-[770px]:mb-1 bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent`}>
                        {t("profile.title")}
                    </h1>
                    <p className={`text-xl max-[1024px]:text-lg max-[770px]:text-base text-gray-600 dark:text-gray-400`}>
                        {t("profile.subtitle")}
                    </p>
                </div>

                <div className="mb-6 max-[770px]:mb-4 rounded-2xl border border-[#08D3E2]/30 bg-gradient-to-r from-[#C505EB]/10 via-[#08D3E2]/10 to-[#08E2BE]/10 p-5 max-[770px]:p-4">
                    <div className="flex items-center gap-5 max-[770px]:flex-col max-[770px]:items-start">
                        <div className="relative w-[140px] h-[140px] max-[770px]:w-[120px] max-[770px]:h-[120px] shrink-0">
                            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                                <defs>
                                    <linearGradient id="profileCompletionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#08D3E2" />
                                        <stop offset="50%" stopColor="#08E2BE" />
                                        <stop offset="100%" stopColor="#C505EB" />
                                    </linearGradient>
                                </defs>
                                <circle
                                    cx="70"
                                    cy="70"
                                    r={completionRadius}
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="none"
                                    className="text-gray-200 dark:text-gray-700"
                                />
                                <circle
                                    cx="70"
                                    cy="70"
                                    r={completionRadius}
                                    stroke="url(#profileCompletionGradient)"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    fill="none"
                                    strokeDasharray={completionCircumference}
                                    strokeDashoffset={completionOffset}
                                    className="transition-all duration-700 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[34px] max-[770px]:text-[30px] font-extrabold leading-none text-[#C505EB]">{completionPercent}%</span>
                                <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{t("profile.completion")}</span>
                            </div>
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-2xl max-[770px]:text-xl font-bold text-[#C505EB]">{t("profile.completionTitle")}</h2>
                            <p className="text-sm max-[770px]:text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {t("profile.completionSubtitle")}
                            </p>
                            <p className="text-sm font-semibold text-[#08D3E2] mt-3">
                                {t("profile.completionMissing")
                                    .replace("{{missing}}", String(profileCompletion.missingCount || 0))
                                    .replace("{{total}}", String(profileCompletion.totalFields || 0))}
                            </p>
                            {profileCompletion.missingFields.length > 0 ? (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                                        {t("profile.completionMissingListTitle")}
                                    </p>
                                    <ul className="grid grid-cols-1 min-[1025px]:grid-cols-2 gap-1.5 text-sm max-[770px]:text-xs text-gray-700 dark:text-gray-200">
                                        {profileCompletion.missingFields.map((item, index) => {
                                            const key = profileCompletion.missingFieldKeys[index] || "";
                                            const localized = key ? t(`profile.completionFields.${key}`) : "";
                                            const displayValue = localized && localized !== `profile.completionFields.${key}` ? localized : item;
                                            return (
                                            <li key={`missing-field-${index}`} className="flex items-start gap-2">
                                                <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[#C505EB]" />
                                                <span>{displayValue}</span>
                                            </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-3">
                                    {t("profile.completionNoMissing")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section Tabs - Desktop */}
                <div className={`hidden min-[771px]:flex flex-wrap items-center gap-2 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1`}>
                    {sections.map((section) => (
                        <button
                            key={section.key}
                            onClick={() => setActiveSection(section.key)}
                            className={`px-6 py-3 rounded-lg font-semibold text-lg whitespace-nowrap transition-all duration-300 ${
                                activeSection === section.key
                                    ? "bg-[#C505EB] text-white shadow-md"
                                    : "text-gray-600 dark:text-gray-400 hover:text-[#C505EB]"
                            }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Section Tabs - Mobile (Carousel) */}
                <div className={`max-[770px]:flex min-[771px]:hidden items-center gap-2 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1`}>
                    <button
                        onClick={handlePrevious}
                        disabled={!canGoPrevious}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
                            canGoPrevious
                                ? "bg-white dark:bg-gray-700 text-[#C505EB] hover:bg-[#C505EB] hover:text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    <div className={`flex-1 flex items-center justify-center px-4`}>
                        <span className={`text-base font-semibold text-[#C505EB]`}>
                            {sections[currentSectionIndex].label}
                        </span>
                        <span className={`ml-2 text-xs text-gray-500`}>
                            ({currentSectionIndex + 1}/{sections.length})
                        </span>
                    </div>
                    
                    <button
                        onClick={handleNext}
                        disabled={!canGoNext}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
                            canGoNext
                                ? "bg-white dark:bg-gray-700 text-[#C505EB] hover:bg-[#C505EB] hover:text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 max-[1024px]:p-6 max-[770px]:p-4`}>
                    
                    {/* Основная информация */}
                    {activeSection === "basic" && (
                        <div className={`flex flex-col gap-6 max-[770px]:gap-4`}>
                            {/* Photo Upload */}
                            <div className={`flex flex-col items-center gap-4 max-[770px]:gap-3`}>
                                <div className={`relative`}>
                                    <div className={`w-40 h-40 max-[770px]:w-32 max-[770px]:h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-[#C505EB]`}>
                                        {profileData.photo ? (
                                            <img src={profileData.photo} alt="Profile" className={`w-full h-full object-cover`} />
                                        ) : (
                                            <User size={80} className={`max-[770px]:w-16 max-[770px]:h-16 text-gray-400`} />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`absolute bottom-0 right-0 w-12 h-12 max-[770px]:w-10 max-[770px]:h-10 rounded-full bg-[#C505EB] flex items-center justify-center hover:bg-[#BA00F8] transition-colors shadow-lg`}
                                    >
                                        <Camera size={24} className={`max-[770px]:w-5 max-[770px]:h-5 text-white`} />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className={`hidden`}
                                    />
                                </div>
                                <span className={`text-sm max-[770px]:text-xs text-gray-600 dark:text-gray-400 text-center px-4`}>{t("profile.photoHint")}</span>
                            </div>

                            {/* Name */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.name")}</label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                    className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                    placeholder={t("profile.namePlaceholder")}
                                />
                            </div>

                            {/* Phone */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.phone")}</label>
                                <input
                                    type="tel"
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                                    className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                    placeholder={t("profile.phonePlaceholder")}
                                />
                            </div>

                            {/* Age and Gender */}
                            <div className={`flex max-[770px]:flex-col gap-4`}>
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.age")}</label>
                                    <input
                                        type="number"
                                        value={profileData.age}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, age: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.agePlaceholder")}
                                    />
                                </div>
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.gender")}</label>
                                    <select
                                        value={profileData.gender}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                    >
                                        <option value="">{t("profile.selectGender")}</option>
                                        <option value="male">{t("profile.genderMale")}</option>
                                        <option value="female">{t("profile.genderFemale")}</option>
                                        <option value="other">{t("profile.genderOther")}</option>
                                    </select>
                                </div>
                            </div>

                            {/* City */}
                            <div className="flex flex-col gap-2">
                              <label className="text-lg max-[770px]:text-base font-bold">
                                {t("profile.city")}
                              </label>

                              <select
                                value={profileData.city}
                                onChange={(e) =>
                                  setProfileData(prev => ({ ...prev, city: e.target.value }))
                                }
                                className="w-full h-[56px] max-[770px]:h-[48px]
                                           border border-[#E0E0E0] dark:border-gray-600
                                           dark:bg-gray-700 dark:text-white
                                           focus:border-[#C505EB] duration-300
                                           outline-0 rounded-xl px-5 max-[770px]:px-4
                                           text-base max-[770px]:text-sm"
                              >
                                <option value="">{t("profile.cityPlaceholder")}</option>
                                {CZECH_REGIONS.map(region => (
                                  <option key={region.value} value={region.value}>
                                    {region.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Location City and Address */}
                            <div className={`flex max-[770px]:flex-col gap-4`}>
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.locationCity")}</label>
                                    <input
                                        type="text"
                                        value={profileData.locationCity}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, locationCity: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.locationCityPlaceholder")}
                                    />
                                </div>

                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.locationAddress")}</label>
                                    <input
                                        type="text"
                                        value={profileData.locationAddress}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, locationAddress: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.locationAddressPlaceholder")}
                                    />
                                </div>
                            </div>

                            {!showUniversityFields ? (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowUniversityFields(true)}
                                        className={`h-[56px] max-[770px]:h-[48px] px-5 max-[770px]:px-4 rounded-xl border border-[#C505EB] text-[#C505EB] hover:bg-[#C505EB] hover:text-white duration-300 font-semibold`}
                                    >
                                        {t("profile.selectUniversityButton")}
                                    </button>
                                </div>
                            ) : (
                            <>
                            <div className={`flex`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUniversityFields(false);
                                        setUniversityInput("");
                                        setFacultyInput("");
                                        setUniversityDropdownOpen(false);
                                        setFacultyDropdownOpen(false);
                                        setUniversitySuggestions([]);
                                        setFacultySuggestions([]);
                                        setProfileData(prev => ({
                                            ...prev,
                                            universityId: null,
                                            universityName: "",
                                            facultyId: null,
                                            facultyName: "",
                                        }));
                                    }}
                                    className={`h-[56px] max-[770px]:h-[48px] px-5 max-[770px]:px-4 rounded-xl border border-[#C505EB] text-[#C505EB] hover:bg-[#C505EB] hover:text-white duration-300 font-semibold`}
                                >
                                    {t("profile.hideUniversityButton")}
                                </button>
                            </div>
                            <div className={`flex max-[770px]:flex-col gap-4`}>
                                <div ref={universityAutocompleteRef} className={`flex-1 w-full flex flex-col gap-2 relative`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.university")}</label>
                                    <input
                                        type="text"
                                        value={universityInput}
                                        onFocus={() => setUniversityDropdownOpen(true)}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setUniversityInput(value);
                                            setUniversityDropdownOpen(true);
                                            setProfileData(prev => ({
                                                ...prev,
                                                universityId: null,
                                                universityName: value,
                                                facultyId: null,
                                                facultyName: "",
                                            }));
                                            setFacultyInput("");
                                        }}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.universityPlaceholder")}
                                    />
                                    {universitiesLoading && (
                                        <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 block`}>{t("profile.loadingUniversities")}</span>
                                    )}
                                    {universityDropdownOpen && universityInput.trim().length >= 2 && !universitiesLoading && (
                                        <div className={`absolute top-[92px] z-20 w-full max-h-[220px] overflow-y-auto rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg`}>
                                            {universitySuggestions.length > 0 ? universitySuggestions.map((item) => (
                                                <button
                                                    key={`university-${item.id}`}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleUniversitySuggestionSelect(item)}
                                                    className={`w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-200`}
                                                >
                                                    {item.name}
                                                </button>
                                            )) : (
                                                <div className={`px-4 py-2 text-sm text-gray-500 dark:text-gray-400`}>
                                                    {t("profile.universityNoResults")}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div ref={facultyAutocompleteRef} className={`flex-1 w-full flex flex-col gap-2 relative`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.faculty")}</label>
                                    <input
                                        type="text"
                                        value={facultyInput}
                                        disabled={!profileData.universityId}
                                        onFocus={() => {
                                            if (profileData.universityId) {
                                                setFacultyDropdownOpen(true);
                                            }
                                        }}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFacultyInput(value);
                                            if (profileData.universityId) {
                                                setFacultyDropdownOpen(true);
                                            }
                                            setProfileData(prev => ({
                                                ...prev,
                                                facultyId: null,
                                                facultyName: value,
                                            }));
                                        }}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                                        placeholder={profileData.universityId ? t("profile.facultyPlaceholder") : t("profile.selectUniversityFromList")}
                                    />
                                    {facultiesLoading && (
                                        <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 block`}>{t("profile.loadingFaculties")}</span>
                                    )}
                                    {facultyDropdownOpen && profileData.universityId && !facultiesLoading && (
                                        <div className={`absolute top-[92px] z-20 w-full max-h-[220px] overflow-y-auto rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg`}>
                                            {facultySuggestions.length > 0 ? facultySuggestions.map((item) => (
                                                <button
                                                    key={`faculty-${item.id}`}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleFacultySuggestionSelect(item)}
                                                    className={`w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-200`}
                                                >
                                                    {item.name}
                                                </button>
                                            )) : (
                                                <div className={`px-4 py-2 text-sm text-gray-500 dark:text-gray-400`}>
                                                    {t("profile.facultyNoResults")}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            </>
                            )}

                            <div className={`flex max-[770px]:flex-col gap-4 items-end`}>
                                <div className={`flex-1 w-full flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.profession")}</label>
                                    <input
                                        type="text"
                                        value={profileData.profession}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, profession: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.professionPlaceholder")}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddressPicker(prev => !prev)}
                                    className={`h-[56px] max-[770px]:h-[48px] px-5 max-[770px]:px-4 rounded-xl border border-[#C505EB] text-[#C505EB] hover:bg-[#C505EB] hover:text-white duration-300 font-semibold`}
                                >
                                    {showAddressPicker ? t("profile.hideAddressPicker") : t("profile.setAddress")}
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                                <div className={`flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.instagram")}</label>
                                    <input
                                        type="text"
                                        value={profileData.instagram}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, instagram: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.instagramPlaceholder")}
                                    />
                                </div>
                                <div className={`flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.facebook")}</label>
                                    <input
                                        type="text"
                                        value={profileData.facebook}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, facebook: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.facebookPlaceholder")}
                                    />
                                </div>
                            </div>

                            {showAddressPicker && (
                                <div className={`flex flex-col gap-3`}>
                                    <div ref={addressAutocompleteRef} className={`relative z-40`}>
                                        <label className={`text-lg max-[770px]:text-base font-bold mb-2 block`}>{t("profile.address")}</label>
                                        <input
                                            type="text"
                                            value={addressInput}
                                            onChange={(e) => {
                                                setAddressInput(e.target.value);
                                                setAddressDropdownOpen(true);
                                            }}
                                            onBlur={() => {
                                                const raw = addressInput.trim();
                                                if (!raw) {
                                                    return;
                                                }
                                                const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
                                                const nextAddress = parts[0] || raw;
                                                const nextCity = parts.length > 1 ? parts[parts.length - 1] : profileData.locationCity;
                                                setProfileData(prev => ({
                                                    ...prev,
                                                    locationAddress: nextAddress,
                                                    locationCity: nextCity,
                                                }));
                                            }}
                                            className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                            placeholder={t("profile.addressPlaceholder")}
                                        />

                                        {addressLoading && (
                                            <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 block`}>{t("profile.loadingAddress")}</span>
                                        )}

                                        {addressDropdownOpen && addressInput.trim().length >= 2 && !addressLoading && (
                                            <div className={`absolute top-[92px] z-[120] w-full max-h-[220px] overflow-y-auto rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg`}>
                                                {addressSuggestions.length > 0 ? addressSuggestions.map((item) => (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => handleAddressSuggestionSelect(item)}
                                                        className={`w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-200`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                )) : (
                                                    <div className={`px-4 py-2 text-sm text-gray-500 dark:text-gray-400`}>
                                                        {t("profile.addressNoResults")}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`relative z-0`}>
                                        <MapPicker
                                            center={mapCenter}
                                            point={mapPoint}
                                            onPointChange={handleMapPointChange}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Languages */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.languages.title")}</label>
                                <div className={`flex flex-wrap gap-2 max-[770px]:gap-1.5`}>
                                    {availableLanguages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => toggleLanguage(lang.code)}
                                            className={`px-4 max-[770px]:px-3 py-2 max-[770px]:py-1.5 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                profileData.languages.includes(lang.code)
                                                    ? "border-[#C505EB] bg-[#C505EB]/10 text-[#C505EB]"
                                                    : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                            }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* About */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.about")}</label>
                                <textarea
                                    value={profileData.about}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                                    className={`w-full h-[180px] max-[770px]:h-[120px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 py-3 text-base max-[770px]:text-sm resize-none`}
                                    placeholder={t("profile.aboutPlaceholder")}
                                />
                            </div>
                        </div>
                    )}

                    {/* Социальные параметры */}
                    {activeSection === "social" && (
                        <div className={`flex flex-col gap-6 max-[770px]:gap-4`}>
                            {/* Smoking */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.smoking")}</label>
                                <div className={`flex gap-2 max-[770px]:gap-1.5 flex-wrap`}>
                                    {["yes", "no", "sometimes"].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setProfileData(prev => ({ ...prev, smoking: option }))}
                                            className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                profileData.smoking === option
                                                    ? "border-[#C505EB] bg-[#C505EB] text-white"
                                                    : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                            }`}
                                        >
                                            {t(`profile.smokingOptions.${option}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Alcohol */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.alcohol")}</label>
                                <div className={`flex gap-2 max-[770px]:gap-1.5 flex-wrap`}>
                                    {["yes", "no", "rarely"].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setProfileData(prev => ({ ...prev, alcohol: option }))}
                                            className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                profileData.alcohol === option
                                                    ? "border-[#C505EB] bg-[#C505EB] text-white"
                                                    : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                            }`}
                                        >
                                            {t(`profile.alcoholOptions.${option}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sleep Schedule */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.sleepSchedule")}</label>
                                <div className={`flex gap-2 max-[770px]:gap-1.5 flex-wrap`}>
                                    {["early", "late", "flexible"].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setProfileData(prev => ({ ...prev, sleepSchedule: option }))}
                                            className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                profileData.sleepSchedule === option
                                                    ? "border-[#C505EB] bg-[#C505EB] text-white"
                                                    : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                            }`}
                                        >
                                            {t(`profile.sleepScheduleOptions.${option}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Noise Tolerance */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>
                                    {t("profile.noiseTolerance")}: {normalizeNoiseTolerance(profileData.noiseTolerance)}/10
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={normalizeNoiseTolerance(profileData.noiseTolerance)}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, noiseTolerance: e.target.value }))}
                                    className={`w-full h-2 max-[770px]:h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#C505EB]`}
                                />
                            </div>

                            {/* Gamer and Work from Home */}
                            <div className={`flex max-[770px]:flex-col gap-4`}>
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.gamer")}</label>
                                    <div className={`flex gap-2`}>
                                        {["yes", "no"].map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setProfileData(prev => ({ ...prev, gamer: option }))}
                                                className={`flex-1 px-4 max-[770px]:px-3 py-3 max-[770px]:py-2 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                    profileData.gamer === option
                                                        ? "border-[#C505EB] bg-[#C505EB] text-white"
                                                        : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                                }`}
                                            >
                                                {t(`profile.gamerOptions.${option}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.workFromHome")}</label>
                                    <div className={`flex gap-2`}>
                                        {["yes", "no"].map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setProfileData(prev => ({ ...prev, workFromHome: option }))}
                                                className={`flex-1 px-4 max-[770px]:px-3 py-3 max-[770px]:py-2 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                    profileData.workFromHome === option
                                                        ? "border-[#C505EB] bg-[#C505EB] text-white"
                                                        : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                                }`}
                                            >
                                                {t(`profile.workFromHomeOptions.${option}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pets */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.pets")}</label>
                                <textarea
                                    value={profileData.pets}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, pets: e.target.value }))}
                                    className={`w-full h-[120px] max-[770px]:h-[100px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 py-3 text-base max-[770px]:text-sm resize-none`}
                                    placeholder={t("profile.petsPlaceholder")}
                                />
                            </div>

                            {/* Cleanliness Scale */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>
                                    {t("profile.cleanliness")}: {profileData.cleanliness}/10
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={profileData.cleanliness}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, cleanliness: parseInt(e.target.value) }))}
                                    className={`w-full h-2 max-[770px]:h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#C505EB]`}
                                />
                                <div className={`flex justify-between text-sm max-[770px]:text-xs text-gray-500`}>
                                    <span>{t("profile.cleanlinessLow")}</span>
                                    <span>{t("profile.cleanlinessHigh")}</span>
                                </div>
                            </div>

                            {/* Introvert/Extrovert Scale */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>
                                    {t("profile.introvertExtrovert")}: {profileData.introvertExtrovert}/10
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={profileData.introvertExtrovert}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, introvertExtrovert: parseInt(e.target.value) }))}
                                    className={`w-full h-2 max-[770px]:h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#C505EB]`}
                                />
                                <div className={`flex justify-between text-sm max-[770px]:text-xs text-gray-500`}>
                                    <span>{t("profile.introvert")}</span>
                                    <span>{t("profile.extrovert")}</span>
                                </div>
                            </div>

                            {/* Guests/Parties */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.guestsParties")}</label>
                                <div className={`flex gap-2 max-[770px]:gap-1.5 flex-wrap`}>
                                    {["allowed", "notAllowed"].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setProfileData(prev => ({ ...prev, guestsParties: option }))}
                                            className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg border-2 transition-all duration-300 text-base max-[770px]:text-sm ${
                                                profileData.guestsParties === option
                                                    ? "border-[#C505EB] bg-[#C505EB] text-white"
                                                    : "border-gray-300 dark:border-gray-600 hover:border-[#C505EB]"
                                            }`}
                                        >
                                            {t(`profile.guestsPartiesOptions.${option}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preferred Gender and Age Range */}
                            <div className={`flex max-[770px]:flex-col gap-4`}>
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.preferredGender")}</label>
                                    <select
                                        value={profileData.preferredGender}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, preferredGender: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                    >
                                        <option value="">{t("profile.noPreference")}</option>
                                        <option value="male">{t("profile.genderMale")}</option>
                                        <option value="female">{t("profile.genderFemale")}</option>
                                        <option value="any">{t("profile.genderAny")}</option>
                                    </select>
                                </div>
                                <div className={`flex-1 flex flex-col gap-3`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>
                                        {t("profile.preferredAgeRange")}: <span className={`text-[#C505EB]`}>{(() => { const p = (profileData.preferredAgeRange || "").split("-"); const lo = Math.max(18, Math.min(99, Number(p[0]) || 18)); const hi = Math.max(lo + 1, Math.min(100, Number(p[1]) || 100)); return `${lo} – ${hi}`; })()}</span>
                                    </label>
                                    {(() => {
                                        const p = (profileData.preferredAgeRange || "").split("-");
                                        const ageMin = Math.max(18, Math.min(99, Number(p[0]) || 18));
                                        const ageMax = Math.max(ageMin + 1, Math.min(100, Number(p[1]) || 100));
                                        return (
                                            <div className={`flex flex-col gap-1`}>
                                                <div className={`relative h-5 flex items-center`}>
                                                    <div className={`absolute inset-x-0 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full`} />
                                                    <div
                                                        className={`absolute h-1.5 bg-[#C505EB] rounded-full`}
                                                        style={{ left: `${((ageMin - 18) / 82) * 100}%`, right: `${((100 - ageMax) / 82) * 100}%` }}
                                                    />
                                                    <input
                                                        type="range" min="18" max="100" step="1" value={ageMin}
                                                        onChange={(e) => { const v = Math.min(Number(e.target.value), ageMax - 1); setProfileData(prev => ({ ...prev, preferredAgeRange: `${v}-${ageMax}` })); }}
                                                        className={`absolute w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C505EB] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#C505EB] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-track]:bg-transparent`}
                                                        style={{ zIndex: ageMin >= 90 ? 5 : 3 }}
                                                    />
                                                    <input
                                                        type="range" min="18" max="100" step="1" value={ageMax}
                                                        onChange={(e) => { const v = Math.max(Number(e.target.value), ageMin + 1); setProfileData(prev => ({ ...prev, preferredAgeRange: `${ageMin}-${v}` })); }}
                                                        className={`absolute w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C505EB] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#C505EB] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-track]:bg-transparent`}
                                                        style={{ zIndex: ageMin >= 90 ? 3 : 5 }}
                                                    />
                                                </div>
                                                <div className={`flex justify-between text-xs text-gray-400 dark:text-gray-500`}>
                                                    <span>18</span>
                                                    <span>100</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className={`pt-2`}>
                                <h3 className={`text-xl max-[770px]:text-lg font-bold`}>{t("profile.statusSubheading")}</h3>
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3`}>
                                <label className={`flex items-center gap-3 p-4 rounded-xl border border-[#E0E0E0] dark:border-gray-600 cursor-pointer hover:border-[#C505EB]/60 transition-all duration-300`}>
                                    <input
                                        type="checkbox"
                                        checked={profileData.withChildren}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, withChildren: e.target.checked }))}
                                        className={`w-5 h-5 accent-[#C505EB]`}
                                    />
                                    <span className={`text-sm font-semibold`}>{t("profile.withChildren")}</span>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-xl border border-[#E0E0E0] dark:border-gray-600 cursor-pointer hover:border-[#C505EB]/60 transition-all duration-300`}>
                                    <input
                                        type="checkbox"
                                        checked={profileData.withDisability}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, withDisability: e.target.checked }))}
                                        className={`w-5 h-5 accent-[#C505EB]`}
                                    />
                                    <span className={`text-sm font-semibold`}>{t("profile.withDisability")}</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Статус профиля */}
                    {activeSection === "status" && (
                        <div className={`flex flex-col gap-6 max-[770px]:gap-4`}>
                            {/* Verified Status */}
                            <div className={`flex items-center gap-4 max-[770px]:gap-3 p-6 max-[770px]:p-4 rounded-xl border-2 ${
                                profileData.verified 
                                    ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                                    : "border-gray-300 dark:border-gray-600"
                            }`}>
                                <div className={`w-12 h-12 max-[770px]:w-10 max-[770px]:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    profileData.verified ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                }`}>
                                    <CheckCircle size={24} className={`max-[770px]:w-5 max-[770px]:h-5 text-white`} />
                                </div>
                                <div className={`flex-1 min-w-0`}>
                                    <h3 className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.verified")}</h3>
                                    <p className={`text-sm max-[770px]:text-xs text-gray-600 dark:text-gray-400`}>
                                        {profileData.verified 
                                            ? t("profile.verifiedTrue") 
                                            : t("profile.verifiedFalse")
                                        }
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleVerified}
                                    disabled={isTogglingVerified}
                                    className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg font-semibold text-base max-[770px]:text-sm transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                                        profileData.verified
                                            ? "bg-green-500 text-white hover:bg-green-600"
                                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                                >
                                    {profileData.verified ? t("profile.verified") : t("profile.verify")}
                                </button>
                            </div>

                            {/* Looking for Housing */}
                            <div className={`flex items-center gap-4 max-[770px]:gap-3 p-6 max-[770px]:p-4 rounded-xl border-2 border-[#C505EB] bg-[#C505EB]/10`}>
                                <Icon icon="mdi:home-search" width="48" height="48" className={`max-[770px]:w-10 max-[770px]:h-10 flex-shrink-0`} style={{color: `#C505EB`}} />
                                <div className={`flex-1 min-w-0`}>
                                    <h3 className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.lookingForHousing")}</h3>
                                    <p className={`text-sm max-[770px]:text-xs text-gray-600 dark:text-gray-400`}>
                                        {profileData.lookingForHousing 
                                            ? t("profile.lookingForHousingTrue") 
                                            : t("profile.lookingForHousingFalse")
                                        }
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setProfileData(prev => ({ ...prev, lookingForHousing: !prev.lookingForHousing }))}
                                    className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg font-semibold text-base max-[770px]:text-sm transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                                        profileData.lookingForHousing
                                            ? "bg-[#C505EB] text-white hover:bg-[#BA00F8]"
                                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    }`}
                                >
                                    {profileData.lookingForHousing ? t("profile.active") : t("profile.inactive")}
                                </button>
                            </div>

                            <div className="flex items-center gap-4 max-[770px]:gap-3 p-6 max-[770px]:p-4 rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                                <div className="w-12 h-12 max-[770px]:w-10 max-[770px]:h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500">
                                    <Crown size={24} className="max-[770px]:w-5 max-[770px]:h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg max-[770px]:text-base font-bold">{t("profile.monetizationTitle")}</h3>
                                    <p className="text-sm max-[770px]:text-xs text-gray-600 dark:text-gray-300">
                                        {t("profile.monetizationSubtitle")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate("/profile/plans")}
                                    className="px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg font-semibold text-base max-[770px]:text-sm transition-all duration-300 whitespace-nowrap flex-shrink-0 bg-amber-500 text-white hover:bg-amber-600"
                                >
                                    {t("profile.openPlans")}
                                </button>
                            </div>

                        </div>
                    )}

                    {/* Favorites Section */}
                    {activeSection === "favorites" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {t("favorites")}
                                </h2>
                            </div>
                            {favLoading && (
                                <div className="text-center py-10">{t("loading")}</div>
                            )}
                            {favError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{favError}</div>
                            )}
                            {!favLoading && favListings.length === 0 && !favError && (
                                <div className="text-center py-10">
                                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">{t("no_favorites_yet")}</p>
                                    <button
                                        onClick={() => navigate("/apartments")}
                                        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        {t("explore_listings")}
                                    </button>
                                </div>
                            )}
                            {!favLoading && favListings.length > 0 && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 justify-items-center">
                                        {favListings.map((listing) => (
                                            <SaleCard
                                                key={listing.id}
                                                {...convertToSaleCardType(listing)}
                                                onRemoveFavorite={() => handleRemoveFavorite(listing.id, listing.type)}
                                            />
                                        ))}
                                    </div>
                                    {favTotalPages > 1 && (
                                        <div className="flex justify-center gap-2 mt-4">
                                            <button
                                                disabled={favPage === 1}
                                                onClick={() => setFavPage(Math.max(1, favPage - 1))}
                                                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                {t("previous")}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: favTotalPages }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setFavPage(page)}
                                                        className={`px-3 py-2 rounded-lg ${
                                                            favPage === page ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                disabled={favPage === favTotalPages}
                                                onClick={() => setFavPage(Math.min(favTotalPages, favPage + 1))}
                                                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                {t("next")}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* My Listings Section */}
                    {activeSection === "myListings" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Icon icon="mdi:home-city" width="24" height="24" style={{color: "#C505EB"}} />
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {t("profile.sections.myListings")}
                                </h2>
                            </div>
                            {myListingsLoading && (
                                <div className="text-center py-10">{t("loading")}</div>
                            )}
                            {myListingsError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{myListingsError}</div>
                            )}
                            {!myListingsLoading && myListings.length === 0 && !myListingsError && (
                                <div className="text-center py-10">
                                    <Icon icon="mdi:home-city-outline" width="48" height="48" className="text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">{t("no_listings_yet")}</p>
                                    <button
                                        onClick={() => navigate("/add")}
                                        className="inline-block bg-gradient-to-r from-[#C505EB] to-[#BA00F8] text-white px-6 py-2 rounded-lg hover:from-[#BA00F8] hover:to-[#C505EB] transition"
                                    >
                                        {t("header.addListing")}
                                    </button>
                                </div>
                            )}
                            {!myListingsLoading && myListings.length > 0 && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 justify-items-center">
                                        {myListings.map((listing) => (
                                            <div
                                                key={listing.id}
                                                onClick={handleMyListingsCardClick}
                                                className={listing.is_active === false ? "rounded-xl p-1 bg-gray-200/80 dark:bg-gray-700/80" : ""}
                                            >
                                                <SaleCard
                                                    {...convertToSaleCardType(listing)}
                                                    linkState={{ profileTab: "myListings" }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {myListingsTotalPages > 1 && (
                                        <div className="flex justify-center gap-2 mt-4">
                                            <button
                                                disabled={myListingsPage === 1}
                                                onClick={() => setMyListingsPage(Math.max(1, myListingsPage - 1))}
                                                className="px-4 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                                            >
                                                {t("previous")}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: myListingsTotalPages }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setMyListingsPage(page)}
                                                        className={`px-3 py-2 rounded-lg ${
                                                            myListingsPage === page ? "bg-[#C505EB] text-white" : "bg-white dark:bg-gray-700 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                disabled={myListingsPage === myListingsTotalPages}
                                                onClick={() => setMyListingsPage(Math.min(myListingsTotalPages, myListingsPage + 1))}
                                                className="px-4 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                                            >
                                                {t("next")}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* My Home Section */}
                    {activeSection === "myHome" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Icon icon="mdi:home-group" width="24" height="24" style={{color: "#C505EB"}} />
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {t("profile.sections.myHome")}
                                </h2>
                            </div>

                            {showJoinedHomeNotice && (
                                <div className="flex items-center gap-3 rounded-xl border border-[#08D3E2]/40 bg-gradient-to-r from-[#BA00F8]/10 to-[#08D3E2]/10 px-4 py-3">
                                    <CheckCircle className="w-5 h-5 text-[#08D3E2]" />
                                    <span className="text-sm font-semibold text-[#333333] dark:text-white">
                                        {t("profile.joinedHomeSuccess")}
                                    </span>
                                </div>
                            )}

                            {myHomeLoading && <div className="text-center py-10">{t("loading")}</div>}
                            {myHomeError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{myHomeError}</div>
                            )}

                            {!myHomeLoading && myHomeData?.listing == null && !myHomeError && (
                                <div className="text-center py-10 text-gray-500">{t("profile.notInHome")}</div>
                            )}

                            {!myHomeLoading && myHomeData?.listing && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <button
                                        type="button"
                                        onClick={() => navigate(getMyHomeListingUrl(myHomeData.listing))}
                                        className="w-full mb-5 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-[#C505EB] transition-all duration-300 text-left"
                                    >
                                        <div className="w-full max-w-[320px] aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden mx-auto">
                                            <img
                                                src={getImageUrl(myHomeData.listing.image)}
                                                alt={myHomeData.listing.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="p-4 bg-white dark:bg-gray-800">
                                            <div className="text-xl font-bold text-[#C505EB] hover:text-[#BA00F8] underline underline-offset-4">
                                                {myHomeData.listing.title}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {myHomeData.listing.address || myHomeData.listing.region}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                {t("profile.residents")}: {myHomeData.listing.residentsCount} / {myHomeData.listing.maxResidents}
                                            </div>
                                        </div>
                                    </button>

                                    <div className="mb-6">
                                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            {t("profile.residents")}
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                        {Array.isArray(myHomeData.residents) && myHomeData.residents.map((resident: any) => (
                                            <button
                                                key={resident.profileId}
                                                type="button"
                                                onClick={() => navigate(`/neighbours/${resident.profileId}`)}
                                                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full pl-1 pr-3 py-1 hover:ring-2 hover:ring-[#C505EB]/40 transition-all duration-200"
                                            >
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#C505EB]/20 flex items-center justify-center text-[#C505EB] text-xs font-bold">
                                                    {resident.avatar ? (
                                                        <img src={getImageUrl(resident.avatar)} alt={resident.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{getInitials(resident.name)}</span>
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-700 dark:text-gray-200">
                                                    {resident.name}
                                                </span>
                                            </button>
                                        ))}
                                        </div>
                                    </div>

                                    <div className="mb-4 flex flex-wrap gap-3">
                                        <button
                                            onClick={handleCreateInvite}
                                            disabled={creatingInvite}
                                            className="px-6 py-3 rounded-lg bg-[#C505EB] text-white hover:bg-[#BA00F8] disabled:opacity-60"
                                        >
                                            {creatingInvite ? t("profile.creatingInvite") : t("profile.invite")}
                                        </button>
                                        <button
                                            onClick={handleInviteByQr}
                                            disabled={creatingInvite}
                                            className="px-6 py-3 rounded-lg border border-[#C505EB] text-[#C505EB] hover:bg-[#C505EB]/10 disabled:opacity-60"
                                        >
                                            {t("profile.inviteByQr")}
                                        </button>
                                    </div>
                                    {inviteFeedback && (
                                        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                            {inviteFeedback}
                                        </div>
                                    )}
                                    {inviteError && (
                                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                            {inviteError}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setLeaveHomeErrorMessage(null);
                                            setIsLeaveHomeModalOpen(true);
                                        }}
                                        disabled={leavingHome}
                                        className="px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                        {leavingHome ? t("profile.leavingHome") : t("profile.leaveHome")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save Button */}
                    {activeSection !== "favorites" && activeSection !== "myListings" && activeSection !== "myHome" && (
                        <div className={`mt-8 max-[770px]:mt-6 flex flex-col items-end max-[770px]:items-stretch gap-3`}>
                            {saveErrorMessage && (
                                <div className={`w-full min-[771px]:w-auto px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium`}>
                                    {saveErrorMessage}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`px-8 max-[770px]:px-6 py-4 max-[770px]:py-3 rounded-full text-white text-lg max-[770px]:text-base font-semibold bg-gradient-to-r from-[#C505EB] to-[#BA00F8] hover:from-[#BA00F8] hover:to-[#C505EB] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full max-[770px]:w-full min-[771px]:w-auto`}
                            >
                                {saveSuccess ? (
                                    <>
                                        <CheckCircle size={20} className={`max-[770px]:w-5 max-[770px]:h-5`} />
                                        {t("profile.saved")}
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} className={`max-[770px]:w-5 max-[770px]:h-5`} />
                                        {isSaving ? t("profile.saving") : t("profile.save")}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isQrModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsQrModalOpen(false)}
                        aria-label={t("profile.closeQrModal")}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                        <button
                            type="button"
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label={t("profile.closeQrModal")}
                        >
                            <X size={18} />
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t("profile.inviteByQr")}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            {t("profile.scanQrHint")}
                        </p>
                        <div className="mx-auto w-64 h-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-3">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(inviteQrLink)}`}
                                alt={t("profile.inviteByQr")}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
            {isLeaveHomeModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsLeaveHomeModalOpen(false)}
                        aria-label={t("profile.leaveHome")}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                        <button
                            type="button"
                            onClick={() => setIsLeaveHomeModalOpen(false)}
                            className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label={t("profile.leaveHome")}
                        >
                            <X size={18} />
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t("profile.leaveHome")}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            {t("profile.leaveHomeConfirm")}
                        </p>
                        {leaveHomeErrorMessage && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {leaveHomeErrorMessage}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsLeaveHomeModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                {t("messenger.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleLeaveHome}
                                disabled={leavingHome}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {leavingHome ? t("profile.leavingHome") : t("profile.leaveHome")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
