import { CircleUser, Globe, Heart, Menu, Moon, Sun, X, ChevronDown, MessageCircle, Plus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/defaultImage";



export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isBlogMenuOpen, setIsBlogMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);
    const blogMenuRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const pathname = location.pathname;
    const showLangInHeader =
        pathname === "/" || pathname === "/profile" || pathname.startsWith("/profile/");
    const isSearchPage = pathname !== "/";
    const { language, setLanguage, t } = useLanguage();
    const { isAuthenticated, logout, user } = useAuth();
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    // Страницы с объявлениями
    const listingPages = ["/apartments", "/rooms", "/neighbours"];
    const isListingPage = listingPages.includes(pathname);
    const forceSolidHeader = pathname.startsWith("/messenger");
    const navigate = useNavigate();
    const menuItemsColumn1 = [
        { title: t("header.home"), path: "/" },
        { title: t("header.about"), path: "/#about" },
        { title: t("header.blog"), path: "/blog" },
        { title: t("header.faq"), path: "/faq" },
        { title: t("header.contact"), path: "/contact" },
    ];

    const menuItemsColumn2 = [
        //{ title: t("header.rooms"), path: "/rooms" },
        { title: t("header.neighbours"), path: "/neighbours" },
        { title: t("header.apartments"), path: "/apartments" },

    ];

    // menuItems объединены из menuItemsColumn1 и menuItemsColumn2, используется в отдельных местах

    const languages = [
        { code: "cz" as const, label: "CZ" },
        { code: "ru" as const, label: "RU" },
        { code: "en" as const, label: "EN" },
    ];


    const handleLogout = async () => {
      console.log("LOGOUT CLICKED");

      try {
        const res = await fetch("/api/logout/", {
          method: "POST",
          credentials: "include",
        });

        console.log("LOGOUT RESPONSE:", res.status);
      } catch (e) {
        console.error("LOGOUT ERROR:", e);
      }

      logout();
      navigate("/");
    };
    // Инициализация темы из localStorage
    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        
        setIsDark(shouldBeDark);
        // Убеждаемся, что класс и colorScheme применены правильно
        if (shouldBeDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            setUnreadMessagesCount(0);
            return;
        }

        const loadUnreadCount = () => {
            fetch("/api/chats/", { credentials: "include" })
                .then((res) => (res.ok ? res.json() : []))
                .then((data) => {
                    if (!Array.isArray(data)) {
                        setUnreadMessagesCount(0);
                        return;
                    }

                    const total = data.reduce((sum, chat) => {
                        const value = Number(chat?.unread_count ?? 0);
                        return sum + (Number.isFinite(value) ? value : 0);
                    }, 0);

                    setUnreadMessagesCount(total);
                })
                .catch(() => {});
        };

        loadUnreadCount();
        const intervalId = window.setInterval(loadUnreadCount, 15000);
        return () => window.clearInterval(intervalId);
    }, [isAuthenticated, pathname]);

    // Переключение темы
    const toggleTheme = () => {
        // Используем функциональное обновление для гарантии правильного значения
        setIsDark((prevIsDark) => {
            const newTheme = !prevIsDark;
            
            // Сразу обновляем DOM и localStorage
            if (newTheme) {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
                localStorage.setItem('theme', 'light');
            }
            
            return newTheme;
        });
    };

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 0);
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            const isMobile = window.innerWidth <= 770;
            
            if (isMobile) {
                // Для мобильных устройств проверяем только overlay
                if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
                    setIsMenuOpen(false);
                }
            } else {
                // Для десктопа проверяем десктопное меню
                if (menuRef.current && !menuRef.current.contains(target)) {
                    setIsMenuOpen(false);
                }
            }
        };

        if (isMenuOpen) {
            // Небольшая задержка, чтобы не перехватывать клики на ссылки
            const timeoutId = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside as EventListener);
                document.addEventListener("touchstart", handleClickOutside as EventListener);
            }, 100);

            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener("mousedown", handleClickOutside as EventListener);
                document.removeEventListener("touchstart", handleClickOutside as EventListener);
            };
        }
    }, [isMenuOpen]);

    useEffect(() => {
        setIsMenuOpen(false);
        setIsLangMenuOpen(false);
        setIsBlogMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (blogMenuRef.current && !blogMenuRef.current.contains(target)) {
                setIsBlogMenuOpen(false);
            }
        };

        if (isBlogMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside as EventListener);
            document.addEventListener("touchstart", handleClickOutside as EventListener);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside as EventListener);
            document.removeEventListener("touchstart", handleClickOutside as EventListener);
        };
    }, [isBlogMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (langMenuRef.current && !langMenuRef.current.contains(target)) {
                setIsLangMenuOpen(false);
            }
        };

        if (isLangMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside as EventListener);
            document.addEventListener("touchstart", handleClickOutside as EventListener);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside as EventListener);
            document.removeEventListener("touchstart", handleClickOutside as EventListener);
        };
    }, [isLangMenuOpen]);

    // Блокировка скролла body при открытом мобильном меню
    useEffect(() => {
        if (isMenuOpen) {
            const isMobile = window.innerWidth <= 770;
            if (isMobile) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    /* Десктоп: как раньше — плотный фон только при скролле / messenger.
       Мобилка: тот же «поднятый» вид при скролле и при открытом меню (одинаковая лёгкая подложка). */
    const desktopSolidBar = scrolled || forceSolidHeader;
    const mobileElevatedBar = desktopSolidBar || isMenuOpen;

    return(
        <div
            className={`fixed left-0 top-0 z-50 flex h-[100px] w-full flex-col items-center border-b border-gray-300 transition-[background-color,box-shadow,backdrop-filter] duration-300 dark:border-gray-700 interFont ${
                desktopSolidBar
                    ? "min-[771px]:bg-white min-[771px]:shadow-sm min-[771px]:dark:bg-gray-900"
                    : "min-[771px]:bg-transparent"
            } ${
                mobileElevatedBar
                    ? "max-[770px]:bg-white/88 max-[770px]:shadow-sm max-[770px]:backdrop-blur-md max-[770px]:dark:bg-gray-900/88"
                    : "max-[770px]:bg-transparent max-[770px]:shadow-none"
            }`}
        >

            

            <div className="grid h-[100px] w-full max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2">
                <Link to="/" className="flex shrink-0 items-center justify-center">
                    <span className="max-[770px]:text-[32px] min-[770px]:text-[52px] cursor-pointer font-extrabold bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent">
                        FlatFly
                    </span>
                </Link>

                <div className="hidden min-[771px]:flex min-w-0 items-center justify-center px-2">
                    {!isListingPage && (
                        <div className="relative" ref={blogMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsBlogMenuOpen(!isBlogMenuOpen)}
                                className="flex items-center gap-1 text-xl font-semibold text-black duration-300 hover:text-[#C505EB] dark:text-white dark:hover:text-[#D946EF]"
                                aria-expanded={isBlogMenuOpen}
                                aria-haspopup="true"
                            >
                                <span>{t("header.blog")}</span>
                                <ChevronDown
                                    size={18}
                                    className={`text-[#C505EB] transition-transform duration-200 ${isBlogMenuOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isBlogMenuOpen && (
                                <div className="absolute left-1/2 z-[100] mt-2 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                    <Link
                                        to="/#about"
                                        className="block px-4 py-2.5 text-base font-semibold text-[#333333] hover:bg-[#C505EB]/10 hover:text-[#C505EB] dark:text-gray-200 dark:hover:text-[#D946EF]"
                                        onClick={() => setIsBlogMenuOpen(false)}
                                    >
                                        {t("header.about")}
                                    </Link>
                                    <Link
                                        to="/blog"
                                        className="block px-4 py-2.5 text-base font-semibold text-[#333333] hover:bg-[#C505EB]/10 hover:text-[#C505EB] dark:text-gray-200 dark:hover:text-[#D946EF]"
                                        onClick={() => setIsBlogMenuOpen(false)}
                                    >
                                        {t("header.blog")}
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1 max-[770px]:gap-1 min-[771px]:gap-2">
                    <div
                        className={`hidden min-[771px]:flex items-center gap-2 ${isSearchPage ? "max-[1220px]:hidden" : ""}`}
                    >
                        <Link
                            to="/add"
                            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] px-4 py-2 text-[16px] font-extrabold text-white shadow-md duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] min-[1100px]:px-5 min-[1100px]:text-[18px]"
                        >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 duration-300 group-hover:bg-white/30">
                                <Plus size={16} />
                            </span>
                            <span className="whitespace-nowrap">{t("header.addListing")}</span>
                        </Link>
                        <Link
                            to="/neighbours"
                            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] px-4 py-2 text-[16px] font-extrabold text-white shadow-md duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] min-[1100px]:px-5 min-[1100px]:text-[18px]"
                        >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 duration-300 group-hover:bg-white/30">
                                <Plus size={16} />
                            </span>
                            <span className="whitespace-nowrap">{t("header.findNeighbor")}</span>
                        </Link>
                    </div>

                    {mounted && (
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white duration-300 hover:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:hover:border-[#C505EB] min-[771px]:h-10 min-[771px]:w-10"
                            aria-label={isDark ? t("header.switchToLightTheme") : t("header.switchToDarkTheme")}
                        >
                            {isDark ? (
                                <Sun className="h-4 w-4 text-yellow-400 min-[771px]:h-5 min-[771px]:w-5" />
                            ) : (
                                <Moon className="h-4 w-4 text-gray-700 dark:text-gray-300 min-[771px]:h-5 min-[771px]:w-5" />
                            )}
                        </button>
                    )}

                    {showLangInHeader && (
                        <div className="relative" ref={langMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white duration-300 hover:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:hover:border-[#C505EB] min-[771px]:h-10 min-[771px]:w-10"
                                aria-label={t("header.selectLanguage")}
                            >
                                <Globe className="h-[15px] w-[15px] text-gray-700 dark:text-gray-300 min-[771px]:h-[18px] min-[771px]:w-[18px]" />
                            </button>
                            {isLangMenuOpen && (
                                <div className="absolute right-0 z-[100] mt-2 w-[100px] overflow-hidden rounded-xl border border-[#E5E5E5] bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setIsLangMenuOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm font-semibold duration-300 hover:bg-[#C505EB] hover:text-white ${
                                                language === lang.code
                                                    ? "bg-[#C505EB] text-white"
                                                    : "text-[#333333] dark:text-gray-200"
                                            }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <Link
                        to="/profile?tab=favorites"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white duration-300 hover:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:hover:border-[#C505EB] min-[771px]:h-10 min-[771px]:w-10"
                        aria-label={t("favorites")}
                    >
                        <Heart
                            className="h-4 w-4 text-[#C505EB] min-[771px]:h-5 min-[771px]:w-5"
                            strokeWidth={2}
                            fill="rgba(197, 5, 235, 0.12)"
                        />
                    </Link>

                    {isAuthenticated && (
                        <Link
                            to="/messenger"
                            className="relative hidden min-[771px]:flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white duration-300 hover:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:hover:border-[#C505EB]"
                            aria-label={t("messenger.title")}
                        >
                            <MessageCircle size={22} className="text-[#C505EB]" />
                            {unreadMessagesCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C505EB] px-1 text-center text-[11px] font-bold leading-none text-white">
                                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    )}

                    <div className="relative" ref={menuRef}>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`flex cursor-pointer items-center gap-0.5 rounded-full border-2 border-[#DDDDDD] px-2.5 py-1 duration-300 hover:border-[#C505EB] dark:border-gray-600 min-[771px]:gap-1 min-[771px]:border-[3px] min-[771px]:px-5 min-[771px]:py-2 ${isMenuOpen ? "border-[#C505EB]" : ""}`}
                            aria-label={t("header.openMenu")}
                        >
                            <Menu className="h-[18px] w-[18px] shrink-0 text-[#08E2BE] min-[771px]:h-6 min-[771px]:w-6" />
                            <CircleUser className="h-[18px] w-[18px] shrink-0 text-[#C505EB] min-[771px]:h-6 min-[771px]:w-6" />
                        </button>
                        
                        {/* Десктопное выпадающее меню — вертикальные блоки */}
                        {isMenuOpen && (
                            <div
                                className="absolute right-0 z-[100] mt-2 hidden w-[min(100vw-1.5rem,300px)] flex-col gap-2 rounded-2xl border border-[#E5E5E5] bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800 min-[771px]:flex"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {isAuthenticated && user ? (
                                    <div className="rounded-xl bg-gray-100 p-3 dark:bg-zinc-900/90">
                                        <div className="flex gap-3">
                                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white bg-gray-200 shadow-sm dark:border-zinc-600 dark:bg-zinc-700">
                                                {user.avatar ? (
                                                    <img
                                                        src={getImageUrl(user.avatar)}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <CircleUser className="h-7 w-7 text-[#C505EB]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[15px] font-bold text-[#333333] dark:text-white">
                                                    {user.name || user.email}
                                                </p>
                                                {user.email ? (
                                                    <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">
                                                        {user.email}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900/60">
                                    <div className="flex flex-col divide-y divide-gray-200/90 dark:divide-zinc-600">
                                        {menuItemsColumn1.map((item, index) => (
                                            <Link
                                                key={`nav-${index}`}
                                                to={item.path}
                                                className={`block px-4 py-2.5 text-left text-[15px] font-semibold transition-colors hover:bg-[#C505EB]/10 hover:text-[#C505EB] dark:text-gray-100 ${
                                                    pathname === item.path ? "text-[#C505EB]" : "text-[#333333]"
                                                }`}
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900/60">
                                    <div className="flex flex-col divide-y divide-gray-200/90 dark:divide-zinc-600">
                                        {menuItemsColumn2.map((item, index) => (
                                            <Link
                                                key={`cat-${index}`}
                                                to={item.path}
                                                className={`block px-4 py-2.5 text-left text-[15px] font-semibold transition-colors hover:bg-[#C505EB]/10 hover:text-[#C505EB] dark:text-gray-100 ${
                                                    pathname === item.path ? "text-[#C505EB]" : "text-[#333333]"
                                                }`}
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {isAuthenticated ? (
                                    <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900/60">
                                        <Link
                                            to="/profile"
                                            className={`block px-4 py-2.5 text-left text-[15px] font-semibold transition-colors hover:bg-[#C505EB]/10 hover:text-[#C505EB] dark:text-gray-100 ${
                                                pathname === "/profile" ? "text-[#C505EB]" : "text-[#333333]"
                                            }`}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {t("header.profile")}
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-gray-200/90 bg-gray-50 p-2 dark:border-zinc-600 dark:bg-zinc-900/60">
                                        <Link
                                            to="/auth"
                                            className="block w-full rounded-lg bg-gradient-to-r from-[#C505EB] to-[#BA00F8] py-2.5 text-center text-[15px] font-bold text-white transition hover:from-[#BA00F8] hover:to-[#C505EB]"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {t("header.login")}
                                        </Link>
                                    </div>
                                )}

                                {isAuthenticated ? (
                                    <div className="overflow-hidden rounded-xl border border-red-200/80 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/25">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                handleLogout();
                                                e.stopPropagation();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-[15px] font-semibold text-red-600 transition hover:bg-red-100/90 dark:text-red-400 dark:hover:bg-red-950/50"
                                        >
                                            {t("header.logout")}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Мобильное полноэкранное меню */}
            {isMenuOpen && (
                <>
                    {/* Overlay для затемнения фона */}
                    <div 
                        className={`hidden max-[770px]:block fixed inset-0 bg-black bg-opacity-50 z-[99] top-[100px]`}
                        onClick={() => setIsMenuOpen(false)}
                        onTouchStart={(e) => {
                            if (e.target === e.currentTarget) {
                                setIsMenuOpen(false);
                            }
                        }}
                        role="button"
                        tabIndex={-1}
                        aria-label={t("header.closeMenu")}
                    />
                    
                    {/* Мобильное меню — компактная колонка по центру */}
                    <div 
                        ref={mobileMenuRef}
                        className={`hidden max-[770px]:flex fixed top-[100px] left-0 w-full h-[calc(100vh-100px)] flex-col items-center overflow-y-auto bg-white/95 px-3 pb-8 pt-6 backdrop-blur-sm dark:bg-gray-900/95 z-[100] transition-all duration-300`}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <button 
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                            }}
                            className={`absolute right-3 top-3 z-[101] cursor-pointer rounded-full p-1.5 duration-300 touch-manipulation hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15`}
                            aria-label={t("header.closeMenu")}
                        >
                            <X size={24} color={`#C505EB`} strokeWidth={2.25} />
                        </button>
                        <div
                            className={`mt-1 flex w-full max-w-[min(19rem,100%)] flex-col gap-1.5 rounded-2xl border border-gray-200/90 bg-white p-2.5 shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10`}
                        >
                            {/* Первый столбец - как на десктопе */}
                            {menuItemsColumn1.map((item, index) => (
                                <Link
                                    key={index}
                                    to={item.path}
                                    className={`w-full rounded-lg px-3 py-2 text-center text-[15px] font-semibold duration-300 touch-manipulation active:scale-[0.98] ${
                                        pathname === item.path 
                                            ? 'bg-[#C505EB] text-white shadow-sm' 
                                            : 'bg-gray-50 text-[#333333] hover:bg-gray-100 active:bg-gray-200/80 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600'
                                    }`}
                                    onClick={() => {
                                        setTimeout(() => {
                                            setIsMenuOpen(false);
                                        }, 100);
                                    }}
                                >
                                    {item.title}
                                </Link>
                            ))}
                            
                            {/* Второй столбец - как на десктопе */}
                            {menuItemsColumn2.map((item, index) => (
                                <Link
                                    key={index}
                                    to={item.path}
                                    className={`w-full rounded-lg px-3 py-2 text-center text-[15px] font-semibold duration-300 touch-manipulation active:scale-[0.98] ${
                                        pathname === item.path 
                                            ? 'bg-[#C505EB] text-white shadow-sm' 
                                            : 'bg-gray-50 text-[#333333] hover:bg-gray-100 active:bg-gray-200/80 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600'
                                    }`}
                                    onClick={() => {
                                        setTimeout(() => {
                                            setIsMenuOpen(false);
                                        }, 100);
                                    }}
                                >
                                    {item.title}
                                </Link>
                            ))}
                            
                            {/* Добавить объявление */}
                            <Link
                                to="/add"
                                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center text-[15px] font-bold text-white shadow-sm duration-300 touch-manipulation active:scale-[0.98] ${
                                    pathname === "/add" 
                                        ? 'bg-gradient-to-r from-[#9E04C2] to-[#06A8B8]' 
                                        : 'bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] hover:opacity-95'
                                }`}
                                onClick={() => {
                                    setTimeout(() => {
                                        setIsMenuOpen(false);
                                    }, 100);
                                }}
                            >
                                <Plus size={16} strokeWidth={2.5} />
                                {t("header.addListing")}
                            </Link>

                            <Link
                                to="/neighbours"
                                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center text-[15px] font-bold text-white shadow-sm duration-300 touch-manipulation active:scale-[0.98] ${
                                    pathname === "/neighbours"
                                        ? "bg-gradient-to-r from-[#9E04C2] to-[#06A8B8]"
                                        : "bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] hover:opacity-95"
                                }`}
                                onClick={() => {
                                    setTimeout(() => {
                                        setIsMenuOpen(false);
                                    }, 100);
                                }}
                            >
                                <Plus size={16} strokeWidth={2.5} />
                                {t("header.findNeighbor")}
                            </Link>
                            
                            {/* Профиль для зарегистрированных пользователей */}
                            {isAuthenticated && (
                                <Link
                                    to="/messenger"
                                    className={`w-full rounded-lg px-3 py-2 text-center text-[15px] font-semibold duration-300 touch-manipulation active:scale-[0.98] ${
                                        pathname === "/messenger"
                                            ? 'bg-[#C505EB] text-white shadow-sm'
                                            : 'bg-gray-50 text-[#333333] hover:bg-gray-100 active:bg-gray-200/80 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600'
                                    }`}
                                    onClick={() => {
                                        setTimeout(() => {
                                            setIsMenuOpen(false);
                                        }, 100);
                                    }}
                                >
                                    {t("messenger.title")}
                                    {unreadMessagesCount > 0 ? ` (${unreadMessagesCount > 9 ? "9+" : unreadMessagesCount})` : ""}
                                </Link>
                            )}

                            {/* Профиль для зарегистрированных пользователей */}
                            {isAuthenticated && (
                                <Link
                                    to="/profile"
                                    className={`w-full rounded-lg px-3 py-2 text-center text-[15px] font-semibold duration-300 touch-manipulation active:scale-[0.98] ${
                                        pathname === "/profile" 
                                            ? 'bg-[#C505EB] text-white shadow-sm' 
                                            : 'bg-gray-50 text-[#333333] hover:bg-gray-100 active:bg-gray-200/80 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600'
                                    }`}
                                    onClick={() => {
                                        setTimeout(() => {
                                            setIsMenuOpen(false);
                                        }, 100);
                                    }}
                                >
                                    {t("header.profile")}
                                </Link>
                            )}
                            
                            {/* Выйти для зарегистрированных пользователей */}
                            {isAuthenticated && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleLogout();
                                  setTimeout(() => {
                                    setIsMenuOpen(false);
                                  }, 100);
                                }}
                                className="w-full rounded-lg border border-red-200/70 bg-red-50/90 px-3 py-2 text-center text-[15px] font-semibold text-red-600 duration-300 touch-manipulation active:scale-[0.98] hover:bg-red-100/90 dark:border-red-900/35 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                              >
                                {t("header.logout")}
                              </button>
                            )}
                            
                            {/* Кнопка Войти для гостей */}
                            {!isAuthenticated && (
                                <Link
                                    to="/auth"
                                    className={`w-full rounded-lg bg-gradient-to-r from-[#C505EB] to-[#BA00F8] px-3 py-2 text-center text-[15px] font-bold text-white shadow-sm duration-300 touch-manipulation active:scale-[0.98] hover:from-[#BA00F8] hover:to-[#C505EB]`}
                                    onClick={() => {
                                        setTimeout(() => {
                                            setIsMenuOpen(false);
                                        }, 100);
                                    }}
                                >
                                    {t("header.login")}
                                </Link>
                            )}
                            
                            {/* Разделитель */}
                            <div className="my-1 h-px w-full bg-gray-200 dark:bg-zinc-700" />
                            
                            {/* Кнопка темы - в мобильном меню */}
                            {mounted && (
                                <button
                                    onClick={toggleTheme}
                                    className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-center text-[15px] font-semibold text-[#333333] duration-300 touch-manipulation active:scale-[0.98] hover:bg-gray-100 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700`}
                                >
                                    {isDark ? (
                                        <>
                                            <Sun size={18} className="shrink-0 text-yellow-400" />
                                            <span>{t("header.lightTheme")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Moon size={18} className="shrink-0 text-gray-700 dark:text-gray-300" />
                                            <span>{t("header.darkTheme")}</span>
                                        </>
                                    )}
                                </button>
                            )}
                            
                            {/* Выбор языка в выезжающем меню — на всех страницах */}
                            <div className="flex w-full items-stretch justify-center gap-1.5">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => {
                                            setLanguage(lang.code);
                                        }}
                                        className={`flex flex-1 items-center justify-center rounded-lg px-2 py-2 text-xl leading-none duration-300 touch-manipulation active:scale-[0.98] ${
                                            language === lang.code
                                                ? "bg-[#C505EB] text-white shadow-sm ring-1 ring-[#C505EB]/40"
                                                : "bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                        }`}
                                    >
                                        {lang.code === "cz" && "🇨🇿"}
                                        {lang.code === "ru" && "🇷🇺"}
                                        {lang.code === "en" && "🇬🇧"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>
    );

}
