import { Icon } from "@iconify/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "react-router-dom";
import { FlatFlyFMark } from "../brand/FlatFlyFMark";

const iconSize = 32;

const FOOTER_LEGAL_KEYS = [
  "legalLine1",
  "legalLine2",
  "legalLine3",
  "legalLine4",
  "legalLine5",
  "legalLine6",
] as const;

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
    <footer className="interFont flex w-full flex-col items-center bg-[#333333] py-5 dark:bg-gray-900">
      <div className="flex w-full max-w-[1440px] flex-col gap-4 px-4 max-[1439px]:px-5 min-[1440px]:px-[88px]">
        <div className="flex w-full flex-col items-stretch justify-between gap-4 min-[770px]:min-h-0 min-[770px]:flex-row min-[770px]:items-start min-[770px]:gap-10">
          <div className="flex min-w-0 flex-col gap-2.5 max-[770px]:items-center max-[770px]:text-center min-[770px]:gap-3">
            <Link
              to="/"
              className="inline-flex w-fit text-white max-[770px]:mx-auto"
              aria-label="FlatFly"
            >
              <FlatFlyFMark variant="mark" className="h-11 w-11" aria-hidden={false} title="FlatFly" />
            </Link>

            <div className="flex items-center justify-center gap-5 min-[770px]:justify-start">
              <Icon icon="tdesign:logo-instagram" width={iconSize} height={iconSize} style={{ color: `#ffffff` }} />
              <Icon icon="ic:baseline-facebook" width={iconSize} height={iconSize} style={{ color: `#ffffff` }} />
              <Icon icon="iconoir:tiktok-solid" width={iconSize} height={iconSize} style={{ color: `#ffffff` }} />
            </div>
          </div>

          <nav className="grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-1.5 max-[770px]:mx-auto min-[770px]:flex min-[770px]:w-auto min-[770px]:max-w-none min-[770px]:flex-col min-[770px]:items-end min-[770px]:gap-1.5">
            {NavLinks.map((value, index) => (
              <Link key={index} to={value.path} className={linkClass}>
                {value.title}
              </Link>
            ))}
          </nav>
        </div>

        <div
          className="space-y-1 w-full border-t border-white/10 pt-3 text-center text-[13px] leading-snug text-white/85 max-[770px]:max-w-md max-[770px]:mx-auto min-[770px]:text-left"
        >
          {FOOTER_LEGAL_KEYS.map((key) => (
            <p key={key}>
              {t(`footer.${key}`)}
            </p>
          ))}
        </div>

        <p className="w-full text-center text-[13px] font-semibold leading-snug text-white/90">
          {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
