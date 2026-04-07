import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

export default function PublishQueuedPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-6 py-16 interFont">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md p-8 md:p-10 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C505EB]/10 flex items-center justify-center text-[#C505EB] text-xl">
            ✓
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
            {t("add.publishQueuedTitle")}
          </h1>
        </div>

        <p className="text-base md:text-lg text-[#555555] dark:text-gray-300 leading-relaxed">
          {t("add.publishQueuedDescription")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-12 px-6 rounded-xl border border-[#DDDDDD] dark:border-gray-600 text-black dark:text-white hover:bg-[#F7F7F7] dark:hover:bg-gray-700 duration-300 font-semibold"
          >
            {t("add.backHome")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile?tab=myListings")}
            className="h-12 px-6 rounded-xl bg-[#C505EB] text-white hover:bg-[#BA00F8] duration-300 font-semibold"
          >
            {t("add.toProfile")}
          </button>
        </div>
      </div>
    </div>
  );
}
