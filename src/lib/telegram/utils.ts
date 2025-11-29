// src/lib/telegram/utils.ts

export const escapeMarkdown = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  // In MarkdownV2, these characters must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

// Helper to convert to smallest currency unit (e.g., kopecks, cents)
export const toSmallestUnit = (amount: number) => Math.round(amount * 100);

export const getTelegramLogsKey = () => `telegram_logs`;
export const getProjectLogsKey = () => `project_logs`;

export const getUserStateKey = (chatId: number) => `telegram_user_state:${chatId}`;

// --- Cart Keys ---
export const getCartKey = (chatId: number) => `telegram_cart:${chatId}`;
export const CART_TTL_SECONDS = 86400; // 24 hours for cart
export const getQuantityFromCart = async (redisClient: any, chatId: number, productId: string) => {
    const cartKey = getCartKey(chatId);
    const itemsInCart = await redisClient.lRange(cartKey, 0, -1);
    return itemsInCart.filter((id: string) => id === productId).length;
};


// --- New Support System Keys ---
// A list holding JSON strings of users waiting for support.
export const getSupportQueueKey = () => `support:queue`;
// A key indicating a user is currently in a support chat with a moderator. Value is the moderator's chatId.
export const getUserSupportChatKey = (userChatId: number) => `support_chat:user:${userChatId}`;
// A key indicating a moderator is currently in a support chat with a user. Value is the user's chatId.
export const getModeratorSupportChatKey = (moderatorChatId: number) => `support_chat:mod:${moderatorChatId}`;
