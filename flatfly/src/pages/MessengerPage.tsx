import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Icon } from "@iconify/react";
import { getCsrfToken } from "../utils/csrf";
import { getImageUrl } from "../utils/defaultImage";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bed,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageCircle,
  MoreVertical,
  Reply,
  Send,
  Square,
  Heart,
  HeartCrack,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const DELETE_CHAT_CONFIRMATION_KEY = "flatfly.skipDeleteChatConfirmation";
const MESSAGE_CACHE_KEY = "flatfly.messageCache.v1";
const MESSAGES_PAGE_SIZE = 10;
const FLATFLY_SUPPORT_EMAIL = "support@flatfly.local";
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_id?: number | null;
  avatar?: string | null;
}

interface ListingPreview {
  id: number;
  type?: string;
  title?: string;
  price?: string;
  currency?: string;
  city?: string;
  region?: string;
  address?: string;
  image?: string | null;
  images?: string[];
  rooms?: string | number | null;
  size?: string | number | null;
  amenities?: string[];
  path?: string;
}

interface ListingRatingVoter {
  user_id: number;
  is_like: boolean;
  avatar?: string | null;
  display_name?: string;
}

interface ListingRatingsPayload {
  my_vote: boolean | null;
  voters: ListingRatingVoter[];
  like_count: number;
  dislike_count: number;
}

interface MessageReplyPreview {
  id: number;
  message_kind: string;
  sender_name: string;
  text_snippet: string;
  listing_thumb?: string | null;
}

interface Message {
  id: number;
  chat: number;
  sender: User;
  text: string;
  created_at: string;
  is_read: boolean;
  message_kind?: string;
  listing_id?: number | null;
  listing_preview?: ListingPreview | Record<string, unknown>;
  display_text?: string;
  listing_ratings?: ListingRatingsPayload | null;
  reply_preview?: MessageReplyPreview | null;
}

function buildReplyPreviewFromMessage(
  message: Message,
  getParticipantName: (participant: User | null) => string,
): MessageReplyPreview {
  const sender_name = getParticipantName(message.sender);
  if (message.message_kind === "listing") {
    const lp = message.listing_preview as ListingPreview | undefined;
    const title = (lp?.title || message.display_text || "").trim();
    let listing_thumb: string | null = null;
    if (lp?.image) {
      listing_thumb = String(lp.image);
    } else if (Array.isArray(lp?.images) && lp.images.length > 0) {
      listing_thumb = String(lp.images[0]);
    }
    return {
      id: message.id,
      message_kind: "listing",
      sender_name,
      text_snippet: title || (message.display_text ?? ""),
      listing_thumb,
    };
  }
  return {
    id: message.id,
    message_kind: "text",
    sender_name,
    text_snippet: (message.text || "").slice(0, 280),
    listing_thumb: null,
  };
}

