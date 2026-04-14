import { CheckCircle2, Crown, Sparkles, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "../contexts/LanguageContext";

type PlanCardProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    accentClass: string;
};

function PlanCard({ icon, title, subtitle, accentClass }: PlanCardProps) {
    return (
        <div className={`rounded-2xl border p-6 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm ${accentClass}`}>
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 dark:bg-gray-800">
                    {icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <CheckCircle2 size={16} />
                <span>Details will be added soon</span>
            </div>
        </div>
    );
}

export default function ProfilePlansPage() {
    const { t } = useLanguage();

    return (
        <div className="mx-auto w-full min-h-[100vh] max-w-[1200px] px-5 pt-28 pb-10 max-[770px]:pt-[112px] max-[770px]:pb-8">
            <div className="mb-8">
                <h1 className="text-3xl max-[770px]:text-2xl font-extrabold text-gray-900 dark:text-white">
                    {t("profilePlans.title")}
                </h1>
                <p className="mt-2 text-base max-[770px]:text-sm text-gray-600 dark:text-gray-300">
                    {t("profilePlans.subtitle")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlanCard
                    icon={<UserRound className="text-[#5C6AC4]" size={22} />}
                    title={t("profilePlans.basic.title")}
                    subtitle={t("profilePlans.basic.subtitle")}
                    accentClass="border-[#DCE1FF]"
                />
                <PlanCard
                    icon={<Sparkles className="text-[#C505EB]" size={22} />}
                    title={t("profilePlans.advanced.title")}
                    subtitle={t("profilePlans.advanced.subtitle")}
                    accentClass="border-[#F1CCFF]"
                />
                <PlanCard
                    icon={<Crown className="text-[#F59E0B]" size={22} />}
                    title={t("profilePlans.premium.title")}
                    subtitle={t("profilePlans.premium.subtitle")}
                    accentClass="border-[#FFE2A7]"
                />
            </div>
        </div>
    );
}
