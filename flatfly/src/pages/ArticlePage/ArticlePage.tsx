import {useParams, Link, useNavigate} from "react-router-dom";
import {useLanguage} from "../../contexts/LanguageContext";
import {ArrowLeft, Calendar} from "lucide-react";
import cofee from "../../assets/cofee.png";
import laptop from "../../assets/laptop.png";
import book from "../../assets/holdbooks.png";

interface Article {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    image: string;
    content: {
        en: string;
        ru: string;
        cz: string;
    };
}

const articles: Article[] = [
    {
        id: "1",
        title: "Blog #1 - Proč si najít spolubydlení?",
        subtitle: "Sdílené bydlení není jen o úspoře peněz za nájem. Zjisti, jaké výhody ti přinese život v partě a proč už nikdy nebudeš chtít bydlet sám...",
        date: "2.11.2025",
        image: cofee,
        content: {
            en: `<p>Shared living isn't just about saving money on rent. It's about building connections, creating memories, and finding your tribe. When you live with roommates, you're not just sharing a space – you're sharing experiences, meals, and life's ups and downs.</p>
            
            <p>One of the biggest advantages of co-living is the financial aspect. Splitting rent, utilities, and household expenses can significantly reduce your monthly costs. But beyond the money, there's something more valuable: companionship.</p>
            
            <p>Living with others teaches you valuable life skills. You learn to communicate, compromise, and respect boundaries. These are skills that will serve you well in all areas of life, from your career to your personal relationships.</p>
            
            <p>Another benefit is the social aspect. Coming home to an empty apartment can be lonely, but when you have roommates, there's always someone to talk to, share a meal with, or just hang out. This is especially important if you're new to a city or country.</p>
            
            <p>Co-living also offers flexibility. Many shared living arrangements are more flexible than traditional leases, making it easier to move if your circumstances change. Plus, you often get access to amenities and spaces you might not be able to afford on your own.</p>
            
            <p>So if you're considering your living situation, don't overlook the benefits of shared living. It might just be the best decision you make for your wallet, your social life, and your personal growth.</p>`,
            ru: `<p>Совместное проживание - это не только экономия денег на аренде. Это о построении связей, создании воспоминаний и поиске своего круга. Когда вы живете с соседями, вы не просто делите пространство - вы делите опыт, еду и жизненные взлеты и падения.</p>
            
            <p>Одним из самых больших преимуществ совместного проживания является финансовый аспект. Разделение арендной платы, коммунальных услуг и бытовых расходов может значительно снизить ваши ежемесячные расходы. Но помимо денег есть что-то более ценное: товарищество.</p>
            
            <p>Жизнь с другими учит вас ценным жизненным навыкам. Вы учитесь общаться, идти на компромиссы и уважать границы. Это навыки, которые пригодятся вам во всех сферах жизни, от карьеры до личных отношений.</p>
            
            <p>Еще одно преимущество - социальный аспект. Возвращение домой в пустую квартиру может быть одиноким, но когда у вас есть соседи, всегда есть с кем поговорить, разделить трапезу или просто провести время. Это особенно важно, если вы новичок в городе или стране.</p>
            
            <p>Совместное проживание также предлагает гибкость. Многие договоренности о совместном проживании более гибкие, чем традиционная аренда, что облегчает переезд, если ваши обстоятельства изменятся. Кроме того, вы часто получаете доступ к удобствам и пространствам, которые не смогли бы себе позволить самостоятельно.</p>
            
            <p>Так что если вы рассматриваете свой жилищный вопрос, не упускайте из виду преимущества совместного проживания. Это может быть лучшим решением для вашего кошелька, социальной жизни и личностного роста.</p>`,
            cz: `<p>Sdílené bydlení není jen o úspoře peněz za nájem. Jde o budování vztahů, vytváření vzpomínek a hledání svého kmene. Když bydlíte se spolubydlícími, nesdílíte jen prostor - sdílíte zážitky, jídlo a životní vzestupy a pády.</p>
            
            <p>Jednou z největších výhod spolubydlení je finanční stránka. Dělení nájmu, energií a domácích výdajů může výrazně snížit vaše měsíční náklady. Ale kromě peněz je tu něco cennějšího: přátelství.</p>
            
            <p>Život s ostatními vás učí cenným životním dovednostem. Učíte se komunikovat, kompromisovat a respektovat hranice. To jsou dovednosti, které vám budou užitečné ve všech oblastech života, od kariéry po osobní vztahy.</p>
            
            <p>Další výhodou je sociální aspekt. Návrat domů do prázdného bytu může být osamělý, ale když máte spolubydlící, je vždy s kým mluvit, s kým sdílet jídlo nebo jen trávit čas. To je obzvláště důležité, pokud jste v novém městě nebo zemi.</p>
            
            <p>Spolubydlení také nabízí flexibilitu. Mnoho sdílených bydlení je flexibilnějších než tradiční nájemní smlouvy, což usnadňuje stěhování, pokud se vaše okolnosti změní. Navíc často získáte přístup k vybavení a prostorům, které byste si sami nemohli dovolit.</p>
            
            <p>Takže pokud uvažujete o své bytové situaci, nepřehlížejte výhody sdíleného bydlení. Může to být nejlepší rozhodnutí, které uděláte pro svou peněženku, společenský život a osobní růst.</p>`
        }
    },
    {
        id: "2",
        title: "Blog #2 - Jak vybrat spolubydlícího?",
        subtitle: "Hledáš parťáka, ne jen někoho, kdo zaplatí nájem. Poradíme ti, na co se ptát, abyste se po měsíci nepohádali kvůli neumytému nádobí...",
        date: "2.11.2025",
        image: laptop,
        content: {
            en: `<p>Finding the right roommate is crucial for a harmonious living situation. It's not just about finding someone who can pay rent – you need someone who fits your lifestyle, values, and habits. Here's how to find your perfect match.</p>
            
            <p><strong>Start with the basics:</strong> Before you even meet, discuss the fundamentals. What's their work schedule? Are they a morning person or night owl? Do they have pets? These basic questions will help you determine if you're compatible.</p>
            
            <p><strong>Discuss cleanliness:</strong> This is often the biggest source of conflict. Be honest about your cleanliness standards and ask about theirs. Are they okay with doing dishes immediately or do they let them pile up? How often do they clean common areas?</p>
            
            <p><strong>Talk about guests:</strong> How often do they have friends over? Are they okay with overnight guests? Setting boundaries early can prevent misunderstandings later.</p>
            
            <p><strong>Financial responsibility:</strong> Make sure they can consistently pay rent on time. Ask about their employment situation and financial stability. You don't want to be stuck covering their portion of the rent.</p>
            
            <p><strong>Lifestyle compatibility:</strong> Do they smoke? Drink? Party often? Work from home? These factors can significantly impact your daily life, so it's important to discuss them upfront.</p>
            
            <p><strong>Communication style:</strong> How do they handle conflicts? Are they direct or do they avoid confrontation? Good communication is key to resolving issues before they become major problems.</p>
            
            <p>Remember, it's better to be thorough in your search than to rush into a living situation that doesn't work. Take your time, ask the right questions, and trust your instincts. Your future self will thank you!</p>`,
            ru: `<p>Поиск подходящего соседа имеет решающее значение для гармоничной жилищной ситуации. Речь идет не только о том, чтобы найти того, кто может платить арендную плату - вам нужен тот, кто соответствует вашему образу жизни, ценностям и привычкам. Вот как найти идеального соседа.</p>
            
            <p><strong>Начните с основ:</strong> Прежде чем встретиться, обсудите основы. Каков их рабочий график? Они жаворонок или сова? Есть ли у них домашние животные? Эти базовые вопросы помогут вам определить, совместимы ли вы.</p>
            
            <p><strong>Обсудите чистоту:</strong> Это часто является самым большим источником конфликтов. Будьте честны в отношении своих стандартов чистоты и спросите об их. Они согласны мыть посуду сразу или позволяют ей накапливаться? Как часто они убирают общие зоны?</p>
            
            <p><strong>Поговорите о гостях:</strong> Как часто у них бывают друзья? Они согласны с ночевкой гостей? Установление границ заранее может предотвратить недопонимание в будущем.</p>
            
            <p><strong>Финансовая ответственность:</strong> Убедитесь, что они могут постоянно платить арендную плату вовремя. Спросите об их трудовой ситуации и финансовой стабильности. Вы не хотите оказаться в ситуации, когда вам придется покрывать их часть арендной платы.</p>
            
            <p><strong>Совместимость образа жизни:</strong> Они курят? Пьют? Часто устраивают вечеринки? Работают из дома? Эти факторы могут значительно повлиять на вашу повседневную жизнь, поэтому важно обсудить их заранее.</p>
            
            <p><strong>Стиль общения:</strong> Как они справляются с конфликтами? Они прямолинейны или избегают конфронтации? Хорошее общение - ключ к решению проблем до того, как они станут серьезными.</p>
            
            <p>Помните, лучше тщательно провести поиск, чем спешить в жилищную ситуацию, которая не работает. Не торопитесь, задавайте правильные вопросы и доверяйте своей интуиции. Ваше будущее "я" скажет вам спасибо!</p>`,
            cz: `<p>Najít správného spolubydlícího je klíčové pro harmonické soužití. Nejde jen o to najít někoho, kdo zaplatí nájem - potřebujete někoho, kdo se hodí k vašemu životnímu stylu, hodnotám a zvykům. Zde je návod, jak najít svého ideálního parťáka.</p>
            
            <p><strong>Začněte základy:</strong> Než se vůbec setkáte, proberte základní věci. Jaký je jejich pracovní rozvrh? Jsou ranní ptáče nebo noční sova? Mají domácí mazlíčky? Tyto základní otázky vám pomohou určit, zda jste kompatibilní.</p>
            
            <p><strong>Proberte čistotu:</strong> To je často největší zdroj konfliktů. Buďte upřímní ohledně svých standardů čistoty a zeptejte se na jejich. Jsou v pořádku s mytím nádobí okamžitě, nebo ho nechávají hromadit? Jak často uklízejí společné prostory?</p>
            
            <p><strong>Mluvte o hostech:</strong> Jak často mají přátele? Jsou v pořádku s nočními hosty? Stanovení hranic brzy může zabránit nedorozuměním později.</p>
            
            <p><strong>Finanční odpovědnost:</strong> Ujistěte se, že mohou pravidelně platit nájem včas. Zeptejte se na jejich pracovní situaci a finanční stabilitu. Nechcete být uvězněni v situaci, kdy musíte pokrýt jejich část nájmu.</p>
            
            <p><strong>Kompatibilita životního stylu:</strong> Kouří? Pijí? Pořádají často večírky? Pracují z domova? Tyto faktory mohou výrazně ovlivnit váš každodenní život, takže je důležité je prodiskutovat předem.</p>
            
            <p><strong>Styl komunikace:</strong> Jak řeší konflikty? Jsou přímí nebo se vyhýbají konfrontaci? Dobrá komunikace je klíčem k řešení problémů dříve, než se stanou velkými.</p>
            
            <p>Pamatujte, že je lepší být důkladný ve svém hledání, než spěchat do bytové situace, která nefunguje. Vezměte si čas, ptejte se na správné otázky a důvěřujte svým instinktům. Vaše budoucí já vám poděkuje!</p>`
        }
    },
    {
        id: "3",
        title: "Nabízím byt",
        subtitle: "Pronajmi volné místo nebo celý byt.",
        date: "2.11.2025",
        image: book,
        content: {
            en: `<p>Are you a property owner looking to rent out space? Whether you have a spare room or an entire apartment, FlatFly makes it easy to find the right tenants.</p>
            
            <p><strong>Why rent through FlatFly?</strong> Our platform connects you with verified users who are serious about finding quality housing. You can set your own terms, screen potential tenants, and manage everything from one place.</p>
            
            <p><strong>Getting started:</strong> Creating a listing is simple. Just upload photos, describe your space, set your price, and specify what you're looking for in a tenant. Our platform handles the rest.</p>
            
            <p><strong>Safety and security:</strong> All users go through a verification process, giving you peace of mind. You can also review potential tenants' profiles before making a decision.</p>
            
            <p>Ready to list your property? Get started today and find the perfect tenant for your space!</p>`,
            ru: `<p>Вы владелец недвижимости, который хочет сдать пространство в аренду? Независимо от того, есть ли у вас свободная комната или целая квартира, FlatFly упрощает поиск подходящих арендаторов.</p>
            
            <p><strong>Почему стоит сдавать через FlatFly?</strong> Наша платформа связывает вас с проверенными пользователями, которые серьезно относятся к поиску качественного жилья. Вы можете установить свои собственные условия, проверить потенциальных арендаторов и управлять всем из одного места.</p>
            
            <p><strong>Начало работы:</strong> Создание объявления простое. Просто загрузите фотографии, опишите свое пространство, установите цену и укажите, что вы ищете в арендаторе. Наша платформа сделает остальное.</p>
            
            <p><strong>Безопасность:</strong> Все пользователи проходят процесс проверки, что дает вам спокойствие. Вы также можете просмотреть профили потенциальных арендаторов перед принятием решения.</p>
            
            <p>Готовы разместить свою недвижимость? Начните сегодня и найдите идеального арендатора для вашего пространства!</p>`,
            cz: `<p>Jste vlastník nemovitosti, který chce pronajmout prostor? Ať už máte volný pokoj nebo celý byt, FlatFly vám usnadní najít správné nájemníky.</p>
            
            <p><strong>Proč pronajímat přes FlatFly?</strong> Naše platforma vás spojí s ověřenými uživateli, kteří jsou vážní ohledně hledání kvalitního bydlení. Můžete si nastavit vlastní podmínky, prověřit potenciální nájemníky a spravovat vše z jednoho místa.</p>
            
            <p><strong>Začínáme:</strong> Vytvoření inzerátu je jednoduché. Stačí nahrát fotografie, popsat svůj prostor, nastavit cenu a specifikovat, co hledáte v nájemníkovi. Naše platforma se postará o zbytek.</p>
            
            <p><strong>Bezpečnost:</strong> Všichni uživatelé procházejí procesem ověření, což vám dává klid. Můžete také zkontrolovat profily potenciálních nájemníků před rozhodnutím.</p>
            
            <p>Připraveni zveřejnit svou nemovitost? Začněte ještě dnes a najděte ideálního nájemníka pro svůj prostor!</p>`
        }
    }
];

export default function ArticlePage() {
    const { t, language } = useLanguage();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const article = articles.find(a => a.id === id);
    
    if (!article) {
        return (
            <div className={`w-full min-h-screen flex flex-col items-center justify-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>
                <div className={`flex flex-col items-center gap-4`}>
                    <h1 className={`text-2xl font-bold`}>{t("article.notFound")}</h1>
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
                <div className={`w-full max-w-4xl mb-12 rounded-xl overflow-hidden`}>
                    <img 
                        src={article.image} 
                        alt={article.title}
                        className={`w-full h-auto object-cover`}
                    />
                </div>

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
