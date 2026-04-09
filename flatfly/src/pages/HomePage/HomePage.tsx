import { useEffect, useMemo, useState } from "react";
import HeroCard from "../../components/HeroCard/HeroCard";
import logo from "../../assets/logo.png";
import { useLanguage } from "../../contexts/LanguageContext";
import furniture from "../../assets/furniture.jpg";
import wall from "../../assets/wallpaint.jpg";
import keys from "../../assets/holdingkeys.jpg";

type TeamMemberRow = {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
  email: string;
  phone: string;
  website: string;
};

function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "#";
  return `tel:${cleaned}`;
}

function websiteHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function websiteLabel(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "") || raw.trim();
}

const TEAM_FALLBACK_IMAGES = [keys, wall, furniture];

const teamPillClass =
  "block w-full rounded-xl border border-[#C505EB]/40 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-[#333333] shadow-sm transition hover:bg-[#C505EB]/10 dark:bg-gray-800/80 dark:text-gray-200 sm:text-sm";

export default function HomePage() {
  const { t, language } = useLanguage();
  const [teamFromApi, setTeamFromApi] = useState<TeamMemberRow[] | null>(null);

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

  const fallbackTeam = useMemo(
    (): TeamMemberRow[] => [
      {
        id: -1,
        name: "Michal Krechler",
        role: t("home.team.founder"),
        photo_url: null,
        email: "info@flatfly.cz",
        phone: "+420 777 123 456",
        website: "https://flatfly.cz",
      },
      {
        id: -2,
        name: "Tomáš Hájek",
        role: t("home.team.designer"),
        photo_url: null,
        email: "info@flatfly.cz",
        phone: "+420 777 123 456",
        website: "",
      },
      {
        id: -3,
        name: "Bogdan Rassovskiy",
        role: t("home.team.it"),
        photo_url: null,
        email: "info@flatfly.cz",
        phone: "+420 777 123 456",
        website: "https://flatfly.cz",
      },
    ],
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/team-members/?lang=${encodeURIComponent(language)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { members?: TeamMemberRow[] } | null) => {
        if (cancelled || !data?.members?.length) return;
        setTeamFromApi(data.members);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [language]);

  const teamRows = teamFromApi?.length ? teamFromApi : fallbackTeam;

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

        <div className="mb-[120px] w-full max-[770px]:mb-[80px]">
          <div className="flex w-full max-[770px]:flex-col max-[770px]:items-stretch max-[770px]:gap-8 max-[770px]:px-1 items-start justify-center gap-10 max-[1100px]:gap-8 min-[1100px]:gap-12">
            {teamRows.map((member, index) => (
              <div
                key={member.id}
                className="flex w-full min-[770px]:max-w-[280px] min-[770px]:flex-1 min-[770px]:basis-0 flex-col items-center text-center"
              >
                <img
                  src={member.photo_url || TEAM_FALLBACK_IMAGES[index % TEAM_FALLBACK_IMAGES.length]}
                  alt={member.role}
                  className="h-[148px] w-[148px] rounded-full border-4 border-[#C505EB]/30 object-cover max-[770px]:h-[132px] max-[770px]:w-[132px]"
                />
                <span className="mt-3 text-[20px] font-bold text-black max-[770px]:text-[18px] dark:text-white">
                  {member.role}
                </span>
                <span className="text-[15px] text-[#666666] dark:text-gray-400">{member.name}</span>

                <div className="mt-4 flex w-full max-w-[280px] flex-col gap-2">
                  {member.email ? (
                    <a href={`mailto:${member.email}`} className={teamPillClass}>
                      {t("contact.email")}: {member.email}
                    </a>
                  ) : null}
                  {member.phone ? (
                    <a href={telHref(member.phone)} className={teamPillClass}>
                      {t("contact.phone")}: {member.phone}
                    </a>
                  ) : null}
                  {member.website ? (
                    <a
                      href={websiteHref(member.website)}
                      target="_blank"
                      rel="noreferrer"
                      className={teamPillClass}
                    >
                      {t("contact.website")}: {websiteLabel(member.website)}
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
