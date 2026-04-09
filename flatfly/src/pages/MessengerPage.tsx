import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCsrfToken } from "../utils/csrf";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, MessageCircle, MoreVertical, Send, XCircle } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const DELETE_CHAT_CONFIRMATION_KEY = "flatfly.skipDeleteChatConfirmation";
const MESSAGE_CACHE_KEY = "flatfly.messageCache.v1";
const MESSAGES_PAGE_SIZE = 10;

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_id?: number | null;
  avatar?: string | null;
}

interface Message {
  id: number;
  chat: number;
  sender: User;
  text: string;
  created_at: string;
  is_read: boolean;
}

interface Chat {
  chatid: number;
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
  const [blacklist, setBlacklist] = useState<User[]>([]);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("insult");
  const [reportDetails, setReportDetails] = useState("");
  const [reportAndBlockUser, setReportAndBlockUser] = useState(true);
  const [isReportConsentOpen, setIsReportConsentOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoOpenAttemptedRef = useRef(false);
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
  const isInitialMessagesLoading = Boolean(selectedChatId) && isMessagesLoading && activeMessages.length === 0;
  const isDraftConversationActive = Boolean(draftConversation);
  const isAwaitingReply = Boolean(selectedChatPermission?.awaitingReply);
  const canSendInCurrentChat = selectedChat ? (selectedChatPermission?.canSend ?? true) : true;
  const isSendLocked = Boolean(selectedChat?.is_blocked) || isAwaitingReply || (Boolean(selectedChat) && !canSendInCurrentChat);

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
  const activeParticipantName = getParticipantName(activeParticipant);
  const activeParticipantAvatar = getParticipantAvatar(activeParticipant);
  const canOpenParticipantProfile = typeof activeParticipant?.profile_id === "number";
  const canShareContacts = Boolean(currentUserContacts.email || currentUserContacts.phone);
  const selectedChatIsBlocked = Boolean(selectedChat?.is_blocked);
  const selectedChatBlockedByMe = Boolean(selectedChat?.blocked_by_me);
  const isMobileChatOpen = Boolean(selectedChat || draftConversation);

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
    options: { offset?: number; afterId?: number; mode: "initial" | "older" | "poll" },
  ) => {
    const query = new URLSearchParams();
    if (typeof options.afterId === "number" && options.afterId > 0) {
      query.set("after_id", String(options.afterId));
    } else {
      query.set("limit", String(MESSAGES_PAGE_SIZE));
      query.set("offset", String(options.offset ?? 0));
    }

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
    });
  };

  const openDraftConversation = (userId: number, participant: User | null = null) => {
    setSelectedChat(null);
    setDraftConversation({ userId, participant });
  };

  const filteredChats = useMemo(() => {
    const normalizedQuery = chatSearch.trim().toLowerCase();
    if (!normalizedQuery) return chats;

    return chats.filter((chat) => {
      const participant = getOtherParticipant(chat);
      if (!participant) return false;
      const display = (participant.display_name || "").toLowerCase();
      const first = (participant.first_name || "").toLowerCase();
      const last = (participant.last_name || "").toLowerCase();
      const full = `${first} ${last}`.trim();
      return display.includes(normalizedQuery) || first.includes(normalizedQuery) || last.includes(normalizedQuery) || full.includes(normalizedQuery);
    });
  }, [chatSearch, chats, currentUserId]);

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

  const executeDeleteChat = async (chatId: number) => {
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
        throw new Error("Failed to delete chat");
      }

      setChats((previous) => previous.filter((chat) => chat.chatid !== chatId));
      removeMessageCacheEntry(chatId);
      if (isDeletingSelectedChat) {
        setSelectedChat(null);
      }
    } catch {
      showToast(t("messenger.deleteError"), "error");
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
  }, [chats, chatsLoaded, searchParams]);

  useEffect(() => {
    if (!selectedChatId) {
      shouldStickToBottomRef.current = true;
      initialScrollCompletedForChatRef.current = null;
      return;
    }

    inputRef.current?.focus();
    shouldStickToBottomRef.current = true;
    initialScrollCompletedForChatRef.current = null;

    const cachedEntry = messageCacheRef.current[selectedChatId];
    if (!cachedEntry || cachedEntry.messages.length === 0) {
      void fetchMessagesPage(selectedChatId, { mode: "initial", offset: 0 });
      return;
    }

    queueScrollToBottom("auto");
    void pollLatestMessages(selectedChatId);
  }, [selectedChatId]);

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
  }, [selectedChatId, activeMessages.length, isMessagesLoading]);

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
  }, [selectedChatId, draftConversation?.userId]);

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
  }, [activeMessages.length, selectedChatId]);

  const sendMessage = async (rawText: string) => {
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
      }

      if (!activeChat) {
        throw new Error("Chat was not resolved");
      }

      const chatId = activeChat.chatid;

      const response = await fetch("/api/messages/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ chat: chatId, text: sentText }),
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
    if (!canShareContacts) {
      return;
    }

    const contactLines = [t("messenger.contactsMessageIntro")];
    if (currentUserContacts.phone) {
      contactLines.push(`${t("messenger.contactsMessagePhone")}: ${currentUserContacts.phone}`);
    }
    if (currentUserContacts.email) {
      contactLines.push(`${t("messenger.contactsMessageEmail")}: ${currentUserContacts.email}`);
    }

    await sendMessage(contactLines.join("\n"));
  };

  const handleOpenParticipantProfile = () => {
    if (!canOpenParticipantProfile || !activeParticipant?.profile_id) {
      return;
    }

    navigate(`/neighbours/${activeParticipant.profile_id}`);
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
    <div className="mt-[50px] flex h-[calc(100vh-50px)] w-full bg-white dark:bg-gray-900 min-[771px]:mt-[100px] min-[771px]:h-[calc(100vh-100px)]">
      <div className={`${isMobileChatOpen ? "hidden md:block" : "block"} w-full overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 md:min-w-[200px] md:max-w-[280px] md:w-[240px]`}>
        <div className="mb-4 flex items-center gap-2">
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
        {filteredChats.length === 0 && (
          <div className="text-sm text-gray-400">
            {chats.length === 0 ? t("messenger.noDialogs") : t("messenger.noSearchResults")}
          </div>
        )}
        {filteredChats.map((chat) => (
          <div
            key={chat.chatid}
            className={`relative mb-2 cursor-pointer rounded-xl p-3 transition-all duration-200 ${selectedChatId === chat.chatid ? "border border-[#C505EB] bg-[#C505EB]/10" : chat.unread_count > 0 ? "border border-[#08D3E2] bg-[#08D3E2]/10" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            onClick={() => {
              setDraftConversation(null);
              setSelectedChat(chat);
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
            <div className="truncate text-xs text-gray-500">{chat.last_message?.text || t("messenger.noMessagesPreview")}</div>
            {actionMenuChatId === chat.chatid && (
              <div className="absolute right-2 top-2 z-20 min-w-[170px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
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
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="md:hidden rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
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
                  onClick={handleOpenParticipantProfile}
                  disabled={!canOpenParticipantProfile}
                >
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {activeParticipantAvatar ? (
                      <img src={activeParticipantAvatar} alt={activeParticipantName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-200">
                        {activeParticipantName.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-black dark:text-white">{activeParticipantName}</div>
                  </div>
                </button>
              </div>
              <div className="relative flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="md:hidden rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileActionsOpen((prev) => !prev)}
                  aria-label={t("header.openMenu")}
                >
                  <MoreVertical size={18} />
                </button>
                {isMobileActionsOpen && (
                  <div className="absolute right-0 top-11 z-30 min-w-[210px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800 md:hidden">
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
                  </div>
                )}
              </div>
              <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
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
              ) : (
                activeMessages.map((message) => (
                  <div key={message.id} className={`mb-4 flex ${message.sender.id === currentUserId ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-[60%] rounded-2xl px-4 py-2 ${message.sender.id === currentUserId ? "bg-[#C505EB] text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold">{getParticipantName(message.sender)}</span>
                        <span className="ml-2 text-[10px] text-gray-300">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div>{message.text}</div>
                      <div className="mt-1 flex items-center gap-1">
                        {message.sender.id === currentUserId && (
                          <span className="text-[10px] text-gray-400">
                            {message.is_read ? t("messenger.read") : t("messenger.sent")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              {(isDraftConversationActive || isAwaitingReply || sendError || selectedChatIsBlocked) && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${sendError ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300" : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300"}`}>
                  {sendError
                    ? sendError
                    : selectedChatIsBlocked
                      ? t("messenger.blockedChatWarning")
                    : isAwaitingReply
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
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-black outline-none focus:border-[#C505EB] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                placeholder={isAwaitingReply ? t("messenger.awaitingReplyPlaceholder") : t("messenger.inputPlaceholder")}
                disabled={isSending || isSendLocked}
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
