import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

type FaqItem = {
  id: number;
  faq_id: number;
  language: "en" | "ru" | "cz";
  question: string;
  answer: string;
  keys: string[];
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text: string) => normalizeText(text).split(" ").filter((part) => part.length > 1);

export default function FaqChatWidget() {
  const { language, t } = useLanguage();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: t("faq.chat.welcome"),
      },
    ]);
  }, [language, t]);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch(`/api/faqs/?language=${language}`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to load FAQ");
        }
        const data = await res.json();
        setFaqs(data.faqs || []);
      } catch (error) {
        console.error("Error loading FAQ chat data:", error);
        setFaqs([]);
      }
    };

    fetchFaqs();
  }, [language]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatMessages, isThinking, isChatOpen]);

  const faqIndex = useMemo(() => {
    return faqs.map((faq) => ({
      faq,
      keysNormalized: faq.keys.map((key) => normalizeText(String(key))),
      questionNormalized: normalizeText(faq.question),
      answerNormalized: normalizeText(faq.answer),
    }));
  }, [faqs]);

  const findBestFaq = (userQuestion: string): FaqItem | null => {
    const userTokens = tokenize(userQuestion);
    if (userTokens.length === 0) {
      return null;
    }

    let bestMatch: FaqItem | null = null;
    let bestScore = 0;

    for (const item of faqIndex) {
      let score = 0;

      for (const token of userTokens) {
        if (item.keysNormalized.some((key) => key.includes(token) || token.includes(key))) {
          score += 3;
        }
        if (item.questionNormalized.includes(token)) {
          score += 2;
        }
        if (item.answerNormalized.includes(token)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item.faq;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  };

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text || isThinking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsThinking(true);

    window.setTimeout(() => {
      const bestFaq = findBestFaq(text);
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: bestFaq
          ? `${bestFaq.question}\n\n${bestFaq.answer}`
          : t("faq.chat.noMatch"),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 1000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsChatOpen((prev) => !prev)}
        className={`fixed right-6 bottom-6 w-15 h-15 rounded-full bg-[#C505EB] hover:bg-[#AA04CC] text-white flex items-center justify-center shadow-lg z-[120] transition-transform duration-300 ${
          isChatOpen ? "scale-100" : "animate-pulse"
        }`}
        aria-label={t("faq.chat.open")}
      >
        {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isChatOpen && (
        <div className={`fixed right-6 bottom-24 w-[360px] max-[420px]:w-[calc(100vw-24px)] max-[420px]:right-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}>
          <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900`}>
            <span className={`font-bold text-[#333333] dark:text-white`}>{t("faq.chat.title")}</span>
          </div>

          <div ref={messagesRef} className={`h-[320px] overflow-y-auto p-3 flex flex-col gap-2`}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] px-3 py-2 rounded-xl text-[14px] leading-5 whitespace-pre-wrap ${
                  message.role === "user"
                    ? "self-end bg-[#C505EB] text-white"
                    : "self-start bg-gray-100 dark:bg-gray-700 text-[#333333] dark:text-gray-100"
                }`}
              >
                {message.text}
              </div>
            ))}

            {isThinking && (
              <div className={`self-start bg-gray-100 dark:bg-gray-700 text-[#333333] dark:text-gray-100 px-3 py-2 rounded-xl text-[14px] leading-5 flex items-center gap-1`}>
                <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:120ms]" />
                <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:240ms]" />
              </div>
            )}
          </div>

          <div className={`p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2`}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t("faq.chat.placeholder")}
              className={`flex-1 h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white outline-0 focus:border-[#C505EB]`}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isThinking}
              className={`w-10 h-10 rounded-xl bg-[#C505EB] hover:bg-[#AA04CC] text-white flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label={t("faq.chat.send")}
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
