// src/lib/telegram/handlers/message.ts
import { MongoClient } from 'mongodb';
import { sendMessage, sendPhoto, apiCall } from '../api';
import { escapeMarkdown, getUserStateKey } from '../utils';

async function sendActiveCampaignsToNewUser(chatId: number, config: any) {
    const { MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_TOKEN } = config;
    if (!MONGODB_URI) return;

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const campaignsCollection = mongoClient.db(dbName).collection("campaigns");

        const now = new Date();
        const activeCampaigns = await campaignsCollection.find({
            status: { $in: ['sending', 'completed'] },
            lifetimeHours: { $gt: 0 }
        }).toArray();

        for (const campaign of activeCampaigns) {
            const campaignEndDate = new Date(new Date(campaign.createdAt).getTime() + campaign.lifetimeHours * 60 * 60 * 1000);
            if (now < campaignEndDate) {
                // Wait a bit before sending promo message
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                try {
                    const payload: any = {
                        chat_id: chatId,
                        parse_mode: 'Markdown',
                    };
                    
                    if (campaign.text) payload.text = campaign.text;
                    if (campaign.text && campaign.imageUrl) payload.caption = campaign.text;

                    if (campaign.imageUrl) {
                        await apiCall(TELEGRAM_TOKEN, 'sendPhoto', {
                            ...payload,
                            photo: campaign.imageUrl,
                        });
                    } else {
                        await apiCall(TELEGRAM_TOKEN, 'sendMessage', payload);
                    }
                } catch (e) {
                    console.error(`[Campaign] Failed to send evergreen message for campaign ${campaign._id} to new user ${chatId}`, e);
                }
            }
        }

    } catch (e) {
        console.error("[Campaign] Error fetching/sending evergreen campaigns for new user:", e);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}


export async function handleStartCommand(chatId: number, chatType: string, config: any, isNewUser: boolean = false) {
    const { 
        TELEGRAM_WELCOME_MESSAGE, 
        TELEGRAM_CUSTOM_LINKS, 
        TELEGRAM_SHOP_BUTTON_NAME,
        TELEGRAM_BOT_LINK,
        TELEGRAM_WELCOME_IMAGE_URL
    } = config;

    if (config.redisClient) {
        await config.redisClient.del(getUserStateKey(chatId));
    }

    let welcomeMessage = TELEGRAM_WELCOME_MESSAGE || "🤖 Привет! Я твой помощник.";
    welcomeMessage = escapeMarkdown(welcomeMessage);
    
    let keyboardRows: any[][] = [];
    
    let customLinkButtons = (TELEGRAM_CUSTOM_LINKS || [])
        .filter((link: { text: string; url: string; showInGroups: boolean }) => link.text && link.url);

    if (chatType !== 'private') {
        customLinkButtons = customLinkButtons.filter((link: any) => link.showInGroups);
    }
    
    const formattedCustomLinks = customLinkButtons.map((link: { text: string; url: string }) => ([{ text: escapeMarkdown(link.text), url: link.url }]));
    keyboardRows.push(...formattedCustomLinks);


    if (chatType === 'private') {
        if (TELEGRAM_SHOP_BUTTON_NAME) {
            keyboardRows.unshift([{ text: `🛍️ ${escapeMarkdown(TELEGRAM_SHOP_BUTTON_NAME)}`, callback_data: "show_categories:1" }]);
        }
        keyboardRows.push([{ text: "❓ Тех. поддержка", callback_data: "request_support" }]);
    } else { // Group chat
         if (TELEGRAM_BOT_LINK) {
            keyboardRows.unshift([{ text: "🤖 Открыть бота", url: TELEGRAM_BOT_LINK }]);
        }
    }

    const mainMenu = {
      inline_keyboard: keyboardRows
    };

    if (TELEGRAM_WELCOME_IMAGE_URL) {
        await sendPhoto(config.TELEGRAM_TOKEN, chatId, TELEGRAM_WELCOME_IMAGE_URL, welcomeMessage, mainMenu);
    } else {
        await sendMessage(config.TELEGRAM_TOKEN, chatId, welcomeMessage, mainMenu);
    }

    if (isNewUser && chatType === 'private') {
        await sendActiveCampaignsToNewUser(chatId, config);
    }
}


export async function handleTextMessage(chatId: number, text: string, from: any, config: any) {
    // This function is now a no-op as bot only responds to commands/buttons.
}
