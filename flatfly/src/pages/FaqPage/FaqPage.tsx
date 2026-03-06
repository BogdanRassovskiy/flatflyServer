import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

type FaqItem = {
    id: number;
    faq_id: number;
    language: "en" | "ru" | "cz";
    question: string;
    answer: string;
    keys: string[];
};

export default function FaqPage() {
    const { language, t } = useLanguage();
    const [faqs, setFaqs] = useState<FaqItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/faqs/?language=${language}`, {
                    credentials: "include",
                });

                if (!res.ok) {
                    throw new Error("Failed to load FAQ");
                }

                const data = await res.json();
                const loadedFaqs: FaqItem[] = data.faqs || [];
                setFaqs(loadedFaqs);
                setOpenId(loadedFaqs.length > 0 ? loadedFaqs[0].id : null);
            } catch (error) {
                console.error("Error loading FAQ:", error);
                setFaqs([]);
                setOpenId(null);
            } finally {
                setLoading(false);
            }
        };

        fetchFaqs();
    }, [language]);


    return (
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-transparent`}>
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>
                <div className={`mt-[214px] max-[770px]:mt-[164px] flex flex-col items-center`}>
                    <span className={`text-[44px] max-[770px]:text-[28px] font-extrabold text-[#555555] dark:text-gray-300 interFont leading-16 max-[770px]:leading-10 text-center`}>
                        <span className={`text-[48px] max-[770px]:text-[32px] bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent`}>
                            {t("faq.title")}
                        </span>
                    </span>
                </div>

                <div className={`w-full max-w-[900px] mt-[60px] mb-[120px] flex flex-col gap-3`}>
                    {loading ? (
                        <div className={`text-lg text-gray-600 dark:text-gray-400 text-center`}>
                            {t("faq.loading")}
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className={`text-lg text-gray-600 dark:text-gray-400 text-center`}>
                            {t("faq.empty")}
                        </div>
                    ) : (
                        faqs.map((faq) => {
                            const isOpen = openId === faq.id;
                            return (
                                <div key={faq.id} className={`border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden`}>
                                    <button
                                        type="button"
                                        className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 duration-200`}
                                        onClick={() => setOpenId(isOpen ? null : faq.id)}
                                    >
                                        <span className={`text-[20px] max-[770px]:text-[18px] font-bold text-[#333333] dark:text-gray-100`}>
                                            {faq.question}
                                        </span>
                                        <ChevronDown
                                            size={22}
                                            className={`text-[#C505EB] shrink-0 duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                                        />
                                    </button>

                                    {isOpen && (
                                        <div className={`px-5 pb-5 pt-1 text-[17px] max-[770px]:text-[16px] leading-7 text-[#555555] dark:text-gray-300 bg-white dark:bg-gray-800`}>
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

        </div>
    );
}
