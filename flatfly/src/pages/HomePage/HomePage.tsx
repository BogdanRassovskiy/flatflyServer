import HeroCard from "../../components/HeroCard/HeroCard";
import TeamSection from "../../components/TeamSection/TeamSection";
import logo from "../../assets/logo.png";
import { useLanguage } from "../../contexts/LanguageContext";
import furniture from "../../assets/furniture.jpg";
import wall from "../../assets/wallpaint.jpg";
import keys from "../../assets/holdingkeys.jpg";

export default function HomePage() {
  const { t } = useLanguage();

  const HeroCards = [
    {
      title: t("home.heroCard1.title"),
      subtitle: t("home.heroCard1.subtitle"),
      image: furniture,
      link: `/rooms`,
    },
    {
      title: t("home.heroCard2.title"),
      subtitle: t("home.heroCard2.subtitle"),
      image: wall,
      link: `/neighbours`,
    },
    {
      title: t("home.heroCard3.title"),
      subtitle: t("home.heroCard3.subtitle"),
      image: keys,
      link: `/add`,
    },
  ];

  return (
    <div
      className={`interFont flex min-h-screen w-screen flex-col items-center bg-transparent text-black dark:text-white`}
    >
      <div
        className={`flex w-full max-w-[1440px] flex-col items-center max-[1440px]:px-10 max-[770px]:px-3 min-[1440px]:px-[110px]`}
      >
        {/*Hero title*/}
        <div className={`mt-[132px] flex flex-col items-center max-[770px]:mt-[72px] `}>
          <span
            className={`interFont text-center text-[52px] font-extrabold leading-[1.02] text-[#555555] max-[770px]:text-[32px] max-[770px]:leading-10 dark:text-gray-300`}
          >
            <span className={`text-[56px] max-[770px]:text-[36px]`}>
              <span
                className={`bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-transparent`}
              >
                FlatFly,
              </span>{" "}
              {t("home.title").replace("FlatFly, ", "")}
            </span>
            <br className={`max-[770px]:hidden`} />
            {t("home.subtitle")}
          </span>
        </div>

        {/*HeroCards*/}
        <div
          className={`mt-[42px] flex w-full max-[770px]:mt-[34px] max-[770px]:flex-col max-[770px]:items-center max-[770px]:gap-4 max-[1220px]:gap-3 min-[1220px]:items-center min-[1220px]:justify-center min-[1220px]:gap-4`}
        >
          {HeroCards.map((value, index) => (
            <HeroCard
              key={index}
              title={value.title}
              subtitle={value.subtitle}
              image={value.image}
              type={"HERO"}
              link={value.link}
            />
          ))}
        </div>

        <div
          id="about"
          className={`mb-[80px] mt-[151px] flex min-h-[513px] w-full max-[770px]:h-auto max-[770px]:min-h-0 max-[770px]:flex-col-reverse max-[770px]:items-center max-[770px]:gap-10 items-start justify-between`}
        >
          <div
            className={`flex max-[770px]:w-full max-[770px]:items-center min-[770px]:w-1/2 min-[770px]:flex-shrink-0 min-[770px]:flex-col min-[770px]:items-start flex-col`}
          >
            <span
              className={`bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-[40px] font-bold text-transparent `}
            >
              {t("home.aboutTitle")}
            </span>
            <p className={`w-full min-[770px]:max-w-[504px]`}>
              <span className={`text-[#000000] dark:text-gray-200`}>{t("home.aboutText1")}</span>
              <br />
              <br />
              <span className={`text-[#333333] dark:text-gray-400`}>
                {t("home.aboutText2")
                  .split("\n")
                  .map((line, i, arr) => (
                    <span key={i}>
                      {line}
                      {i < arr.length - 1 && (
                        <>
                          <br />
                          <br />
                        </>
                      )}
                    </span>
                  ))}
              </span>
            </p>
          </div>

          <div
            className={`flex max-[770px]:w-full min-[770px]:w-1/2 items-center justify-center self-center `}
          >
            <img
              className={`max-[770px]:h-[200px] max-[770px]:w-[200px] min-[770px]:h-[394px] min-[770px]:w-[394px] object-contain`}
              src={logo}
              alt="FlatFly Logo"
            />
          </div>
        </div>

        <TeamSection className="mb-[120px] w-full max-[770px]:mb-[80px]" />
      </div>
    </div>
  );
}
