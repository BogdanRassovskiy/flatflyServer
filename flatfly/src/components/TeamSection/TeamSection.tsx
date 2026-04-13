import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import furniture from "../../assets/furniture.jpg";
import wall from "../../assets/wallpaint.jpg";
import keys from "../../assets/holdingkeys.jpg";

export type TeamMemberRow = {
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

const contactLinkClass =
  "group block w-full rounded-xl border border-[#C505EB]/35 bg-white/95 px-3.5 py-2.5 text-left shadow-sm transition " +
  "hover:border-[#C505EB]/60 hover:shadow-md dark:border-[#C505EB]/30 dark:bg-gray-900/85 dark:hover:border-[#08D3E2]/40";

const labelClass =
  "block text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b7280] dark:text-gray-400";
const valueClass =
  "mt-0.5 block truncate text-sm font-semibold text-[#111827] group-hover:text-[#C505EB] dark:text-gray-100 dark:group-hover:text-[#D946EF]";

type TeamSectionProps = {
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Show gradient heading (e.g. on contact page) */
  showHeading?: boolean;
};

export default function TeamSection({ className = "", showHeading = false }: TeamSectionProps) {
  const { t, language } = useLanguage();
  const [teamFromApi, setTeamFromApi] = useState<TeamMemberRow[] | null>(null);

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
    <div className={className}>
      {showHeading ? (
        <h2 className="mb-8 bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] bg-clip-text text-2xl font-bold text-transparent min-[900px]:text-3xl">
          {t("contact.teamHeading")}
        </h2>
      ) : null}
      <div className="flex w-full max-[770px]:flex-col max-[770px]:items-stretch max-[770px]:gap-8 max-[770px]:px-1 items-start justify-center gap-10 max-[1100px]:gap-8 min-[1100px]:gap-12">
        {teamRows.map((member, index) => (
          <div
            key={member.id}
            className="flex w-full min-[770px]:max-w-[280px] min-[770px]:flex-1 min-[770px]:basis-0 flex-col items-center text-center"
          >
            <img
              src={member.photo_url || TEAM_FALLBACK_IMAGES[index % TEAM_FALLBACK_IMAGES.length]}
              alt={member.role}
              className="h-[148px] w-[148px] rounded-full border-4 border-[#C505EB]/40 object-cover shadow-lg shadow-[#C505EB]/10 max-[770px]:h-[132px] max-[770px]:w-[132px] dark:border-[#C505EB]/35 dark:shadow-[#C505EB]/5"
            />
            <span className="mt-4 text-[20px] font-bold leading-tight text-black max-[770px]:text-[18px] dark:text-white">
              {member.role}
            </span>
            <span className="mt-1.5 text-[15px] font-semibold leading-snug text-[#374151] dark:text-gray-100">
              {member.name}
            </span>

            <div className="mt-4 flex w-full max-w-[280px] flex-col gap-2.5">
              {member.email ? (
                <a href={`mailto:${member.email}`} className={contactLinkClass}>
                  <span className={labelClass}>{t("contact.email")}</span>
                  <span className={valueClass}>{member.email}</span>
                </a>
              ) : null}
              {member.phone ? (
                <a href={telHref(member.phone)} className={contactLinkClass}>
                  <span className={labelClass}>{t("contact.phone")}</span>
                  <span className={valueClass}>{member.phone}</span>
                </a>
              ) : null}
              {member.website ? (
                <a
                  href={websiteHref(member.website)}
                  target="_blank"
                  rel="noreferrer"
                  className={contactLinkClass}
                >
                  <span className={labelClass}>{t("contact.website")}</span>
                  <span className={valueClass}>{websiteLabel(member.website)}</span>
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
