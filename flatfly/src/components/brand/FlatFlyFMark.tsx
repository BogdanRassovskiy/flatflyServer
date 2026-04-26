import { useId } from "react";

const F_PATH = "M9 7.5h3.2v17H9V7.5zm3.2 0H24v3.1H12.2V7.5zm0 6.6h8.3v3.1H12.2v-3.1z";

type Props = {
  /** F only, uses currentColor (header / inline use). */
  variant?: "mark" | "tile";
  className?: string;
  title?: string;
  "aria-hidden"?: boolean;
};

/**
 * FlatFly mark: only the letter F (no wordmark). Use `variant="tile"` for
 * gradient square with white F (home hero, favicon-style).
 */
export function FlatFlyFMark({
  variant = "mark",
  className = "",
  title = "FlatFly",
  "aria-hidden": ariaHidden = true,
}: Props) {
  const gradId = useId().replace(/:/g, "");

  if (variant === "tile") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className={className}
        role="img"
        aria-hidden={ariaHidden}
        aria-label={ariaHidden ? undefined : title}
      >
        <title>{title}</title>
        <defs>
          <linearGradient
            id={gradId}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#C505EB" />
            <stop offset="1" stopColor="#08D3E2" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill={`url(#${gradId})`} />
        <path fill="#fff" d={F_PATH} />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      fill="currentColor"
      role="img"
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      <title>{title}</title>
      <path d={F_PATH} />
    </svg>
  );
}

export { F_PATH };
