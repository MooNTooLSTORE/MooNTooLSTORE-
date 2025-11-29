
"use server";
import { NextResponse, NextRequest } from 'next/server';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { headers } from 'next/headers';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

import { getConfig, updateConfig } from '../status/route';
import { setWebhook, getMe, setBotCommands, answerPreCheckoutQuery, answerCallbackQuery, editMessageText, deleteMessage, sendMessage } from '@/lib/telegram/api';
import { getTelegramLogsKey, getUserStateKey, escapeMarkdown, getSupportQueueKey, getUserSupportChatKey, getModeratorSupportChatKey, getProjectLogsKey, getCartKey } from '@/lib/telegram/utils';
import { SessionData, sessionOptions } from '@/lib/session';

import { handleStartCommand, handleTextMessage } from '@/lib/telegram/handlers/message';
import { handlePreCheckout, handleSuccessfulPayment } from '@/lib/telegram/handlers/payment';
import { handleShowCategories, handleShowProducts, handleViewProduct, handleCheckout, handleAddToCart, handleViewCart, handleClearCart, handleRemoveFromCartOne } from '@/lib/telegram/handlers/shop';

verify_integrity('9da6c83cd8f935767e7a632a021795f91c623104d5592bd5a158ebf742281702', '5d295b9cf3663bc5076334a66614237d952d032c320a6c8cb129e14a62b37162');

const BOT_USERS_COLLECTION = "bot_users";

async function logEvent(redisClient: any, level: 'info' | 'error' | 'success', message: string, data: any = {}) {
  try {
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...data,
    };
    const PROJECT_LOGS_KEY = getProjectLogsKey();
    await redisClient.lPush(PROJECT_LOGS_KEY, JSON.stringify(logEntry));
    await redisClient.lTrim(PROJECT_LOGS_KEY, 0, 500); // Keep last 500 logs
  } catch (e) {
    console.error("Failed to write to project log:", e);
  }
}

