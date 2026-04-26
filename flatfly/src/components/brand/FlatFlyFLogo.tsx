import fLogo from "../../assets/flatfly-f-logo.svg";

const headerImgClass =
  "object-contain [filter:brightness(0)] dark:invert transition-[filter] duration-300";

/** F mark from `faviconF.PNG` as `flatfly-f-logo.svg` (PNG embedded in SVG for crisp edges at any size). */
export function FlatFlyFLogoHeader() {
  return (
    <>
      <img
        src={fLogo}
        alt=""
        aria-hidden
        className={`hidden min-[771px]:block h-[60px] w-[60px] ${headerImgClass}`}
      />
      <img
        src={fLogo}
        alt=""
        aria-hidden
        className={`block min-[771px]:hidden h-[50px] w-[50px] translate-x-1 ${headerImgClass}`}
      />
    </>
  );
}

/** “About” section: large F, same look as the header (no background card). */
export function FlatFlyFLogoHero({ className = "" }: { className?: string }) {
  return (
    <img
      src={fLogo}
      alt=""
      aria-hidden
      className={`object-contain max-[770px]:h-[200px] max-[770px]:w-[200px] min-[770px]:h-[394px] min-[770px]:w-[394px] ${headerImgClass} ${className}`}
    />
  );
}
