import { ArrowLeft, CheckCircle2, Crown, Rocket, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export type ListingPromotionTier = "standard" | "auto_boost" | "premium";

type TierCardProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    detailsHint: string;
    accentClass: string;
    ctaLabel: string;
    onChoose: () => void;
    disabled: boolean;
    highlighted?: boolean;
};

function TierCard({
    icon,
    title,
    subtitle,
    detailsHint,
    accentClass,
    ctaLabel,
    onChoose,
    disabled,
    highlighted,
}: TierCardProps) {
    return (
        <div
            className={`rounded-2xl border p-6 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm flex flex-col ${accentClass} ${
                highlighted ? "ring-2 ring-[#C505EB]/60" : ""
            }`}
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 dark:bg-gray-800">
                    {icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">{subtitle}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <CheckCircle2 size={16} />
                <span>{detailsHint}</span>
            </div>
            <button
                type="button"
                onClick={onChoose}
                disabled={disabled}
                className="mt-5 w-full rounded-full py-3 text-sm font-semibold text-white bg-[#C505EB] hover:bg-[#BA00F8] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {ctaLabel}
            </button>
        </div>
    );
}

type ListingPromotionPanelProps = {
    onBack: () => void;
    onPublish: (tier: ListingPromotionTier) => void;
    isPublishing: boolean;
};

export default function ListingPromotionPanel({ onBack, onPublish, isPublishing }: ListingPromotionPanelProps) {
    const { t } = useLanguage();

    return (
        <div className="w-full max-w-[900px] flex flex-col items-stretch gap-6 py-6">
            <button
                type="button"
                onClick={onBack}
                disabled={isPublishing}
                className="self-start flex items-center gap-2 text-sm font-semibold text-[#C505EB] hover:text-[#BA00F8] disabled:opacity-50"
            >
                <ArrowLeft size={18} />
                {t("add.promotion.backToForm")}
            </button>

            <div>
                <h2 className="text-2xl max-[770px]:text-xl font-extrabold text-black dark:text-white">
                    {t("add.promotion.title")}
                </h2>
                <p className="mt-2 text-sm max-[770px]:text-xs text-gray-600 dark:text-gray-300">
                    {t("add.promotion.subtitle")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TierCard
                    icon={<Rocket className="text-[#5C6AC4]" size={22} />}
                    title={t("add.promotion.standard.title")}
                    subtitle={t("add.promotion.standard.subtitle")}
                    detailsHint={t("add.promotion.detailsSoon")}
                    accentClass="border-[#DCE1FF]"
                    ctaLabel={t("add.promotion.standard.cta")}
                    onChoose={() => onPublish("standard")}
                    disabled={isPublishing}
                    highlighted
                />
                <TierCard
                    icon={<Sparkles className="text-[#C505EB]" size={22} />}
                    title={t("add.promotion.autoBoost.title")}
                    subtitle={t("add.promotion.autoBoost.subtitle")}
                    detailsHint={t("add.promotion.detailsSoon")}
                    accentClass="border-[#F1CCFF]"
                    ctaLabel={t("add.promotion.autoBoost.cta")}
                    onChoose={() => onPublish("auto_boost")}
                    disabled={isPublishing}
                />
                <TierCard
                    icon={<Crown className="text-[#F59E0B]" size={22} />}
                    title={t("add.promotion.premium.title")}
                    subtitle={t("add.promotion.premium.subtitle")}
                    detailsHint={t("add.promotion.detailsSoon")}
                    accentClass="border-[#FFE2A7]"
                    ctaLabel={t("add.promotion.premium.cta")}
                    onChoose={() => onPublish("premium")}
                    disabled={isPublishing}
                />
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">{t("add.promotion.footnote")}</p>
        </div>
    );
}
