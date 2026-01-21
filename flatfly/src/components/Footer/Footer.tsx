import {Icon} from "@iconify/react";
import {useLanguage} from "../../contexts/LanguageContext";
import {Link} from "react-router-dom";
import qrcode from "../../assets/michalkrechler.png";

export default function Footer() {
    const { t } = useLanguage();

    const NavLinks = [
        {title: t("footer.home"), path:`/`},
        {title: t("footer.about"), path:`/`},
        {title: t("footer.blog"), path:`/blog`},
        {title: t("footer.contact"), path:`/contact`},
    ];

    return(
        <div className={`flex flex-col items-center w-full min-h-[250px] bg-[#333333] dark:bg-gray-900 py-5`}>

            <div className={`flex max-[770px]:flex-col items-start justify-between max-[770px]:gap-5 w-full min-[770px]:h-full min-h-[210px] max-w-[1440px] min-[1440px]:px-[110px] max-[1440px]:px-5 `}>

                <div className={`flex flex-col items-start justify-between max-[770px]:gap-3 min-[770px]:h-full min-[770px]:min-h-[210px]`}>
                    <Link to="/">
                        <span className={`text-[52px] text-white interFont font-bold cursor-pointer hover:text-[#C505EB] duration-300`}>FlatFly</span>
                    </Link>

                    <div className={`flex items-center gap-6`}>
                        <Icon icon="tdesign:logo-instagram" width="40" height="40"  style={{color: `#ffffff`}} />
                        <Icon icon="ic:baseline-facebook" width="40" height="40"  style={{color: `#ffffff`}} />
                        <Icon icon="iconoir:tiktok-solid" width="40" height="40"  style={{color: `#ffffff`}} />
                    </div>

                    <span className={`text-[16px] font-bold interFont text-white max-[770px]:hidden`}>{t("footer.copyright")}</span>
                </div>

                <div className={`flex max-[770px]:flex-col max-[770px]:h-auto items-start gap-[94px] max-[770px]:gap-5 h-[190px]`}>

                    <div className={`flex flex-col min-[770px]:items-end max-[770px]:items-start justify-between h-full`}>
                        {NavLinks.map((value, index)=>
                            <Link key={index} to={value.path} className={`text-[22px] text-white duration-300 font-bold hover:text-[#C505EB] cursor-pointer`}>
                                {value.title} <br/> 
                            </Link>
                        )}
                    </div>

                    <div className={`flex items-center justify-center `}>
                        <img className={`w-[188px] h-[188px] object-contain `} src={qrcode} alt={`Qr Code`}/>
                    </div>

                    <span className={`text-[16px] font-bold interFont text-white min-[770px]:hidden `}>{t("footer.copyright")}</span>

                </div>

            </div>
        </div>
    );

}