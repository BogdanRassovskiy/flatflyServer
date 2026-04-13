import type { ReactNode } from "react";

type PageBackgroundProps = {
	children: ReactNode;
	className?: string;
	withOverlays?: boolean;
};

export default function PageBackground({
	children,
	className,
	withOverlays = true,
}: PageBackgroundProps) {
	return (
		<div
			className={[
				"relative w-full min-h-screen text-slate-950 dark:text-white",
				"bg-[linear-gradient(135deg,#faf7ff_0%,#f2fbff_55%,#ffffff_100%)]",
				"dark:bg-[linear-gradient(135deg,#2d1b4e_0%,#1a0d2e_50%,#0f0a1a_100%)]",
				className ?? "",
			].join(" ")}
		>
			{withOverlays && (
				<>
					<div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(138,42,196,0.10),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(138,42,196,0.15),transparent)]" />
					<div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_90%_40%,rgba(0,0,0,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_90%_40%,rgba(0,0,0,0.28),transparent_55%)]" />
				</>
			)}
			<div className="relative z-10 w-full min-h-screen">{children}</div>
		</div>
	);
}

