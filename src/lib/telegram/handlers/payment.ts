// src/lib/telegram/handlers/payment.ts
import { MongoClient, ObjectId } from 'mongodb';
import { sendMessage } from '../api';
import { escapeMarkdown, getCartKey, toSmallestUnit } from '../utils';

export async function handlePreCheckout(query: any, config: any) {
    const { MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_TOKEN, redisClient } = config;
    const payload = query.invoice_payload;
    let productIds: string[] = [];
    
    const payloadParts = payload.split(':');
    const paymentType = payloadParts[payloadParts.length -1];
    
    if (payload.startsWith('product:')) {
        const quantity = parseInt(payloadParts[2], 10) || 1;
        productIds = Array(quantity).fill(payloadParts[1]);
    } else if (payload.startsWith('cart_checkout:')) {
        const userId = parseInt(payloadParts[1], 10);
        const cartKey = getCartKey(userId);
        productIds = await redisClient.lRange(cartKey, 0, -1);
        if (productIds.length === 0) {
            await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, false, "Ваша корзина пуста.");
            return;
        }
    }

    if (productIds.length === 0) {
        await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, false, "Нет товаров для проверки.");
        return;
    }
    
    if (!MONGODB_URI) {
         await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, false, "База данных не настроена.");
         return;
    }

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const productsCollection = mongoClient.db(dbName).collection("products");

        const uniqueProductIds = [...new Set(productIds)];
        const productObjectIds = uniqueProductIds.map(id => new ObjectId(id));
        const productsInDb = await productsCollection.find({ _id: { $in: productObjectIds } }).toArray();

        const productMap = new Map(productsInDb.map(p => [p._id.toString(), p]));
        const productCounts: {[key: string]: number} = productIds.reduce((acc: any, id: string) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});

        for (const [productId, count] of Object.entries(productCounts)) {
             const product = productMap.get(productId);
             if (!product) {
                  await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, false, `Один из товаров больше не доступен.`);
                  return;
             }
            if (product.type === 'static') {
                const keys = (product.staticKey || '').split('\n').filter((k: string) => k.trim() !== '');
                if (keys.length < count) {
                     await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, false, `Товара "${product.buttonName}" не хватает на складе.`);
                     return;
                }
            }
        }

    } catch (e) {
        console.error("Pre-checkout error:", e);
        await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, false, "Ошибка на стороне сервера.");
        return;
    } finally {
        if (mongoClient) await mongoClient.close();
    }
    
    await config.answerPreCheckoutQuery(TELEGRAM_TOKEN, query.id, true);
}


export async function handleSuccessfulPayment(payment: any, chatId: number, config: any) {
    const { MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_TOKEN, redisClient } = config;
    const invoicePayload = payment.invoice_payload;
    let productIds: string[] = [];
    
    const payloadParts = invoicePayload.split(':');
    
    if (invoicePayload.startsWith('product:')) {
        const quantity = parseInt(payloadParts[2], 10) || 1;
        productIds = Array(quantity).fill(payloadParts[1]);
    } else if (invoicePayload.startsWith('cart_checkout:')) {
        const userId = parseInt(payloadParts[1], 10);
        const cartKey = getCartKey(userId);
        productIds = await redisClient.lRange(cartKey, 0, -1);
        await redisClient.del(cartKey); // Clear cart after successful payment
    } else {
        await sendMessage(TELEGRAM_TOKEN, chatId, `✅ Оплата прошла успешно, но мы не смогли определить, что вы купили. Свяжитесь с поддержкой.`);
        return;
    }

    if (productIds.length === 0) {
        await sendMessage(TELEGRAM_TOKEN, chatId, "✅ Оплата прошла успешно, но ваша корзина была пуста.");
        return;
    }

    if (!MONGODB_URI) {
        await sendMessage(TELEGRAM_TOKEN, chatId, "❌ Ошибка. База данных не настроена.");
        return;
    }
    
    await sendMessage(TELEGRAM_TOKEN, chatId, `✅ Оплата прошла успешно! Ваши товары:`);

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const productsCollection = mongoClient.db(dbName).collection("products");

        const uniqueProductIds = [...new Set(productIds)];
        const productObjectIds = uniqueProductIds.map(id => new ObjectId(id));
        const productsInDb = await productsCollection.find({ _id: { $in: productObjectIds } }).toArray();
        const productMap = new Map(productsInDb.map(p => [p._id.toString(), p]));
        const productCounts: {[key: string]: number} = productIds.reduce((acc: any, id: string) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});

        for (const [productId, count] of Object.entries(productCounts)) {
             const product = productMap.get(productId);
             if (!product) continue;

             for (let i = 0; i < count; i++) {
                if (product.type === 'api') {
                     try {
                        const apiResponse = await fetch(product.apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${product.apiToken}`
                            },
                            body: JSON.stringify({ validityDays: product.apiDays })
                        });
                        const data = await apiResponse.json();
                        if (data.success && data.key) {
                            await sendMessage(TELEGRAM_TOKEN, chatId, `*${escapeMarkdown(product.invoiceTitle)}*:\n\`${escapeMarkdown(data.key)}\``);
                        } else {
                            throw new Error(data.message || "Не удалось сгенерировать ключ.");
                        }
                    } catch (e: any) {
                        console.error("API product error:", e);
                        await sendMessage(TELEGRAM_TOKEN, chatId, `❌ Произошла ошибка при генерации ключа для *${escapeMarkdown(product.invoiceTitle)}*\\. Свяжитесь с администратором\\.`);
                    }
                } else { // static
                    const currentProductState = await productsCollection.findOne({ _id: new ObjectId(productId) });
                    const keys = (currentProductState?.staticKey || '').split('\n').filter((k: string) => k.trim() !== '');
                    
                    if (keys.length > 0) {
                        const keyToIssue = keys.shift();
                        await sendMessage(TELEGRAM_TOKEN, chatId, `*${escapeMarkdown(product.invoiceTitle)}*:\n\`${escapeMarkdown(keyToIssue)}\``);
                        
                        const updatedStaticKey = keys.join('\n');
                        await productsCollection.updateOne(
                            { _id: new ObjectId(productId) },
                            { $set: { staticKey: updatedStaticKey } }
                        );
                    } else {
                        await sendMessage(TELEGRAM_TOKEN, chatId, `❌ Извините, товар *${escapeMarkdown(product.invoiceTitle)}* закончился во время обработки заказа\\. Пожалуйста, свяжитесь с администратором\\.`);
                    }
                }
             }
        }
        
    } catch (e) {
        console.error("Error handling successful payment:", e);
        await sendMessage(TELEGRAM_TOKEN, chatId, "❌ Произошла критическая ошибка при обработке вашего платежа\\.");
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}