async function updateUserInDb(chatId: number, from: any, config: any): Promise<boolean> {
    if (!config.MONGODB_URI) return false;
    let mongoClient: MongoClient | undefined;
    let isNewUser = false;
    try {
        mongoClient = new MongoClient(config.MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(config.MONGODB_URI).pathname.substring(1) || config.MONGODB_DB_NAME;
        const db = mongoClient.db(dbName);
        const collection = db.collection(BOT_USERS_COLLECTION);
        
        const now = new Date();
        const result = await collection.updateOne(
            { chatId: chatId },
            {
                $set: {
                    username: from.username,
                    firstName: from.first_name,
                    status: 'active',
                    lastSeen: now,
                },
                $setOnInsert: {
                    joinedAt: now,
                    role: 'user', // Default role
                }
            },
            { upsert: true }
        );
        
        isNewUser = !!result.upsertedId;
        if (isNewUser) {
            await logEvent(config.redisClient, 'info', 'New user registered in DB', { chatId, username: from.username });
        }

    } catch (e: any) {
        console.error("[Telegram] Failed to update user in DB", e);
        if(config.redisClient) await logEvent(config.redisClient, 'error', 'Failed to update user in DB', { error: e.message, stack: e.stack });
    } finally {
        if(mongoClient) await mongoClient.close();
    }
    return isNewUser;
}

async function endSupportChat(chatId1: number, chatId2: number, config: any) {
    const { TELEGRAM_TOKEN, redisClient } = config;

    await redisClient.del([
        getUserSupportChatKey(chatId1),
        getModeratorSupportChatKey(chatId1),
        getUserSupportChatKey(chatId2),
        getModeratorSupportChatKey(chatId2),
    ]);
    
    await logEvent(redisClient, 'info', `Ending support chat between ${chatId1} and ${chatId2}`);

    try {
        await sendMessage(TELEGRAM_TOKEN, chatId2, "Диалог завершен\\.");
    } catch(e: any) {
        console.error(`Failed to send end-chat message to ${chatId2}`, e);
        if(config.redisClient) await logEvent(config.redisClient, 'error', `Failed to send end-chat message to ${chatId2}`, { error: e.message });
    }
}

async function showSupportPanel(chatId: number, config: any) {
    const { redisClient, TELEGRAM_TOKEN } = config;
    const queueKey = getSupportQueueKey();
    const waitingUsersRaw = await redisClient.lRange(queueKey, 0, -1);

    const keyboard = [];
    if (waitingUsersRaw.length > 0) {
        for (const userRaw of waitingUsersRaw) {
            try {
                const user = JSON.parse(userRaw);
                const userName = user.username ? `@${user.username}` : user.firstName;
                keyboard.push([{ text: `💬 ${userName}`, callback_data: `support_accept:${user.id}` }]);
            } catch (e: any) {
                console.error("Failed to parse user from support queue", e);
                 if(config.redisClient) await logEvent(redisClient, 'error', 'Failed to parse user from support queue', { error: e.message });
            }
        }
    }
    
    keyboard.push([{ text: "🔄 Обновить", callback_data: `support_panel_refresh` }]);
    keyboard.push([{ text: "⬅️ Назад в меню", callback_data: `main_menu` }]);

    const messageText = waitingUsersRaw.length > 0 
        ? "*Панель поддержки*\\n\\nАктивные заявки в тех\\. поддержку:" 
        : "В очереди на поддержку нет активных заявок\\.";

    await sendMessage(TELEGRAM_TOKEN, chatId, messageText, { inline_keyboard: keyboard });
}


// GET Logs
export async function GET(request: NextRequest) {
    const { REDIS_URI, TELEGRAM_LOGS_LIMIT } = await getConfig();
    if (!REDIS_URI) {
        return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get('type') || 'telegram';

    const redisClient = createClient({ url: REDIS_URI });
    const LOGS_KEY = logType === 'project' ? getProjectLogsKey() : getTelegramLogsKey();
    const maxLogEntries = logType === 'project' ? 500 : (TELEGRAM_LOGS_LIMIT || 200);

    try {
        await redisClient.connect();
        const logs = await redisClient.lRange(LOGS_KEY, 0, maxLogEntries - 1);
        const parsedLogs = logs.map(log => log ? JSON.parse(log) : null).filter(Boolean);
        return NextResponse.json(parsedLogs);
    } catch (error: any) {
        console.error("Error fetching logs:", error);
        return NextResponse.json({ error: 'Failed to fetch logs: ' + error.message }, { status: 500 });
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    }
}

// POST Webhook
export async function POST(request: NextRequest) {
  verify_integrity('9da6c83cd8f935767e7a632a021795f91c623104d5592bd5a158ebf742281702', '5d295b9cf3663bc5076334a66614237d952d032c320a6c8cb129e14a62b37162');
  const config = await getConfig();
  
  const { TELEGRAM_TOKEN, REDIS_URI, MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_LOGS_LIMIT } = config;

  let redisClient: any;
  if (REDIS_URI) {
      redisClient = createClient({ url: REDIS_URI });
      await redisClient.connect();
  }

  if (!TELEGRAM_TOKEN) {
    const errorMessage = "Telegram token not configured.";
    console.error(errorMessage);
    if(redisClient) await logEvent(redisClient, 'error', errorMessage);
    return NextResponse.json({ status: 'ok' });
  }
  
  let mongoClient: MongoClient | undefined;
  let chatInfo: any;

  try {
    const body = await request.json();

    // Log to Telegram-specific logs (raw payload)
    if (redisClient) {
        const telegramLogEntry = { timestamp: new Date().toISOString(), payload: body };
        const TELEGRAM_LOGS_KEY = getTelegramLogsKey();
        const maxLogEntries = TELEGRAM_LOGS_LIMIT || 200;
        await redisClient.lPush(TELEGRAM_LOGS_KEY, JSON.stringify(telegramLogEntry));
        await redisClient.lTrim(TELEGRAM_LOGS_KEY, 0, maxLogEntries - 1);
    }
    
    // Log to Project logs (more structured)
    await logEvent(redisClient, 'info', 'Received update from Telegram', { update_id: body.update_id, payload_type: Object.keys(body).filter(k => k !== 'update_id')[0] });

    chatInfo = body.message?.chat || body.callback_query?.message?.chat;
    if (chatInfo && MONGODB_URI) {
        if (!mongoClient) {
            mongoClient = new MongoClient(MONGODB_URI);
            await mongoClient.connect();
        }
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const db = mongoClient.db(dbName);
        const user = await db.collection(BOT_USERS_COLLECTION).findOne({ chatId: chatInfo.id });
        if (user && user.status === 'banned') {
            const banMessage = "Вы заблокированы и не можете использовать этого бота.";
            await logEvent(redisClient, 'info', `Banned user action detected`, { chatId: chatInfo.id });
            if(body.message?.chat.id) {
                await sendMessage(TELEGRAM_TOKEN, body.message.chat.id, banMessage);
            } else if (body.callback_query?.id) {
                await answerCallbackQuery(TELEGRAM_TOKEN, body.callback_query.id, "Вы заблокированы.", true);
            }
            return NextResponse.json({ status: 'ok' });
        }
    }

    const handlerConfig = { 
        ...config, 
        redisClient, 
        deleteMessage,
        answerPreCheckoutQuery,
        logEvent // Pass logger to handlers
    };
    
    const fromInfo = body.message?.from || body.callback_query?.from;
    let isNewUser = false;
    if (chatInfo?.type === 'private' && fromInfo) {
        isNewUser = await updateUserInDb(chatInfo.id, fromInfo, handlerConfig);
    }

    // --- Message Handling ---
    if (body.message) {
        const { message } = body;
        const chatId = message.chat.id;
        const text = message.text;
        const chatType = message.chat.type;
        const from = message.from;
        
        await logEvent(redisClient, 'info', 'Processing message', { chatId, text, chatType });
        
        if (body.message.successful_payment) {
            await logEvent(redisClient, 'success', 'Successful payment received', { chatId, payment: message.successful_payment });
            await handleSuccessfulPayment(message.successful_payment, chatId, handlerConfig);
            return NextResponse.json({ status: 'ok' });
        }

        const userChattingWithModId = await redisClient?.get(getUserSupportChatKey(chatId));
        if (userChattingWithModId) {
            const moderatorId = parseInt(userChattingWithModId, 10);
            await logEvent(redisClient, 'info', `Forwarding message from user ${chatId} to mod ${moderatorId}`);
            await sendMessage(TELEGRAM_TOKEN, moderatorId, `*Пользователь ${escapeMarkdown(from.first_name)}:*\\n${escapeMarkdown(text)}`);
            return NextResponse.json({ status: 'ok' });
        }

        const modChattingWithUserId = await redisClient?.get(getModeratorSupportChatKey(chatId));
        if (modChattingWithUserId) {
            const userId = parseInt(modChattingWithUserId, 10);
            await logEvent(redisClient, 'info', `Forwarding message from mod ${chatId} to user ${userId}`);
            await sendMessage(TELEGRAM_TOKEN, userId, `*Модератор:*\\n${escapeMarkdown(text)}`);
            return NextResponse.json({ status: 'ok' });
        }
        
        if (!text) {
             if (chatType === 'private') {
                 await logEvent(redisClient, 'info', 'No text in message, handling as /start command', { chatId });
                 await handleStartCommand(chatId, chatType, handlerConfig, isNewUser);
             }
             return NextResponse.json({ status: 'ok' });
        }

        if (text.startsWith('/')) {
            let command = text.substring(1).split(' ')[0].toLowerCase();
            const botUsernameMatch = command.match(/^(.*?)@/);
            if (botUsernameMatch) command = botUsernameMatch[1];
            
            await logEvent(redisClient, 'info', `Processing command: /${command}`, { chatId });
            
            if (command === 'start') {
                await handleStartCommand(chatId, chatType, handlerConfig, isNewUser);
            } else if (command === 'supportpanel') {
                if (!mongoClient) {
                    mongoClient = new MongoClient(MONGODB_URI);
                    await mongoClient.connect();
                }
                const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
                const db = mongoClient.db(dbName);
                const user = await db.collection(BOT_USERS_COLLECTION).findOne({ chatId: chatId });

                if (user && user.role === 'moderator') {
                    await logEvent(redisClient, 'info', `Moderator ${chatId} accessed support panel`);
                    await showSupportPanel(chatId, handlerConfig);
                } else {
                    await logEvent(redisClient, 'info', `User ${chatId} attempted to access support panel without rights`);
                    await sendMessage(TELEGRAM_TOKEN, chatId, "У вас нет прав для доступа к этой команде\\.");
                }
            } else {
                 await handleTextMessage(chatId, text, from, handlerConfig);
            }
        } else {
            await handleTextMessage(chatId, text, from, handlerConfig);
        }
    
    // --- Callback Query Handling ---
    } else if (body.callback_query) {
        const { callback_query } = body;
        const chatId = callback_query.message.chat.id;
        const messageId = callback_query.message.message_id;
        const data = callback_query.data;
        
        await logEvent(redisClient, 'info', 'Processing callback_query', { chatId, callback_data: data });
        
        const fullHandlerConfig = { ...handlerConfig, message: callback_query.message, callback_query };

        const [action, ...params] = data.split(':');
        
        if (action === 'view_product') {
            await handleViewProduct(chatId, params[0], messageId, fullHandlerConfig, 1, 'real');
            await answerCallbackQuery(TELEGRAM_TOKEN, callback_query.id);
            return NextResponse.json({ status: 'ok' });
        } else if (action === 'add_to_cart_multi') {
            await handleAddToCart(chatId, params[0], callback_query.id, fullHandlerConfig, Number(params[1] || 1));
            return NextResponse.json({ status: 'ok' });
        } else if(action === 'add_to_cart'){
             await handleAddToCart(chatId, params[0], callback_query.id, fullHandlerConfig);
             await handleViewCart(chatId, messageId, fullHandlerConfig); // Refresh cart view
             return NextResponse.json({ status: 'ok' });
        } else if (action === 'remove_one_from_cart') {
             await handleRemoveFromCartOne(chatId, params[0], callback_query.id, fullHandlerConfig);
             await handleViewCart(chatId, messageId, fullHandlerConfig); // Refresh cart view
             return NextResponse.json({ status: 'ok' });
        } else if (action === 'increment_quantity' || action === 'decrement_quantity') {
            const [productId, currentQuantityStr, currencyType] = params;
            const currentQuantity = parseInt(currentQuantityStr, 10);
            const newQuantity = action === 'increment_quantity' ? currentQuantity + 1 : Math.max(1, currentQuantity - 1);
            await handleViewProduct(chatId, productId, messageId, fullHandlerConfig, newQuantity, currencyType as any);
            try { await answerCallbackQuery(TELEGRAM_TOKEN, callback_query.id); } catch(e) { /* ignore */ }
             return NextResponse.json({ status: 'ok' });
        } else if (action === 'switch_currency') {
            const [productId, quantity, newCurrency] = params;
            await handleViewProduct(chatId, productId, messageId, fullHandlerConfig, parseInt(quantity, 10), newCurrency as any);
            try { await answerCallbackQuery(TELEGRAM_TOKEN, callback_query.id); } catch(e) { /* ignore */ }
             return NextResponse.json({ status: 'ok' });
        }

        
        if (action === 'show_categories') {
            await handleShowCategories(chatId, parseInt(params[0] || '1', 10), messageId, fullHandlerConfig);
        } else if (action === 'show_products') {
            await handleShowProducts(chatId, params[0], parseInt(params[1] || '1', 10), messageId, fullHandlerConfig);
        } else if (action === 'back_to_products') {
            await handleShowProducts(chatId, params[0], 1, messageId, fullHandlerConfig);
        } else if (action === 'buy_now' || action === 'checkout_cart') {
            await handleCheckout(chatId, data, callback_query.id, fullHandlerConfig);
        } else if (action === 'view_cart') {
            await handleViewCart(chatId, messageId, fullHandlerConfig);
        } else if (action === 'clear_cart') {
            await handleClearCart(chatId, messageId, fullHandlerConfig);
        } else if (action === 'request_support') {
            if (!mongoClient) {
                mongoClient = new MongoClient(MONGODB_URI);
                await mongoClient.connect();
            }
            const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
            const db = mongoClient.db(dbName);
            const user = await db.collection(BOT_USERS_COLLECTION).findOne({ chatId: chatId });

            if (user && user.role === 'moderator') {
                await logEvent(redisClient, 'info', `Moderator ${chatId} opened support panel directly`);
                await deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
                await showSupportPanel(chatId, fullHandlerConfig);
            } else {
                const userInQueue = await redisClient.lPos(getSupportQueueKey(), JSON.stringify(callback_query.from));
                if (userInQueue !== null) {
                    await logEvent(redisClient, 'info', `User ${chatId} already in support queue`);
                    await answerCallbackQuery(TELEGRAM_TOKEN, callback_query.id, "Вы уже в очереди на поддержку. Пожалуйста, ожидайте.", true);
                } else {
                    const userInChat = await redisClient.get(getUserSupportChatKey(chatId));
                    if(userInChat) {
                         await logEvent(redisClient, 'info', `User ${chatId} already in support chat`);
                         await answerCallbackQuery(TELEGRAM_TOKEN, callback_query.id, "Вы уже находитесь в чате поддержки.", true);
                    } else {
                        await redisClient.rPush(getSupportQueueKey(), JSON.stringify(callback_query.from));
                        await logEvent(redisClient, 'info', `User ${chatId} requested support and was added to queue`);
                        await editMessageText(TELEGRAM_TOKEN, chatId, messageId, "Вы были добавлены в очередь на поддержку\\. Как только модератор освободится, он начнет с вами диалог\\.", { inline_keyboard: [[{text: "❌ Отменить запрос", callback_data: `cancel_support_request` }]] });
                    }
                }
            }
        } else if (action === 'cancel_support_request') {
            await redisClient.lRem(getSupportQueueKey(), 0, JSON.stringify(callback_query.from));
            await logEvent(redisClient, 'info', `User ${chatId} cancelled support request`);
            await editMessageText(TELEGRAM_TOKEN, chatId, messageId, "Ваш запрос на поддержку был отменен\\.", {});
        } else if (action === 'support_panel_refresh') {
            await logEvent(redisClient, 'info', `Moderator ${chatId} refreshed support panel`);
            await deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
            await showSupportPanel(chatId, fullHandlerConfig);
        } else if (action === 'support_accept') {
            const userChatId = Number(params[0]);
            const moderatorChatId = chatId;
            
            const userInChat = await redisClient.get(getUserSupportChatKey(userChatId));
            if (userInChat) {
                await logEvent(redisClient, 'info', `Moderator ${moderatorChatId} tried to accept user ${userChatId} who is already in chat with ${userInChat}`);
                await editMessageText(TELEGRAM_TOKEN, moderatorChatId, messageId, "Этот пользователь уже общается с другим модератором\\.", {});
            } else {
                const queueKey = getSupportQueueKey();
                const allUsersInQueueRaw = await redisClient.lRange(queueKey, 0, -1);
                let userToConnect = null;
                let userToConnectRaw = null;

                for (const userRaw of allUsersInQueueRaw) {
                    const user = JSON.parse(userRaw);
                    if (user.id === userChatId) {
                        userToConnect = user;
                        userToConnectRaw = userRaw;
                        break;
                    }
                }

                if (!userToConnect || !userToConnectRaw) {
                     await logEvent(redisClient, 'info', `Moderator ${moderatorChatId} tried to accept user ${userChatId} who is no longer in queue`);
                     await editMessageText(TELEGRAM_TOKEN, moderatorChatId, messageId, "Не удалось найти пользователя в очереди\\. Возможно, он отменил запрос\\.", {});
                } else {
                    await redisClient.lRem(queueKey, 1, userToConnectRaw);
                    
                    await redisClient.set(getUserSupportChatKey(userChatId), moderatorChatId, { EX: 86400 });
                    await redisClient.set(getModeratorSupportChatKey(moderatorChatId), userChatId, { EX: 86400 });
                    
                    await logEvent(redisClient, 'info', `Moderator ${moderatorChatId} accepted support chat with user ${userChatId}`);
                    
                    const endSupportKeyboard = {
                        inline_keyboard: [[{ text: "❌ Завершить чат", callback_data: "end_support" }]]
                    };

                    await sendMessage(TELEGRAM_TOKEN, userChatId, "✅ Модератор подключился к вашему чату\\. Задайте свой вопрос\\.", endSupportKeyboard);
                    await editMessageText(TELEGRAM_TOKEN, moderatorChatId, messageId, `✅ Вы подключились к чату с пользователем ${escapeMarkdown(userToConnect.first_name)}\\.`, endSupportKeyboard);
                }
            }
        } else if (action === 'end_support') {
            const userChattingWithModId = await redisClient.get(getUserSupportChatKey(chatId));
            const modChattingWithUserId = await redisClient.get(getModeratorSupportChatKey(chatId));
            const otherPartyId = userChattingWithModId || modChattingWithUserId;

            if (otherPartyId) {
                await endSupportChat(chatId, Number(otherPartyId), fullHandlerConfig);
                await editMessageText(TELEGRAM_TOKEN, chatId, messageId, "Вы завершили чат поддержки\\.", {});
            } else {
                await editMessageText(TELEGRAM_TOKEN, chatId, messageId, "Чат уже был завершен\\.", {});
            }
        } else if (action === 'main_menu') {
            await deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
            await handleStartCommand(chatId, 'private', fullHandlerConfig, false);
        } else {
            // Log unhandled actions
            await logEvent(redisClient, 'info', 'Unhandled callback_query action', { chatId, action, params });
            await answerCallbackQuery(TELEGRAM_TOKEN, callback_query.id);
        }

    // --- Pre-Checkout Query Handling ---
    } else if (body.pre_checkout_query) {
        const { pre_checkout_query } = body;
        await logEvent(redisClient, 'info', 'Processing pre_checkout_query', { query_id: pre_checkout_query.id, payload: pre_checkout_query.invoice_payload });
        await handlePreCheckout(pre_checkout_query, handlerConfig);
    } else {
        await logEvent(redisClient, 'info', 'Received unhandled update type', { update: body });
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error("Error handling telegram update:", error);
    if(redisClient) await logEvent(redisClient, 'error', 'Critical error in webhook handler', { error: error.message, stack: error.stack });
    return NextResponse.json({ status: 'ok' });
  } finally {
      if (redisClient && redisClient.isOpen) {
          await redisClient.quit();
      }
      if (mongoClient) {
          await mongoClient.close();
      }
  }
}

// PUT Webhook
export async function PUT(request: NextRequest) {
    const { token } = await request.json();
    const config = await getConfig();
    
    let appUrl = config.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
        const requestHeaders = headers();
        const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
        if (host) {
            appUrl = `https://${host}`;
        }
    }

    if (!appUrl) {
        return NextResponse.json({ error: 'App public URL could not be determined. Set NEXT_PUBLIC_APP_URL environment variable.' }, { status: 400 });
    }
    if (!token) {
        return NextResponse.json({ error: 'Telegram token not provided' }, { status: 400 });
    }
    
    const url = new URL(appUrl);
    url.pathname = '/api/telegram';
    const webhookUrl = url.toString();

    try {
        const webhookResult = await setWebhook(token, webhookUrl);
        if (webhookResult.ok) {
            await setBotCommands(token);
            
            const meResult = await getMe(token);
            let botLink = "";
            if (meResult.ok && meResult.result.username) {
                botLink = `https://t.me/${meResult.result.username}`;
            }

            await updateConfig({ TELEGRAM_TOKEN: token, TELEGRAM_BOT_LINK: botLink });
            
            return NextResponse.json({ message: `Вебхук успешно установлен на ${webhookUrl}` });
        } else {
            console.error('Webhook Error:', webhookResult);
            const description = webhookResult.description || "Не удалось установить вебхук.";
            if (description.includes("bot token is already taken")) {
                 return NextResponse.json({ error: `Этот токен уже используется другим сервером. Попробуйте сбросить токен у @BotFather.` }, { status: 409 });
            }
             if (description.includes("invalid bot token")) {
                 return NextResponse.json({ error: `Неверный токен. Проверьте правильность введенного токена.` }, { status: 400 });
            }
            throw new Error(description);
        }
    } catch (error: any) {
        console.error('Webhook Exception:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE Logs
export async function DELETE(request: NextRequest) {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    if (!session.isLoggedIn) {
         return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }
    
    const config = await getConfig();
    if (!config.REDIS_URI) {
        return NextResponse.json({ error: 'Redis не сконфигурирован' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get('type') || 'telegram';
    const LOGS_KEY = logType === 'project' ? getProjectLogsKey() : getTelegramLogsKey();

    let redisClient: any;
    try {
        redisClient = createClient({ url: config.REDIS_URI });
        await redisClient.connect();
        await redisClient.del(LOGS_KEY);
        const logTypeName = logType === 'project' ? 'проекта' : 'Telegram';
        return NextResponse.json({ message: `Логи ${logTypeName} успешно очищены.` });

    } catch (error: any) {
        console.error("Ошибка при очистке логов:", error);
        return NextResponse.json({ error: 'Не удалось очистить логи' }, { status: 500 });
    } finally {
        if (redisClient?.isOpen) {
            await redisClient.quit();
        }
    }
}
