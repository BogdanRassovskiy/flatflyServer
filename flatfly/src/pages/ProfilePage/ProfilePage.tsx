import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { User, Camera, Save, CheckCircle, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Icon } from "@iconify/react";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProfileData {
    // Основная информация
    photo: string;
    name: string;
    age: string;
    gender: string;
    city: string;
    languages: string[];
    profession: string;
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
}

export default function ProfilePage() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [activeSection, setActiveSection] = useState<"basic" | "social" | "status" | "favorites">("basic");
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const [profileData, setProfileData] = useState<ProfileData>({
        photo: "",
        name: user?.name || "",
        age: "",
        gender: "",
        city: "",
        languages: [],
        profession: "",
        about: "",
        smoking: "",
        alcohol: "",
        sleepSchedule: "",
        noiseTolerance: "",
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
          }));
        })
        .catch(() => {
          console.log("Profile not loaded");
        });
    }, []);
    const availableLanguages = [
        { code: "cz", label: t("profile.languages.cz") || "Čeština" },
        { code: "en", label: t("profile.languages.en") || "English" },
        { code: "ru", label: t("profile.languages.ru") || "Русский" },
        { code: "de", label: t("profile.languages.de") || "Deutsch" },
        { code: "sk", label: t("profile.languages.sk") || "Slovenčina" },
    ];

    const sections: Array<{ key: "basic" | "social" | "status" | "favorites"; label: string }> = [
        { key: "basic", label: t("profile.sections.basic") },
        { key: "social", label: t("profile.sections.social") },
        { key: "status", label: t("profile.sections.status") },
        { key: "favorites", label: t("favorites") },
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

    const handleSave = async () => {
        console.log("HANDLE SAVE CLICKED");
        console.log("PROFILE DATA:", profileData);

      try {
        setIsSaving(true);

        const response = await fetch("/api/profile/", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...profileData,
            //languages: profileData.languages.join(","), // для Django CharField
          }),
        });

        if (!response.ok) {
          throw new Error("Profile save failed");
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);

      } catch (err) {
        console.error("Save error:", err);
        alert(t("profile.errorSavingProfile"));
      } finally {
        setIsSaving(false);
      }
    };

    return (
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900 pt-[150px] max-[770px]:pt-[120px] pb-[90px] max-[770px]:pb-[60px]`}>
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

                {/* Section Tabs - Desktop */}
                <div className={`hidden min-[771px]:flex items-center gap-2 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1`}>
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

                            {/* Profession */}
                            <div className={`flex flex-col gap-2`}>
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.profession")}</label>
                                <input
                                    type="text"
                                    value={profileData.profession}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, profession: e.target.value }))}
                                    className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                    placeholder={t("profile.professionPlaceholder")}
                                />
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
                                <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.noiseTolerance")}</label>
                                <textarea
                                    value={profileData.noiseTolerance}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, noiseTolerance: e.target.value }))}
                                    className={`w-full h-[120px] max-[770px]:h-[100px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 py-3 text-base max-[770px]:text-sm resize-none`}
                                    placeholder={t("profile.noiseTolerancePlaceholder")}
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
                                <div className={`flex-1 flex flex-col gap-2`}>
                                    <label className={`text-lg max-[770px]:text-base font-bold`}>{t("profile.preferredAgeRange")}</label>
                                    <input
                                        type="text"
                                        value={profileData.preferredAgeRange}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, preferredAgeRange: e.target.value }))}
                                        className={`w-full h-[56px] max-[770px]:h-[48px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 max-[770px]:px-4 text-base max-[770px]:text-sm`}
                                        placeholder={t("profile.preferredAgeRangePlaceholder")}
                                    />
                                </div>
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
                                    onClick={() => setProfileData(prev => ({ ...prev, verified: !prev.verified }))}
                                    className={`px-6 max-[770px]:px-4 py-3 max-[770px]:py-2 rounded-lg font-semibold text-base max-[770px]:text-sm transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                                        profileData.verified
                                            ? "bg-green-500 text-white hover:bg-green-600"
                                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    }`}
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
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {t("view_all_favorites")}
                            </p>
                            <button
                                onClick={() => navigate("/favorites")}
                                className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                <Heart size={20} className="fill-white" />
                                {t("open_favorites")}
                            </button>
                        </div>
                    )}

                    {/* Save Button */}
                    {activeSection !== "favorites" && (
                        <div className={`mt-8 max-[770px]:mt-6 flex justify-end max-[770px]:justify-center`}>
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
        </div>
    );
}
