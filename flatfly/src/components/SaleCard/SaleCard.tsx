import {Icon} from "@iconify/react";
import {useState} from "react";

import {useLanguage} from "../../contexts/LanguageContext";
import {Link} from "react-router-dom";

export type SaleCardTypes = "APARTMENT" | "ROOM" | "NEIGHBOUR";

interface SaleCardProps {
    id?: string;
    price?: number;
    address?: string;
    size?: number;
    rooms?: string;
    badges: string[];
    image?: string;
    type: SaleCardTypes;

    // для NEIGHBOUR
    name?: string;
    age?: number;
    from?: string;
}

export default function SaleCard({id,price,address,size,badges,image,rooms,type,name,age,from}:SaleCardProps) {
    const { t } = useLanguage();
    const [isLike,setLike] = useState(true);
    const getListingUrl = () => {
        if (!id) return null;
        switch (type) {
            case "APARTMENT":
                return `/apartments/${id}`;
            case "ROOM":
                return `/rooms/${id}`;
            case "NEIGHBOUR":
                return `/neighbours/${id}`;
            default:
                return null;
        }
    };

    const listingUrl = getListingUrl();

    const SaleCardTypeHandler = ()=>{
        switch (type) {
            case "ROOM":
                return(
                    <div className={`w-full h-full flex flex-col items-start py-1.5 px-3 gap-1`}>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="ph:hand-coins-light" style={{color: `#C505EB`}} className={`w-[30px] h-[30px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`} />
                            <span className={`text-[24px] max-[1220px]:text-[16px] text-[#C505EB] font-bold`}>{price} {t("saleCard.perMonth")}</span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="material-symbols-light:bed-outline" className={`w-[26px] h-[26px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[18px] max-[1220px]:text-[12px] font-semibold text-black dark:text-gray-200`}>{t("saleCard.roomRent")} {size} m²</span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="qlementine-icons:location-16" className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[16px] max-[1220px]:text-[10px] font-semibold text-black dark:text-gray-200`}>{address} </span>
                        </div>
                    </div>
                );
            case "NEIGHBOUR":
                return (
                    <div className={`w-full h-full flex flex-col items-start py-1.5 px-8 gap-1`}>
                        <div className={`w-full flex items-center justify-between text-[22px] font-semibold max-[1220px]:text-[18px]`}>
                            <div className={`flex items-center gap-1 text-black dark:text-white`}>
                                <span>{name},</span>
                                <span>{age}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[#333333] dark:text-gray-300`}>
                                <Icon icon="qlementine-icons:location-16" className={`w-[20px] h-[20px] -translate-y-0.5 max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                                <span>{from}</span>
                            </div>
                        </div>
                        <div className={`w-full flex flex-wrap items-center justify-center content-center gap-4 mt-2`}>
                            {badges.map((value, index)=>
                                <div key={index} className={`p-1 max-[1220px]:p-0.5 rounded border border-[#666666] dark:border-gray-500 text-[10px] max-[1220px]:text-[6px] text-[#08E2BE] dark:text-[#08E2BE] font-bold`}>
                                    {value}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case "APARTMENT":
                return(
                    <div className={`w-full h-full flex flex-col items-start py-1.5 px-3 gap-1`}>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="ph:hand-coins-light" style={{color: `#C505EB`}} className={`w-[30px] h-[30px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`} />
                            <span className={`text-[24px] max-[1220px]:text-[16px] text-[#C505EB] font-bold`}>{price} {t("saleCard.perMonth")}</span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="material-symbols-light:bed-outline" className={`w-[26px] h-[26px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[18px] max-[1220px]:text-[12px] font-semibold text-black dark:text-gray-200`}>{t("saleCard.apartmentRent")} {rooms} {` `} {size} m²</span>
                        </div>
                        <div className={`flex items-center justify-start gap-2`}>
                            <Icon icon="qlementine-icons:location-16" className={`w-[24px] h-[24px] max-[1220px]:w-[15px] max-[1220px]:h-[15px]`}  style={{color: `#666666`}} />
                            <span className={`text-[16px] max-[1220px]:text-[10px] font-semibold text-black dark:text-gray-200`}>{address} </span>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const CardContent = (
        <div className={`flex flex-col items-center max-[1220px]:w-[254px] max-[1220px]:h-[290px] w-[384px] h-[420px] bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 border border-[#E5E5E5] dark:border-gray-700 interFont overflow-hidden relative ${listingUrl ? 'cursor-pointer hover:shadow-xl dark:hover:shadow-gray-900/70 hover:scale-[1.02] duration-300' : ''}`}>
            <div className={`w-full h-[282px] max-[1220px]:h-[182px] flex-shrink-0 flex flex-col items-start overflow-hidden relative`}>
                <img className={`w-full h-full object-cover absolute top-0 left-0`} src={image} alt={address}/>
                <div className={`w-full flex flex-col items-start p-3 absolute top-0 left-0`}>
                    <div className={`w-full flex items-start justify-between`}>
                        {(type==="ROOM" || type==="APARTMENT")?
                            <div className={`flex flex-col items-start gap-3 max-[1220px]:gap-1 `}>
                                {badges.map((value, index)=>
                                    <div key={index} className={`p-1 max-[1220px]:p-0.5 rounded bg-[#08E2BE] border border-[#06B396] text-black text-[10px] max-[1220px]:text-[6px] font-bold`}>
                                        {value}
                                    </div>
                                )}
                            </div>
                            : <div></div> }
                        <div 
                            className={`cursor-pointer z-10`} 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLike(!isLike);
                            }}
                        >
                            <Icon icon="line-md:heart" width="24" height="24"  style={{color: isLike? `#C505EB` : `#ffffff`,transitionDuration:`0.3s`}} />
                        </div>
                    </div>
                </div>

            </div>
            <SaleCardTypeHandler/>
        </div>
    );

    if (listingUrl) {
        return (
            <Link to={listingUrl}>
                {CardContent}
            </Link>
        );
    }

    return CardContent;

}