function MessageReplyQuote({
  preview,
  variant,
  onJump,
  t,
}: {
  preview: MessageReplyPreview;
  variant: "incoming" | "outgoing" | "listing";
  onJump: () => void;
  t: (key: string) => string;
}) {
  const thumbSrc = preview.listing_thumb ? getImageUrl(String(preview.listing_thumb)) : null;
  const barCls =
    variant === "outgoing"
      ? "border-white/30 bg-white/15 hover:bg-white/22"
      : variant === "listing"
        ? "border-gray-200 bg-gray-100 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700/80 dark:hover:bg-gray-600"
        : "border-gray-300 bg-gray-100 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700/80 dark:hover:bg-gray-600";
  const nameCls =
    variant === "outgoing" ? "text-white/85" : "text-gray-600 dark:text-gray-300";
  const snippetCls = variant === "outgoing" ? "text-white/95" : "text-gray-800 dark:text-gray-100";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onJump();
      }}
      className={`mb-2 flex w-full max-w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${barCls}`}
      title={t("messenger.replyJumpToOriginal")}
    >
      {thumbSrc ? (
        <img src={thumbSrc} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-semibold ${nameCls}`}>{preview.sender_name}</div>
        <div className={`line-clamp-2 text-xs ${snippetCls}`}>{preview.text_snippet}</div>
      </div>
    </button>
  );
}

interface Chat {
  chatid: number;
  chat_type?: string;
  invite_token?: string | null;
  participant_count?: number;
  participants: User[];
  created_at: string;
  last_message: Message | null;
  unread_count: number;
  last_activity_at: string;
  is_blocked?: boolean;
  blocked_by_me?: boolean;
}

interface DraftConversation {
  userId: number;
  participant: User | null;
}

interface CurrentUserContacts {
  email: string;
  phone: string;
}

type ReportReason = "insult" | "threat" | "spam" | "fraud" | "inappropriate_content" | "other";
type ToastKind = "success" | "error";

interface MessagePageResponse {
  results: Message[];
  has_more: boolean;
  next_offset: number | null;
  total_count: number | null;
  can_send_message: boolean;
  awaiting_reply: boolean;
}

interface ChatSendPermission {
  canSend: boolean;
  awaitingReply: boolean;
}

interface ChatMessagesCacheEntry {
  messages: Message[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number | null;
  lastMessageId: number | null;
}

type MessageCache = Record<number, ChatMessagesCacheEntry>;

function getChatSortTimestamp(chat: Chat): number {
  const raw = chat.last_message?.created_at ?? chat.last_activity_at ?? chat.created_at;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortChatsByActivity(input: Chat[]): Chat[] {
  return [...input].sort((a, b) => getChatSortTimestamp(b) - getChatSortTimestamp(a));
}

function shouldSkipDeleteConfirmation(): boolean {
  try {
    return window.localStorage.getItem(DELETE_CHAT_CONFIRMATION_KEY) === "true";
  } catch {
    return false;
  }
}

function setSkipDeleteConfirmation(value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(DELETE_CHAT_CONFIRMATION_KEY, "true");
      return;
    }

    window.localStorage.removeItem(DELETE_CHAT_CONFIRMATION_KEY);
  } catch {
  }
}

function readMessageCache(): MessageCache {
  try {
    const raw = window.localStorage.getItem(MESSAGE_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<ChatMessagesCacheEntry>>;
    const normalized: MessageCache = {};

    Object.entries(parsed).forEach(([chatId, entry]) => {
      const numericChatId = Number(chatId);
      if (!Number.isFinite(numericChatId) || numericChatId <= 0) {
        return;
      }

      const messages = Array.isArray(entry?.messages) ? (entry?.messages as Message[]) : [];
      normalized[numericChatId] = {
        messages,
        hasMore: Boolean(entry?.hasMore),
        nextOffset: typeof entry?.nextOffset === "number" ? entry.nextOffset : messages.length,
        totalCount: typeof entry?.totalCount === "number" ? entry.totalCount : null,
        lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : null,
      };
    });

    return normalized;
  } catch {
    return {};
  }
}

function writeMessageCache(cache: MessageCache): void {
  try {
    window.localStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
  }
}

function normalizeMessagesResponse(payload: unknown): MessagePageResponse {
  if (Array.isArray(payload)) {
    return {
      results: payload as Message[],
      has_more: false,
      next_offset: null,
      total_count: Array.isArray(payload) ? payload.length : null,
      can_send_message: true,
      awaiting_reply: false,
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      results: [],
      has_more: false,
      next_offset: null,
      total_count: 0,
      can_send_message: true,
      awaiting_reply: false,
    };
  }

  const response = payload as Partial<MessagePageResponse>;
  return {
    results: Array.isArray(response.results) ? response.results : [],
    has_more: Boolean(response.has_more),
    next_offset: typeof response.next_offset === "number" ? response.next_offset : null,
    total_count: typeof response.total_count === "number" ? response.total_count : null,
    can_send_message: typeof response.can_send_message === "boolean" ? response.can_send_message : true,
    awaiting_reply: typeof response.awaiting_reply === "boolean" ? response.awaiting_reply : false,
  };
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<number, Message>();

  existing.forEach((message) => {
    byId.set(message.id, message);
  });

  incoming.forEach((message) => {
    byId.set(message.id, message);
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftTime = Date.parse(left.created_at);
    const rightTime = Date.parse(right.created_at);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id - right.id;
  });
}

function buildCacheEntry(
  messages: Message[],
  previous: ChatMessagesCacheEntry | undefined,
  overrides?: Partial<ChatMessagesCacheEntry>,
): ChatMessagesCacheEntry {
  return {
    messages,
    hasMore: overrides?.hasMore ?? previous?.hasMore ?? false,
    nextOffset: overrides?.nextOffset ?? previous?.nextOffset ?? messages.length,
    totalCount: overrides?.totalCount ?? previous?.totalCount ?? messages.length,
    lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : null,
  };
}

function messengerUrlWithChat(searchParams: URLSearchParams, chatId: number | null): string {
  const next = new URLSearchParams(searchParams);
  if (chatId === null || !Number.isFinite(chatId) || chatId <= 0) {
    next.delete("chat");
    next.delete("user");
    next.delete("profile");
  } else {
    next.set("chat", String(chatId));
    next.delete("user");
    next.delete("profile");
  }
  const qs = next.toString();
  return qs ? `/messenger?${qs}` : "/messenger";
}

function canonicalChatListingAmenityKey(raw: string): string {
  let k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    washingmachine: "washing_machine",
    airconditioning: "air_conditioning",
  };
  return aliases[k] || k;
}

const CHAT_LISTING_AMENITY_ORDER = ["dishwasher", "balcony", "parking", "furnished"] as const;
type ChatListingAmenityKey = (typeof CHAT_LISTING_AMENITY_ORDER)[number];
const CHAT_LISTING_AMENITY_ICONS: Record<ChatListingAmenityKey, string> = {
  dishwasher: "mdi:dishwasher",
  balcony: "mdi:balcony",
  parking: "mdi:car",
  furnished: "mdi:sofa-outline",
};

type MessengerChatListingCardProps = {
  message: Message;
  preview: ListingPreview;
  currentUserId: number | null;
  t: (key: string) => string;
  getParticipantName: (participant: User | null) => string;
  onOpenListing: (path: string) => void;
  onVote?: (messageId: number, isLike: boolean) => void;
  voteBusy?: boolean;
  onReply?: () => void;
  onJumpToReplyTarget?: (messageId: number) => void;
  highlighted?: boolean;
};

function MessengerChatListingCard({
  message,
  preview,
  currentUserId,
  t,
  getParticipantName,
  onOpenListing,
  onVote,
  voteBusy,
  onReply,
  onJumpToReplyTarget,
  highlighted,
}: MessengerChatListingCardProps) {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setImgIndex(0);
  }, [message.id]);

  const galleryUrls = useMemo(() => {
    if (Array.isArray(preview.images) && preview.images.length > 0) {
      return preview.images.map((u) => getImageUrl(String(u)));
    }
    if (preview.image) {
      return [getImageUrl(preview.image)];
    }
    return [];
  }, [preview.images, preview.image]);

  const listingPath = preview.path ? preview.path : null;
  const listingTitle = preview.title || message.display_text || "";
  const priceLine = preview.price
    ? `${preview.price}${preview.currency ? ` ${preview.currency}` : ""}`
    : "";
  const locLine = [preview.city, preview.region].filter(Boolean).join(", ");
  const addressLine = typeof preview.address === "string" ? preview.address.trim() : "";
  const amenities = Array.isArray(preview.amenities) ? preview.amenities : [];
  const amenitySet = new Set(amenities.map((a) => canonicalChatListingAmenityKey(String(a))));
  const amenityIcons = CHAT_LISTING_AMENITY_ORDER.filter((k) => amenitySet.has(k));
  const roomsStr = preview.rooms != null && String(preview.rooms).trim() !== "" ? String(preview.rooms) : "";
  const sizeStr = preview.size != null && String(preview.size).trim() !== "" ? String(preview.size) : "";
  const showArrows = galleryUrls.length > 1;
  const currentSrc = galleryUrls[imgIndex] ?? null;

  const amenityLabel = (key: ChatListingAmenityKey): string => {
    switch (key) {
      case "dishwasher":
        return t("filter.amenityDishwasher");
      case "balcony":
        return t("filter.amenityBalcony");
      case "parking":
        return t("filter.amenityParking");
      case "furnished":
        return t("filter.amenityFurnished");
      default:
        return key;
    }
  };

  const goPrev = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (galleryUrls.length < 2) return;
    setImgIndex((i) => (i - 1 + galleryUrls.length) % galleryUrls.length);
  };

  const goNext = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (galleryUrls.length < 2) return;
    setImgIndex((i) => (i + 1) % galleryUrls.length);
  };

  return (
    <div
      id={`chat-message-${message.id}`}
      className={`mb-4 flex ${message.sender.id === currentUserId ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-[770px]:max-w-[min(100%,29rem)] max-w-[92%] md:max-w-[70%] ${
          highlighted
            ? "rounded-2xl ring-[3px] ring-[#08D3E2] ring-offset-2 ring-offset-white transition-shadow duration-300 dark:ring-offset-gray-900"
            : ""
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {getParticipantName(message.sender)}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {onReply ? (
              <button
                type="button"
                className="rounded-md p-1 text-gray-500 transition hover:bg-gray-200 hover:text-[#C505EB] dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-[#e9d5ff]"
                aria-label={t("messenger.reply")}
                onClick={(e) => {
                  e.stopPropagation();
                  onReply();
                }}
              >
                <Reply size={16} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <span className="text-[10px] text-gray-400">
              {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        {message.reply_preview && onJumpToReplyTarget ? (
          <MessageReplyQuote
            preview={message.reply_preview}
            variant="listing"
            t={t}
            onJump={() => onJumpToReplyTarget(message.reply_preview!.id)}
          />
        ) : null}
        <button
          type="button"
          className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-md transition hover:border-[#C505EB] dark:border-gray-600 dark:bg-gray-800 dark:hover:border-[#C505EB]"
          onClick={() => {
            if (listingPath) {
              onOpenListing(listingPath);
            }
          }}
          aria-label={listingTitle}
        >
          <div className="flex flex-col sm:flex-row sm:items-start">
            <div className="relative h-[140px] w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-900 sm:h-[140px] sm:w-[168px] sm:flex-shrink-0">
              {currentSrc ? (
                <img
                  src={currentSrc}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <Users className="opacity-40" size={40} />
                </div>
              )}
              {showArrows ? (
                <>
                  <button
                    type="button"
                    className="absolute left-1 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/45 p-1 text-white backdrop-blur-sm transition hover:bg-black/60"
                    aria-label={t("listing.previousImage")}
                    onClick={goPrev}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/45 p-1 text-white backdrop-blur-sm transition hover:bg-black/60"
                    aria-label={t("listing.nextImage")}
                    onClick={goNext}
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="pointer-events-none absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                    {galleryUrls.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${i === imgIndex ? "bg-white" : "bg-white/40"}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex min-h-[140px] min-w-0 flex-1 flex-col justify-center gap-1.5 p-3 sm:p-4">
              <div className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{listingTitle}</div>
              {priceLine ? (
                <div className="text-sm font-semibold text-[#C505EB]">{priceLine}</div>
              ) : null}
              {(roomsStr || sizeStr) ? (
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                  {roomsStr ? (
                    <span className="inline-flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      {roomsStr}
                    </span>
                  ) : null}
                  {sizeStr ? (
                    <span className="inline-flex items-center gap-1">
                      <Square className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      {sizeStr}
                      <span className="text-[10px] opacity-80">m²</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {amenityIcons.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-600/80">
                  {amenityIcons.map((key) => (
                    <span
                      key={key}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      title={amenityLabel(key)}
                    >
                      <Icon icon={CHAT_LISTING_AMENITY_ICONS[key]} className="h-4 w-4" aria-hidden />
                    </span>
                  ))}
                </div>
              ) : null}
              {addressLine ? (
                <div className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{addressLine}</div>
              ) : null}
              {!addressLine && locLine ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">{locLine}</div>
              ) : null}
            </div>
          </div>
        </button>
        {onVote ? (
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <div
              className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
              aria-label={t("messenger.housingGroup.listingVotesRowLabel")}
            >
              {(message.listing_ratings?.voters ?? []).map((voter) => {
                const borderClass = voter.is_like
                  ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
                  : "ring-2 ring-red-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900";
                const src = voter.avatar ? getImageUrl(String(voter.avatar)) : null;
                const initial = (voter.display_name ?? "").trim().charAt(0).toUpperCase() || "?";
                return (
                  <div
                    key={voter.user_id}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-200 ${borderClass}`}
                    title={voter.display_name || undefined}
                  >
                    {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
                  </div>
                );
              })}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={voteBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(message.id, true);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition disabled:opacity-50 ${
                  message.listing_ratings?.my_vote === true
                    ? "border-rose-400 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25 dark:border-rose-400 dark:from-rose-600 dark:to-pink-700"
                    : "border-gray-200 bg-white text-gray-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-rose-500/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                }`}
                aria-pressed={message.listing_ratings?.my_vote === true}
                aria-label={t("messenger.housingGroup.listingLike")}
              >
                <Heart
                  size={20}
                  className={message.listing_ratings?.my_vote === true ? "fill-current" : ""}
                  strokeWidth={message.listing_ratings?.my_vote === true ? 0 : 2}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                disabled={voteBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(message.id, false);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition disabled:opacity-50 ${
                  message.listing_ratings?.my_vote === false
                    ? "border-red-400 bg-red-500/15 text-red-600 shadow-md shadow-red-500/20 dark:border-red-500 dark:bg-red-950/50 dark:text-red-400"
                    : "border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-red-500/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                }`}
                aria-pressed={message.listing_ratings?.my_vote === false}
                aria-label={t("messenger.housingGroup.listingDislike")}
              >
                <HeartCrack size={20} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-1 flex items-center gap-1 px-1">
          {message.sender.id === currentUserId && (
            <span className="text-[10px] text-gray-400">
              {message.is_read ? t("messenger.read") : t("messenger.sent")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessengerPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [draftConversation, setDraftConversation] = useState<DraftConversation | null>(null);
  const [currentUserContacts, setCurrentUserContacts] = useState<CurrentUserContacts>({ email: "", phone: "" });
  const [messageCache, setMessageCache] = useState<MessageCache>(() => readMessageCache());
  const [input, setInput] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [chatSendPermissions, setChatSendPermissions] = useState<Record<number, ChatSendPermission>>({});
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [actionMenuChatId, setActionMenuChatId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deleteConfirmationChatId, setDeleteConfirmationChatId] = useState<number | null>(null);
  const [rememberDeleteChoice, setRememberDeleteChoice] = useState(false);
  const [housingDestructiveConfirm, setHousingDestructiveConfirm] = useState<
    null | { mode: "leave" | "delete"; chatId: number }
  >(null);
  const [isHousingConfirmBusy, setIsHousingConfirmBusy] = useState(false);
  const [blacklist, setBlacklist] = useState<User[]>([]);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("insult");
  const [reportDetails, setReportDetails] = useState("");
  const [reportAndBlockUser, setReportAndBlockUser] = useState(true);
  const [isReportConsentOpen, setIsReportConsentOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const [housingMessageFilter, setHousingMessageFilter] = useState<"all" | "listings">("all");
  const [isHousingParticipantsOpen, setIsHousingParticipantsOpen] = useState(false);
  const [isHousingInviteOpen, setIsHousingInviteOpen] = useState(false);
  const [isHousingPitchOpen, setIsHousingPitchOpen] = useState(false);
  const [isHousingCompactInviteOpen, setIsHousingCompactInviteOpen] = useState(false);
  const [housingListingVoteFilter, setHousingListingVoteFilter] = useState<number | "unanimous" | null>(null);
  const [isHousingCreateBusy, setIsHousingCreateBusy] = useState(false);
  const [listingVoteBusyId, setListingVoteBusyId] = useState<number | null>(null);
  const [pendingJoinToken, setPendingJoinToken] = useState<string | null>(null);
  const [joinConflictChatId, setJoinConflictChatId] = useState<number | null>(null);
  const [isJoinBusy, setIsJoinBusy] = useState(false);
  const [replyDraft, setReplyDraft] = useState<MessageReplyPreview | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoOpenAttemptedRef = useRef(false);
  const dismissedHousingCompactInviteChatIdRef = useRef<number | null>(null);
  const housingFetchFilterByChatRef = useRef<Record<number, { likedBy?: number; unanimous?: boolean } | null>>({});
  const longPressTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const initialScrollCompletedForChatRef = useRef<number | null>(null);
  const messageCacheRef = useRef<MessageCache>(messageCache);
  const pendingScrollAdjustmentRef = useRef<
    | { mode: "none" }
    | { mode: "bottom"; behavior: ScrollBehavior }
    | { mode: "preserve"; previousHeight: number; previousTop: number }
  >({ mode: "none" });
  const [searchParams] = useSearchParams();

  const selectedChatId = selectedChat?.chatid ?? null;
  const activeChatCache = selectedChatId ? messageCache[selectedChatId] ?? null : null;
  const selectedChatPermission = selectedChatId ? chatSendPermissions[selectedChatId] ?? null : null;
  const activeMessages = activeChatCache?.messages ?? [];
  const visibleMessages = useMemo(() => {
    const housing = selectedChat?.chat_type === "housing_group";
    if (!housing || housingMessageFilter === "all") {
      return activeMessages;
    }
    return activeMessages.filter((m) => m.message_kind === "listing");
  }, [activeMessages, housingMessageFilter, selectedChat?.chat_type]);
  const isInitialMessagesLoading = Boolean(selectedChatId) && isMessagesLoading && activeMessages.length === 0;
  const isDraftConversationActive = Boolean(draftConversation);
  const isAwaitingReply = Boolean(selectedChatPermission?.awaitingReply);
  const canSendInCurrentChat = selectedChat ? (selectedChatPermission?.canSend ?? true) : true;

  const replaceMessengerUrlChat = useCallback(
    (chatId: number | null) => {
      navigate(messengerUrlWithChat(new URLSearchParams(searchParams), chatId), { replace: true });
    },
    [navigate, searchParams],
  );

  const openExternalFromChat = useCallback(
    (path: string) => {
      if (selectedChatId) {
        navigate(messengerUrlWithChat(new URLSearchParams(searchParams), selectedChatId), { replace: true });
        window.setTimeout(() => {
          navigate(path);
        }, 0);
        return;
      }
      navigate(path);
    },
    [navigate, searchParams, selectedChatId],
  );

  const getOtherParticipant = (chat: Chat) => {
    if (currentUserId === null) return chat.participants[0] ?? null;
    return chat.participants.find((user) => user.id !== currentUserId) ?? chat.participants[0] ?? null;
  };

  const getParticipantName = (participant: User | null): string => {
    if (!participant) return t("messenger.unknownParticipant");
    const displayName = (participant.display_name || "").trim();
    if (displayName) return displayName;
    const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim();
    if (fullName) return fullName;
    if (participant.first_name) return participant.first_name;
    if (participant.last_name) return participant.last_name;
    return t("messenger.unknownParticipant");
  };

  const getOtherParticipantDisplay = (chat: Chat): string => {
    if (chat.chat_type === "housing_group") {
      return t("messenger.housingGroup.chatTitle");
    }
    const participant = getOtherParticipant(chat);
    return getParticipantName(participant);
  };

  const getParticipantAvatar = (participant: User | null): string | null => {
    return participant?.avatar ? participant.avatar : null;
  };

  const getActiveParticipant = (): User | null => {
    if (selectedChat) {
      return getOtherParticipant(selectedChat);
    }

    return draftConversation?.participant ?? null;
  };

  const activeParticipant = getActiveParticipant();
  const isHousingGroupChat = selectedChat?.chat_type === "housing_group";
  const housingParticipantCount = selectedChat?.participant_count ?? selectedChat?.participants?.length ?? 0;
  const activeParticipantName = isHousingGroupChat
    ? t("messenger.housingGroup.chatTitle")
    : getParticipantName(activeParticipant);
  const activeParticipantAvatar = isHousingGroupChat ? null : getParticipantAvatar(activeParticipant);
  const isFlatFlySupportParticipant = activeParticipant?.email === FLATFLY_SUPPORT_EMAIL;
  const canOpenParticipantProfile =
    !isHousingGroupChat && (isFlatFlySupportParticipant || typeof activeParticipant?.profile_id === "number");
  const canShareContacts = Boolean(currentUserContacts.email || currentUserContacts.phone);
  const selectedChatIsBlocked = Boolean(selectedChat?.is_blocked);
  const selectedChatBlockedByMe = Boolean(selectedChat?.blocked_by_me);
  const isMobileChatOpen = Boolean(selectedChat || draftConversation);
  const canInteractWithDirectParticipant = !isFlatFlySupportParticipant && !isHousingGroupChat;
  const canInteractWithParticipant = canInteractWithDirectParticipant;
  const isSendLocked =
    (!isHousingGroupChat && !canInteractWithDirectParticipant)
    || Boolean(selectedChat?.is_blocked)
    || (!isHousingGroupChat && isAwaitingReply)
    || (Boolean(selectedChat) && !canSendInCurrentChat);

  const housingGroupChat = useMemo(
    () => chats.find((c) => c.chat_type === "housing_group") ?? null,
    [chats],
  );

  const buildHousingListFilter = useCallback(
    (chatId: number): { likedBy?: number; unanimous?: boolean } | undefined => {
      if (chatId !== selectedChatId || !isHousingGroupChat || housingMessageFilter !== "listings") {
        return undefined;
      }
      if (housingListingVoteFilter === "unanimous") {
        return { unanimous: true };
      }
      if (typeof housingListingVoteFilter === "number") {
        return { likedBy: housingListingVoteFilter };
      }
      return undefined;
    },
    [selectedChatId, isHousingGroupChat, housingMessageFilter, housingListingVoteFilter],
  );

  const updateMessageCacheEntry = (
    chatId: number,
    updater: (previous: ChatMessagesCacheEntry | undefined) => ChatMessagesCacheEntry,
  ) => {
    setMessageCache((previous) => ({
      ...previous,
      [chatId]: updater(previous[chatId]),
    }));
  };

  const removeMessageCacheEntry = (chatId: number) => {
    setMessageCache((previous) => {
      if (!(chatId in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[chatId];
      return next;
    });
  };

  const queueScrollToBottom = (behavior: ScrollBehavior = "auto") => {
    pendingScrollAdjustmentRef.current = { mode: "bottom", behavior };
  };

  const syncChatPreview = (chatId: number, latestMessage: Message, unreadCount = 0) => {
    setChats((previous) => {
      const nextChats = previous.map((chat) => {
        if (chat.chatid !== chatId) {
          return chat;
        }

        return {
          ...chat,
          unread_count: unreadCount,
          last_activity_at: latestMessage.created_at,
          last_message: latestMessage,
        };
      });

      return sortChatsByActivity(nextChats);
    });

    setSelectedChat((previous) => {
      if (!previous || previous.chatid !== chatId) {
        return previous;
      }

      return {
        ...previous,
        unread_count: unreadCount,
        last_activity_at: latestMessage.created_at,
        last_message: latestMessage,
      };
    });
  };

  const fetchMessagesPage = async (
    chatId: number,
    options: {
      offset?: number;
      afterId?: number;
      mode: "initial" | "older" | "poll";
      housingListFilter?: { likedBy?: number; unanimous?: boolean };
    },
  ) => {
    const query = new URLSearchParams();
    if (typeof options.afterId === "number" && options.afterId > 0) {
      query.set("after_id", String(options.afterId));
    } else {
      query.set("limit", String(MESSAGES_PAGE_SIZE));
      query.set("offset", String(options.offset ?? 0));
    }

    const hf = options.housingListFilter ?? buildHousingListFilter(chatId);
    if (hf?.unanimous) {
      query.set("housing_filter_unanimous", "1");
    } else if (typeof hf?.likedBy === "number") {
      query.set("housing_filter_liked_by", String(hf.likedBy));
    }
    housingFetchFilterByChatRef.current[chatId] = hf ?? null;

    if (options.mode === "initial") {
      setIsMessagesLoading(true);
    }

    if (options.mode === "older") {
      setIsLoadingOlderMessages(true);
    }

    try {
      const response = await fetch(`/api/chats/${chatId}/messages/?${query.toString()}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const payload = normalizeMessagesResponse(await response.json());
      const incomingMessages = payload.results;

      setChatSendPermissions((previous) => ({
        ...previous,
        [chatId]: {
          canSend: payload.can_send_message,
          awaitingReply: payload.awaiting_reply,
        },
      }));

      if (options.mode === "poll") {
        if (incomingMessages.length === 0) {
          return;
        }

        const shouldScroll = selectedChatId === chatId && shouldStickToBottomRef.current;
        updateMessageCacheEntry(chatId, (previous) => {
          const merged = mergeMessages(previous?.messages ?? [], incomingMessages);
          const addedCount = merged.length - (previous?.messages.length ?? 0);
          return buildCacheEntry(merged, previous, {
            hasMore: previous?.hasMore ?? false,
            nextOffset: previous ? previous.nextOffset + addedCount : merged.length,
            totalCount: typeof previous?.totalCount === "number" ? previous.totalCount + addedCount : previous?.totalCount ?? null,
          });
        });

        const latestMessage = incomingMessages[incomingMessages.length - 1];
        syncChatPreview(chatId, latestMessage, 0);

        if (shouldScroll) {
          queueScrollToBottom("auto");
        }

        return;
      }

      if (options.mode === "older") {
        updateMessageCacheEntry(chatId, (previous) => {
          const merged = mergeMessages(incomingMessages, previous?.messages ?? []);
          return buildCacheEntry(merged, previous, {
            hasMore: payload.has_more,
            nextOffset: payload.next_offset ?? merged.length,
            totalCount: payload.total_count,
          });
        });
        return;
      }

      updateMessageCacheEntry(chatId, (previous) => buildCacheEntry(incomingMessages, previous, {
        hasMore: payload.has_more,
        nextOffset: payload.next_offset ?? incomingMessages.length,
        totalCount: payload.total_count,
      }));
      queueScrollToBottom("auto");
    } finally {
      if (options.mode === "initial") {
        setIsMessagesLoading(false);
      }

      if (options.mode === "older") {
        setIsLoadingOlderMessages(false);
      }
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedChatId || isLoadingOlderMessages || isMessagesLoading) {
      return;
    }

    const cacheEntry = messageCacheRef.current[selectedChatId];
    if (!cacheEntry?.hasMore) {
      return;
    }

    const container = messagesContainerRef.current;
    if (container) {
      pendingScrollAdjustmentRef.current = {
        mode: "preserve",
        previousHeight: container.scrollHeight,
        previousTop: container.scrollTop,
      };
    }

    await fetchMessagesPage(selectedChatId, {
      mode: "older",
      offset: cacheEntry.nextOffset,
      housingListFilter: housingFetchFilterByChatRef.current[selectedChatId] ?? buildHousingListFilter(selectedChatId),
    });
  };

  const pollLatestMessages = async (chatId: number) => {
    const cacheEntry = messageCacheRef.current[chatId];
    const lastMessageId = cacheEntry?.lastMessageId;
    if (!lastMessageId) {
      return;
    }

    await fetchMessagesPage(chatId, {
      mode: "poll",
      afterId: lastMessageId,
      housingListFilter: housingFetchFilterByChatRef.current[chatId] ?? undefined,
    });
  };

  const openDraftConversation = (userId: number, participant: User | null = null) => {
    setSelectedChat(null);
    setDraftConversation({ userId, participant });
  };

  const nonHousingChats = useMemo(
    () => chats.filter((chat) => chat.chat_type !== "housing_group"),
    [chats],
  );

  const filteredChats = useMemo(() => {
    const normalizedQuery = chatSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return nonHousingChats;
    }

    return nonHousingChats.filter((chat) => {
      const participant = getOtherParticipant(chat);
      if (!participant) return false;
      const display = (participant.display_name || "").toLowerCase();
      const first = (participant.first_name || "").toLowerCase();
      const last = (participant.last_name || "").toLowerCase();
      const full = `${first} ${last}`.trim();
      return display.includes(normalizedQuery) || first.includes(normalizedQuery) || last.includes(normalizedQuery) || full.includes(normalizedQuery);
    });
  }, [chatSearch, nonHousingChats, currentUserId, t]);

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleChatPressStart = (chatId: number) => {
    clearLongPressTimeout();
    longPressTimeoutRef.current = window.setTimeout(() => {
      setActionMenuChatId(chatId);
    }, 500);
  };

  const handleChatPressEnd = () => {
    clearLongPressTimeout();
  };

  const showToast = (message: string, kind: ToastKind) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, kind });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2600);
  };

  const jumpToQuotedMessage = useCallback(
    (messageId: number) => {
      const el = document.getElementById(`chat-message-${messageId}`);
      if (!el) {
        showToast(t("messenger.replyJumpNotFound"), "error");
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      window.setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2200);
    },
    [showToast, t],
  );

  const startReplyTo = useCallback(
    (message: Message) => {
      setReplyDraft(buildReplyPreviewFromMessage(message, getParticipantName));
    },
    [getParticipantName],
  );

  const clearJoinGroupQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("join_group");
    const qs = next.toString();
    navigate(qs ? `/messenger?${qs}` : "/messenger", { replace: true });
  }, [navigate, searchParams]);

  const toggleHousingListingsFilter = useCallback(() => {
    setHousingMessageFilter((prev) => {
      const next = prev === "all" ? "listings" : "all";
      if (next === "all") {
        setHousingListingVoteFilter(null);
      }
      return next;
    });
  }, []);

  const closeHousingCompactInvite = () => {
    if (selectedChatId) {
      dismissedHousingCompactInviteChatIdRef.current = selectedChatId;
    }
    setIsHousingCompactInviteOpen(false);
  };

  const createHousingGroup = async () => {
    if (isHousingCreateBusy) {
      return;
    }
    setIsHousingCreateBusy(true);
    try {
      const response = await fetch("/api/chats/create-housing-group/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as { code?: string; chat?: Chat };
      if (response.status === 409 && data.chat) {
        dismissedHousingCompactInviteChatIdRef.current = null;
        setChats((previous) => {
          const rest = previous.filter((chat) => chat.chatid !== data.chat!.chatid);
          return sortChatsByActivity([data.chat!, ...rest]);
        });
        setSelectedChat(data.chat);
        setDraftConversation(null);
        replaceMessengerUrlChat(data.chat.chatid);
        setIsHousingPitchOpen(false);
        const solo = (data.chat.participant_count ?? data.chat.participants?.length ?? 0) <= 1;
        setIsHousingCompactInviteOpen(solo);
        showToast(t("messenger.housingGroup.alreadyHaveGroupOpened"), "success");
        return;
      }
      if (!response.ok) {
        showToast(t("messenger.housingGroup.createGroupError"), "error");
        return;
      }
      const chat = data as Chat;
      dismissedHousingCompactInviteChatIdRef.current = null;
      setChats((previous) => {
        const rest = previous.filter((c) => c.chatid !== chat.chatid);
        return sortChatsByActivity([chat, ...rest]);
      });
      setSelectedChat(chat);
      setDraftConversation(null);
      replaceMessengerUrlChat(chat.chatid);
      setIsHousingPitchOpen(false);
      setIsHousingCompactInviteOpen(true);
      showToast(t("messenger.housingGroup.groupCreated"), "success");
    } catch {
      showToast(t("messenger.housingGroup.createGroupError"), "error");
    } finally {
      setIsHousingCreateBusy(false);
    }
  };

  const submitListingReaction = async (messageId: number, isLike: boolean) => {
    if (!selectedChatId || listingVoteBusyId !== null) {
      return;
    }
    setListingVoteBusyId(messageId);
    try {
      const response = await fetch(`/api/messages/${messageId}/listing-reaction/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({ is_like: isLike }),
      });
      if (!response.ok) {
        showToast(t("messenger.housingGroup.listingVoteError"), "error");
        return;
      }
      const updated = (await response.json()) as Message;
      updateMessageCacheEntry(selectedChatId, (previous) => {
        const list = previous?.messages ?? [];
        const idx = list.findIndex((m) => m.id === messageId);
        if (idx < 0) {
          return previous ?? buildCacheEntry(list, undefined, {});
        }
        const prevMsg = list[idx];
        const next = [...list];
        next[idx] = {
          ...prevMsg,
          ...updated,
          listing_preview: prevMsg.listing_preview,
          listing_ratings: updated.listing_ratings ?? prevMsg.listing_ratings,
        };
        return buildCacheEntry(next, previous, {});
      });
    } catch {
      showToast(t("messenger.housingGroup.listingVoteError"), "error");
    } finally {
      setListingVoteBusyId(null);
    }
  };

  const leaveHousingGroup = async (chatId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chats/${chatId}/leave-housing-group/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        showToast(t("messenger.housingGroup.leaveFailed"), "error");
        return false;
      }
      setChats((previous) => previous.filter((chat) => chat.chatid !== chatId));
      removeMessageCacheEntry(chatId);
      if (selectedChat?.chatid === chatId) {
        replaceMessengerUrlChat(null);
        setSelectedChat(null);
      }
      showToast(t("messenger.housingGroup.leftGroupSuccess"), "success");
      return true;
    } catch {
      showToast(t("messenger.housingGroup.leaveFailed"), "error");
      return false;
    }
  };

  const runJoinHousingGroup = async (token: string, opts?: { confirmLeavePrevious?: boolean }) => {
    const body: Record<string, unknown> = { invite_token: token };
    if (opts?.confirmLeavePrevious) {
      body.confirm_leave_previous = true;
    }
    const response = await fetch("/api/chats/join-housing-group/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      code?: string;
      chatid?: number;
      detail?: string;
    };
    return { response, data };
  };

  const submitJoinHousingGroup = async (confirmLeavePrevious = false) => {
    if (!pendingJoinToken || isJoinBusy) {
      return;
    }
    const leavingChatId = confirmLeavePrevious ? joinConflictChatId : null;
    setIsJoinBusy(true);
    if (!confirmLeavePrevious) {
      setJoinConflictChatId(null);
    }
    try {
      const { response, data } = await runJoinHousingGroup(pendingJoinToken, { confirmLeavePrevious });
      if (response.status === 409 && data.code === "already_in_group" && !confirmLeavePrevious) {
        setJoinConflictChatId(typeof data.chatid === "number" ? data.chatid : null);
        return;
      }
      if (!response.ok) {
        if (data.code === "group_full") {
          showToast(t("messenger.housingGroup.groupFull"), "error");
        } else {
          showToast(t("messenger.housingGroup.joinError"), "error");
        }
        return;
      }
      setJoinConflictChatId(null);
      if (leavingChatId !== null) {
        removeMessageCacheEntry(leavingChatId);
      }
      const chat = data as unknown as Chat;
      setChats((previous) => {
        const withoutNew = previous.filter((c) => c.chatid !== chat.chatid);
        const pruned =
          leavingChatId !== null ? withoutNew.filter((c) => c.chatid !== leavingChatId) : withoutNew;
        return sortChatsByActivity([chat, ...pruned]);
      });
      setSelectedChat(chat);
      setDraftConversation(null);
      replaceMessengerUrlChat(chat.chatid);
      setPendingJoinToken(null);
      clearJoinGroupQuery();
      showToast(t("messenger.housingGroup.joinedSuccess"), "success");
    } catch {
      showToast(t("messenger.housingGroup.joinError"), "error");
    } finally {
      setIsJoinBusy(false);
    }
  };

  const executeDeleteChat = async (chatId: number): Promise<boolean> => {
    const isDeletingSelectedChat = selectedChat?.chatid === chatId;
    try {
      const response = await fetch(`/api/chats/${chatId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCsrfToken(),
        },
      });

      if (!response.ok && response.status !== 204) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string };
        if (payload.code === "housing_group_delete_requires_solo") {
          showToast(t("messenger.housingGroup.deleteRequiresSolo"), "error");
        } else {
          showToast(t("messenger.deleteError"), "error");
        }
        return false;
      }

      setChats((previous) => previous.filter((chat) => chat.chatid !== chatId));
      removeMessageCacheEntry(chatId);
      if (isDeletingSelectedChat) {
        replaceMessengerUrlChat(null);
        setSelectedChat(null);
      }
      return true;
    } catch {
      showToast(t("messenger.deleteError"), "error");
      return false;
    } finally {
      setActionMenuChatId(null);
      setDeleteConfirmationChatId(null);
      setRememberDeleteChoice(false);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    if (shouldSkipDeleteConfirmation()) {
      await executeDeleteChat(chatId);
      return;
    }

    setRememberDeleteChoice(false);
    setDeleteConfirmationChatId(chatId);
    setActionMenuChatId(null);
  };

  const handleDeleteConfirmationCancel = () => {
    setDeleteConfirmationChatId(null);
    setRememberDeleteChoice(false);
  };

  const handleDeleteConfirmationApprove = async () => {
    if (deleteConfirmationChatId === null) {
      return;
    }

    setSkipDeleteConfirmation(rememberDeleteChoice);
    await executeDeleteChat(deleteConfirmationChatId);
  };

  const openHousingLeaveConfirm = (chatId: number) => {
    setHousingDestructiveConfirm({ mode: "leave", chatId });
    setActionMenuChatId(null);
    setIsMobileActionsOpen(false);
  };

  const openHousingDeleteConfirm = (chatId: number) => {
    setHousingDestructiveConfirm({ mode: "delete", chatId });
    setActionMenuChatId(null);
    setIsMobileActionsOpen(false);
  };

  const closeHousingDestructiveConfirm = () => {
    if (isHousingConfirmBusy) {
      return;
    }
    setHousingDestructiveConfirm(null);
  };

  const confirmHousingDestructive = async () => {
    if (!housingDestructiveConfirm) {
      return;
    }
    const { mode, chatId } = housingDestructiveConfirm;
    setIsHousingConfirmBusy(true);
    try {
      if (mode === "leave") {
        const ok = await leaveHousingGroup(chatId);
        if (ok) {
          setHousingDestructiveConfirm(null);
        }
      } else {
        const ok = await executeDeleteChat(chatId);
        if (ok) {
          setHousingDestructiveConfirm(null);
        }
      }
    } finally {
      setIsHousingConfirmBusy(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    shouldStickToBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 48;

    if (container.scrollTop <= 80) {
      void loadOlderMessages();
    }
  };

  useEffect(() => {
    messageCacheRef.current = messageCache;
    writeMessageCache(messageCache);
  }, [messageCache]);

  useEffect(() => {
    fetch("/api/me/", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.id === "number") {
          setCurrentUserId(data.id);
        }
        if (data && typeof data.email === "string") {
          setCurrentUserContacts((previous) => ({ ...previous, email: data.email }));
        }
      })
      .catch(() => {});

    fetch("/api/profile/", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.phone === "string") {
          setCurrentUserContacts((previous) => ({ ...previous, phone: data.phone }));
        }
      })
      .catch(() => {});
    void loadBlacklist().catch(() => {});
  }, []);

  useEffect(() => {
    const loadChats = () => {
      fetch("/api/chats/", { credentials: "include" })
        .then((response) => (response.ok ? response.json() : []))
        .then((data) => {
          const loadedChats = sortChatsByActivity(Array.isArray(data) ? data : []);
          setChats(loadedChats);
          setChatsLoaded(true);
          setSelectedChat((previous) => {
            if (!previous) {
              return previous;
            }

            return loadedChats.find((chat) => chat.chatid === previous.chatid) ?? previous;
          });
        })
        .catch(() => {
          setChatsLoaded(true);
        });
    };

    loadChats();
    const intervalId = window.setInterval(loadChats, 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    autoOpenAttemptedRef.current = false;
  }, [searchParams]);

  useEffect(() => {
    return () => {
      clearLongPressTimeout();
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleWindowClick = () => {
      setActionMenuChatId(null);
    };

    window.addEventListener("click", handleWindowClick);
    return () => {
      window.removeEventListener("click", handleWindowClick);
    };
  }, []);

  useEffect(() => {
    if (!isFlatFlySupportParticipant) return;
    setIsReportingOpen(false);
    setIsMobileActionsOpen(false);
  }, [isFlatFlySupportParticipant]);

  useEffect(() => {
    if (autoOpenAttemptedRef.current) return;

    const chatParam = searchParams.get("chat");
    const userParam = searchParams.get("user");
    const profileParam = searchParams.get("profile");
    if (!chatParam && !userParam && !profileParam) {
      autoOpenAttemptedRef.current = true;
      return;
    }

    const openOrCreateChat = async () => {
      const targetChatId = Number(chatParam || "");
      if (Number.isFinite(targetChatId) && targetChatId > 0) {
        if (!chatsLoaded) {
          return;
        }

        const foundById = chats.find((chat) => chat.chatid === targetChatId);
        if (foundById) {
          setDraftConversation(null);
          setSelectedChat(foundById);
          navigate(messengerUrlWithChat(new URLSearchParams(searchParams), foundById.chatid), { replace: true });
          autoOpenAttemptedRef.current = true;
          return;
        }
      }

      let targetUserId = Number(userParam || "");
      let draftParticipant: User | null = null;

      if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
        const profileId = Number(profileParam || "");
        if (Number.isFinite(profileId) && profileId > 0) {
          const profileResponse = await fetch(`/api/neighbours/${profileId}/`, { credentials: "include" });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (typeof profileData?.userId === "number") {
              targetUserId = profileData.userId;
            }
            if (typeof profileData?.name === "string" || profileData?.avatar || typeof profileData?.id === "number") {
              draftParticipant = {
                id: typeof profileData?.userId === "number" ? profileData.userId : targetUserId,
                email: "",
                first_name: "",
                last_name: "",
                display_name: typeof profileData?.name === "string" ? profileData.name : "",
                profile_id: typeof profileData?.id === "number" ? profileData.id : null,
                avatar: typeof profileData?.avatar === "string" ? profileData.avatar : null,
              };
            }
          }
        }
      }

      if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
        autoOpenAttemptedRef.current = true;
        return;
      }

      const foundChat = chats.find((chat) => chat.participants.some((user) => user.id === targetUserId));
      if (foundChat) {
        setDraftConversation(null);
        setSelectedChat(foundChat);
        navigate(messengerUrlWithChat(new URLSearchParams(searchParams), foundChat.chatid), { replace: true });
        autoOpenAttemptedRef.current = true;
        return;
      }

      if (!chatsLoaded) {
        return;
      }

      openDraftConversation(targetUserId, draftParticipant);
      autoOpenAttemptedRef.current = true;
    };

    openOrCreateChat().catch(() => {
      autoOpenAttemptedRef.current = true;
    });
  }, [chats, chatsLoaded, navigate, searchParams]);

  useEffect(() => {
    if (!selectedChatId) {
      shouldStickToBottomRef.current = true;
      initialScrollCompletedForChatRef.current = null;
      return;
    }

    const coarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (!coarsePointer) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    shouldStickToBottomRef.current = true;
    initialScrollCompletedForChatRef.current = null;

    const isHousingSelected = selectedChat?.chat_type === "housing_group" && selectedChat.chatid === selectedChatId;

    if (!isHousingSelected) {
      const cachedEntry = messageCacheRef.current[selectedChatId];
      if (cachedEntry && cachedEntry.messages.length > 0) {
        queueScrollToBottom("auto");
        void pollLatestMessages(selectedChatId);
        return;
      }
    }

    void fetchMessagesPage(selectedChatId, { mode: "initial", offset: 0 });
  }, [selectedChatId, selectedChat?.chat_type, selectedChat?.chatid, housingMessageFilter, housingListingVoteFilter]);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    if (isMessagesLoading || activeMessages.length === 0) {
      return;
    }

    if (initialScrollCompletedForChatRef.current === selectedChatId) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "auto",
    });
    initialScrollCompletedForChatRef.current = selectedChatId;
    shouldStickToBottomRef.current = true;
  }, [selectedChatId, activeMessages.length, visibleMessages.length, isMessagesLoading]);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pollLatestMessages(selectedChatId);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedChatId]);

  useEffect(() => {
    setSendError(null);
    setReplyDraft(null);
  }, [selectedChatId, draftConversation?.userId]);

  useEffect(() => {
    setHousingMessageFilter("all");
    setIsHousingParticipantsOpen(false);
    setIsHousingInviteOpen(false);
    setHousingListingVoteFilter(null);
    if (selectedChat?.chat_type !== "housing_group") {
      setIsHousingCompactInviteOpen(false);
    }
  }, [selectedChatId, selectedChat?.chat_type]);

  useEffect(() => {
    if (!selectedChatId || selectedChat?.chat_type !== "housing_group") {
      return;
    }
    if (housingParticipantCount !== 1 || activeMessages.length > 0) {
      setIsHousingCompactInviteOpen(false);
      return;
    }
    if (dismissedHousingCompactInviteChatIdRef.current === selectedChatId) {
      return;
    }
    setIsHousingCompactInviteOpen(true);
  }, [selectedChatId, selectedChat?.chat_type, housingParticipantCount, activeMessages.length]);

  useEffect(() => {
    if (!chatsLoaded) {
      return;
    }
    const token = searchParams.get("join_group")?.trim();
    setPendingJoinToken(token || null);
  }, [searchParams, chatsLoaded]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const pendingAdjustment = pendingScrollAdjustmentRef.current;
    if (pendingAdjustment.mode === "none") {
      return;
    }

    if (pendingAdjustment.mode === "bottom") {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: pendingAdjustment.behavior,
      });
    }

    if (pendingAdjustment.mode === "preserve") {
      container.scrollTop = container.scrollHeight - pendingAdjustment.previousHeight + pendingAdjustment.previousTop;
    }

    pendingScrollAdjustmentRef.current = { mode: "none" };
  }, [visibleMessages.length, selectedChatId]);

  const sendMessage = async (rawText: string, options?: { omitReply?: boolean }) => {
    const sentText = rawText.trim();
    if (!sentText || isSending || isSendLocked) return;

    let activeChat = selectedChat;
    if (!activeChat && !draftConversation) return;

    setSendError(null);
    setIsSending(true);

    try {
      if (!activeChat && draftConversation) {
        const createResponse = await fetch("/api/chats/start/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
          },
          credentials: "include",
          body: JSON.stringify({ user_ids: [draftConversation.userId] }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create chat");
        }

        activeChat = (await createResponse.json()) as Chat;
        setChats((previous) => {
          const alreadyExists = previous.some((chat) => chat.chatid === activeChat!.chatid);
          return alreadyExists ? previous : sortChatsByActivity([activeChat!, ...previous]);
        });
        setSelectedChat(activeChat);
        setDraftConversation(null);
        replaceMessengerUrlChat(activeChat.chatid);
      }

      if (!activeChat) {
        throw new Error("Chat was not resolved");
      }

      const chatId = activeChat.chatid;

      const payload: Record<string, unknown> = { chat: chatId, text: sentText };
      const replySource = options?.omitReply ? null : replyDraft;
      if (replySource?.id) {
        payload.reply_to = replySource.id;
      }

      const response = await fetch("/api/messages/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorCode = "";
        try {
          const errorPayload = await response.json();
          if (
            errorPayload
            && typeof errorPayload === "object"
            && "code" in errorPayload
            && typeof (errorPayload as { code?: unknown }).code === "string"
          ) {
            errorCode = (errorPayload as { code: string }).code;
          }
        } catch {
        }

        if (errorCode === "awaiting_reply") {
          setChatSendPermissions((previous) => ({
            ...previous,
            [chatId]: {
              canSend: false,
              awaitingReply: true,
            },
          }));
          setSendError(t("messenger.awaitingReplyError"));
          return;
        }

        throw new Error("Failed to send message");
      }

      const createdMessage = (await response.json()) as Message;
      setInput("");
      setReplyDraft(null);

      updateMessageCacheEntry(chatId, (previous) => {
        const merged = mergeMessages(previous?.messages ?? [], [createdMessage]);
        const addedCount = merged.length - (previous?.messages.length ?? 0);
        return buildCacheEntry(merged, previous, {
          hasMore: previous?.hasMore ?? false,
          nextOffset: previous ? previous.nextOffset + addedCount : merged.length,
          totalCount: typeof previous?.totalCount === "number" ? previous.totalCount + addedCount : previous?.totalCount ?? merged.length,
        });
      });

      syncChatPreview(chatId, createdMessage, 0);

      // Refresh permission flags immediately after sending to avoid local stale/flickering lock state.
      await fetchMessagesPage(chatId, {
        mode: "poll",
        afterId: createdMessage.id,
      });

      queueScrollToBottom("smooth");
    } catch {
      setSendError(t("messenger.sendError"));
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const handleShareContacts = async () => {
    if (!canInteractWithParticipant || !canShareContacts) {
      return;
    }

    const contactLines = [t("messenger.contactsMessageIntro")];
    if (currentUserContacts.phone) {
      contactLines.push(`${t("messenger.contactsMessagePhone")}: ${currentUserContacts.phone}`);
    }
    if (currentUserContacts.email) {
      contactLines.push(`${t("messenger.contactsMessageEmail")}: ${currentUserContacts.email}`);
    }

    await sendMessage(contactLines.join("\n"), { omitReply: true });
  };

  const handleOpenParticipantProfile = () => {
    if (!canOpenParticipantProfile || !activeParticipant) {
      return;
    }

    if (isFlatFlySupportParticipant) {
      if (selectedChatId) {
        navigate(messengerUrlWithChat(new URLSearchParams(searchParams), selectedChatId), { replace: true });
        window.setTimeout(() => {
          navigate("/#about");
        }, 0);
        return;
      }
      navigate("/#about");
      return;
    }

    if (!activeParticipant.profile_id) {
      return;
    }

    openExternalFromChat(`/neighbours/${activeParticipant.profile_id}`);
  };

  const loadBlacklist = async () => {
    const response = await fetch("/api/chats/blacklist/", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to load blacklist");
    }
    const payload = await response.json();
    setBlacklist(Array.isArray(payload) ? payload : []);
  };

  const handleBlockParticipant = async () => {
    if (!canInteractWithParticipant) return;
    if (!activeParticipant?.id) return;
    const response = await fetch("/api/chats/block/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({ user_id: activeParticipant.id }),
    });
    if (!response.ok) {
      showToast(t("messenger.blockFailed"), "error");
      return;
    }
    showToast(t("messenger.blockSuccess"), "success");
    setSelectedChat((previous) => (previous ? { ...previous, is_blocked: true, blocked_by_me: true } : previous));
    void loadBlacklist();
    setChats((previous) => previous.filter((chat) => chat.chatid !== selectedChatId));
    replaceMessengerUrlChat(null);
    setSelectedChat(null);
  };

  const handleUnblock = async (userId: number) => {
    const response = await fetch("/api/chats/unblock/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!response.ok) {
      showToast(t("messenger.unblockFailed"), "error");
      return;
    }
    setBlacklist((previous) => previous.filter((user) => user.id !== userId));
    showToast(t("messenger.unblockSuccess"), "success");
  };

  const handleReport = async () => {
    if (!selectedChat?.chatid) return;

    const response = await fetch(`/api/chats/${selectedChat.chatid}/report/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({
        reason: reportReason,
        details: reportDetails,
        consent_confirmed: true,
        block_user: reportAndBlockUser,
      }),
    });
    if (!response.ok) {
      showToast(t("messenger.reportFailed"), "error");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    showToast(
      payload?.blocked ? t("messenger.reportSuccessWithBlock") : t("messenger.reportSuccess"),
      "success",
    );
    if (payload?.blocked) {
      setSelectedChat((previous) => (previous ? { ...previous, is_blocked: true, blocked_by_me: true } : previous));
      void loadBlacklist();
      setChats((previous) => previous.filter((chat) => chat.chatid !== selectedChatId));
      replaceMessengerUrlChat(null);
      setSelectedChat(null);
    }
    setIsReportingOpen(false);
    setIsReportConsentOpen(false);
    setReportReason("insult");
    setReportDetails("");
    setReportAndBlockUser(true);
    setIsMobileActionsOpen(false);
  };

  return (
    <div className="mt-[100px] flex h-[calc(100vh-100px)] w-full bg-white dark:bg-gray-900">
      <div className={`${isMobileChatOpen ? "hidden md:block" : "block"} w-full overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 md:min-w-[200px] md:max-w-[280px] md:w-[240px]`}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <MessageCircle className="text-[#C505EB]" size={24} />
          <span className="text-lg font-bold text-black dark:text-white">{t("messenger.title")}</span>
          <button
            type="button"
            className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => setIsBlacklistOpen(true)}
          >
            {t("messenger.blacklist")}
          </button>
        </div>
        <input
          type="text"
          value={chatSearch}
          onChange={(event) => setChatSearch(event.target.value)}
          placeholder={t("messenger.searchPlaceholder")}
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <div
          className={`relative mb-3 cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
            housingGroupChat && selectedChatId === housingGroupChat.chatid
              ? "border-[#C505EB] bg-[#C505EB]/10"
              : "border-[#08D3E2]/35 bg-gradient-to-r from-[#C505EB]/8 to-[#08D3E2]/12 hover:border-[#C505EB]/45 dark:border-[#08D3E2]/25"
          }`}
          onClick={() => {
            if (housingGroupChat) {
              setDraftConversation(null);
              setSelectedChat(housingGroupChat);
              replaceMessengerUrlChat(housingGroupChat.chatid);
            } else {
              setIsHousingPitchOpen(true);
            }
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C505EB] to-[#08D3E2] text-white shadow-sm">
              <Users size={22} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-black dark:text-white">{t("messenger.housingGroup.chatTitle")}</div>
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                {housingGroupChat ? (
                  housingGroupChat.last_message?.message_kind === "listing" ? (
                    housingGroupChat.last_message.display_text
                      || (typeof housingGroupChat.last_message.listing_preview === "object"
                        && housingGroupChat.last_message.listing_preview
                        && "title" in housingGroupChat.last_message.listing_preview
                        ? String((housingGroupChat.last_message.listing_preview as ListingPreview).title || "")
                        : "")
                      || t("messenger.housingGroup.listingsOnly")
                  ) : (
                    housingGroupChat.last_message?.text || t("messenger.noMessagesPreview")
                  )
                ) : (
                  t("messenger.housingGroup.pinnedNoGroupSubtitle")
                )}
              </div>
            </div>
          </div>
        </div>
        {filteredChats.length === 0 && (
          <div className="text-sm text-gray-400">
            {chats.length === 0 || (nonHousingChats.length === 0 && !chatSearch.trim())
              ? t("messenger.noDialogs")
              : t("messenger.noSearchResults")}
          </div>
        )}
        {filteredChats.map((chat) => (
          <div
            key={chat.chatid}
            className={`relative mb-2 cursor-pointer rounded-xl p-3 transition-all duration-200 ${selectedChatId === chat.chatid ? "border border-[#C505EB] bg-[#C505EB]/10" : chat.unread_count > 0 ? "border border-[#08D3E2] bg-[#08D3E2]/10" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            onClick={() => {
              setDraftConversation(null);
              setSelectedChat(chat);
              replaceMessengerUrlChat(chat.chatid);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setActionMenuChatId(chat.chatid);
            }}
            onMouseDown={() => handleChatPressStart(chat.chatid)}
            onMouseUp={handleChatPressEnd}
            onMouseLeave={handleChatPressEnd}
            onTouchStart={() => handleChatPressStart(chat.chatid)}
            onTouchEnd={handleChatPressEnd}
            onTouchCancel={handleChatPressEnd}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-black dark:text-white">{getOtherParticipantDisplay(chat)}</div>
              {chat.unread_count > 0 && (
                <span className="min-w-5 h-5 rounded-full bg-[#C505EB] px-1 text-center text-[11px] font-bold leading-5 text-white">
                  {chat.unread_count > 9 ? "9+" : chat.unread_count}
                </span>
              )}
            </div>
            <div className="truncate text-xs text-gray-500">
              {chat.last_message?.message_kind === "listing"
                ? (chat.last_message.display_text
                    || (typeof chat.last_message.listing_preview === "object"
                      && chat.last_message.listing_preview
                      && "title" in chat.last_message.listing_preview
                      ? String((chat.last_message.listing_preview as ListingPreview).title || "")
                      : "")
                    || t("messenger.housingGroup.listingsOnly"))
                : (chat.last_message?.text || t("messenger.noMessagesPreview"))}
            </div>
            {actionMenuChatId === chat.chatid && (
              <div className="absolute right-2 top-2 z-20 min-w-[170px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                {chat.chat_type === "housing_group" ? (
                  <>
                    {(chat.participant_count ?? chat.participants.length) > 1 && (
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          openHousingLeaveConfirm(chat.chatid);
                        }}
                      >
                        {t("messenger.housingGroup.leaveGroup")}
                      </button>
                    )}
                    {(chat.participant_count ?? chat.participants.length) === 1 && (
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          openHousingDeleteConfirm(chat.chatid);
                        }}
                      >
                        {t("messenger.housingGroup.deleteGroup")}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteChat(chat.chatid);
                    }}
                  >
                    {t("messenger.deleteChatForBoth")}
                  </button>
                )}
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActionMenuChatId(null);
                  }}
                >
                  {t("messenger.cancel")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={`${isMobileChatOpen ? "flex" : "hidden md:flex"} h-full flex-1 flex-col`}>
        {selectedChat || draftConversation ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800 md:gap-3 md:px-4 md:py-3">
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="md:hidden rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    replaceMessengerUrlChat(null);
                    setSelectedChat(null);
                    setDraftConversation(null);
                    setIsMobileActionsOpen(false);
                  }}
                  aria-label={t("previous")}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-3 text-left"
                  onClick={() => {
                    if (isHousingGroupChat) {
                      setIsHousingParticipantsOpen(true);
                      return;
                    }
                    handleOpenParticipantProfile();
                  }}
                  disabled={!isHousingGroupChat && !canOpenParticipantProfile}
                >
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {isHousingGroupChat ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C505EB] to-[#08D3E2] text-white">
                        <Users size={22} aria-hidden />
                      </div>
                    ) : activeParticipantAvatar ? (
                      <img src={activeParticipantAvatar} alt={activeParticipantName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-200">
                        {activeParticipantName.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-black dark:text-white">{activeParticipantName}</div>
                    {isHousingGroupChat && (
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {t("messenger.housingGroup.memberCount").replace("{{count}}", String(housingParticipantCount))}
                      </div>
                    )}
                  </div>
                </button>
              </div>
              {isHousingGroupChat && housingMessageFilter === "listings" && selectedChat ? (
                <div
                  className="flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-0.5 sm:gap-1.5"
                  role="toolbar"
                  aria-label={t("messenger.housingGroup.listingFilterHint")}
                >
                  {selectedChat.participants.map((participant) => {
                    const active = housingListingVoteFilter === participant.id;
                    const src = participant.avatar ? getImageUrl(String(participant.avatar)) : null;
                    const initial = getParticipantName(participant).charAt(0).toUpperCase() || "?";
                    return (
                      <button
                        key={participant.id}
                        type="button"
                        title={t("messenger.housingGroup.filterByMemberLikes").replace("{{name}}", getParticipantName(participant))}
                        onClick={() => {
                          setHousingListingVoteFilter((prev) => (prev === participant.id ? null : participant.id));
                        }}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-gray-200 text-[10px] font-bold text-gray-700 transition dark:bg-gray-700 dark:text-gray-200 sm:h-9 sm:w-9 sm:text-xs ${
                          active ? "border-[#C505EB] shadow-sm" : "border-transparent"
                        }`}
                      >
                        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    title={t("messenger.housingGroup.filterUnanimousLikes")}
                    onClick={() => {
                      setHousingListingVoteFilter((prev) => (prev === "unanimous" ? null : "unanimous"));
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[#C505EB]/20 to-[#08D3E2]/25 text-[#7a0cb3] transition dark:from-[#C505EB]/30 dark:to-[#08D3E2]/30 dark:text-[#e9d5ff] sm:h-9 sm:w-9 ${
                      housingListingVoteFilter === "unanimous" ? "border-[#C505EB] shadow-sm" : "border-transparent"
                    }`}
                  >
                    <Users className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="min-w-0 flex-1" aria-hidden />
              )}
              <div className="relative flex shrink-0 items-center justify-end gap-2">
                {(canInteractWithParticipant || isHousingGroupChat) && (
                  <button
                    type="button"
                    className="md:hidden rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setIsMobileActionsOpen((prev) => !prev)}
                    aria-label={t("header.openMenu")}
                  >
                    <MoreVertical size={18} />
                  </button>
                )}
                {isMobileActionsOpen && (canInteractWithParticipant || isHousingGroupChat) && (
                  <div className="absolute right-0 top-11 z-30 min-w-[210px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800 md:hidden">
                    {isHousingGroupChat && selectedChat && (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          onClick={() => {
                            setIsMobileActionsOpen(false);
                            toggleHousingListingsFilter();
                          }}
                        >
                          {housingMessageFilter === "all"
                            ? t("messenger.housingGroup.listingsOnly")
                            : t("messenger.housingGroup.allMessages")}
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          onClick={() => {
                            setIsMobileActionsOpen(false);
                            setIsHousingInviteOpen(true);
                          }}
                        >
                          {t("messenger.housingGroup.invite")}
                        </button>
                        {housingParticipantCount > 1 && (
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              openHousingLeaveConfirm(selectedChat.chatid);
                            }}
                          >
                            {t("messenger.housingGroup.leaveGroup")}
                          </button>
                        )}
                        {housingParticipantCount === 1 && (
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                            onClick={() => {
                              openHousingDeleteConfirm(selectedChat.chatid);
                            }}
                          >
                            {t("messenger.housingGroup.deleteGroup")}
                          </button>
                        )}
                      </>
                    )}
                    {canInteractWithParticipant && (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
                          onClick={() => {
                            setIsMobileActionsOpen(false);
                            void handleShareContacts();
                          }}
                          disabled={isSending || !canShareContacts}
                        >
                          {t("messenger.shareContacts")}
                        </button>
                        {selectedChat && !selectedChatBlockedByMe && (
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
                            onClick={() => {
                              setIsMobileActionsOpen(false);
                              void handleBlockParticipant();
                            }}
                          >
                            {t("messenger.blockUser")}
                          </button>
                        )}
                        {selectedChat && (
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/30"
                            onClick={() => {
                              setIsMobileActionsOpen(false);
                              setIsReportingOpen(true);
                            }}
                          >
                            {t("messenger.reportUser")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="hidden shrink-0 md:flex flex-wrap items-center justify-end gap-2">
                {isHousingGroupChat && selectedChat && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => {
                        toggleHousingListingsFilter();
                      }}
                    >
                      {housingMessageFilter === "all"
                        ? t("messenger.housingGroup.listingsOnly")
                        : t("messenger.housingGroup.allMessages")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[#C505EB] px-3 py-2 text-sm font-medium text-[#7a0cb3] transition-colors hover:bg-[#C505EB]/10 dark:text-[#e9d5ff] dark:hover:bg-[#C505EB]/20"
                      onClick={() => setIsHousingInviteOpen(true)}
                    >
                      {t("messenger.housingGroup.invite")}
                    </button>
                    {housingParticipantCount > 1 && (
                      <button
                        type="button"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        onClick={() => {
                          openHousingLeaveConfirm(selectedChat.chatid);
                        }}
                      >
                        {t("messenger.housingGroup.leaveGroup")}
                      </button>
                    )}
                    {housingParticipantCount === 1 && (
                      <button
                        type="button"
                        className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                        onClick={() => {
                          openHousingDeleteConfirm(selectedChat.chatid);
                        }}
                      >
                        {t("messenger.housingGroup.deleteGroup")}
                      </button>
                    )}
                  </>
                )}
                {canInteractWithParticipant && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => {
                        void handleShareContacts();
                      }}
                      disabled={isSending || !canShareContacts}
                    >
                      {t("messenger.shareContacts")}
                    </button>
                    {selectedChat && (
                      <>
                        {!selectedChatBlockedByMe && (
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                            onClick={() => {
                              void handleBlockParticipant();
                            }}
                          >
                            {t("messenger.blockUser")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                          onClick={() => setIsReportingOpen(true)}
                        >
                          {t("messenger.reportUser")}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto bg-white p-6 dark:bg-gray-900"
              onScroll={handleMessagesScroll}
            >
              {isLoadingOlderMessages && (
                <div className="mb-4 text-center text-sm text-gray-400">{t("loading")}</div>
              )}
              {isInitialMessagesLoading ? (
                <div className="text-gray-400">{t("loading")}</div>
              ) : activeMessages.length === 0 ? (
                <div className="text-gray-400">{t("messenger.noMessages")}</div>
              ) : visibleMessages.length === 0 ? (
                <div className="text-gray-400">
                  {isHousingGroupChat && housingMessageFilter === "listings"
                    ? t("messenger.housingGroup.noListingMessages")
                    : t("messenger.noMessages")}
                </div>
              ) : (
                visibleMessages.map((message) => {
                  const isListing = message.message_kind === "listing";
                  const preview = message.listing_preview as ListingPreview | undefined;

                  if (isListing && preview) {
                    return (
                      <MessengerChatListingCard
                        key={message.id}
                        message={message}
                        preview={preview}
                        currentUserId={currentUserId}
                        t={t}
                        getParticipantName={getParticipantName}
                        onOpenListing={openExternalFromChat}
                        onVote={isHousingGroupChat ? submitListingReaction : undefined}
                        voteBusy={listingVoteBusyId === message.id}
                        highlighted={highlightedMessageId === message.id}
                        onReply={selectedChat ? () => startReplyTo(message) : undefined}
                        onJumpToReplyTarget={jumpToQuotedMessage}
                      />
                    );
                  }

                  const isOutgoingText = message.sender.id === currentUserId;
                  return (
                    <div
                      key={message.id}
                      id={`chat-message-${message.id}`}
                      className={`mb-4 flex ${isOutgoingText ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[60%] rounded-2xl px-4 py-2 transition-shadow duration-300 ${
                          isOutgoingText ? "bg-[#C505EB] text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
                        } ${
                          highlightedMessageId === message.id
                            ? "ring-[3px] ring-[#08D3E2] ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                            : ""
                        }`}
                      >
                        {message.reply_preview ? (
                          <MessageReplyQuote
                            preview={message.reply_preview}
                            variant={isOutgoingText ? "outgoing" : "incoming"}
                            t={t}
                            onJump={() => jumpToQuotedMessage(message.reply_preview!.id)}
                          />
                        ) : null}
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-semibold ${isOutgoingText ? "text-white/95" : "text-gray-800 dark:text-gray-100"}`}
                          >
                            {getParticipantName(message.sender)}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {selectedChat ? (
                              <button
                                type="button"
                                className={`rounded-md p-1 transition ${
                                  isOutgoingText
                                    ? "text-white/70 hover:bg-white/15 hover:text-white"
                                    : "text-gray-500 hover:bg-gray-300/60 hover:text-[#C505EB] dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-[#e9d5ff]"
                                }`}
                                aria-label={t("messenger.reply")}
                                onClick={() => startReplyTo(message)}
                              >
                                <Reply size={15} strokeWidth={2} aria-hidden />
                              </button>
                            ) : null}
                            <span
                              className={`text-[10px] ${isOutgoingText ? "text-white/65" : "text-gray-500 dark:text-gray-400"}`}
                            >
                              {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        <div className={isOutgoingText ? "text-white" : ""}>{message.text}</div>
                        <div className="mt-1 flex items-center gap-1">
                          {message.sender.id === currentUserId && (
                            <span className={`text-[10px] ${isOutgoingText ? "text-white/55" : "text-gray-400"}`}>
                              {message.is_read ? t("messenger.read") : t("messenger.sent")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              {replyDraft ? (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#C505EB]/35 bg-[#C505EB]/8 px-3 py-2 dark:border-[#C505EB]/45 dark:bg-[#C505EB]/15">
                  {replyDraft.listing_thumb ? (
                    <img
                      src={getImageUrl(String(replyDraft.listing_thumb))}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-[#7a0cb3] dark:text-[#e9d5ff]">
                      {t("messenger.replyingTo")} {replyDraft.sender_name}
                    </div>
                    <div className="line-clamp-2 text-sm text-gray-800 dark:text-gray-100">{replyDraft.text_snippet}</div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                    aria-label={t("messenger.cancelReply")}
                    onClick={() => setReplyDraft(null)}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
              ) : null}
              {(sendError
                || selectedChatIsBlocked
                || isDraftConversationActive
                || (!isHousingGroupChat && isAwaitingReply)) && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${sendError ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300" : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300"}`}>
                  {sendError
                    ? sendError
                    : selectedChatIsBlocked
                      ? t("messenger.blockedChatWarning")
                    : !isHousingGroupChat && isAwaitingReply
                      ? t("messenger.awaitingReplyWarning")
                      : t("messenger.firstMessageWarning")}
                </div>
              )}
              <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (sendError) {
                    setSendError(null);
                  }
                }}
                onKeyDown={(event) => event.key === "Enter" && void handleSend()}
                className="flex-1 touch-manipulation rounded-xl border border-gray-300 bg-white px-4 py-2 text-black outline-none focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                placeholder={
                  !isHousingGroupChat && isAwaitingReply
                    ? t("messenger.awaitingReplyPlaceholder")
                    : t("messenger.inputPlaceholder")
                }
                disabled={isSending || isSendLocked}
                autoComplete="off"
                enterKeyHint="send"
                inputMode="text"
              />
              <button
                onClick={() => {
                  void handleSend();
                }}
                className="rounded-full bg-[#C505EB] p-2 text-white duration-200 hover:bg-[#BA00F8]"
                disabled={isSending || isSendLocked || !input.trim()}
              >
                <Send size={20} />
              </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">{t("messenger.selectDialog")}</div>
        )}
      </div>
      {deleteConfirmationChatId !== null && (
        <div
          className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleDeleteConfirmationCancel}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 text-lg font-bold text-black dark:text-white">{t("messenger.deleteChatForBoth")}</div>
            <div className="mb-5 text-sm text-gray-600 dark:text-gray-300">{t("messenger.deleteConfirm")}</div>
            <label className="mb-5 flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={rememberDeleteChoice}
                onChange={(event) => setRememberDeleteChoice(event.target.checked)}
                className="h-4 w-4 accent-[#C505EB]"
              />
              <span>{t("messenger.dontAskAgain")}</span>
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={handleDeleteConfirmationCancel}
              >
                {t("messenger.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                onClick={() => {
                  void handleDeleteConfirmationApprove();
                }}
              >
                {t("messenger.deleteChatForBoth")}
              </button>
            </div>
          </div>
        </div>
      )}
      {housingDestructiveConfirm !== null && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeHousingDestructiveConfirm}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 text-lg font-bold text-black dark:text-white">
              {housingDestructiveConfirm.mode === "leave"
                ? t("messenger.housingGroup.leaveConfirmTitle")
                : t("messenger.housingGroup.deleteConfirmTitle")}
            </div>
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">
              {housingDestructiveConfirm.mode === "leave"
                ? t("messenger.housingGroup.leaveConfirmBody")
                : t("messenger.housingGroup.deleteConfirmBody")}
            </div>
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-100">
              {t("messenger.housingGroup.destructiveDataWarning")}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={closeHousingDestructiveConfirm}
                disabled={isHousingConfirmBusy}
              >
                {t("messenger.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                disabled={isHousingConfirmBusy}
                onClick={() => {
                  void confirmHousingDestructive();
                }}
              >
                {housingDestructiveConfirm.mode === "leave"
                  ? t("messenger.housingGroup.confirmLeaveButton")
                  : t("messenger.housingGroup.confirmDeleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isBlacklistOpen && (
        <div
          className="fixed inset-0 z-[202] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsBlacklistOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 text-lg font-bold text-black dark:text-white">{t("messenger.blacklist")}</div>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">{t("messenger.blacklistDescription")}</div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {blacklist.length === 0 && (
                <div className="text-sm text-gray-500">{t("messenger.blacklistEmpty")}</div>
              )}
              {blacklist.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <span className="text-sm text-black dark:text-white">{getParticipantName(user)}</span>
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => {
                      void handleUnblock(user.id);
                    }}
                  >
                    {t("messenger.unblock")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {isReportingOpen && (
        <div
          className="fixed inset-0 z-[203] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsReportingOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 text-lg font-bold text-black dark:text-white">{t("messenger.reportUser")}</div>
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value as ReportReason)}
              className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="insult">{t("messenger.reportReasonInsult")}</option>
              <option value="threat">{t("messenger.reportReasonThreat")}</option>
              <option value="spam">{t("messenger.reportReasonSpam")}</option>
              <option value="fraud">{t("messenger.reportReasonFraud")}</option>
              <option value="inappropriate_content">{t("messenger.reportReasonInappropriate")}</option>
              <option value="other">{t("messenger.reportReasonOther")}</option>
            </select>
            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              rows={4}
              placeholder={t("messenger.reportDetailsPlaceholder")}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={reportAndBlockUser}
                onChange={(event) => setReportAndBlockUser(event.target.checked)}
                className="h-4 w-4 accent-[#C505EB]"
              />
              <span>{t("messenger.reportAlsoBlockUser")}</span>
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => setIsReportingOpen(false)}
              >
                {t("messenger.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                onClick={() => {
                  setIsReportConsentOpen(true);
                }}
              >
                {t("messenger.sendReport")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isReportConsentOpen && (
        <div
          className="fixed inset-0 z-[204] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsReportConsentOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 text-lg font-bold text-black dark:text-white">{t("messenger.reportConsentTitle")}</div>
            <div className="mb-5 text-sm text-gray-600 dark:text-gray-300">{t("messenger.reportConsent")}</div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => setIsReportConsentOpen(false)}
              >
                {t("messenger.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                onClick={() => {
                  void handleReport();
                }}
              >
                {t("messenger.reportConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingJoinToken && (
        <div
          className="fixed inset-0 z-[206] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => {
            setPendingJoinToken(null);
            setJoinConflictChatId(null);
            clearJoinGroupQuery();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 text-lg font-bold text-black dark:text-white">{t("messenger.housingGroup.joinPromptTitle")}</div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{t("messenger.housingGroup.joinPromptBody")}</p>
            {joinConflictChatId !== null && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                <p className="mb-2 font-semibold">{t("messenger.housingGroup.joinConflictTitle")}</p>
                <p className="mb-3">{t("messenger.housingGroup.joinConflictBody")}</p>
                <button
                  type="button"
                  className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  disabled={isJoinBusy}
                  onClick={() => {
                    void submitJoinHousingGroup(true);
                  }}
                >
                  {t("messenger.housingGroup.joinConflictConfirm")}
                </button>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                disabled={isJoinBusy}
                onClick={() => {
                  setPendingJoinToken(null);
                  setJoinConflictChatId(null);
                  clearJoinGroupQuery();
                }}
              >
                {t("messenger.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#C505EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#BA00F8] disabled:opacity-60"
                disabled={isJoinBusy || joinConflictChatId !== null}
                onClick={() => {
                  void submitJoinHousingGroup(false);
                }}
              >
                {isJoinBusy ? t("loading") : t("messenger.housingGroup.joinConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isHousingPitchOpen && (
        <div
          className="fixed inset-0 z-[211] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setIsHousingPitchOpen(false)}
        >
          <div
            className="flex max-h-[min(92vh,620px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-4 py-4 text-xs leading-snug text-gray-700 dark:text-gray-200 sm:space-y-2.5 sm:px-6 sm:py-5 sm:text-sm sm:leading-snug">
              {t("messenger.housingGroup.pitchBody")
                .split("\n\n")
                .map((para, idx) => (
                  <p key={idx} className="whitespace-pre-line">
                    {para}
                  </p>
                ))}
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                className="order-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 sm:order-1"
                onClick={() => setIsHousingPitchOpen(false)}
              >
                {t("messenger.housingGroup.pitchLater")}
              </button>
              <button
                type="button"
                disabled={isHousingCreateBusy}
                className="order-1 rounded-lg bg-[#C505EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#BA00F8] disabled:opacity-50 sm:order-2"
                onClick={() => {
                  void createHousingGroup();
                }}
              >
                {isHousingCreateBusy ? t("loading") : t("messenger.housingGroup.pitchCreateInvite")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isHousingCompactInviteOpen && selectedChat?.invite_token && selectedChat.chat_type === "housing_group" && (
        <div
          className="fixed inset-0 z-[212] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
          onClick={closeHousingCompactInvite}
        >
          <div
            className="flex w-full max-w-[min(100%,400px)] flex-col rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-800 sm:max-w-md sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 text-base font-bold text-black dark:text-white sm:text-lg">
              {t("messenger.housingGroup.compactInviteTitle")}
            </div>
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">{t("messenger.housingGroup.compactInviteHint")}</p>
            <div className="mx-auto flex aspect-square w-[min(72vw,200px)] max-w-[200px] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-600 sm:w-44 sm:max-w-none sm:p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/messenger?join_group=${selectedChat.invite_token}`)}`}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
              onClick={async () => {
                const link = `${window.location.origin}/messenger?join_group=${selectedChat.invite_token}`;
                try {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(link);
                  } else {
                    throw new Error("no clipboard");
                  }
                  showToast(t("messenger.housingGroup.linkCopied"), "success");
                } catch {
                  showToast(t("messenger.housingGroup.joinError"), "error");
                }
              }}
            >
              <Copy size={16} />
              {t("messenger.housingGroup.copyLinkHidden")}
            </button>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => {
                  if (selectedChatId) {
                    dismissedHousingCompactInviteChatIdRef.current = selectedChatId;
                  }
                  setIsHousingCompactInviteOpen(false);
                  setIsHousingInviteOpen(true);
                }}
              >
                {t("messenger.housingGroup.compactFullInvite")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#C505EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#BA00F8]"
                onClick={closeHousingCompactInvite}
              >
                {t("messenger.housingGroup.compactDone")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isHousingInviteOpen && selectedChat?.invite_token && (
        <div
          className="fixed inset-0 z-[207] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsHousingInviteOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 text-lg font-bold text-black dark:text-white">{t("messenger.housingGroup.invite")}</div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">{t("messenger.housingGroup.inviteLinkTitle")}</p>
            <div className="mb-4 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
              {`${window.location.origin}/messenger?join_group=${selectedChat.invite_token}`}
            </div>
            <button
              type="button"
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
              onClick={async () => {
                const link = `${window.location.origin}/messenger?join_group=${selectedChat.invite_token}`;
                try {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(link);
                  } else {
                    throw new Error("no clipboard");
                  }
                  showToast(t("messenger.housingGroup.linkCopied"), "success");
                } catch {
                  showToast(t("messenger.housingGroup.joinError"), "error");
                }
              }}
            >
              <Copy size={16} />
              {t("messenger.housingGroup.copyLink")}
            </button>
            <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">{t("messenger.housingGroup.qrHint")}</p>
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-600">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/messenger?join_group=${selectedChat.invite_token}`)}`}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => setIsHousingInviteOpen(false)}
              >
                {t("messenger.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isHousingParticipantsOpen && selectedChat && (
        <div
          className="fixed inset-0 z-[208] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsHousingParticipantsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 text-lg font-bold text-black dark:text-white">{t("messenger.housingGroup.participants")}</div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {selectedChat.participants.map((participant) => {
                const canOpenProfile = typeof participant.profile_id === "number";
                return (
                  <li key={participant.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                        canOpenProfile
                          ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                          : "cursor-default opacity-80"
                      }`}
                      disabled={!canOpenProfile}
                      onClick={() => {
                        if (!canOpenProfile || typeof participant.profile_id !== "number") {
                          return;
                        }
                        setIsHousingParticipantsOpen(false);
                        openExternalFromChat(`/neighbours/${participant.profile_id}`);
                      }}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        {participant.avatar ? (
                          <img src={participant.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-200">
                            {getParticipantName(participant).charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-sm font-medium text-black dark:text-white">{getParticipantName(participant)}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => setIsHousingParticipantsOpen(false)}
              >
                {t("messenger.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[205]">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
              toast.kind === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.kind === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
