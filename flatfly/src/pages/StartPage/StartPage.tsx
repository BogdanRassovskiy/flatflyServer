import { useEffect, useMemo, useState } from "react";
import logo from "../../assets/logo.png";

const LAUNCH_IN_DAYS = 150;
const LAUNCH_TARGET_STORAGE_KEY = "flatfly_launch_target_ts";

function getTimeLeft(targetTimestamp: number) {
	const totalMs = Math.max(targetTimestamp - Date.now(), 0);
	const totalSeconds = Math.floor(totalMs / 1000);

	const days = Math.floor(totalSeconds / (24 * 60 * 60));
	const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
	const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
	const seconds = totalSeconds % 60;

	return { days, hours, minutes, seconds };
}

function getStableLaunchTimestamp() {
	const fallbackTarget = Date.now() + LAUNCH_IN_DAYS * 24 * 60 * 60 * 1000;

	if (typeof window === "undefined") {
		return fallbackTarget;
	}

	const rawStored = window.localStorage.getItem(LAUNCH_TARGET_STORAGE_KEY);
	if (rawStored) {
		const parsed = Number(rawStored);
		if (!Number.isNaN(parsed) && parsed > Date.now()) {
			return parsed;
		}
	}

	window.localStorage.setItem(LAUNCH_TARGET_STORAGE_KEY, String(fallbackTarget));
	return fallbackTarget;
}

export default function StartPage() {
	const fallbackTargetTimestamp = useMemo(getStableLaunchTimestamp, []);
	const [targetTimestamp, setTargetTimestamp] = useState(fallbackTargetTimestamp);

	const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(fallbackTargetTimestamp));

	useEffect(() => {
		let isMounted = true;

		const fetchLaunchDate = async () => {
			try {
				const response = await fetch("/api/launch-date/");
				if (!response.ok) {
					return;
				}

				const data: { launch_date?: string } = await response.json();
				if (!data.launch_date) {
					return;
				}

				const parsedLaunchDate = Date.parse(data.launch_date);
				if (Number.isNaN(parsedLaunchDate)) {
					return;
				}

				if (isMounted) {
					setTargetTimestamp(parsedLaunchDate);
					window.localStorage.setItem(LAUNCH_TARGET_STORAGE_KEY, String(parsedLaunchDate));
				}
			} catch {
				// keep fallback timestamp
			}
		};

		fetchLaunchDate();

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		const timerId = window.setInterval(() => {
			setTimeLeft(getTimeLeft(targetTimestamp));
		}, 1000);

		return () => window.clearInterval(timerId);
	}, [targetTimestamp]);

	return (
		<div className="relative w-full min-h-screen overflow-hidden bg-[#292a2d] text-white flex items-center justify-center px-4 py-10">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.04),transparent_42%)]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_40%,rgba(0,0,0,0.32),transparent_52%)]" />
			<img
				src={logo}
				alt=""
				aria-hidden="true"
				className="absolute right-[-250px] top-1/2 -translate-y-1/2 w-[833px] max-w-none select-none pointer-events-none opacity-[0.18] grayscale brightness-[0.22] contrast-110"
			/>

			<div className="relative z-10 w-full max-w-[980px] flex flex-col items-center gap-12">
				<div className="w-full flex items-center justify-center gap-8 max-[700px]:flex-col max-[700px]:gap-4">
					<img
						src={logo}
						alt="FlatFly"
						className="w-[178px] h-[178px] max-[700px]:w-[120px] max-[700px]:h-[120px] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
					/>
					<span className="text-[86px] leading-none max-[980px]:text-[72px] max-[700px]:text-[52px] font-extrabold tracking-[-0.02em] bg-gradient-to-r from-[#8A2AC4] via-[#6C63D9] to-[#32C8EE] bg-clip-text text-transparent">
						FLATFLY
					</span>
				</div>

				<p className="text-[48px] leading-tight max-[980px]:text-[40px] max-[700px]:text-[30px] font-extrabold text-center">
					Děláme spolubydlení jednodušší.
				</p>

				


				<div
	className="w-full rounded-[64px] max-[700px]:rounded-[34px]"
	style={{
		position: "relative",
		borderRadius: "64px",
	}}
>
	<div
		style={{
			position: "absolute",
			inset: 0,
			padding: "2px",
			borderRadius: "64px",
			background: "linear-gradient(to right, #8A2AC4, #6C63D9, #32C8EE)",
			WebkitMask:
				"linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
			WebkitMaskComposite: "xor",
			maskComposite: "exclude",
			pointerEvents: "none",
		}}
	/>

	{/* ✅ только один grid контейнер */}
	<div className="px-10 py-12 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2 max-[700px]:grid-cols-2 max-[700px]:gap-y-7">

		<div className="flex flex-col items-center gap-5 max-[700px]:gap-3 min-w-0">
			<span className="text-[50px] leading-none max-[980px]:text-[40px] max-[700px]:text-[30px] font-extrabold">
				Dní
			</span>
			<span className="text-[78px] max-[980px]:text-[64px] max-[700px]:text-[50px] leading-none font-extrabold bg-gradient-to-r from-[#8E00EA] to-[#6A00D4] bg-clip-text text-transparent">
				{timeLeft.days}
			</span>
		</div>

		<div className="flex flex-col items-center gap-5 max-[700px]:gap-3 min-w-0">
			<span className="text-[50px] leading-none max-[980px]:text-[40px] max-[700px]:text-[30px] font-extrabold">
				Hodiny
			</span>
			<span className="text-[78px] max-[980px]:text-[64px] max-[700px]:text-[50px] leading-none font-extrabold bg-gradient-to-r from-[#8E00EA] to-[#6A00D4] bg-clip-text text-transparent">
				{timeLeft.hours}
			</span>
		</div>

		<div className="flex flex-col items-center gap-5 max-[700px]:gap-3 min-w-0">
			<span className="text-[50px] leading-none max-[980px]:text-[40px] max-[700px]:text-[30px] font-extrabold">
				Minut
			</span>
			<span className="text-[78px] max-[980px]:text-[64px] max-[700px]:text-[50px] leading-none font-extrabold bg-gradient-to-r from-[#8E00EA] to-[#6A00D4] bg-clip-text text-transparent">
				{timeLeft.minutes}
			</span>
		</div>

		<div className="flex flex-col items-center gap-5 max-[700px]:gap-3 min-w-0">
			<span className="text-[50px] leading-none max-[980px]:text-[40px] max-[700px]:text-[30px] font-extrabold">
				Sekund
			</span>
			<span className="text-[78px] max-[980px]:text-[64px] max-[700px]:text-[50px] leading-none font-extrabold bg-gradient-to-r from-[#8E00EA] to-[#6A00D4] bg-clip-text text-transparent">
				{timeLeft.seconds}
			</span>
		</div>

	</div>
</div>
			</div>
		</div>
	);
}
