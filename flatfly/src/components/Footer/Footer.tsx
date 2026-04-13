import { Icon } from "@iconify/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "react-router-dom";
import qrcode from "../../assets/michalkrechler.png";

const iconSize = 32;

export default function Footer() {
  const { t } = useLanguage();

  const NavLinks = [
    { title: t("footer.home"), path: `/` },
    { title: t("footer.about"), path: `/` },
    { title: t("footer.blog"), path: `/blog` },
    { title: t("footer.contact"), path: `/contact` },
  ];

  const linkClass =
    "block text-[18px] font-bold leading-snug text-white transition-colors duration-300 hover:text-[#C505EB] min-[770px]:text-[17px]";

  return (
    <footer className="interFont flex w-full flex-col items-center bg-[#333333] py-4 dark:bg-gray-900">
      <div
        className="flex w-full max-w-[1440px] flex-col items-stretch justify-between gap-4 px-4 max-[770px]:gap-4 max-[1439px]:px-5 min-[770px]:min-h-0 min-[770px]:flex-row min-[770px]:items-start min-[770px]:gap-10 min-[1440px]:px-[88px]"
      >
        {/* Бренд + соцсети + копирайт (только десктоп) */}
        <div className="flex min-w-0 flex-col gap-2.5 max-[770px]:items-center max-[770px]:text-center min-[770px]:gap-3">
          <Link to="/">
            <span className="cursor-pointer text-[42px] font-bold leading-none text-white transition-colors duration-300 hover:text-[#C505EB]">
              FlatFly
            </span>
          </Link>

          <div className="flex items-center justify-center gap-5 min-[770px]:justify-start">
            <Icon icon="tdesign:logo-instagram" width={iconSize} height={iconSize} style={{ color: `#ffffff` }} />
            <Icon icon="ic:baseline-facebook" width={iconSize} height={iconSize} style={{ color: `#ffffff` }} />
            <Icon icon="iconoir:tiktok-solid" width={iconSize} height={iconSize} style={{ color: `#ffffff` }} />
          </div>

          <span className="hidden text-[13px] font-semibold leading-snug text-white/90 min-[770px]:block">
            {t("footer.copyright")}
          </span>
        </div>

        {/* Навигация + QR: на мобилке компактная сетка */}
        <div className="flex w-full min-w-0 flex-col items-stretch gap-4 min-[770px]:w-auto min-[770px]:flex-1 min-[770px]:flex-row min-[770px]:items-start min-[770px]:justify-end min-[770px]:gap-[75px]">
          <nav className="grid w-full grid-cols-2 gap-x-6 gap-y-1.5 max-[770px]:max-w-sm max-[770px]:mx-auto min-[770px]:flex min-[770px]:w-auto min-[770px]:flex-col min-[770px]:gap-1.5 min-[770px]:items-end">
            {NavLinks.map((value, index) => (
              <Link key={index} to={value.path} className={linkClass}>
                {value.title}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 justify-center min-[770px]:justify-end">
            <img className="h-[150px] w-[150px] object-contain" src={qrcode} alt="QR" />
          </div>

          <span className="text-center text-[13px] font-semibold leading-snug text-white/90 min-[770px]:hidden">
            {t("footer.copyright")}
          </span>
        </div>
      </div>
    </footer>
  );
}
