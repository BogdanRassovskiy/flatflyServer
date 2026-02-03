import { useState, useEffect } from "react";
import {useParams, Link, useNavigate} from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {ArrowLeft, Calendar} from "lucide-react";

interface Article {
    id: number;
    title: string;
    subtitle: string;
    date: string;
    image: string | null;
    content: {
        en: string;
        ru: string;
        cz: string;
    };
}

export default function ArticlePage() {
    const { id } = useParams<{ id: string }>();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    useEffect(() => {
        const fetchArticle = async () => {
            if (!id) {
                setError(true);
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/articles/${id}/`, {
                    credentials: "include",
                });
                
                if (!res.ok) {
                    throw new Error("Article not found");
                }
                
                const data = await res.json();
                setArticle(data);
                setError(false);
            } catch (err) {
                console.error("Error loading article:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [id]);
    
    if (loading) {
        return (
            <div className={`w-full min-h-screen flex items-center justify-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>
                <div className={`text-lg`}>{t("loading") || "Загрузка..."}</div>
            </div>
        );
    }
    
    if (error || !article) {
        return (
            <div className={`w-full min-h-screen flex flex-col items-center justify-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>
                <div className={`text-2xl mb-4`}>{t("article.notFound")}</div>
                <div className={`mt-8`}>
                    <Link 
                        to="/blog" 
                        className={`px-6 py-2 rounded-lg bg-gradient-to-r from-[#C505EB] to-[#BA00F8] text-white hover:from-[#BA00F8] hover:to-[#C505EB] duration-300 font-semibold`}
                    >
                        {t("article.backToBlog")}
                    </Link>
                </div>
            </div>
        );
    }
    
    const content = article.content[language as keyof typeof article.content] || article.content.en;
    
    return (
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>
            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>
                
                {/* Back button */}
                <div className={`w-full mt-[164px] max-[770px]:mt-[120px] mb-6`}>
                    <button
                        onClick={() => navigate(-1)}
                        className={`flex items-center gap-2 text-[#C505EB] hover:text-[#BA00F8] duration-300 font-semibold`}
                    >
                        <ArrowLeft size={20} />
                        <span>{t("article.back")}</span>
                    </button>
                </div>

                {/* Article Header */}
                <div className={`w-full max-w-4xl mb-8`}>
                    <h1 className={`text-4xl max-[770px]:text-2xl font-bold mb-4`}>
                        {article.title}
                    </h1>
                    <p className={`text-xl max-[770px]:text-lg text-[#666666] dark:text-gray-400 mb-6`}>
                        {article.subtitle}
                    </p>
                    <div className={`flex items-center gap-2 text-[#666666] dark:text-gray-400 mb-8`}>
                        <Calendar size={18} />
                        <span className={`text-sm`}>{article.date}</span>
                    </div>
                </div>

                {/* Article Image */}
                {article.image && (
                    <div className={`w-full max-w-4xl mb-12 rounded-xl overflow-hidden`}>
                        <img 
                            src={article.image} 
                            alt={article.title}
                            className={`w-full h-auto object-cover`}
                        />
                    </div>
                )}

                {/* Article Content */}
                <div className={`w-full max-w-4xl mb-16`}>
                    <div 
                        className={`text-[#333333] dark:text-gray-300 leading-relaxed
                                    [&_p]:mb-6 [&_p]:text-base [&_p]:leading-relaxed
                                    [&_strong]:text-black [&_strong]:dark:text-white [&_strong]:font-bold
                                    [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-black [&_h1]:dark:text-white
                                    [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-black [&_h2]:dark:text-white
                                    [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-black [&_h3]:dark:text-white
                                    [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4
                                    [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4
                                    [&_li]:mb-2`}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>

                {/* Back to Blog Button */}
                <div className={`w-full max-w-4xl mb-16 flex justify-center`}>
                    <Link 
                        to="/blog" 
                        className={`px-8 py-3 rounded-lg bg-gradient-to-r from-[#C505EB] to-[#BA00F8] text-white hover:from-[#BA00F8] hover:to-[#C505EB] duration-300 font-semibold`}
                    >
                        {t("article.backToBlog")}
                    </Link>
                </div>

            </div>
        </div>
    );
}
