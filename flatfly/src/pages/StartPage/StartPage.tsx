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

	const [email, setEmail] = useState("");
	const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [subscribeMessage, setSubscribeMessage] = useState("");

	const handleSubscribe = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) return;
		setSubscribeStatus("loading");
		setSubscribeMessage("");
		try {
			const response = await fetch("/api/newsletter/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: trimmed }),
			});
			const data = await response.json().catch(() => ({}));
			if (response.ok) {
				setSubscribeStatus("success");
				setSubscribeMessage("Děkujeme! Budete mezi prvními.");
				setEmail("");
			} else {
				setSubscribeStatus("error");
				setSubscribeMessage((data as { message?: string }).message ?? "Něco se pokazilo. Zkuste to znovu.");
			}
		} catch {
			setSubscribeStatus("error");
			setSubscribeMessage("Něco se pokazilo. Zkuste to znovu.");
		}
	};

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
		<div
			className="relative w-full min-h-screen overflow-hidden text-white flex flex-col items-center justify-center px-4 py-10"
			style={{
				background: "linear-gradient(135deg, #2d1b4e 0%, #1a0d2e 50%, #0f0a1a 100%)",
			}}
		>
			{/* Декоративная полупрозрачная F на фоне — full height справа */}
			<img
				src={logo}
				alt=""
				aria-hidden="true"
				className="absolute right-0 top-0 h-full w-auto min-w-0 max-w-[45vw] sm:min-w-[280px] sm:max-w-[55vw] md:min-w-[400px] md:max-w-[60vw] object-contain object-right select-none pointer-events-none opacity-[0.12]"
			/>
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(138,42,196,0.15),transparent)] pointer-events-none" />

			<div className="relative z-10 w-full max-w-[720px] flex flex-col items-center gap-12">
				{/* Логотип: иконка + FLATFLY */}
				<div className="flex items-center justify-center gap-4 max-[700px]:gap-3">
					<div
						className="rounded-2xl flex-shrink-0  transition-shadow "
					>
						<img
							src={logo}
							alt=""
							className="w-28 h-28 max-[700px]:w-12 max-[700px]:h-12 object-contain"
						/>
					</div>
					<span className="text-[72px] max-[700px]:text-[32px] font-bold tracking-tight uppercase text-white drop-shadow-sm">
						FLATFLY
					</span>
				</div>

				{/* Слоган */}
				<p className="text-[34px] max-[700px]:text-[26px] leading-tight font-bold text-center text-white tracking-tight">
					Děláme spolubydlení jednodušší.
				</p>

				{/* Призыв и форма подписки */}
				<p className="text-[18px] font-extrabold max-[700px]:text-[16px] leading-relaxed text-center text-white/90 max-w-md -mt-2">
					Bud&apos; mezi prvními, kdo si najde spolubydlení! Odebírej náš newsletter a buď v obraze.
				</p>

				<form
					onSubmit={handleSubscribe}
					className="w-full max-w-[480px] flex flex-col sm:flex-row gap-3 sm:gap-0"
					style={{ position: "relative" }}
				>
					<div
						className="absolute inset-0 rounded-2xl sm:rounded-full"
						style={{
							padding: "2px",
							background: "linear-gradient(135deg, #8A2AC4, #6C63D9, #32C8EE)",
							WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
							WebkitMaskComposite: "xor",
							maskComposite: "exclude",
							pointerEvents: "none",
						}}
					/>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="example123@gmail.com"
						disabled={subscribeStatus === "loading"}
						className="flex-1 w-full px-5 py-4 sm:py-4 sm:pl-6 sm:pr-4 rounded-2xl sm:rounded-l-full sm:rounded-r-none bg-[rgba(26,13,46,0.85)] text-white placeholder-white/45 outline-none text-[16px] focus:ring-2 focus:ring-white/20 transition-shadow border-0"
						aria-label="E-mail pro newsletter"
						required
					/>
					<button
						type="submit"
						disabled={subscribeStatus === "loading"}
						className="shrink-0 px-8 py-4 rounded-2xl sm:rounded-l-none sm:rounded-r-full font-semibold text-[15px] uppercase tracking-wide text-white disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] min-h-[52px]"
						style={{
							background: "linear-gradient(135deg, #8A2AC4 0%, #6C63D9 50%, #5b7cdf 100%)",
							boxShadow: "0 4px 20px rgba(138,42,196,0.4)",
						}}
					>
						{subscribeStatus === "loading" ? "Odesílám…" : "Odebírat"}
					</button>
				</form>

				{subscribeMessage && (
					<p
						className={`text-sm font-medium min-h-[20px] ${
							subscribeStatus === "success" ? "text-emerald-300" : "text-red-300"
						}`}
					>
						{subscribeMessage}
					</p>
				)}

				{/* Таймер в овале с градиентной обводкой */}
				<div
					className="w-full rounded-[64px] max-[700px]:rounded-[48px]"
					style={{ position: "relative" }}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							padding: "2px",
							borderRadius: "64px",
							background: "linear-gradient(to right, #8A2AC4, #6C63D9, #32C8EE)",
							WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
							WebkitMaskComposite: "xor",
							maskComposite: "exclude",
							pointerEvents: "none",
						}}
					/>
					<div className="px-8 py-8 grid grid-cols-4 gap-4 max-[700px]:grid-cols-2 max-[700px]:gap-y-6 max-[700px]:py-6 rounded-[64px] bg-[rgba(26,13,46,0.5)]">
						<div className="flex flex-col items-center gap-2 min-w-0">
							<span className="text-[18px] max-[700px]:text-[14px] font-semibold text-white uppercase tracking-wide">
								Dní
							</span>
							<span className="text-[56px] max-[700px]:text-[42px] leading-none font-bold text-[#b366ff]">
								{timeLeft.days}
							</span>
						</div>
						<div className="flex flex-col items-center gap-2 min-w-0">
							<span className="text-[18px] max-[700px]:text-[14px] font-semibold text-white uppercase tracking-wide">
								Hodiny
							</span>
							<span className="text-[56px] max-[700px]:text-[42px] leading-none font-bold text-[#b366ff]">
								{timeLeft.hours}
							</span>
						</div>
						<div className="flex flex-col items-center gap-2 min-w-0">
							<span className="text-[18px] max-[700px]:text-[14px] font-semibold text-white uppercase tracking-wide">
								Minut
							</span>
							<span className="text-[56px] max-[700px]:text-[42px] leading-none font-bold text-[#b366ff]">
								{timeLeft.minutes}
							</span>
						</div>
						<div className="flex flex-col items-center gap-2 min-w-0">
							<span className="text-[18px] max-[700px]:text-[14px] font-semibold text-white uppercase tracking-wide">
								Sekund
							</span>
							<span className="text-[56px] max-[700px]:text-[42px] leading-none font-bold text-[#b366ff]">
								{timeLeft.seconds}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
