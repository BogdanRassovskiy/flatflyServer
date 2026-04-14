import {Icon} from "@iconify/react";
import {useState, useRef, useEffect} from "react";
import {X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle} from "lucide-react";
import {useLanguage} from "../../contexts/LanguageContext";
import {useNavigate, useSearchParams} from "react-router-dom";
import { getCsrfToken } from "../../utils/csrf";
import MapPicker from "../../components/MapPicker/MapPicker";
import ListingPromotionPanel, { type ListingPromotionTier } from "./ListingPromotionPanel";

type MunicipalitySuggestion = {
  name: string;
  region_code: string;
  municipality_type?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type StreetSuggestion = {
  name: string;
  city_name: string;
  region_code: string;
  latitude?: number | null;
  longitude?: number | null;
  full_address?: string;
};


export default function AddingPage() {
    const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editListingId = searchParams.get("editListingId");
  const isEditMode = Boolean(editListingId);
    
    // Основные поля
    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");
    const [address, setAddress] = useState("");
    const [citySuggestions, setCitySuggestions] = useState<MunicipalitySuggestion[]>([]);
    const [isCityLoading, setIsCityLoading] = useState(false);
    const [isCityFromList, setIsCityFromList] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([]);
    const [isStreetLoading, setIsStreetLoading] = useState(false);
    const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
    const [isAddressFromList, setIsAddressFromList] = useState(false);
    const [geoLat, setGeoLat] = useState<number | null>(null);
    const [geoLng, setGeoLng] = useState<number | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([50.0755, 14.4378]);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    
    // Состояние и энергетика
    const [conditionState, setConditionState] = useState("");
    const [energyClass, setEnergyClass] = useState("");
    const [currency, setCurrency] = useState("CZK");
    
    // POI инфраструктура
    const [hasBusStop, setHasBusStop] = useState(false);
    const [hasTrainStation, setHasTrainStation] = useState(false);
    const [hasMetro, setHasMetro] = useState(false);
    const [hasPostOffice, setHasPostOffice] = useState(false);
    const [hasAtm, setHasAtm] = useState(false);
    const [hasGeneralPractitioner, setHasGeneralPractitioner] = useState(false);
    const [hasVet, setHasVet] = useState(false);
    const [hasPrimarySchool, setHasPrimarySchool] = useState(false);
    const [hasKindergarten, setHasKindergarten] = useState(false);
    const [hasSupermarket, setHasSupermarket] = useState(false);
    const [hasSmallShop, setHasSmallShop] = useState(false);
    const [hasRestaurant, setHasRestaurant] = useState(false);
    const [hasPlayground, setHasPlayground] = useState(false);
    
    // Старые поля
    const [internet, setInternet] = useState(false);
    const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
    const [utilitiesFee, setUtilitiesFee] = useState<number>(0);
    const [deposit, setDeposit] = useState<number>(0);
    const [petsAllowed, setPetsAllowed] = useState(false);
    const [smokingAllowed, setSmokingAllowed] = useState(false);
    const [rentalPeriod, setRentalPeriod] = useState("long");
    const [maxResidents, setMaxResidents] = useState(2);
    const [creatorRole, setCreatorRole] = useState<"OWNER" | "NEIGHBOUR">("OWNER");
    const [preferredGender, setPreferredGender] = useState<"male" | "female" | "any">("any");
    const [moveInDate, setMoveInDate] = useState("");
    const [amenities, setAmenities] = useState<string[]>([]);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const { t } = useLanguage();
    const [typeAd,setTypeAd] = useState(``);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const cityAutocompleteRef = useRef<HTMLDivElement>(null);
    const addressAutocompleteRef = useRef<HTMLDivElement>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [layout, setLayout] = useState("");
    const [price, setPrice] = useState<number | null>(null);
    
    // Состояние для уведомлений
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [isLoadingListing, setIsLoadingListing] = useState(false);
    const [showLeaveHomeAction, setShowLeaveHomeAction] = useState(false);
    const [isLeavingHome, setIsLeavingHome] = useState(false);
    const [showPromotionStep, setShowPromotionStep] = useState(false);

    // Функция показа уведомления
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({message, type});
        setTimeout(() => setNotification(null), 4000);
    };

    const handleLeaveHomeForPublishing = async () => {
      try {
        setIsLeavingHome(true);
        const response = await fetch("/api/listings/leave-home/", {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": getCsrfToken(),
          },
        });

        const payload = await response.json().catch(() => ({}));
        const detail = String(payload?.detail || "").trim();

        if (!response.ok) {
          if (detail === "Cannot leave as sole resident") {
            showNotification(t("add.cannotLeaveAsSoleResident"), "error");
            return;
          }
          if (detail === "Not in any home") {
            showNotification(t("add.notInAnyHome"), "error");
            setShowLeaveHomeAction(false);
            return;
          }
          showNotification(detail || t("add.leaveHomeFailed"), "error");
          return;
        }

        showNotification(t("add.leftHomeSuccess"), "success");
        setShowLeaveHomeAction(false);
      } catch (error) {
        console.error(error);
        showNotification(t("add.leaveHomeFailed"), "error");
      } finally {
        setIsLeavingHome(false);
      }
    };

    const handleCityInputChange = (value: string) => {
      setCity(value);
      setIsCityFromList(false);
      setIsCityDropdownOpen(true);
    };

    const handleCitySelect = (item: MunicipalitySuggestion) => {
      setCity(item.name);
      setIsCityFromList(true);
      setCitySuggestions([]);
      setIsCityDropdownOpen(false);
      setAddress("");
      setStreetSuggestions([]);
      setIsAddressFromList(false);
      setIsAddressDropdownOpen(false);
      if (item.latitude !== null && item.latitude !== undefined && item.longitude !== null && item.longitude !== undefined) {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setMapCenter([lat, lng]);
          if (geoLat === null || geoLng === null) {
            setGeoLat(lat);
            setGeoLng(lng);
          }
        }
      }
    };

    const handleAddressInputChange = (value: string) => {
      setAddress(value);
      setIsAddressFromList(false);
      setIsAddressDropdownOpen(true);
    };

    const handleAddressSelect = (item: StreetSuggestion) => {
      setAddress(item.name);
      setIsAddressFromList(true);
      setStreetSuggestions([]);
      setIsAddressDropdownOpen(false);

      const lat = Number(item.latitude);
      const lng = Number(item.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setGeoLat(lat);
        setGeoLng(lng);
        setMapCenter([lat, lng]);
      }
    };

    const reverseGeocodePoint = async (lat: number, lng: number) => {
      try {
        setIsReverseGeocoding(true);
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
        });
        const response = await fetch(`/api/geocode/reverse?${params.toString()}`, {
          credentials: "include",
        });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const nextRegion = String(payload?.region_code || "").trim();
        const nextCity = String(payload?.city || "").trim();
        const nextAddress = String(payload?.address || "").trim();

        if (nextRegion) {
          setRegion(nextRegion);
        }

        if (nextCity) {
          setCity(nextCity);
          setIsCityFromList(Boolean(payload?.city_in_dictionary));
        }

        if (nextAddress) {
          setAddress(nextAddress);
          // Street is advisory-only: never enforce list-only mode for publishing.
          setIsAddressFromList(false);
        }
      } catch (error) {
        console.error("Reverse geocoding failed", error);
      } finally {
        setIsReverseGeocoding(false);
      }
    };

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
    const toggleAmenity = (value: string) => {
      setAmenities(prev => {
        const next = prev.includes(value)
          ? prev.filter(v => v !== value)
          : [...prev, value];

        if (value === "internet") {
          setInternet(next.includes("internet"));
        }

        return next;
      });
    };
    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;

        const imageFiles = Array.from(files).filter(file =>
            file.type.startsWith("image/") &&
            ["image/jpeg", "image/jpg", "image/png"].includes(file.type)
        );

        imageFiles.forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                showNotification(t("add.fileTooLarge").replace("{fileName}", file.name), 'error');
                return;
            }

            // сохраняем файл для отправки на сервер
            setSelectedFiles(prev => [...prev, file]);

            // делаем превью для интерфейса
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result) {
                    setUploadedImages(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };
    const validatePublishForm = (): boolean => {
      if (!typeAd) {
        showNotification(t("add.selectAdType"), "error");
        return false;
      }
      if (!title || !description || !price) {
        showNotification(t("add.fillRequiredFields"), "error");
        return false;
      }
      if (!region) {
        showNotification(t("add.selectRegionRequired"), "error");
        return false;
      }
      if (!city || !isCityFromList) {
        showNotification(t("add.selectCityFromList"), "error");
        return false;
      }
      return true;
    };

    const handlePublishClick = () => {
      if (!validatePublishForm()) {
        return;
      }
      if (isEditMode) {
        void executePublish("standard");
        return;
      }
      setShowPromotionStep(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const executePublish = async (promotionTier: ListingPromotionTier = "standard") => {
      try {
        setIsLoadingListing(true);
        setShowLeaveHomeAction(false);
        const payload = {
              property_type: typeAd,
              type: typeAd,
              creatorRole,
              title,
              description,
              price,
              currency,
              preferredGender,
              preferred_gender: preferredGender,
              
              region,
              city,
              address,
              geo_lat: geoLat,
              geo_lng: geoLng,
              
              rooms: layout,
              
              condition_state: conditionState || null,
              energy_class: energyClass || null,
              
              has_bus_stop: hasBusStop,
              has_train_station: hasTrainStation,
              has_metro: hasMetro,
              has_post_office: hasPostOffice,
              has_atm: hasAtm,
              has_general_practitioner: hasGeneralPractitioner,
              has_vet: hasVet,
              has_primary_school: hasPrimarySchool,
              has_kindergarten: hasKindergarten,
              has_supermarket: hasSupermarket,
              has_small_shop: hasSmallShop,
              has_restaurant: hasRestaurant,
              has_playground: hasPlayground,
              
              rental_period: rentalPeriod === "short" ? "SHORT" : rentalPeriod === "long" ? "LONG" : "BOTH",
              max_residents: maxResidents,
              maxResidents,
              amenities,
              internet,
              utilities_included: utilitiesIncluded,
              utilities_fee: utilitiesIncluded ? 0 : utilitiesFee,
              utilitiesFee: utilitiesIncluded ? 0 : utilitiesFee,
              deposit,
              pets_allowed: petsAllowed,
              smoking_allowed: smokingAllowed,
              move_in_date: moveInDate || null,
            };

        const endpoint = isEditMode ? `/api/listings/${editListingId}/` : "/api/listings/";
        const method = isEditMode ? "PATCH" : "POST";

        const res = await fetch(endpoint, {
          method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const detail = String(errorData?.detail || "").trim();
          if (detail === "You already belong to a home") {
            setShowLeaveHomeAction(true);
            throw new Error(t("add.alreadyBelongToHome"));
          }
          throw new Error(detail || (isEditMode ? t("add.publishFailed") : t("add.failedToCreateAd")));
        }

        const data = await res.json();
        const adId = isEditMode ? editListingId : data.id;

        // Новое объявление создаётся неактивным до успешной загрузки фото (модерация).
        // Если пользователь не добавляет новых файлов — публикуем без смены картинок.
        if (!isEditMode && selectedFiles.length === 0) {
          const activateRes = await fetch(`/api/listings/${adId}/`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCsrfToken(),
            },
            body: JSON.stringify({ isActive: true }),
          });
          if (!activateRes.ok) {
            const err = await activateRes.json().catch(() => ({}));
            throw new Error(String(err?.detail || "").trim() || t("add.publishFailed"));
          }
        }

        // загружаем только новые изображения; выбранное "главное фото" получает приоритет.
        const existingImageCount = Math.max(0, uploadedImages.length - selectedFiles.length);
        for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
          const file = selectedFiles[fileIndex];
          const formData = new FormData();
          formData.append("image", file);
          const imageGlobalIndex = existingImageCount + fileIndex;
          formData.append("is_primary", imageGlobalIndex === primaryImageIndex ? "true" : "false");
          const isLastUpload = fileIndex === selectedFiles.length - 1;
          if (isLastUpload) {
            formData.append("publish_now", "true");
          }

          const imgRes = await fetch(`/api/listings/${adId}/images/`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });

          if (!imgRes.ok) {
            const imgErr = await imgRes.json().catch(() => ({}));
            const detail = String(imgErr?.detail || "").trim();
            throw new Error(
              detail === "Image rejected by moderation"
                ? t("add.imageRejectedByModeration")
                : detail || t("add.failedToUploadImage"),
            );
          }
        }

        const successMessage = (() => {
          if (isEditMode) {
            return t("add.updatedSuccessfully");
          }
          if (promotionTier !== "standard") {
            return t("add.promotion.publishedWithOption");
          }
          return t("add.adSuccessfullyPublished");
        })();
        showNotification(successMessage, "success");

        setShowPromotionStep(false);

        if (!isEditMode) {
          navigate("/listing-published");
          return;
        }

        setTimeout(() => {
          navigate('/profile?tab=myListings');
        }, 1200);

        // опционально: очистка формы
        setTitle("");
        setDescription("");
        setLayout("");
        setPrice(null);
        setTypeAd("");
        setUploadedImages([]);
        setPrimaryImageIndex(0);
        setSelectedFiles([]);
        setCity("");
        setAddress("");
        setIsAddressFromList(false);
        setGeoLat(null);
        setGeoLng(null);
        setConditionState("");
        setEnergyClass("");
        setDeposit(0);
        setPreferredGender("any");

      } catch (err) {
        console.error(err);
        const message = err instanceof Error && err.message ? err.message : t("add.publishFailed");
        showNotification(message, "error");
      } finally {
        setIsLoadingListing(false);
      }
    };

    useEffect(() => {
      if (!isEditMode || !editListingId) {
        return;
      }

      const loadExistingListing = async () => {
        try {
          setIsLoadingListing(true);
          const response = await fetch(`/api/listings/${editListingId}/`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to load listing");
          }

          const data = await response.json();

          const normalizedType = (() => {
            const rawType = String(data.type || data.property_type || "BYT").toUpperCase();
            if (rawType === "APARTMENT") return "BYT";
            if (rawType === "ROOM") return "ROOM";
            if (rawType === "NEIGHBOUR") return "NEIGHBOUR";
            if (rawType === "DUM") return "BYT";
            return "BYT";
          })();

          setTypeAd(normalizedType);
          setTitle(data.title || "");
          setDescription(data.description || "");
          setLayout(data.rooms !== null && data.rooms !== undefined ? String(data.rooms) : "");
          setPrice(data.price !== null && data.price !== undefined ? Number(data.price) : null);
          setCurrency(data.currency || "CZK");

          setRegion(data.region || "");
          setCity(data.city || "");
          setIsCityFromList(Boolean(data.city));
          setAddress(data.address || "");
          setIsAddressFromList(Boolean(data.address));
          const existingGeoLat = data.geo_lat !== null && data.geo_lat !== undefined ? Number(data.geo_lat) : null;
          const existingGeoLng = data.geo_lng !== null && data.geo_lng !== undefined ? Number(data.geo_lng) : null;
          setGeoLat(existingGeoLat);
          setGeoLng(existingGeoLng);
          if (existingGeoLat !== null && existingGeoLng !== null && Number.isFinite(existingGeoLat) && Number.isFinite(existingGeoLng)) {
            setMapCenter([existingGeoLat, existingGeoLng]);
          }

          setConditionState(data.condition_state || "");
          setEnergyClass(data.energy_class || "");

          const normalizedAmenities = Array.isArray(data.amenities) ? data.amenities : [];
          setAmenities(normalizedAmenities);
          setInternet(Boolean(data.internet) || normalizedAmenities.includes("internet"));

          setUtilitiesIncluded(Boolean(data.utilities_included));
          setUtilitiesFee(Number(data.utilitiesFee || 0));
          setDeposit(Number(data.deposit || 0));

          setPetsAllowed(Boolean(data.pets_allowed));
          setSmokingAllowed(Boolean(data.smoking_allowed));
          setRentalPeriod(data.rental_period === "SHORT" ? "short" : data.rental_period === "LONG" ? "long" : "flexible");
          setMaxResidents(Number(data.maxResidents || 1));
          setMoveInDate(data.move_in_date || "");
          setPreferredGender((data.preferredGender || data.preferred_gender || "any") as "male" | "female" | "any");

          setHasBusStop(Boolean(data.has_bus_stop));
          setHasTrainStation(Boolean(data.has_train_station));
          setHasMetro(Boolean(data.has_metro));
          setHasPostOffice(Boolean(data.has_post_office));
          setHasAtm(Boolean(data.has_atm));
          setHasGeneralPractitioner(Boolean(data.has_general_practitioner));
          setHasVet(Boolean(data.has_vet));
          setHasPrimarySchool(Boolean(data.has_primary_school));
          setHasKindergarten(Boolean(data.has_kindergarten));
          setHasSupermarket(Boolean(data.has_supermarket));
          setHasSmallShop(Boolean(data.has_small_shop));
          setHasRestaurant(Boolean(data.has_restaurant));
          setHasPlayground(Boolean(data.has_playground));

          const existingImages = Array.isArray(data.images) ? data.images : [];
          setUploadedImages(existingImages);
          const imageItems = Array.isArray(data.imageItems) ? data.imageItems : [];
          const primaryIdxFromBackend = imageItems.findIndex((item: any) => Boolean(item?.isPrimary));
          setPrimaryImageIndex(primaryIdxFromBackend >= 0 ? primaryIdxFromBackend : 0);
          setSelectedFiles([]);
        } catch (error) {
          console.error("Failed to preload listing for editing", error);
          showNotification(t("add.publishFailed"), "error");
        } finally {
          setIsLoadingListing(false);
        }
      };

      loadExistingListing();
    }, [isEditMode, editListingId, t]);
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        setSelectedFiles(prev => {
            const existingCount = Math.max(0, uploadedImages.length - prev.length);
            if (index < existingCount) {
                return prev;
            }
            const fileIndex = index - existingCount;
            return prev.filter((_, i) => i !== fileIndex);
        });

        setPrimaryImageIndex((prev) => {
            if (uploadedImages.length <= 1) {
                return 0;
            }
            if (index < prev) {
                return prev - 1;
            }
            if (index === prev) {
                return Math.max(0, prev - 1);
            }
            return prev;
        });

        if (currentImageIndex >= uploadedImages.length - 1 && currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
        }
    };

    const openModal = (index: number) => {
        setCurrentImageIndex(index);
        setIsModalOpen(true);
    };

    const nextImage = () => {
        if (isTransitioning || uploadedImages.length <= 1) return;
        setIsTransitioning(true);
        setCurrentImageIndex((prev) => (prev + 1) % uploadedImages.length);
        setTimeout(() => setIsTransitioning(false), 300);
    };

    const prevImage = () => {
        if (isTransitioning || uploadedImages.length <= 1) return;
        setIsTransitioning(true);
        setCurrentImageIndex((prev) => (prev - 1 + uploadedImages.length) % uploadedImages.length);
        setTimeout(() => setIsTransitioning(false), 300);
    };

    useEffect(() => {
      if (!region) {
        setCitySuggestions([]);
        setIsCityLoading(false);
        return;
      }

      const cityQuery = city.trim();
      if (cityQuery.length < 2 || isCityFromList) {
        setCitySuggestions([]);
        setIsCityLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(async () => {
        try {
          setIsCityLoading(true);
          const params = new URLSearchParams({
            q: cityQuery,
            region,
            limit: "12",
          });

          const response = await fetch(`/api/municipalities/search?${params.toString()}`, {
            credentials: "include",
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error("Failed to load municipalities");
          }

          const payload = await response.json();
          const results = Array.isArray(payload?.results) ? payload.results : [];
          setCitySuggestions(results);
          setIsCityDropdownOpen(true);

          const exactMatch = results.some((item: MunicipalitySuggestion) =>
            String(item?.name || "").toLowerCase() === cityQuery.toLowerCase()
          );
          if (exactMatch) {
            setIsCityFromList(true);
            setIsCityDropdownOpen(false);
          }
        } catch (error: any) {
          if (error?.name !== "AbortError") {
            setCitySuggestions([]);
          }
        } finally {
          setIsCityLoading(false);
        }
      }, 250);

      return () => {
        controller.abort();
        clearTimeout(timeout);
      };
    }, [city, region, isCityFromList]);

    useEffect(() => {
      if (!region || !city || !isCityFromList) {
        setStreetSuggestions([]);
        setIsStreetLoading(false);
        return;
      }

      const streetQuery = address.trim();
      if (streetQuery.length < 2) {
        setStreetSuggestions([]);
        setIsStreetLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(async () => {
        try {
          setIsStreetLoading(true);
          const params = new URLSearchParams({
            q: streetQuery,
            city,
            region,
            limit: "12",
          });

          const response = await fetch(`/api/streets/search?${params.toString()}`, {
            credentials: "include",
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error("Failed to load streets");
          }

          const payload = await response.json();
          const results = Array.isArray(payload?.results) ? payload.results : [];
          setStreetSuggestions(results);
          setIsAddressDropdownOpen(true);

          const exactMatch = results.some((item: StreetSuggestion) =>
            String(item?.name || "").toLowerCase() === streetQuery.toLowerCase()
          );
          if (exactMatch) {
            setIsAddressFromList(true);
            setIsAddressDropdownOpen(false);
          }
        } catch (error: any) {
          if (error?.name !== "AbortError") {
            setStreetSuggestions([]);
          }
        } finally {
          setIsStreetLoading(false);
        }
      }, 250);

      return () => {
        controller.abort();
        clearTimeout(timeout);
      };
    }, [address, city, region, isCityFromList]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (cityAutocompleteRef.current && !cityAutocompleteRef.current.contains(event.target as Node)) {
          setIsCityDropdownOpen(false);
        }
        if (addressAutocompleteRef.current && !addressAutocompleteRef.current.contains(event.target as Node)) {
          setIsAddressDropdownOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };

        if (isModalOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    return(
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-transparent`}>

            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>

                <div className={`mb-[100px] mt-[112px] flex w-full flex-col items-center min-[771px]:mt-[124px]`}>

                    <span className={`font-bold text-[32px] mb-6 text-black dark:text-white text-center max-[770px]:text-2xl`}>
                        {showPromotionStep && !isEditMode ? t("add.promotion.stepTitle") : t("add.title")}
                    </span>

                    {showPromotionStep && !isEditMode ? (
                        <ListingPromotionPanel
                            onBack={() => setShowPromotionStep(false)}
                            onPublish={(tier) => void executePublish(tier)}
                            isPublishing={isLoadingListing}
                        />
                    ) : (
                    <>
                    <div className={`flex flex-col items-center w-full max-w-[850px] py-10 px-[72px] max-[770px]:py-5 max-[770px]:px-[20px] border border-[#666666] dark:border-gray-600 bg-white dark:bg-gray-800 rounded-[24px]`}>
                        <div className={`w-full flex items-center justify-between gap-2`}>
                            <div onClick={()=>setTypeAd(`BYT`)} className={`cursor-pointer relative flex flex-col items-center ${typeAd==="BYT"? `bg-[#C505EB] shadow-md`:``} duration-300 pt-9 max-[770px]:pt-4 max-[770px]:w-[100px] max-[770px]:h-[84px] w-[180px] h-[164px] rounded-[18px] border border-[#666666] dark:border-gray-600 gap-2`}>
                              <span className={`text-2xl max-[770px]:text-xs font-bold ${typeAd===`BYT`? `text-white` : `text-[#C505EB]`} duration-300`}>{t("add.fullApartment")}</span>
                              <Icon className={`absolute bottom-5 duration-300 w-[64px] h-[64px] max-[770px]:w-[32px] max-[770px]:h-[32px]`} icon="lsicon:house-outline" width="64" height="64"  style={{color: typeAd===`BYT`? `#ffffff` : `#08E2BE`}} />
                            </div>
                            <div onClick={()=>setTypeAd(`ROOM`)} className={`cursor-pointer relative flex flex-col items-center ${typeAd==="ROOM"? `bg-[#C505EB] shadow-md`:``} duration-300 pt-9 max-[770px]:pt-4 max-[770px]:w-[100px] max-[770px]:h-[84px] w-[180px] h-[164px] rounded-[18px] border border-[#666666] dark:border-gray-600 gap-2`}>
                                <span className={`text-2xl max-[770px]:text-xs font-bold ${typeAd===`ROOM`? `text-white` : `text-[#C505EB]`} duration-300`}>{t("add.room")}</span>
                                <Icon className={`absolute bottom-3 duration-300 w-[64px] h-[64px] max-[770px]:w-[32px] max-[770px]:h-[32px]`} icon="material-symbols-light:bed-outline" style={{color: typeAd===`ROOM`? `#ffffff` : `#08E2BE`}} />
                            </div>
                            <div onClick={()=>setTypeAd(`NEIGHBOUR`)} className={`cursor-pointer relative flex flex-col items-center text-center ${typeAd==="NEIGHBOUR"? `bg-[#C505EB] shadow-md`:``} duration-300 pt-9 max-[770px]:pt-4 max-[770px]:w-[100px] max-[770px]:h-[84px] w-[180px] h-[164px] rounded-[18px] border border-[#666666] dark:border-gray-600 gap-2 px-3`}>
                              <span className={`text-2xl max-[770px]:text-xs font-bold ${typeAd===`NEIGHBOUR`? `text-white` : `text-[#C505EB]`} duration-300 `}>{t("add.sharedRoom")}</span>
                              <Icon className={`absolute bottom-2 duration-300 w-[64px] h-[64px] max-[770px]:w-[32px] max-[770px]:h-[32px]`} icon="iconoir:sofa" style={{color:  typeAd===`NEIGHBOUR`? `#ffffff` : `#08E2BE`}} />
                            </div>
                        </div>
                        <div className={`w-full flex flex-col items-center mt-[90px] max-[770px]:mt-8`}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                multiple
                                onChange={(e) => handleFileSelect(e.target.files)}
                                className="hidden"
                            />
                            <div 
                                ref={dropZoneRef}
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`w-full flex flex-col items-center min-h-[200px] border border-[#666666] dark:border-gray-600 rounded-[16px] border-dashed cursor-pointer transition-colors duration-300 ${
                                    isDragging ? 'bg-[#C505EB]/10 border-[#C505EB]' : 'hover:bg-[#F9F9F9] dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className={`w-full min-h-[200px] flex flex-col items-center justify-center gap-3 p-4`}>
                                    <Icon icon="mdi-light:cloud-upload" width="64" height="64" style={{color: `#08E2BE`}} />
                                    <span className={`text-[#C505EB] text-2xl font-semibold`}>{t("add.uploadPhotos")}</span>
                                    <span className={`text-[#666666] dark:text-gray-400 text-[14px] text-center`}>{t("add.uploadFormat")}</span>
                                </div>
                            </div>

                            {/* Превью загруженных изображений */}
                            {uploadedImages.length > 0 && (
                                <div className={`w-full mt-6 grid grid-cols-3 max-[770px]:grid-cols-2 gap-4`}>
                                    {uploadedImages.map((image, index) => (
                                        <div key={index} className={`relative group aspect-square rounded-lg overflow-hidden border border-[#E5E5E5] dark:border-gray-600`}>
                                            <img
                                                src={image}
                                                alt={t("add.uploadedImage").replace("{index}", String(index + 1))}
                                                onClick={() => openModal(index)}
                                                className={`w-full h-full object-cover cursor-pointer hover:opacity-90 duration-300`}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPrimaryImageIndex(index);
                                                }}
                                                className={`absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                                                    primaryImageIndex === index
                                                        ? "bg-[#C505EB] text-white"
                                                        : "bg-black/60 text-white hover:bg-black/75"
                                                }`}
                                            >
                                                {primaryImageIndex === index ? t("add.mainPhoto") : t("add.setMainPhoto")}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage(index);
                                                }}
                                                className={`absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 duration-300`}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`w-full max-w-[850px] flex flex-col items-start my-6 gap-3`}>

                      {/* TITLE */}
                      <div className={`w-full flex flex-col items-start gap-1`}>
                        <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                          {t("add.adTitle")}
                        </span>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                      focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                          placeholder={t("add.adTitlePlaceholder")}
                        />
                      </div>

                      {/* DESCRIPTION */}
                      <div className={`w-full flex flex-col items-start gap-1`}>
                        <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                          {t("add.description")}
                        </span>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className={`w-full h-[220px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                      focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 
                                      text-[14px] resize-none`}
                          placeholder={t("add.descriptionPlaceholder")}
                        />
                      </div>

                      <div className={`w-full flex max-[770px]:flex-col items-center justify-between gap-4`}>

                        {/* LAYOUT */}
                        <div className={`w-full flex flex-col items-start gap-1`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.layout")}
                          </span>
                          <input
                            value={layout}
                            onChange={(e) => setLayout(e.target.value)}
                            className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                        focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                            placeholder={t("add.layoutPlaceholder")}
                          />
                        </div>

                        {/* CREATOR ROLE */}
                        <div className={`w-full flex flex-col items-start gap-1`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.creatorRole")}
                          </span>
                          <div className={`w-full h-[50px] grid grid-cols-2 gap-2`}>
                            <button
                              type="button"
                              onClick={() => setCreatorRole("OWNER")}
                              className={`rounded-xl border duration-300 text-xs max-[770px]:text-[11px] leading-tight px-1 text-center font-semibold ${creatorRole === "OWNER" ? "bg-[#C505EB] text-white border-[#C505EB]" : "border-[#E0E0E0] dark:border-gray-600 dark:text-white"}`}
                            >
                              {t("add.roleOwner")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCreatorRole("NEIGHBOUR")}
                              className={`rounded-xl border duration-300 text-xs max-[770px]:text-[11px] leading-tight px-1 text-center font-semibold ${creatorRole === "NEIGHBOUR" ? "bg-[#C505EB] text-white border-[#C505EB]" : "border-[#E0E0E0] dark:border-gray-600 dark:text-white"}`}
                            >
                              {t("add.roleNeighbour")}
                            </button>
                          </div>
                        </div>

                        {/* PREFERRED GENDER */}
                        <div className={`w-full flex flex-col items-start gap-1`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.preferredGender")}
                          </span>
                          <div className={`w-full h-[50px] grid grid-cols-3 gap-1.5`}>
                            <button
                              type="button"
                              onClick={() => setPreferredGender("male")}
                              className={`h-full rounded-xl border duration-300 text-[11px] max-[770px]:text-[10px] leading-[1.1] px-1 text-center font-semibold whitespace-normal break-words ${preferredGender === "male" ? "bg-[#C505EB] text-white border-[#C505EB]" : "border-[#E0E0E0] dark:border-gray-600 dark:text-white"}`}
                            >
                              {t("filter.preferredGenderMale")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreferredGender("female")}
                              className={`h-full rounded-xl border duration-300 text-[11px] max-[770px]:text-[10px] leading-[1.1] px-1 text-center font-semibold whitespace-normal break-words ${preferredGender === "female" ? "bg-[#C505EB] text-white border-[#C505EB]" : "border-[#E0E0E0] dark:border-gray-600 dark:text-white"}`}
                            >
                              {t("filter.preferredGenderFemale")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreferredGender("any")}
                              className={`h-full rounded-xl border duration-300 text-[11px] max-[770px]:text-[10px] leading-[1.1] px-1 text-center font-semibold whitespace-normal break-words ${preferredGender === "any" ? "bg-[#C505EB] text-white border-[#C505EB]" : "border-[#E0E0E0] dark:border-gray-600 dark:text-white"}`}
                            >
                              {t("filter.preferredGenderAny")}
                            </button>
                          </div>
                        </div>

                        {/* PRICE */}
                        <div className={`w-full flex flex-col items-start gap-1`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.price")}
                          </span>
                          <div className={`w-full flex gap-2`}>
                            <input
                              type="number"
                              value={price ?? ""}
                              onChange={(e) =>
                                setPrice(e.target.value === "" ? null : Number(e.target.value))
                              }
                              className={`flex-1 h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                          focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                              placeholder={t("add.pricePlaceholder")}
                            />
                            <select
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className={`w-[100px] h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                         focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 text-[14px]`}
                            >
                              <option value="CZK">CZK</option>
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                            </select>
                          </div>

                          <label className={`mt-2 flex items-center gap-2 text-sm font-medium text-black dark:text-white`}>
                            <input
                              type="checkbox"
                              checked={utilitiesIncluded}
                              onChange={(e) => {
                                const isIncluded = e.target.checked;
                                setUtilitiesIncluded(isIncluded);
                                if (isIncluded) setUtilitiesFee(0);
                              }}
                              className={`w-4 h-4 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] focus:ring-[#C505EB]`}
                            />
                            {t("add.utilitiesIncludedExplicit")}
                          </label>

                          {!utilitiesIncluded && (
                            <input
                              type="number"
                              min={0}
                              value={utilitiesFee}
                              onChange={(e) => setUtilitiesFee(Number(e.target.value || 0))}
                              className={`mt-2 w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                          focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                              placeholder={t("add.utilitiesFeePlaceholder")}
                            />
                          )}

                          <span className={`mt-2 text-sm font-medium text-black dark:text-white`}>
                            {t("add.deposit")}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={deposit}
                            onChange={(e) => setDeposit(Number(e.target.value || 0))}
                            className={`mt-2 w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                        focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                            placeholder={t("add.depositPlaceholder")}
                          />
                        </div>

                      </div>

                      <div className={`w-full flex flex-col items-start gap-2`}>
                        <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                          {t("add.maxResidents")}
                        </span>
                        <div className={`grid grid-cols-6 gap-2 w-full`}>
                          {[1, 2, 3, 4, 5, 6].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setMaxResidents(count)}
                              className={`h-[42px] rounded-xl border duration-300 text-sm font-semibold ${maxResidents === count ? "bg-[#C505EB] text-white border-[#C505EB]" : "border-[#E0E0E0] dark:border-gray-600 dark:text-white"}`}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* DIVIDER */}
                      <div className={`w-full my-8 border-t border-[#E0E0E0] dark:border-gray-600`}></div>

                      {/* CONDITION & ENERGY SECTION */}
                      <div className={`w-full flex max-[770px]:flex-col items-center justify-between gap-4`}>
                        {/* CONDITION STATE */}
                        <div className={`w-full flex flex-col items-start gap-1`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.conditionState")}
                          </span>
                          <select
                            value={conditionState}
                            onChange={(e) => setConditionState(e.target.value)}
                            className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                       focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 text-[14px]`}
                          >
                            <option value="">{t("add.selectConditionState")}</option>
                            <option value="VELMI_DOBRY">{t("filter.conditionVeryGood")}</option>
                            <option value="DOBRY">{t("filter.conditionGood")}</option>
                            <option value="SPATNY">{t("filter.conditionSatisfactory")}</option>
                            <option value="NOVOSTAVBA">{t("filter.conditionNew")}</option>
                            <option value="VE_VYSTAVBE">{t("filter.conditionProject")}</option>
                            <option value="PRED_REKONSTRUKCI">{t("filter.conditionNeedsRenovation")}</option>
                            <option value="V_REKONSTRUKCI">{t("filter.conditionUnderReconstruction")}</option>
                            <option value="PO_REKONSTRUKCI">{t("filter.conditionExcellent")}</option>
                          </select>
                        </div>

                        {/* ENERGY CLASS */}
                        <div className={`w-full flex flex-col items-start gap-1`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.energyClass")}
                          </span>
                          <select
                            value={energyClass}
                            onChange={(e) => setEnergyClass(e.target.value)}
                            className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                       focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 text-[14px]`}
                          >
                            <option value="">{t("add.selectEnergyClass")}</option>
                            <option value="A">{t("add.energyClassA")}</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                            <option value="G">{t("add.energyClassG")}</option>
                          </select>
                        </div>
                      </div>

                      {/* ADDITIONAL FIELDS SECTION */}
                      <div className={`w-full flex flex-col gap-6`}>
                        
                        {/* REGION & ADDRESS ROW */}
                        <div className={`w-full flex max-[770px]:flex-col items-center justify-between gap-4`}>
                          {/* REGION */}
                          <div className={`w-full flex flex-col items-start gap-1`}>
                            <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                              {t("filter.location")}
                            </span>
                            <select
                              value={region}
                              onChange={(e) => {
                                const nextRegion = e.target.value;
                                setRegion(nextRegion);
                                setCity("");
                                setCitySuggestions([]);
                                setIsCityFromList(false);
                                setIsCityDropdownOpen(false);
                                setAddress("");
                                setStreetSuggestions([]);
                                setIsAddressFromList(false);
                                setIsAddressDropdownOpen(false);
                                setGeoLat(null);
                                setGeoLng(null);
                              }}
                              className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                         focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 text-[14px]`}
                            >
                              <option value="" disabled>{t("add.selectRegionRequired")}</option>
                              {CZECH_REGIONS.map(r => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* ADDRESS */}
                          <div ref={cityAutocompleteRef} className={`w-full flex flex-col items-start gap-1 relative`}>
                            <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                              {t("filter.city")}
                            </span>
                            <input
                              value={city}
                              onChange={(e) => handleCityInputChange(e.target.value)}
                              onFocus={() => {
                                if (!isCityFromList && citySuggestions.length > 0) {
                                  setIsCityDropdownOpen(true);
                                }
                              }}
                              className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                        focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                              placeholder={t("filter.cityPlaceholder")}
                            />
                            {isCityLoading && (
                              <span className={`text-xs text-[#666666] dark:text-gray-400 mt-1`}>{t("add.cityLoading")}</span>
                            )}
                            {!isCityFromList && city.length >= 2 && !isCityLoading && isCityDropdownOpen && (
                              <div className={`absolute top-[82px] left-0 w-full z-20 max-h-[220px] overflow-y-auto rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg`}>
                                {citySuggestions.length > 0 ? citySuggestions.map((item, index) => (
                                  <button
                                    key={`${item.name}-${index}`}
                                    type="button"
                                    onClick={() => handleCitySelect(item)}
                                    className={`w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-200`}
                                  >
                                    {item.name}
                                  </button>
                                )) : (
                                  <div className={`px-4 py-2 text-sm text-[#666666] dark:text-gray-400`}>
                                    {t("add.cityNoResults")}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* ADDRESS DETAIL ROW */}
                        <div ref={addressAutocompleteRef} className={`w-full flex flex-col items-start gap-1 relative`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.streetAddress")}
                          </span>
                          <input
                            value={address}
                            onChange={(e) => handleAddressInputChange(e.target.value)}
                            onFocus={() => {
                              if (!isAddressFromList && streetSuggestions.length > 0) {
                                setIsAddressDropdownOpen(true);
                              }
                            }}
                            className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                      focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                            placeholder={t("add.streetAddressPlaceholder")}
                          />
                          {isStreetLoading && (
                            <span className={`text-xs text-[#666666] dark:text-gray-400 mt-1`}>{t("add.streetLoading")}</span>
                          )}
                          {!isAddressFromList && address.length >= 2 && !isStreetLoading && isAddressDropdownOpen && (
                            <div className={`absolute top-[82px] left-0 w-full z-20 max-h-[220px] overflow-y-auto rounded-xl border border-[#E0E0E0] dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg`}>
                              {streetSuggestions.length > 0 ? streetSuggestions.map((item, index) => (
                                <button
                                  key={`${item.name}-${item.city_name}-${index}`}
                                  type="button"
                                  onClick={() => handleAddressSelect(item)}
                                  className={`w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-gray-700 duration-200`}
                                >
                                  {item.full_address || `${item.name}, ${item.city_name}`}
                                </button>
                              )) : (
                                <div className={`px-4 py-2 text-sm text-[#666666] dark:text-gray-400`}>
                                  {t("add.streetNoResults")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={`w-full flex flex-col items-start gap-2 mt-2`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.locationOnMap")}
                          </span>
                          <MapPicker
                            center={mapCenter}
                            point={geoLat !== null && geoLng !== null ? [geoLat, geoLng] : null}
                            onPointChange={(lat, lng) => {
                              setGeoLat(lat);
                              setGeoLng(lng);
                              setMapCenter([lat, lng]);
                              reverseGeocodePoint(lat, lng);
                            }}
                          />
                          <span className={`text-sm text-[#666666] dark:text-gray-400`}>
                            {t("add.mapHint")}
                          </span>
                          {isReverseGeocoding && (
                            <span className={`text-sm text-[#666666] dark:text-gray-400`}>
                              {t("add.reverseGeocoding")}
                            </span>
                          )}
                          <span className={`text-sm font-semibold text-black dark:text-white`}>
                            {geoLat !== null && geoLng !== null
                              ? `${t("add.selectedCoordinates")}: ${geoLat.toFixed(6)}, ${geoLng.toFixed(6)}`
                              : t("add.coordinatesNotSelected")}
                          </span>
                        </div>

                        {/* SIZE & ROOMS ROW - УДАЛЕНО */}

                        {/* RENTAL PERIOD & MOVE-IN DATE ROW */}
                        <div className={`w-full flex max-[770px]:flex-col items-center justify-between gap-4`}>
                          {/* RENTAL PERIOD */}
                          <div className={`w-full flex flex-col items-start gap-1`}>
                            <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                              {t("filter.rentalPeriod")}
                            </span>
                            <select
                              value={rentalPeriod}
                              onChange={(e) => setRentalPeriod(e.target.value)}
                              className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                        focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 text-[14px]`}
                            >
                              <option value="short">{t("filter.rentalPeriodShort")}</option>
                              <option value="long">{t("filter.rentalPeriodLong")}</option>
                              <option value="flexible">{t("filter.rentalPeriodFlexible")}</option>
                            </select>
                          </div>

                          {/* MOVE-IN DATE */}
                          <div className={`w-full flex flex-col items-start gap-1`}>
                            <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                              {t("filter.moveInDate")}
                            </span>
                            <input
                              type="date"
                              value={moveInDate}
                              onChange={(e) => setMoveInDate(e.target.value)}
                              className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                        focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`}
                              placeholder={t("filter.moveInDatePlaceholder")}
                            />
                          </div>
                        </div>

                        {/* CHECKBOXES SECTION */}
                        <div className={`w-full flex flex-col gap-4`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("add.conditions")}
                          </span>
                          
                          {/* BOOLEAN CHECKBOXES GRID */}
                          <div className={`grid grid-cols-2 md:grid-cols-3 gap-4`}>
                            {/* PETS ALLOWED */}
                            <label className={`flex items-center gap-3 p-4 rounded-xl border border-[#E0E0E0] dark:border-gray-600 
                                             hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                             ${petsAllowed ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}>
                              <input
                                type="checkbox"
                                checked={petsAllowed}
                                onChange={(e) => setPetsAllowed(e.target.checked)}
                                className={`w-5 h-5 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                          focus:ring-[#C505EB] focus:ring-2 cursor-pointer`}
                              />
                              <span className={`text-sm font-medium text-black dark:text-white`}>
                                {t("filter.petsAllowed")} ({t("filter.petsAllowedYes")})
                              </span>
                            </label>

                            {/* SMOKING ALLOWED */}
                            <label className={`flex items-center gap-3 p-4 rounded-xl border border-[#E0E0E0] dark:border-gray-600 
                                             hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                             ${smokingAllowed ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}>
                              <input
                                type="checkbox"
                                checked={smokingAllowed}
                                onChange={(e) => setSmokingAllowed(e.target.checked)}
                                className={`w-5 h-5 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                          focus:ring-[#C505EB] focus:ring-2 cursor-pointer`}
                              />
                              <span className={`text-sm font-medium text-black dark:text-white`}>
                                {t("filter.smokingAllowed")} ({t("filter.smokingAllowedYes")})
                              </span>
                            </label>
                          </div>

                          {/* AMENITIES CHECKBOXES */}
                          <div className={`mt-2`}>
                            <span className={`text-sm font-semibold text-black dark:text-white mb-3 block`}>
                              {t("filter.amenities")}
                            </span>
                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
                              {[
                                { key: "internet", label: t("filter.internet") },
                                { key: "balcony", label: t("filter.amenityBalcony") },
                                { key: "parking", label: t("filter.amenityParking") },
                                { key: "furnished", label: t("filter.amenityFurnished") },
                                { key: "dishwasher", label: t("filter.amenityDishwasher") }
                              ].map(amenity => (
                                <label
                                  key={amenity.key}
                                  className={`flex items-center gap-3 p-4 rounded-xl border border-[#E0E0E0] dark:border-gray-600 
                                             hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                             ${amenities.includes(amenity.key) ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={amenities.includes(amenity.key)}
                                    onChange={() => toggleAmenity(amenity.key)}
                                    className={`w-5 h-5 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                              focus:ring-[#C505EB] focus:ring-2 cursor-pointer`}
                                  />
                                  <span className={`text-sm font-medium text-black dark:text-white`}>
                                    {amenity.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* DIVIDER */}
                        <div className={`w-full my-6 border-t border-[#E0E0E0] dark:border-gray-600`}></div>
                        
                        {/* INFRASTRUCTURE (POI) SECTION */}
                        <div className={`w-full flex flex-col gap-4`}>
                          <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>
                            {t("filter.infrastructure")}
                          </span>
                          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3`}>
                            {[
                              { state: hasBusStop, setter: setHasBusStop, label: t("filter.infraBusStop") },
                              { state: hasTrainStation, setter: setHasTrainStation, label: t("filter.infraTrainStation") },
                              { state: hasMetro, setter: setHasMetro, label: t("filter.infraMetro") },
                              { state: hasPostOffice, setter: setHasPostOffice, label: t("filter.infraPostOffice") },
                              { state: hasAtm, setter: setHasAtm, label: t("filter.infraAtm") },
                              { state: hasGeneralPractitioner, setter: setHasGeneralPractitioner, label: t("filter.infraDoctor") },
                              { state: hasVet, setter: setHasVet, label: t("filter.infraVet") },
                              { state: hasPrimarySchool, setter: setHasPrimarySchool, label: t("filter.infraSchool") },
                              { state: hasKindergarten, setter: setHasKindergarten, label: t("filter.infraKindergarten") },
                              { state: hasSupermarket, setter: setHasSupermarket, label: t("filter.infraSupermarket") },
                              { state: hasSmallShop, setter: setHasSmallShop, label: t("filter.infraShop") },
                              { state: hasRestaurant, setter: setHasRestaurant, label: t("filter.infraRestaurant") },
                              { state: hasPlayground, setter: setHasPlayground, label: t("filter.infraPlayground") },
                            ].map((item, idx) => (
                              <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border border-[#E0E0E0] dark:border-gray-600 
                                             hover:border-[#C505EB] dark:hover:border-[#C505EB] cursor-pointer transition-all duration-300
                                             ${item.state ? 'bg-[#C505EB]/10 border-[#C505EB] dark:bg-[#C505EB]/20' : 'bg-white dark:bg-gray-800'}`}>
                                <input
                                  type="checkbox"
                                  checked={item.state}
                                  onChange={(e) => item.setter(e.target.checked)}
                                  className={`w-4 h-4 rounded border-[#DDDDDD] dark:border-gray-600 text-[#C505EB] 
                                            focus:ring-[#C505EB] focus:ring-2 cursor-pointer`}
                                />
                                <span className={`text-xs font-medium text-black dark:text-white`}>
                                  {item.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>




                      {/* PUBLISH */}
                      <button
                        type="button"
                        onClick={handlePublishClick}
                        disabled={isLoadingListing}
                        className={`mt-12 max-[770px]:mt-4 w-full h-11 flex items-center justify-center rounded-full 
                                    text-white text-xl font-semibold bg-[#C505EB] hover:bg-[#BA00F8] transition disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {isLoadingListing ? t("loading") : (isEditMode ? t("add.update") : t("add.publish"))}
                      </button>
                      {showLeaveHomeAction && (
                        <button
                          type="button"
                          onClick={handleLeaveHomeForPublishing}
                          disabled={isLeavingHome}
                          className={`mt-3 w-full h-11 flex items-center justify-center rounded-full text-white text-base font-semibold bg-red-600 hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {isLeavingHome ? t("add.leavingHomeAction") : t("add.leaveHomeAction")}
                        </button>
                      )}

                    </div>
                    </>
                    )}

                </div>

            </div>

            {/* Модальное окно для полноэкранного просмотра */}
            {isModalOpen && uploadedImages.length > 0 && (
                <div 
                    className={`fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-in fade-in duration-300`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsModalOpen(false);
                        }
                    }}
                >
                    {/* Кнопка закрытия */}
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className={`absolute top-4 right-4 z-[10000] bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all duration-300`}
                        aria-label={t("add.close")}
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
                            {uploadedImages.map((img, index) => (
                                <div 
                                    key={index}
                                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-in-out`}
                                    style={{ 
                                        opacity: index === currentImageIndex ? 1 : 0,
                                        pointerEvents: index === currentImageIndex ? 'auto' : 'none',
                                        zIndex: index === currentImageIndex ? 1 : 0
                                    }}
                                >
                                    <img 
                                        src={img} 
                                        alt={t("add.uploadedImage").replace("{index}", String(index + 1))}
                                        className={`max-w-full max-h-full object-contain select-none pointer-events-none`}
                                        draggable={false}
                                    />
                                </div>
                            ))}

                            {/* Кнопки навигации в модальном окне */}
                            {uploadedImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            prevImage();
                                        }}
                                        disabled={isTransitioning}
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10 transition-all duration-300`}
                                        aria-label={t("add.previousImage")}
                                    >
                                        <ChevronLeft size={32} color="#ffffff" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            nextImage();
                                        }}
                                        disabled={isTransitioning}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10 transition-all duration-300`}
                                        aria-label={t("add.nextImage")}
                                    >
                                        <ChevronRight size={32} color="#ffffff" />
                                    </button>
                                </>
                            )}

                            {/* Индикатор в модальном окне */}
                            {uploadedImages.length > 1 && (
                                <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-6 py-3`}>
                                    <span className={`text-white text-lg font-semibold`}>
                                        {currentImageIndex + 1} / {uploadedImages.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Превью в модальном окне */}
                    {uploadedImages.length > 1 && (
                        <div 
                            className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 bg-black/50 rounded-2xl backdrop-blur-sm max-w-[90vw] overflow-x-auto scroll-smooth z-[10001]`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {uploadedImages.map((img, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isTransitioning && index !== currentImageIndex) {
                                            setIsTransitioning(true);
                                            setCurrentImageIndex(index);
                                            setTimeout(() => setIsTransitioning(false), 300);
                                        }
                                    }}
                                    disabled={isTransitioning || index === currentImageIndex}
                                    className={`flex-shrink-0 w-[80px] h-[60px] max-[770px]:w-[70px] max-[770px]:h-[52px] rounded-lg overflow-hidden border-2 transition-all duration-300 ease-in-out ${
                                        currentImageIndex === index 
                                            ? 'border-white scale-110 shadow-lg' 
                                            : 'border-white/30 hover:border-white/60 hover:scale-105'
                                    } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <img 
                                        src={img} 
                                        alt={t("add.previewImage").replace("{index}", String(index + 1))}
                                        className={`w-full h-full object-cover transition-opacity duration-300 select-none pointer-events-none`}
                                        draggable={false}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Стилизованное уведомление */}
            {notification && (
                <div 
                    className={`fixed top-24 right-4 z-[10000] max-w-md w-full sm:w-96 
                               animate-in slide-in-from-right duration-300 
                               ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} 
                               text-white rounded-xl shadow-2xl overflow-hidden`}
                >
                    <div className={`flex items-start gap-3 p-4`}>
                        <div className={`flex-shrink-0 mt-0.5`}>
                            {notification.type === 'success' ? (
                                <CheckCircle size={24} />
                            ) : (
                                <AlertCircle size={24} />
                            )}
                        </div>
                        <div className={`flex-1 mr-2`}>
                            <p className={`text-sm font-medium leading-relaxed`}>
                                {notification.message}
                            </p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className={`flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors`}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div 
                        className={`h-1 bg-white/30`}
                        style={{
                            animation: 'shrink 4s linear forwards'
                        }}
                    />
                </div>
            )}

            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>

        </div>
    );

}