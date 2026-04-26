import markPng from "../../assets/flatfly-f-mark.png";

type Props = {
  /** "mark" = только знак. "tile" = градиентный квадрат с F по центру. */
  variant?: "mark" | "tile";
  className?: string;
  title?: string;
  "aria-hidden"?: boolean;
  /** Белая F на тёмном фоне (шапка/футер с #333) — в любом system theme. */
  lightOnDark?: boolean;
};

/**
 * Официальный знак FlatFly: буква F из макета (без wordmark).
 * По умолчанию: на светлом фоне — чёрный силуэт, в тёмной теме — белая F.
 * `lightOnDark` — всегда белая F (тёмные хедер/футер).
 */
export function FlatFlyFMark({
  variant = "mark",
  className = "",
  title = "FlatFly",
  "aria-hidden": ariaHidden = true,
  lightOnDark = false,
}: Props) {
  const markFilter = lightOnDark
    ? "h-full w-full object-contain"
    : "h-full w-full object-contain [filter:brightness(0)] dark:filter-none";

  const imgClass = variant === "mark" ? markFilter : "h-[min(70%,7rem)] w-[min(70%,7rem)] object-contain";

  if (variant === "tile") {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-[#C505EB] to-[#08D3E2] ${className}`}
        role="img"
        aria-label={title}
        aria-hidden={ariaHidden}
      >
        <img src={markPng} alt="" className={imgClass} />
      </div>
    );
  }

  return (
    <img
      src={markPng}
      alt={ariaHidden ? "" : title}
      className={`${imgClass} ${className}`.trim()}
      aria-hidden={ariaHidden}
    />
  );
}
