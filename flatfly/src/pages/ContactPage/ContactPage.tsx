import { Icon } from "@iconify/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";
import TeamSection from "../../components/TeamSection/TeamSection";

const TEXTAREA_MIN_PX = 76;
const TEXTAREA_MAX_PX = 220;

export default function ContactPage() {
    const [emailError, setEmailError] = useState<string | null>(null);
    const { t } = useLanguage();
    const messageRef = useRef<HTMLTextAreaElement>(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        message: "",
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const ta = messageRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        const next = Math.min(Math.max(ta.scrollHeight, TEXTAREA_MIN_PX), TEXTAREA_MAX_PX);
        ta.style.height = `${next}px`;
    }, [form.message]);

    const handleSubmit = async () => {
        const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!isValidEmail(form.email)) {
            setEmailError(t("contact.emailInvalid"));
            return;
        }
        if (!form.name || !form.email || !form.message) {
            setStatus(t("contact.fillAllFields"));
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch("/api/contact/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                setStatus(data.detail || t("contact.sendFailed"));
                return;
            }

            setStatus(t("contact.sendSuccess"));
            setForm({ name: "", email: "", message: "" });
        } catch {
            setStatus(t("contact.serverError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="interFont w-full min-h-screen bg-transparent pb-8 text-black dark:text-white flex flex-col items-center justify-center">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col px-2 max-[770px]:px-2 max-[1440px]:px-5 min-[1440px]:px-[110px]">
                <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 pt-[50px] min-[771px]:pt-[100px] min-[900px]:grid-cols-2 min-[900px]:items-start min-[900px]:gap-10 min-[900px]:pt-[108px]">
                    {/* Контакты — слева (на мобильных сверху) */}
                    <section className="flex min-w-0 flex-col gap-5">
                        <h1 className="bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-3xl font-bold text-transparent min-[900px]:text-4xl">
                            {t("contact.contacts")}
                        </h1>
                        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/95">
                            <div className="flex items-start gap-4">
                                <Icon icon="mage:phone" width={26} height={26} className="mt-0.5 shrink-0 text-[#08E2BE]" />
                                <a
                                    href="tel:+420736103242"
                                    className="break-all text-base font-semibold text-[#C505EB] min-[900px]:text-lg"
                                >
                                    +420 736 103 242
                                </a>
                            </div>
                            <div className="flex items-start gap-4">
                                <Icon icon="lets-icons:message-light" width={26} height={26} className="mt-0.5 shrink-0 text-[#08E2BE]" />
                                <a
                                    href="mailto:info@flatfly.cz"
                                    className="break-all text-base font-semibold text-[#C505EB] min-[900px]:text-lg"
                                >
                                    info@flatfly.cz
                                </a>
                            </div>
                            <div className="flex items-start gap-4">
                                <Icon icon="weui:location-outlined" width={26} height={26} className="mt-0.5 shrink-0 text-[#08E2BE]" />
                                <span className="text-base font-semibold leading-snug text-[#C505EB] min-[900px]:text-lg">
                                    Teplická 679/72, Duchcov 41901
                                </span>
                            </div>
                        </div>

                        <TeamSection showHeading className="mt-4 w-full min-[900px]:mt-8" />
                    </section>

                    {/* Форма — справа */}
                    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/95 min-[900px]:p-6">
                        <h2 className="text-xl font-bold text-[#333333] dark:text-gray-100 min-[900px]:text-2xl">
                            {t("contact.title")}
                        </h2>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-black dark:text-white" htmlFor="contact-name">
                                {t("contact.name")}
                            </label>
                            <input
                                id="contact-name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="h-11 w-full rounded-xl border border-[#E0E0E0] px-4 text-sm outline-none duration-300 focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-[#C505EB]"
                                placeholder={t("contact.namePlaceholder")}
                                autoComplete="name"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-black dark:text-white" htmlFor="contact-email">
                                {t("contact.email")}
                            </label>
                            <input
                                id="contact-email"
                                type="email"
                                value={form.email}
                                onChange={(e) => {
                                    setEmailError(null);
                                    setForm({ ...form, email: e.target.value });
                                }}
                                className="h-11 w-full rounded-xl border border-[#E0E0E0] px-4 text-sm outline-none duration-300 focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-[#C505EB]"
                                placeholder={t("contact.emailPlaceholder")}
                                autoComplete="email"
                            />
                        </div>
                        {emailError ? <p className="text-sm text-red-500">{emailError}</p> : null}

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-black dark:text-white" htmlFor="contact-message">
                                {t("contact.message")}
                            </label>
                            <textarea
                                ref={messageRef}
                                id="contact-message"
                                rows={2}
                                value={form.message}
                                onChange={(e) => setForm({ ...form, message: e.target.value })}
                                className="min-h-[76px] max-h-[220px] w-full resize-none overflow-y-auto rounded-xl border border-[#E0E0E0] px-4 py-2.5 text-sm leading-snug outline-none duration-300 focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-[#C505EB]"
                                placeholder={t("contact.messagePlaceholder")}
                            />
                        </div>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => void handleSubmit()}
                            className={`flex h-11 w-full items-center justify-center rounded-full text-base font-semibold text-white transition ${
                                loading ? "cursor-not-allowed bg-gray-400" : "cursor-pointer bg-[#C505EB] hover:bg-[#BA00F8]"
                            }`}
                        >
                            {loading ? t("contact.sending") : t("contact.send")}
                        </button>
                        {status ? (
                            <p className="text-center text-sm font-medium text-[#C505EB] dark:text-[#D946EF]">{status}</p>
                        ) : null}
                    </section>
                </div>
            </div>
        </div>
    );
}
