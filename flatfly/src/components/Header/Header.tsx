import { CircleUser, Globe, Menu, Moon, Sun, X, ChevronDown, MessageCircle, Plus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";



export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const pathname = location.pathname;
    const isSearchPage = pathname !== "/";
    const { language, setLanguage, t } = useLanguage();
    const { isAuthenticated, logout } = useAuth();
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    // Страницы с объявлениями
    const listingPages = ["/apartments", "/rooms", "/neighbours"];
    const isListingPage = listingPages.includes(pathname);
    const forceSolidHeader = pathname.startsWith("/messenger");
    const navigate = useNavigate();
    const menuItemsColumn1 = [
        { title: t("favorites"), path: "/profile?tab=favorites" },
        { title: t("header.home"), path: "/" },
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
    }, [pathname]);

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

    return(
        <div className={`fixed top-0 left-0 w-full h-[100px] flex flex-col items-center border-b border-gray-300 dark:border-gray-700 interFont z-50 duration-300 ${(scrolled || forceSolidHeader) ? "bg-white dark:bg-gray-900 shadow-sm" : "bg-transparent"}`}>

            

            <div className={`flex items-center justify-between w-full h-[100px] max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5`}>

                <Link to="/" className={`flex items-center justify-center`}>
                    <span className={`min-[770px]:text-[52px] max-[770px]:text-[32px] cursor-pointer font-extrabold bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent`}>FlatFly</span>
                </Link>


                <div className={`flex items-center gap-[30px]`}>

                    {!isListingPage && (
                        <div className={`flex items-center gap-[30px] text-xl font-semibold max-[770px]:hidden text-black dark:text-white`}>
                            <Link to="/profile?tab=favorites" className={`hover:text-[#C505EB] duration-300`}>{t("favorites")}</Link>
                            <Link to="/" className={`hover:text-[#C505EB] duration-300`}>{t("header.about")}</Link>
                            <Link to="/blog" className={`hover:text-[#C505EB] duration-300`}>{t("header.blog")}</Link>
                            <Link to="/faq" className={`hover:text-[#C505EB] duration-300`}>{t("header.faq")}</Link>
                        </div>
                    )}

                    <Link
                        to="/add"
                        className={`${isSearchPage && `max-[1220px]:hidden`} group max-[770px]:hidden inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] px-5 py-2 text-white font-extrabold text-[18px] shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] duration-300`}
                    >
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 duration-300`}>
                            <Plus size={16} />
                        </span>
                        <span className={`whitespace-nowrap`}>{t("header.addListing")}</span>
                    </Link>

                    {/* Кнопка темы - только для десктопа */}
                    {mounted && (
                        <button
                            onClick={toggleTheme}
                            className={`hidden min-[771px]:flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 hover:border-[#C505EB] dark:hover:border-[#C505EB] duration-300 cursor-pointer bg-white dark:bg-gray-800`}
                            aria-label={isDark ? t("header.switchToLightTheme") : t("header.switchToDarkTheme")}
                        >
                            {isDark ? (
                                <Sun size={20} className="text-yellow-400" />
                            ) : (
                                <Moon size={20} className="text-gray-700 dark:text-gray-300" />
                            )}
                        </button>
                    )}


                    {/* Выбор языка - только для десктопа */}
                    <div className={`hidden min-[771px]:flex items-center gap-2`}>
                        <div className="relative" ref={langMenuRef}>
                            <button
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className={`w-20 h-10 border rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#C505EB] dark:hover:border-[#C505EB] duration-300 flex items-center justify-center px-2 gap-2 cursor-pointer`}
                                aria-label={t("header.selectLanguage")}
                            >
                                <Globe size={18} className="text-gray-700 dark:text-gray-300"/>
                                <span className="text-sm font-semibold text-black dark:text-white">
                                    {languages.find(l => l.code === language)?.label || "CZ"}
                                </span>
                                <ChevronDown size={14} className="text-gray-700 dark:text-gray-300"/>
                            </button>
                            {isLangMenuOpen && (
                                <div className={`absolute right-0 mt-2 w-[100px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-[#E5E5E5] dark:border-gray-700 overflow-hidden z-[100]`}>
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setIsLangMenuOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-sm font-semibold hover:bg-[#C505EB] hover:text-white duration-300 text-left ${
                                                language === lang.code 
                                                    ? 'bg-[#C505EB] text-white' 
                                                    : 'text-[#333333] dark:text-gray-200'
                                            }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Иконка чата */}
                        <Link to="/messenger" className="relative flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 hover:border-[#C505EB] dark:hover:border-[#C505EB] duration-300 ml-2 bg-white dark:bg-gray-800" aria-label="Чаты">
                            <MessageCircle size={22} className="text-[#C505EB]" />
                            {unreadMessagesCount > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-[#C505EB] text-white text-[11px] leading-5 text-center font-bold">
                                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    <div className={`relative`} ref={menuRef}>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`flex items-center px-5 py-2 gap-1 rounded-full border-[3px] border-[#DDDDDD] dark:border-gray-600 text-[24px] hover:border-[#C505EB] duration-300 cursor-pointer ${isMenuOpen ? 'border-[#C505EB]' : ''}`}
                            aria-label={t("header.openMenu")}
                        >
                            <Menu size={24} color={`#08E2BE`} />
                            <CircleUser color={`#C505EB`} size={24} />
                        </button>
                        
                        {/* Десктопное выпадающее меню */}
                        {isMenuOpen && (
                            <div className={`hidden min-[771px]:block absolute right-0 mt-2 w-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-[#E5E5E5] dark:border-gray-700 overflow-hidden z-[100]`}>
                                <div className={`flex items-start gap-0`}>
                                    {/* Первый столбец */}
                                    <div className={`flex flex-col items-start border-r border-[#E5E5E5] dark:border-gray-700`}>
                                        {menuItemsColumn1.map((item, index) => (
                                            <Link
                                                key={index}
                                                to={item.path}
                                                className={`block px-5 py-3 text-lg font-semibold hover:text-[#C505EB] duration-300 ${
                                                    pathname === item.path 
                                                        ? ' text-[#C505EB]' 
                                                        : 'text-[#333333] dark:text-gray-200'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                    {/* Второй столбец */}
                                    <div className={`flex flex-col items-start border-r border-[#E5E5E5] dark:border-gray-700`}>
                                        {menuItemsColumn2.map((item, index) => (
                                            <Link
                                                key={index}
                                                to={item.path}
                                                className={`block px-5 py-3 text-lg font-semibold hover:text-[#C505EB] duration-300 whitespace-nowrap ${
                                                    pathname === item.path 
                                                        ? ' text-[#C505EB]' 
                                                        : 'text-[#333333] dark:text-gray-200'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                    {/* Третий столбец - Профиль (для зарегистрированных) или Войти (для гостей) */}
                                    {isAuthenticated ? (
                                        <div className={`flex flex-col items-start border-r border-[#E5E5E5] dark:border-gray-700`}>
                                            <Link
                                                to="/profile"
                                                className={`block px-5 py-3 text-lg font-semibold hover:text-[#C505EB] duration-300 whitespace-nowrap ${
                                                    pathname === "/profile" 
                                                        ? ' text-[#C505EB]' 
                                                        : 'text-[#333333] dark:text-gray-200'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                {t("header.profile")}
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className={`flex flex-col items-start`}>
                                            <Link
                                                to="/auth"
                                                className={`block px-5 py-3 text-lg font-semibold bg-gradient-to-r from-[#C505EB] to-[#BA00F8] text-white whitespace-nowrap hover:from-[#BA00F8] hover:to-[#C505EB] duration-300 rounded-lg mx-2 my-2`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                {t("header.login")}
                                            </Link>
                                        </div>
                                    )}
                                    {/* Четвертый столбец - Выйти (только для зарегистрированных) */}
                                    {isAuthenticated && (
                                        <div className={`flex flex-col items-start`}>
                                            <button
                                                onClick={(e) => {
                                                    handleLogout();
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                }}
                                                className={`block px-5 py-3 text-lg font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 duration-300 whitespace-nowrap`}
                                            >
                                                {t("header.logout")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
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
                    
                    {/* Мобильное меню */}
                    <div 
                        ref={mobileMenuRef}
                        className={`hidden max-[770px]:flex fixed top-[100px] left-0 bg-white dark:bg-gray-900 w-full h-[calc(100vh-100px)] flex-col items-center pt-10 pb-10 overflow-y-auto z-[100] transition-all duration-300`}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <button 
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                            }}
                            className={`absolute top-5 right-5 p-2 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-gray-700 active:bg-[#E5E5E5] dark:active:bg-gray-600 duration-300 cursor-pointer z-[101] touch-manipulation`}
                            aria-label={t("header.closeMenu")}
                        >
                            <X size={32} color={`#C505EB`} />
                        </button>
                        <div className={`w-full max-w-[500px] flex flex-col items-center gap-2 px-5 mt-4`}>
                            {/* Первый столбец - как на десктопе */}
                            {menuItemsColumn1.map((item, index) => (
                                <Link
                                    key={index}
                                    to={item.path}
                                    className={`w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 ${
                                        pathname === item.path 
                                            ? 'bg-[#C505EB] text-white shadow-md' 
                                            : 'text-[#333333] dark:text-gray-200 bg-[#F9F9F9] dark:bg-gray-800 hover:bg-[#F5F5F5] dark:hover:bg-gray-700 active:bg-[#EEEEEE] dark:active:bg-gray-600'
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
                                    className={`w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 ${
                                        pathname === item.path 
                                            ? 'bg-[#C505EB] text-white shadow-md' 
                                            : 'text-[#333333] dark:text-gray-200 bg-[#F9F9F9] dark:bg-gray-800 hover:bg-[#F5F5F5] dark:hover:bg-gray-700 active:bg-[#EEEEEE] dark:active:bg-gray-600'
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
                                className={`w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 inline-flex items-center justify-center gap-2 ${
                                    pathname === "/add" 
                                        ? 'bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] text-white shadow-md' 
                                        : 'text-white bg-gradient-to-r from-[#9E04C2] to-[#06A8B8] hover:opacity-95 shadow-md'
                                }`}
                                onClick={() => {
                                    setTimeout(() => {
                                        setIsMenuOpen(false);
                                    }, 100);
                                }}
                            >
                                <Plus size={18} />
                                {t("header.addListing")}
                            </Link>
                            
                            {/* Профиль для зарегистрированных пользователей */}
                            {isAuthenticated && (
                                <Link
                                    to="/profile"
                                    className={`w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 ${
                                        pathname === "/profile" 
                                            ? 'bg-[#C505EB] text-white shadow-md' 
                                            : 'text-[#333333] dark:text-gray-200 bg-[#F9F9F9] dark:bg-gray-800 hover:bg-[#F5F5F5] dark:hover:bg-gray-700 active:bg-[#EEEEEE] dark:active:bg-gray-600'
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
                                className="w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                              >
                                {t("header.logout")}
                              </button>
                            )}
                            
                            {/* Кнопка Войти для гостей */}
                            {!isAuthenticated && (
                                <Link
                                    to="/auth"
                                    className={`w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 bg-gradient-to-r from-[#C505EB] to-[#BA00F8] text-white shadow-md hover:from-[#BA00F8] hover:to-[#C505EB]`}
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
                            <div className={`w-full h-px bg-gray-300 dark:bg-gray-600 my-2`}></div>
                            
                            {/* Кнопка темы - в мобильном меню */}
                            {mounted && (
                                <button
                                    onClick={toggleTheme}
                                    className={`w-full px-4 py-3 text-lg font-bold rounded-xl duration-300 text-center touch-manipulation active:scale-95 flex items-center justify-center gap-2 text-[#333333] dark:text-gray-200 bg-[#F9F9F9] dark:bg-gray-800 hover:bg-[#F5F5F5] dark:hover:bg-gray-700`}
                                >
                                    {isDark ? (
                                        <>
                                            <Sun size={20} className="text-yellow-400" />
                                            <span>{t("header.lightTheme")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Moon size={20} className="text-gray-700 dark:text-gray-300" />
                                            <span>{t("header.darkTheme")}</span>
                                        </>
                                    )}
                                </button>
                            )}
                            
                            {/* Выбор языка - в мобильном меню */}
                            <div className={`w-full flex items-center justify-center gap-2`}>
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setLanguage(lang.code);
                                        }}
                                        className={`flex-1 px-4 py-3 text-2xl rounded-xl duration-300 touch-manipulation active:scale-95 flex items-center justify-center  ${
                                            language === lang.code 
                                                ? 'bg-[#C505EB] shadow-md text-white' 
                                                : 'bg-[#F9F9F9] dark:bg-gray-800 hover:bg-[#F5F5F5] dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {lang.code === 'cz' && '🇨🇿'}
                                        {lang.code === 'ru' && '🇷🇺'}
                                        {lang.code === 'en' && '🇬🇧'}
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
