import HeroCard from "../../components/HeroCard/HeroCard";
import logo from "../../assets/logo.png";
import {useLanguage} from "../../contexts/LanguageContext";
import furniture from "../../assets/furniture.jpg";
import wall from "../../assets/wallpaint.jpg";
import keys from "../../assets/holdingkeys.jpg";

export default function HomePage() {
    const { t } = useLanguage();

    const HeroCards = [
        {title: t("home.heroCard1.title"), subtitle: t("home.heroCard1.subtitle"), image:furniture, link:`/rooms`},
        {title: t("home.heroCard2.title"), subtitle: t("home.heroCard2.subtitle"), image:wall, link:`/neighbours`},
        {title: t("home.heroCard3.title"), subtitle: t("home.heroCard3.subtitle"), image:keys, link:`/add`},
    ];

    return(
        <div className={`w-screen min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>

            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>
                {/*Hero title*/}
                <div className={`mt-[214px] flex flex-col items-center `}>
                    <span className={`text-[60px] max-[770px]:text-[32px] font-extrabold text-[#555555] dark:text-gray-300 interFont leading-16 max-[770px]:leading-10 text-center`}>
                        <span className={`text-[64px] max-[770px]:text-[36px]`}>
                            <span className={`bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent`}>FlatFly,</span> {t("home.title").replace("FlatFly, ", "")}
                        </span>
                         <br className={`max-[770px]:hidden`}/>
                        {t("home.subtitle")}
                    </span>
                </div>

                {/*HeroCards*/}
                <div className={`w-full flex max-[770px]:flex-col items-center justify-between max-[1220px]:gap-3 min-[1220px]:gap-6 mt-[130px]`}>
                    {HeroCards.map((value, index)=>
                        <HeroCard key={index} title={value.title} subtitle={value.subtitle} image={value.image} type={"HERO"} link={value.link}/>
                    )}
                </div>

                <div className={`mt-[151px] mb-[123px] w-full h-[513px] max-[770px]:h-auto flex max-[770px]:flex-col-reverse max-[770px]:items-center items-start justify-between max-[770px]:gap-10 `}>

                    <div className={`min-[770px]:w-1/2 max-[770px]:w-full min-[770px]:flex-shrink-0 flex flex-col min-[770px]:items-start max-[770px]:items-center `}>
                        <span className={`text-[40px] font-bold bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent `}>{t("home.aboutTitle")}</span>
                        <p className={`w-full min-[770px]:max-w-[504px]`}>
                            <span className={`text-[#000000] dark:text-gray-200`}>
                                {t("home.aboutText1")}
                            </span>
                            <br/>
                            <br/>
                            <span className={`text-[#333333] dark:text-gray-400`}>
                                {t("home.aboutText2").split('\n').map((line, i, arr) => (
                                    <span key={i}>
                                        {line}
                                        {i < arr.length - 1 && <><br/><br/></>}
                                    </span>
                                ))}
                            </span>
                        </p>
                    </div>

                    <div className={`min-[770px]:w-1/2 max-[770px]:w-full flex items-center justify-center self-center `}>
                        <img className={`min-[770px]:w-[394px] min-[770px]:h-[394px] max-[770px]:w-[200px] max-[770px]:h-[200px] object-contain`} src={logo} alt="FlatFly Logo"/>
                    </div>

                </div>

            </div>

        </div>
    );

}