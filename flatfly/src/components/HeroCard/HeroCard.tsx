import {useLanguage} from "../../contexts/LanguageContext";
import {Link} from "react-router-dom";



type HeroCardTypes = "HERO" | "BLOG";

interface HeroCardProps {
    title:string;
    subtitle:string;
    image:string;
    type:HeroCardTypes;
    date?:string;
    link?:string;
}

export default function HeroCard({title,subtitle,image,type,date,link}:HeroCardProps) {
    const { t } = useLanguage();

    const ContentHandler = ()=>{
        switch (type) {
            case "HERO":
                return (
                    <div className={`w-full pt-10 px-[25px] max-[1220px]:pt-3 max-[1220px]:px-2 flex flex-col items-center text-center`}>
                        <span className={`font-bold text-[24px] max-[1220px]:text-xl text-black dark:text-white`}>{title}</span>
                        <span className={`font-semibold text-[17px] max-[1220px]:text-sm text-[#666666] dark:text-gray-400`}>{subtitle}</span>
                    </div>
                );
            case "BLOG":
                return (
                    <div className={`w-full pt-1 px-2 flex flex-col items-start text-start  `}>
                        <span className={`font-semibold text-lg max-[1220px]:text-md text-black dark:text-white`}>{title}</span>
                        <span className={`font-semibold text-md max-[1220px]:text-sm text-[#666666] dark:text-gray-400`}>
                            <span className={`line-clamp-3`}>{subtitle}</span>
                            <span className={`text-[#C505EB] dark:text-[#C505EB]`}> {t("blog.readMore")}</span>
                        </span>
                    </div>
                );
            default:
                return null;
        }
    }

    const DateHandler = ()=>{
        if (date){
            return(
                <span className={`absolute bottom-0.5 right-1.5 text-[12px] text-[#666666] dark:text-gray-400`}>{date}</span>
            );
        }
    }

    const CardContent = (
        <div className={`flex flex-col items-center max-[1220px]:w-[254px] max-[1220px]:h-[290px] w-[384px] h-[420px] bg-white dark:bg-gray-800 rounded-xl border ${type==="HERO"? `border-[#C505EB] dark:border-[#C505EB]` :`border-[#828282] dark:border-gray-600`} overflow-hidden relative ${link ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-gray-900/50 duration-300' : ''}`}>
            <div className={`w-full h-[282px] max-[1220px]:h-[182px] flex-shrink-0 flex flex-col items-center overflow-hidden`}>
                <img className={`w-full h-full object-cover`} src={image} alt={`furniture`}/>
            </div>
            <ContentHandler/>
            <DateHandler/>
        </div>
    );

    if (link) {
        return (
            <Link to={link}>
                {CardContent}
            </Link>
        );
    }

    return CardContent;

}