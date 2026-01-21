import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";

export default function ResetPasswordPage() {
    const { t } = useLanguage();
    const router = useNavigate();
    const { uid, token } = useParams<{ uid: string; token: string }>();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

    // Проверка валидности токена при загрузке
    useEffect(() => {
        if (!uid || !token) {
            setIsTokenValid(false);
            return;
        }
        // Можно добавить проверку токена через API, но для простоты проверим при отправке формы
        setIsTokenValid(true);
    }, [uid, token]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.password) {
            newErrors.password = t("auth.passwordRequired");
        } else if (formData.password.length < 6) {
            newErrors.password = t("auth.passwordMinLength");
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = t("auth.confirmPasswordRequired");
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t("auth.passwordsDoNotMatch");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || isSubmitting || !uid || !token) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            const res = await fetch(`/api/auth/password-reset-confirm/${uid}/${token}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ password: formData.password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrors({ submit: data.detail || t("resetPassword.invalidLink") });
                setIsTokenValid(false);
                return;
            }

            setIsSuccess(true);
            // Перенаправляем на страницу входа через 2 секунды
            setTimeout(() => {
                router("/auth?redirect=/");
            }, 2000);

        } catch (err) {
            console.error(err);
            setErrors({ submit: t("resetPassword.serverError") });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Очистить ошибку при вводе
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    if (isTokenValid === false) {
        return (
            <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900 pt-[150px] pb-[90px]`}>
                <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-4 flex flex-col items-center`}>
                    <div className={`w-full max-w-[500px] flex flex-col items-center gap-6 p-8 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                        <h1 className={`text-2xl font-bold text-red-600 dark:text-red-400`}>
                            {t("resetPassword.invalidLink")}
                        </h1>
                        <p className={`text-center text-gray-600 dark:text-gray-400`}>
                            {t("resetPassword.invalidLinkDesc")}
                        </p>
                        <button
                            onClick={() => router("/auth")}
                            className={`mt-4 px-6 py-3 rounded-full text-white text-lg font-semibold bg-gradient-to-r from-[#C505EB] to-[#BA00F8] hover:from-[#BA00F8] hover:to-[#C505EB] transition-all duration-300`}
                        >
                            {t("resetPassword.backToLogin")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900 pt-[150px] pb-[90px]`}>
                <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-4 flex flex-col items-center`}>
                    <div className={`w-full max-w-[500px] flex flex-col items-center gap-6 p-8 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`}>
                        <CheckCircle className={`w-16 h-16 text-green-600 dark:text-green-400`} />
                        <h1 className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                            {t("resetPassword.success")}
                        </h1>
                        <p className={`text-center text-gray-600 dark:text-gray-400`}>
                            {t("resetPassword.successDesc")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900 pt-[150px] pb-[90px]`}>
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-4 flex flex-col items-center`}>
                <div className={`w-full max-w-[500px] flex flex-col items-center`}>
                    
                    <h1 className={`text-[32px] max-[770px]:text-[28px] font-bold mb-2 text-center`}>
                        {t("resetPassword.title")}
                    </h1>
                    <p className={`text-lg text-gray-600 dark:text-gray-400 mb-8 text-center`}>
                        {t("resetPassword.subtitle")}
                    </p>

                    <form onSubmit={handleSubmit} className={`w-full flex flex-col gap-6`}>
                        <div className={`w-full flex flex-col items-start gap-2`}>
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
                        </div>

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
                            {isSubmitting ? t("auth.processing") : t("resetPassword.resetButton")}
                        </button>
                    </form>

                    <p className="mt-8 text-center">
                        <button
                            onClick={() => router("/auth")}
                            className="text-[#C505EB] hover:underline font-semibold"
                        >
                            ← {t("resetPassword.backToLogin")}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
