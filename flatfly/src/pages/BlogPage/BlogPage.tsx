import { useState, useEffect } from "react";
import HeroCard from "../../components/HeroCard/HeroCard";
import {useLanguage} from "../../contexts/LanguageContext";
import cofee from "../../assets/cofee.png";
import laptop from "../../assets/laptop.png";
import book from "../../assets/holdbooks.png";

type Article = {
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
};

export default function BlogPage() {
    const { t } = useLanguage();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    // Дефолтные изображения для статей (если в БД нет)
    const defaultImages = [cofee, laptop, book];

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const res = await fetch("/api/articles/", {
                    credentials: "include",
                });
                
                if (!res.ok) {
                    throw new Error("Failed to load articles");
                }
                
                const data = await res.json();
                setArticles(data.articles || []);
            } catch (error) {
                console.error("Error loading articles:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    return(
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-transparent`}>

            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>

                <div className={`mt-[214px] max-[770px]:mt-[164px] flex flex-col items-center `}>
                    <span className={`text-[44px] max-[770px]:text-[28px] font-extrabold text-[#555555] dark:text-gray-300 interFont leading-16 max-[770px]:leading-10 text-center`}>
                        <span className={`text-[48px] max-[770px]:text-[32px]`}>
                            <span className={`bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent`}>Blog FlatFly,</span> {t("blog.title").replace("Blog FlatFly, ", "")}
                        </span>
                         <br className={`max-[770px]:hidden`}/>
                        {t("blog.subtitle")}
                    </span>
                </div>

                <div className={`w-full flex max-[770px]:flex-col items-center justify-between max-[1220px]:gap-3 min-[1220px]:gap-6 mt-[130px] mb-[800px]`}>
                    {loading ? (
                        <div className={`text-lg text-gray-600 dark:text-gray-400`}>
                            {t("loading") || "Загрузка..."}
                        </div>
                    ) : articles.length === 0 ? (
                        <div className={`text-lg text-gray-600 dark:text-gray-400`}>
                            {t("blog.noArticles") || "Статей пока нет"}
                        </div>
                    ) : (
                        articles.map((article, index) => (
                            <HeroCard 
                                key={article.id} 
                                title={article.title} 
                                subtitle={article.subtitle} 
                                image={article.image || defaultImages[index % defaultImages.length]} 
                                date={article.date} 
                                type={"BLOG"} 
                                link={`/blog/${article.id}`}
                            />
                        ))
                    )}
                </div>

            </div>

        </div>
    );

}