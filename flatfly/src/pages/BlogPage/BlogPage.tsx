import HeroCard from "../../components/HeroCard/HeroCard";
import {useLanguage} from "../../contexts/LanguageContext";
import cofee from "../../assets/cofee.png";
import laptop from "../../assets/laptop.png";
import book from "../../assets/holdbooks.png";

export default function BlogPage() {
    const { t } = useLanguage();

    const HeroCards = [
        {title:`Blog #1 - Proč si najít spolubydlení?`,subtitle:`Sdílené bydlení není jen o úspoře peněz za nájem. Zjisti, jaké výhody ti přinese život v partě a proč už nikdy nebudeš chtít bydlet sám...`, date:`2.11.2025` ,image:cofee, link:`/blog/1`},
        {title:`Blog #2 - Jak vybrat spolubydlícího?`,subtitle:`Hledáš parťáka, ne jen někoho, kdo zaplatí nájem. Poradíme ti, na co se ptát, abyste se po měsíci nepohádali kvůli neumytému nádobí...`, date:`2.11.2025` ,image:laptop, link:`/blog/2`},
        {title:`Nabízím byt`,subtitle:`Pronajmi volné místo nebo celý byt.`, date:`2.11.2025` ,image:book, link:`/blog/3`},
    ];

    return(
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>

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
                    {HeroCards.map((value)=>
                        <HeroCard key={value.title} title={value.title} subtitle={value.subtitle} image={value.image} date={value.date} type={"BLOG"} link={value.link}/>
                    )}
                </div>

            </div>

        </div>
    );

}