import {Icon} from "@iconify/react";
import {useLanguage} from "../../contexts/LanguageContext";
import map from "../../assets/map.png";
import { useState } from "react";

export default function ContactPage() {
    const [emailError, setEmailError] = useState<string | null>(null);
    const { t } = useLanguage();
    const [form, setForm] = useState({
      name: "",
      email: "",
      message: "",
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const handleSubmit = async () => {

        const isValidEmail = (email: string) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };
        if (!isValidEmail(form.email)) {
            setEmailError(t("contact.emailInvalid"));
            return;
          }
      if (!form.name || !form.email || !form.message) {
        setStatus("Заполните все поля");
        return;
      }

      setLoading(true);
      setStatus(null);

      try {
        const res = await fetch("/api/contact/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus(data.detail || "Ошибка отправки");
          return;
        }
        
        setStatus("Сообщение успешно отправлено");
        setForm({ name: "", email: "", message: "" });

      } catch (e) {
        setStatus("Ошибка сервера");
      } finally {
        setLoading(false);
      }
    };
    return(
        <div className={`w-full min-h-screen flex flex-col items-center interFont text-black dark:text-white bg-white dark:bg-gray-900`}>

            <div className={`w-full max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 max-[770px]:px-2 flex flex-col items-center`}>

                {/*Contact Form*/}
                <div className={`w-full max-w-[500px] h-auto flex flex-col items-center gap-5 mt-[150px] `}>

                    <span className={`max-[770px]:text-[24px] min-[770px]:text-[32px] text-[#333333] dark:text-gray-200 font-bold`}>{t("contact.title")}</span>

                    <div className={`w-full flex flex-col items-start gap-1`}>
                        <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>{t("contact.name")}</span>
                        <input value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`} placeholder={t("contact.namePlaceholder")}/>
                    </div>

                    <div className={`w-full flex flex-col items-start gap-1`}>
                        <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>{t("contact.email")}</span>
                        <input type="email"
                        value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className={`w-full h-[50px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px]`} placeholder={t("contact.emailPlaceholder")}/>
                    </div>
                    {emailError && (
                      <span className="text-red-500 text-sm">
                        {emailError}
                      </span>
                    )}

                    <div className={`w-full flex flex-col items-start gap-1`}>
                        <span className={`max-[770px]:text-lg min-[770px]:text-xl font-bold text-black dark:text-white`}>{t("contact.message")}</span>
                        <textarea value={form.message}
                                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                                  className={`w-full h-[220px] border border-[#E0E0E0] dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-[#999999] dark:focus:border-[#C505EB] duration-300 outline-0 rounded-xl px-4 py-1 text-[14px] resize-none`} placeholder={t("contact.messagePlaceholder")}/>
                    </div>

                    <div
                      onClick={handleSubmit}
                      className={`w-full h-11 flex items-center justify-center rounded-full text-white text-xl font-semibold 
                      ${loading ? "bg-gray-400" : "bg-[#C505EB] cursor-pointer"}`}
                    >
                      <span>{loading ? "Sending..." : t("contact.send")}</span>
                    </div>
                    {status && (
                      <span className="text-sm text-center text-[#C505EB] mt-2">
                        {status}
                      </span>
                    )}

                </div>

                <div className={`w-full flex max-[770px]:flex-col-reverse max-[770px]:items-center min-[770px]:items-start max-[770px]:justify-between max-[770px]:mt-[20px] mt-[76px] mb-[90px]`}>

                    <div className={` max-[770px]:w-full min-[770px]:w-1/2 flex flex-col items-start flex-shrink-0 gap-10`}>

                        <span className={`bg-clip-text text-transparent bg-gradient-to-r from-[#BA00F8] to-[#08D3E2] text-[40px] font-bold`}>{t("contact.contacts")}</span>

                        <div className={`flex flex-col items-start gap-6 `}>

                            <div className={`flex items-center gap-9`}>

                                <Icon icon="mage:phone" width="30" height="30"  style={{color: `#08E2BE`}} />

                                <span className={`font-semibold max-[770px]:text-xl min-[770px]:text-[26px] text-[#C505EB]`}>+420 736 103 242</span>

                            </div>

                            <div className={`flex items-center gap-9`}>

                                <Icon icon="lets-icons:message-light" width="30" height="30"  style={{color: `#08E2BE`}} />

                                <span className={`font-semibold max-[770px]:text-xl min-[770px]:text-[26px] text-[#C505EB]`}>info@flatfly.cz</span>

                            </div>

                            <div className={`flex items-center gap-9`}>

                                <Icon icon="weui:location-outlined" width="30" height="30"  style={{color: `#08E2BE`}} />

                                <span className={`font-semibold max-[770px]:text-xl min-[770px]:text-[26px] text-[#C505EB]`}>Teplická 679/72, Duchcov 41901</span>

                            </div>

                            <div className={`flex items-center gap-9`}>

                                <Icon icon="system-uicons:postcard" width="30" height="30"  style={{color: `#08E2BE`}} />

                                <span className={`font-semibold max-[770px]:text-xl min-[770px]:text-[26px] text-[#C505EB]`}>Teplická 679/72, Duchcov 41901</span>

                            </div>

                        </div>

                    </div>

                    <div className={`max-[770px]:w-full min-[770px]:w-1/2 h-[360px] flex items-center justify-center `}>
                        <img src={map} className={`w-auto h-[358px] object-contain`} alt={`mapp`}/>
                    </div>

                </div>

            </div>

        </div>
    );

}