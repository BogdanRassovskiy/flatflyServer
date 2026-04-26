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

/** “About” section: F on brand gradient (white glyph via `invert` on the dark raster). */
export function FlatFlyFLogoHero({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#C505EB] to-[#08D3E2] p-5 shadow-[0_20px_60px_-20px_rgba(197,5,235,0.45)] min-[770px]:p-8 ${className}`}
    >
      <img
        src={fLogo}
        alt=""
        aria-hidden
        className="h-[min(200px,55vw)] w-auto min-[770px]:h-[min(360px,36vw)] invert"
      />
    </div>
  );
}
