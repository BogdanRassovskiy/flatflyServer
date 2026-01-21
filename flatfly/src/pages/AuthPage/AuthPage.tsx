import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import {useLanguage} from "../../contexts/LanguageContext";
import {useAuth} from "../../contexts/AuthContext";
import {useNavigate, useSearchParams} from "react-router-dom";

export default function AuthPage() {
    const { t } = useLanguage();
    const { login, isAuthenticated } = useAuth();
    const router = useNavigate();
    const [searchParams] = useSearchParams();
    //const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        name: ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    type AuthMode = "login" | "register" | "forgot";
    const [mode, setMode] = useState<AuthMode>("login");

    // Если пользователь уже аутентифицирован, перенаправляем его
    useEffect(() => {
        if (isAuthenticated) {
            const redirectTo = searchParams.get("redirect") || "/";
            router(redirectTo);
        }
    }, [isAuthenticated, router, searchParams]);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      // Email нужен всегда
      if (!formData.email) {
        newErrors.email = t("auth.emailRequired");
      } else if (!validateEmail(formData.email)) {
        newErrors.email = t("auth.emailInvalid");
      }

      // Пароль нужен только для login и register
      if (mode !== "forgot") {
        if (!formData.password) {
          newErrors.password = t("auth.passwordRequired");
        } else if (formData.password.length < 6) {
          newErrors.password = t("auth.passwordMinLength");
        }
      }

      // Дополнительные проверки только для регистрации
      if (mode === "register") {
        if (!formData.name) {
          newErrors.name = t("auth.nameRequired");
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = t("auth.confirmPasswordRequired");
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = t("auth.passwordsDoNotMatch");
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm() || isSubmitting) return;

      setIsSubmitting(true);
      setErrors({});

      try {
        // === FORGOT PASSWORD ===
        if (mode === "forgot") {
          const form = new FormData();
          form.append("email", formData.email);

          const res = await fetch("/api/auth/password-reset/", {
            method: "POST",
            credentials: "include",
            body: form,
          });

          if (!res.ok) {
            setErrors({ submit: "Ошибка при отправке письма" });
            return;
          }

          setMode("login");
          setErrors({
            submit: "Ссылка для восстановления пароля отправлена на почту",
          });
          return;
        }

        // === LOGIN / REGISTER ===
        let url = "";
        let payload: any = {};

        if (mode === "login") {
          url = "/api/auth/login/";
          payload = {
            email: formData.email,
            password: formData.password,
          };
        }

        if (mode === "register") {
          url = "/api/auth/register/";
          payload = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
          };
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrors({ submit: data.detail || data.error || "Authentication failed" });
          return;
        }

        // login / register → логиним
        login(data.email, data.name);

        const redirectTo = searchParams.get("redirect") || "/";
        router(redirectTo);

      } catch (err) {
        console.error(err);
        setErrors({ submit: "Server error" });
      } finally {
        setIsSubmitting(false);
      }
    };


    const handleGoogleLogin = () => {
        window.location.href = "/api/google_login/";
        console.log("Google login");
    };

    const handleAppleLogin = () => {
      const clientId = "com.your.app.service"; // Apple Service ID
      const redirectUri = encodeURIComponent("https://yourdomain.com/api/auth/apple/callback");
      const state = crypto.randomUUID();

      const url = `https://appleid.apple.com/auth/authorize?` +
        `response_type=code id_token&` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=name email&` +
        `state=${state}`;

      window.location.href = url;
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900 pt-[150px] pb-[90px]`}>
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-4 flex flex-col items-center`}>
                
                {/* Desktop Layout Container */}
                <div className={`w-full max-w-[1200px] flex max-[1024px]:flex-col items-center gap-12 max-[1024px]:gap-8`}>
                    
                    {/* Left Side - Decorative Content (Desktop only) */}
                    <div className={`hidden min-[1025px]:flex flex-col items-start justify-center flex-1 max-w-[500px]`}>
                        <div className={`mb-8`}>
                            <h1 className={`text-[56px] font-extrabold mb-4 bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent leading-tight`}>
                                {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
                            </h1>
                            <p className={`text-xl text-gray-600 dark:text-gray-400 leading-relaxed`}>
                                {mode === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
                            </p>
                        </div>
                        
                        {/* Decorative Elements */}
                        <div className={`w-full flex flex-col gap-6 mt-8`}>
                            <div className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#C505EB]/10 to-[#08E2BE]/10 border border-[#C505EB]/20`}>
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-r from-[#C505EB] to-[#08E2BE] flex items-center justify-center`}>
                                    <Mail className={`text-white`} size={24} />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg text-black dark:text-white`}>
                                        {t("auth.feature1Title")}
                                    </h3>
                                    <p className={`text-sm text-gray-600 dark:text-gray-400`}>
                                        {t("auth.feature1Desc")}
                                    </p>
                                </div>
                            </div>
                            
                            <div className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#C505EB]/10 to-[#08E2BE]/10 border border-[#C505EB]/20`}>
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-r from-[#C505EB] to-[#08E2BE] flex items-center justify-center`}>
                                    <Lock className={`text-white`} size={24} />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg text-black dark:text-white`}>
                                        {t("auth.feature2Title")}
                                    </h3>
                                    <p className={`text-sm text-gray-600 dark:text-gray-400`}>
                                        {t("auth.feature2Desc")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Form */}
                    <div className={`w-full max-[1024px]:max-w-[500px] min-[1025px]:max-w-[550px] flex flex-col items-center`}>
                        
                        {/* Mobile Title */}
                        <h1 className={`min-[1025px]:hidden text-[32px] max-[770px]:text-[28px] font-bold mb-6 text-center`}>
                            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
                        </h1>

                        {/* Toggle between Login and Register */}
                        <div className="w-full flex items-center gap-2 mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5">
                          <button
                            onClick={() => {
                              setMode("login");
                              setErrors({});
                              setFormData({ email: "", password: "", confirmPassword: "", name: "" });
                            }}
                            className={`flex-1 py-3 px-4 min-[1025px]:py-4 min-[1025px]:px-6 rounded-lg font-semibold text-lg min-[1025px]:text-xl transition-all duration-300 ${
                              mode === "login"
                                ? "bg-[#C505EB] text-white shadow-md shadow-[#C505EB]/30"
                                : "text-gray-600 dark:text-gray-400 hover:text-[#C505EB]"
                            }`}
                          >
                            {t("auth.login")}
                          </button>

                          <button
                            onClick={() => {
                              setMode("register");
                              setErrors({});
                              setFormData({ email: "", password: "", confirmPassword: "", name: "" });
                            }}
                            className={`flex-1 py-3 px-4 min-[1025px]:py-4 min-[1025px]:px-6 rounded-lg font-semibold text-lg min-[1025px]:text-xl transition-all duration-300 ${
                              mode === "register"
                                ? "bg-[#C505EB] text-white shadow-md shadow-[#C505EB]/30"
                                : "text-gray-600 dark:text-gray-400 hover:text-[#C505EB]"
                            }`}
                          >
                            {t("auth.register")}
                          </button>
                        </div>

                        {/* Desktop Title */}
                        <h1 className={`hidden min-[1025px]:block text-[40px] font-bold mb-8 text-center`}>
                            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
                        </h1>

                        {/* Social Login Buttons */}
                        <div className={`w-full flex flex-col gap-3 mb-6`}>
                            <button
                                onClick={handleGoogleLogin}
                                className={`w-full h-[56px] min-[1025px]:h-[60px] flex items-center justify-center gap-3 border-2 border-[#E0E0E0] dark:border-gray-600 rounded-xl font-semibold text-lg min-[1025px]:text-xl hover:border-[#C505EB] dark:hover:border-[#C505EB] hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800`}
                            >
                                <svg className="w-6 h-6 min-[1025px]:w-7 min-[1025px]:h-7" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span>{t("auth.continueWithGoogle")}</span>
                            </button>

                            <button
                                onClick={handleAppleLogin}
                                className={`w-full h-[56px] min-[1025px]:h-[60px] flex items-center justify-center gap-3 border-2 border-[#E0E0E0] dark:border-gray-600 rounded-xl font-semibold text-lg min-[1025px]:text-xl hover:border-[#C505EB] dark:hover:border-[#C505EB] hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800`}
                            >
                                <svg className="w-6 h-6 min-[1025px]:w-7 min-[1025px]:h-7" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                </svg>
                                <span>{t("auth.continueWithApple")}</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className={`w-full flex items-center gap-4 mb-6`}>
                            <div className={`flex-1 h-px bg-gray-300 dark:bg-gray-600`}></div>
                            <span className={`text-gray-500 dark:text-gray-400 font-medium text-lg min-[1025px]:text-xl`}>{t("auth.or")}</span>
                            <div className={`flex-1 h-px bg-gray-300 dark:bg-gray-600`}></div>
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleSubmit} className={`w-full flex flex-col gap-6 min-[1025px]:gap-7`}>
                            {mode === "register" && (
                                <div className={`w-full flex flex-col items-start gap-2`}>
                                    <label className={`text-lg min-[1025px]:text-xl font-bold text-black dark:text-white flex items-center gap-2`}>
                                        {t("auth.name")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange("name", e.target.value)}
                                        className={`w-full h-[56px] min-[1025px]:h-[60px] border ${
                                            errors.name ? "border-red-500" : "border-[#E0E0E0] dark:border-gray-600"
                                        } dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 py-1 text-base min-[1025px]:text-lg`}
                                        placeholder={t("auth.namePlaceholder")}
                                    />
                                    {errors.name && (
                                        <span className={`text-red-500 text-sm min-[1025px]:text-base`}>{errors.name}</span>
                                    )}
                                </div>
                            )}

                            <div className={`w-full flex flex-col items-start gap-2`}>
                                <label className={`text-lg min-[1025px]:text-xl font-bold text-black dark:text-white flex items-center gap-2`}>
                                    <Mail size={20} className={`min-[1025px]:w-6 min-[1025px]:h-6`} />
                                    {t("auth.email")}
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    className={`w-full h-[56px] min-[1025px]:h-[60px] border ${
                                        errors.email ? "border-red-500" : "border-[#E0E0E0] dark:border-gray-600"
                                    } dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 py-1 text-base min-[1025px]:text-lg`}
                                    placeholder={t("auth.emailPlaceholder")}
                                />
                                {errors.email && (
                                    <span className={`text-red-500 text-sm min-[1025px]:text-base`}>{errors.email}</span>
                                )}
                            </div>
                            {mode !== "forgot" && (
                              <div>
                                {<div className={`w-full flex flex-col items-start gap-2`}>
                                <label className={`text-lg min-[1025px]:text-xl font-bold text-black dark:text-white flex items-center gap-2`}>
                                    <Lock size={20} className={`min-[1025px]:w-6 min-[1025px]:h-6`} />
                                    {t("auth.password")}
                                </label>
                                <div className={`w-full relative`}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => handleInputChange("password", e.target.value)}
                                        className={`w-full h-[56px] min-[1025px]:h-[60px] border ${
                                            errors.password ? "border-red-500" : "border-[#E0E0E0] dark:border-gray-600"
                                        } dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 py-1 pr-14 text-base min-[1025px]:text-lg`}
                                        placeholder={t("auth.passwordPlaceholder")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-[#C505EB] transition-colors`}
                                    >
                                        {showPassword ? <EyeOff size={22} className={`min-[1025px]:w-6 min-[1025px]:h-6`} /> : <Eye size={22} className={`min-[1025px]:w-6 min-[1025px]:h-6`} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className={`text-red-500 text-sm min-[1025px]:text-base`}>{errors.password}</span>
                                )}
                            </div>}
                              </div>
                            )}
                            

                            {mode === "register" && (
                                <div className={`w-full flex flex-col items-start gap-2`}>
                                    <label className={`text-lg min-[1025px]:text-xl font-bold text-black dark:text-white flex items-center gap-2`}>
                                        <Lock size={20} className={`min-[1025px]:w-6 min-[1025px]:h-6`} />
                                        {t("auth.confirmPassword")}
                                    </label>
                                    <div className={`w-full relative`}>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                                            className={`w-full h-[56px] min-[1025px]:h-[60px] border ${
                                                errors.confirmPassword ? "border-red-500" : "border-[#E0E0E0] dark:border-gray-600"
                                            } dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-5 py-1 pr-14 text-base min-[1025px]:text-lg`}
                                            placeholder={t("auth.confirmPasswordPlaceholder")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className={`absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-[#C505EB] transition-colors`}
                                        >
                                            {showConfirmPassword ? <EyeOff size={22} className={`min-[1025px]:w-6 min-[1025px]:h-6`} /> : <Eye size={22} className={`min-[1025px]:w-6 min-[1025px]:h-6`} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <span className={`text-red-500 text-sm min-[1025px]:text-base`}>{errors.confirmPassword}</span>
                                    )}
                                </div>
                            )}

                            {mode === "forgot" && (
                              <div className="w-full mb-6 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                  Введите почту, на которую будет выслана ссылка для восстановления пароля.
                                </p>
                              </div>
                            )}

                            {mode === "login" && (
                              <div className="w-full flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setMode("forgot")}
                                  className="text-[#C505EB] hover:underline text-base font-medium"
                                >
                                  {t("auth.forgotPassword")}
                                </button>
                              </div>
                            )}

                            {errors.submit && (
                                <div className={`w-full p-4 min-[1025px]:p-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                                    <span className={`text-red-600 dark:text-red-400 text-sm min-[1025px]:text-base`}>{errors.submit}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full h-[56px] min-[1025px]:h-[64px] flex items-center justify-center rounded-full text-white text-xl min-[1025px]:text-2xl font-semibold bg-gradient-to-r from-[#C505EB] to-[#BA00F8] hover:from-[#BA00F8] hover:to-[#C505EB] transition-all duration-300 shadow-lg hover:shadow-xl shadow-[#C505EB]/30 mt-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isSubmitting
                                ? t("auth.processing")
                                : mode === "login"
                                ? t("auth.loginButton")
                                : mode === "register"
                                ? t("auth.registerButton")
                                : t("auth.sendResetLink")}
                            </button>
                        </form>

                        {/* Footer Text */}
                        {mode !== "forgot" && (
                          <p className="mt-8 text-center text-gray-600 dark:text-gray-400">
                            {mode === "login" ? t("auth.loginFooter") : t("auth.registerFooter")}{" "}
                            <button
                              onClick={() => setMode(mode === "login" ? "register" : "login")}
                              className="text-[#C505EB] hover:underline font-semibold"
                            >
                              {mode === "login" ? t("auth.register") : t("auth.login")}
                            </button>
                          </p>
                        )}

                        {mode === "forgot" && (
                          <p className="mt-8 text-center">
                            <button
                              onClick={() => setMode("login")}
                              className="text-[#C505EB] hover:underline font-semibold"
                            >
                              ← {t("auth.backToLogin")}
                            </button>
                          </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
