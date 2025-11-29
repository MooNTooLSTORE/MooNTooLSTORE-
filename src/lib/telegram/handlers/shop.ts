// src/lib/telegram/handlers/shop.ts
import { MongoClient, ObjectId } from 'mongodb';
import { sendMessage, sendPhoto, sendInvoice, editMessageText, answerCallbackQuery } from '../api';
import { escapeMarkdown, toSmallestUnit, getCartKey, CART_TTL_SECONDS, getQuantityFromCart } from '../utils';

export async function handleShowCategories(chatId: number, page: number, messageId: number, config: any) {
    const { MONGODB_URI, MONGODB_DB_NAME, WORKER_ID, TELEGRAM_TOKEN, message } = config;
    if (!MONGODB_URI) return;

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const allCategories = await mongoClient.db(dbName).collection("products").distinct("category", { ownerId: WORKER_ID });

        const text = "🛍️ Выберите категорию:";
        let keyboard: any;

        if (allCategories.length === 0) {
             keyboard = { inline_keyboard: [[{ text: "⬅️ В главное меню", callback_data: "main_menu" }]] };
             await editMessageText(TELEGRAM_TOKEN, chatId, messageId, "В данный момент товары отсутствуют\\.", keyboard);
             return;
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(allCategories.length / itemsPerPage);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const categoriesToShow = allCategories.slice(startIndex, startIndex + itemsPerPage);
        
        const categoryButtons = categoriesToShow.map(cat => ([{ text: escapeMarkdown(cat) || 'Без категории', callback_data: `show_products:${cat || 'none'}:1` }]));

        const paginationButtons = [];
        if (currentPage > 1) paginationButtons.push({ text: `⬅️`, callback_data: `show_categories:${currentPage - 1}` });
        if (totalPages > 1) paginationButtons.push({ text: `${currentPage}/${totalPages}`, callback_data: `sbl_nop` });
        if (currentPage < totalPages) paginationButtons.push({ text: `➡️`, callback_data: `show_categories:${currentPage + 1}` });

        keyboard = {
            inline_keyboard: [
                ...categoryButtons,
                paginationButtons,
                [{ text: "🛒 Корзина", callback_data: "view_cart" }],
                [{ text: "⬅️ В главное меню", callback_data: "main_menu" }]
            ]
        };
        
        if (message.photo) {
            await config.deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
            await sendMessage(TELEGRAM_TOKEN, chatId, text, keyboard);
        } else {
            await editMessageText(TELEGRAM_TOKEN, chatId, messageId, text, keyboard);
        }
    } catch(e) {
        console.error("Error in handleShowCategories:", e);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}

export async function handleShowProducts(chatId: number, category: string, page: number, messageId: number, config: any) {
    const { MONGODB_URI, MONGODB_DB_NAME, WORKER_ID, TELEGRAM_TOKEN, TELEGRAM_PROVIDER_TOKEN, TELEGRAM_PAYMENT_CURRENCY, message } = config;
    if (!MONGODB_URI) return;

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const findQuery = category === 'none' ? { ownerId: WORKER_ID, $or: [{category: ''}, {category: null}] } : { ownerId: WORKER_ID, category: category };
        
        const allProducts = await mongoClient.db(dbName).collection("products").find(findQuery).toArray();
        const availableProducts = allProducts.filter(p => {
            if (p.type === 'static') {
                const keys = (p.staticKey || '').split('\n').filter((k: string) => k.trim() !== '');
                return keys.length > 0;
            }
            return true;
        });
        
        const itemsPerPage = 10;
        const totalPages = Math.ceil(availableProducts.length / itemsPerPage);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const productsToShow = availableProducts.slice(startIndex, startIndex + itemsPerPage);

        const realCurrencySymbol = escapeMarkdown(TELEGRAM_PAYMENT_CURRENCY);

        const productButtons = productsToShow.map(p => {
            const priceParts = [];
            if (TELEGRAM_PROVIDER_TOKEN && p.priceReal > 0) {
                priceParts.push(`${escapeMarkdown(p.priceReal)} ${realCurrencySymbol}`);
            }
            if (p.price > 0) {
                priceParts.push(`${escapeMarkdown(p.price)} ⭐`);
            }
            const priceString = priceParts.join(' / ');

            return [{
                text: `${escapeMarkdown(p.buttonName)} \\- ${priceString}`,
                callback_data: `view_product:${p._id}`
            }]
        });

        const paginationButtons = [];
        if (currentPage > 1) paginationButtons.push({ text: `⬅️`, callback_data: `show_products:${category}:${currentPage - 1}` });
        if (totalPages > 1) paginationButtons.push({ text: `${currentPage}/${totalPages}`, callback_data: `sbl_nop` });
        if (currentPage < totalPages) paginationButtons.push({ text: `➡️`, callback_data: `show_products:${category}:${currentPage + 1}` });
        
        const keyboard = { inline_keyboard: [ 
            ...productButtons, 
            paginationButtons,
            [{ text: "⬅️ Назад к категориям", callback_data: "show_categories:1" }]
        ] };
        
        const text = `*${escapeMarkdown(category === 'none' ? 'Без категории' : category)}*`;
        
        if (message.photo) {
            await config.deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
            await sendMessage(TELEGRAM_TOKEN, chatId, text, keyboard);
        } else {
            await editMessageText(TELEGRAM_TOKEN, chatId, messageId, text, keyboard);
        }
    } catch(e) {
        console.error("Error in handleShowProducts:", e);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}

export async function handleViewProduct(chatId: number, productId: string, messageId: number, config: any, quantity: number = 1, currencyType: 'real' | 'stars' = 'real') {
    const { MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_TOKEN, TELEGRAM_PROVIDER_TOKEN, TELEGRAM_PAYMENT_CURRENCY, redisClient } = config;
    if (!MONGODB_URI) return;

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const product = await mongoClient.db(dbName).collection("products").findOne({ _id: new ObjectId(productId) });

        if (product) {
            const realCurrencySymbol = escapeMarkdown(TELEGRAM_PAYMENT_CURRENCY);
            
            let stockCount = Infinity;
            if (product.type === 'static') {
                stockCount = (product.staticKey || '').split('\n').filter((k: string) => k.trim() !== '').length;
            }

            const currentQuantity = Math.max(1, Math.min(quantity, stockCount));
            
            const totalPriceReal = (product.priceReal || 0) * currentQuantity;
            const totalPriceStars = (product.price || 0) * currentQuantity;

            let text = `*${escapeMarkdown(product.invoiceTitle)}*\n\n${escapeMarkdown(product.invoiceDescription)}`;
            
            const quantityControls = [];
            const quantityRow = [];
            if (stockCount > 0) {
                quantityRow.push({ text: "➖", callback_data: `decrement_quantity:${product._id}:${currentQuantity}:${currencyType}` });
                quantityRow.push({ text: `${currentQuantity} / ${stockCount === Infinity ? '∞' : stockCount}`, callback_data: "sbl_nop" });
                quantityRow.push({ text: "➕", callback_data: `increment_quantity:${product._id}:${currentQuantity}:${currencyType}` });
                quantityControls.push(quantityRow);
            } else {
                 text += `\n\n*Товар закончился*`;
            }

            // Cart Total
            const cartKey = getCartKey(chatId);
            const productIds = await redisClient.lRange(cartKey, 0, -1);
            let cartTotal = 0;
             if (productIds.length > 0) {
                 const productObjectIds = productIds.map((id: string) => new ObjectId(id));
                 const productsInCartDb = await mongoClient.db(dbName).collection("products").find({ _id: { $in: productObjectIds } }).toArray();
                 const productsInCartMap = new Map(productsInCartDb.map(p => [p._id.toString(), p]));
                 const productCounts: {[key: string]: number} = productIds.reduce((acc: any, id: string) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
                 
                 for (const [pId, pCount] of Object.entries(productCounts)) {
                    const p = productsInCartMap.get(pId);
                    if (p) {
                         if (currencyType === 'real' && TELEGRAM_PROVIDER_TOKEN) {
                           cartTotal += (p.priceReal || 0) * pCount;
                        } else {
                           cartTotal += (p.price || 0) * pCount;
                        }
                    }
                 }
            }
            const cartButtonText = `🛒 Корзина ${cartTotal > 0 ? `(${escapeMarkdown(cartTotal)} ${currencyType === 'real' ? realCurrencySymbol : '⭐'})` : ''}`;

            const actionButtons = [];
            if (stockCount > 0) {
                 actionButtons.push({ text: `Добавить в корзину`, callback_data: `add_to_cart_multi:${product._id}:${currentQuantity}` });
            }

            const bottomButtons = [];
            if(TELEGRAM_PROVIDER_TOKEN && product.priceReal > 0 && product.price > 0) {
                 bottomButtons.push({ text: `🔄 Валюта: ${currencyType === 'real' ? realCurrencySymbol : '⭐'}`, callback_data: `switch_currency:${product._id}:${currentQuantity}:${currencyType === 'real' ? 'stars' : 'real'}`});
            }

            const paymentType = currencyType;
            const singlePrice = currencyType === 'real' ? (product.priceReal || 0) : (product.price || 0);
            const totalForButton = singlePrice * currentQuantity;
            
            if (totalForButton > 0) {
                bottomButtons.push({text: `Цена: ${escapeMarkdown(totalForButton)} ${currencyType === 'real' ? realCurrencySymbol : '⭐'}`, callback_data: `buy_now:${product._id}:${currentQuantity}:${paymentType}`});
            }


            const keyboard = {
                inline_keyboard: [
                    ...quantityControls,
                    actionButtons,
                    [{ text: cartButtonText, callback_data: "view_cart" }],
                    [{ text: "⬅️ Назад к товарам", callback_data: `show_products:${product.category || 'none'}:1` }],
                    bottomButtons,
                ].filter(row => row && row.length > 0)
            };
            
            const uniqueText = text + '\u200b'.repeat(Math.floor(Math.random() * 4));

            if (config.message?.photo) {
                await config.deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
                await sendPhoto(TELEGRAM_TOKEN, chatId, product.productImageUrl || config.TELEGRAM_WELCOME_IMAGE_URL, uniqueText, keyboard);
            } else if (product.productImageUrl) {
                 await config.deleteMessage(TELEGRAM_TOKEN, chatId, messageId);
                 await sendPhoto(TELEGRAM_TOKEN, chatId, product.productImageUrl, uniqueText, keyboard);
            }
            else {
                await editMessageText(TELEGRAM_TOKEN, chatId, messageId, uniqueText, keyboard);
            }

         } else {
             await answerCallbackQuery(config.callback_query.id, "Товар не найден.");
         }
    } catch(e) {
        console.error("Error in handleViewProduct:", e);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}

export async function handleAddToCart(chatId: number, productId: string, callbackQueryId: string, config: any, quantity: number = 1) {
    const { redisClient, MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_TOKEN } = config;
    if (!MONGODB_URI) {
        await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Ошибка: База данных не настроена.", true);
        return;
    }

    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const product = await mongoClient.db(dbName).collection("products").findOne({ _id: new ObjectId(productId) });

        if (!product) {
            await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Товар больше не доступен.", true);
            return;
        }

        if (product.type === 'static') {
            const availableKeys = (product.staticKey || '').split('\n').filter((k: string) => k.trim() !== '').length;
            const countInCart = await getQuantityFromCart(redisClient, chatId, productId);

            if (countInCart + quantity > availableKeys) {
                await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Недостаточно товара на складе.", true);
                return;
            }
        }
        
        const cartKey = getCartKey(chatId);
        const itemsToAdd = Array(quantity).fill(productId);
        await redisClient.lPush(cartKey, itemsToAdd);
        await redisClient.expire(cartKey, CART_TTL_SECONDS);
        await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, `✅ Добавлено: ${quantity} шт.`);

    } catch (e) {
        console.error("Error in handleAddToCart:", e);
        await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Произошла ошибка.", true);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}


export async function handleRemoveFromCartOne(chatId: number, productId: string, callbackQueryId: string, config: any) {
    const { redisClient, TELEGRAM_TOKEN } = config;
    const cartKey = getCartKey(chatId);
    await redisClient.lRem(cartKey, 1, productId); 
    await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "➖ Убрано");
}

export async function handleViewCart(chatId: number, messageId: number, config: any) {
    const { redisClient, MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_PROVIDER_TOKEN, TELEGRAM_PAYMENT_CURRENCY, TELEGRAM_TOKEN } = config;
    const cartKey = getCartKey(chatId);
    const productIds = await redisClient.lRange(cartKey, 0, -1);

    if (productIds.length === 0) {
        await editMessageText(TELEGRAM_TOKEN, chatId, messageId, "*🛒 Ваша корзина пуста\\.*", { inline_keyboard: [[{ text: "⬅️ Назад к категориям", callback_data: "show_categories:1" }]] });
        return;
    }
    if (!MONGODB_URI) return;
    
    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const productsCollection = mongoClient.db(dbName).collection("products");

        const productObjectIds = productIds.map(id => new ObjectId(id));
        const productsInCartDb = await productsCollection.find({ _id: { $in: productObjectIds } }).toArray();
        
        // Preserve order of items in cart
        const productsInCart = productIds.map(id => productsInCartDb.find(p => p._id.toString() === id)).filter(Boolean);

        let cartText = "*🛒 Ваша корзина:*";
        let totalPriceStars = 0;
        let totalPriceReal = 0;
        let isCheckoutPossible = true;
        
        const productCounts: {[key: string]: {count: number, product: any}} = {};
        for(const product of productsInCart) {
            const productIdStr = product._id.toString();
            if(!productCounts[productIdStr]) {
                productCounts[productIdStr] = { count: 0, product };
            }
            productCounts[productIdStr].count++;
        }
        
        const cartItemsKeyboard = [];
        const processedProducts = new Set();

        for (const product of productsInCart) {
            const productIdStr = product._id.toString();
            if (processedProducts.has(productIdStr)) continue;
            processedProducts.add(productIdStr);

            const { count } = productCounts[productIdStr];
            
            const priceRealStr = TELEGRAM_PROVIDER_TOKEN && product.priceReal > 0 ? `${escapeMarkdown(product.priceReal * count)} ${escapeMarkdown(TELEGRAM_PAYMENT_CURRENCY)}` : '';
            const priceStarsStr = product.price > 0 ? `${escapeMarkdown(product.price * count)} ⭐` : '';
            const priceString = [priceRealStr, priceStarsStr].filter(Boolean).join(' / ');
            
            let itemButtonText = `*${escapeMarkdown(product.invoiceTitle)}* \\(x${count}\\) \\- ${priceString}`;
            
            if (product.type === 'static') {
                 const availableKeys = (product.staticKey || '').split('\n').filter((k: string) => k.trim() !== '').length;
                 if (count > availableKeys) {
                     itemButtonText += `\n  _⚠️ Не хватает на складе\\! Доступно: ${availableKeys}_`;
                     isCheckoutPossible = false;
                 }
            }

            cartItemsKeyboard.push([{ text: itemButtonText, callback_data: 'sbl_nop' }]);
            cartItemsKeyboard.push([
                { text: `➖`, callback_data: `remove_one_from_cart:${product._id}`},
                { text: `${count} шт.`, callback_data: `sbl_nop`},
                { text: `➕`, callback_data: `add_to_cart:${product._id}`}
            ]);
            
            totalPriceStars += product.price * count;
            totalPriceReal += product.priceReal * count;
        }
        
        const totalRealStr = TELEGRAM_PROVIDER_TOKEN && totalPriceReal > 0 ? `${escapeMarkdown(totalPriceReal)} ${escapeMarkdown(TELEGRAM_PAYMENT_CURRENCY)}` : '';
        const totalStarsStr = totalPriceStars > 0 ? `${escapeMarkdown(totalPriceStars)} ⭐` : '';
        const totalString = [totalRealStr, totalStarsStr].filter(Boolean).join(' / ');

        const totalButton = totalString ? { text: `Итого: ${totalString}`, callback_data: 'sbl_nop' } : null;

        if (!isCheckoutPossible) {
            cartText += `\n\n_Пожалуйста, удалите или измените количество товаров, которых нет в наличии, чтобы продолжить\\._`
        }
        
        const checkoutButtons = [];
        if (isCheckoutPossible && productIds.length > 0) {
            if (TELEGRAM_PROVIDER_TOKEN && totalPriceReal > 0) {
                checkoutButtons.push({ text: `💳 Оплатить ${escapeMarkdown(totalPriceReal)} ${escapeMarkdown(TELEGRAM_PAYMENT_CURRENCY)}`, callback_data: "checkout_cart:real" });
            }
            if (totalPriceStars > 0) {
                checkoutButtons.push({ text: `⭐ Оплатить ${escapeMarkdown(totalPriceStars)}`, callback_data: "checkout_cart:stars" });
            }
        }
        
        const keyboard = {
            inline_keyboard: [
                ...(totalButton ? [[totalButton]] : []),
                ...cartItemsKeyboard,
                checkoutButtons,
                [{ text: "🗑️ Очистить корзину", callback_data: "clear_cart" }],
                [{ text: "⬅️ Назад к категориям", callback_data: "show_categories:1" }]
            ].filter(row => row.length > 0)
        };
        
        await editMessageText(TELEGRAM_TOKEN, chatId, messageId, cartText, keyboard);
    } catch(e) {
        console.error("Error in handleViewCart:", e);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}

export async function handleClearCart(chatId: number, messageId: number, config: any) {
    const cartKey = getCartKey(chatId);
    await config.redisClient.del(cartKey);
    await editMessageText(config.TELEGRAM_TOKEN, chatId, messageId, "✅ Корзина очищена\\.", { inline_keyboard: [[{ text: "⬅️ Назад к категориям", callback_data: "show_categories:1" }]]});
}

export async function handleCheckout(chatId: number, data: string, callbackQueryId: string, config: any) {
    const { MONGODB_URI, MONGODB_DB_NAME, TELEGRAM_PROVIDER_TOKEN, TELEGRAM_PAYMENT_CURRENCY, TELEGRAM_TOKEN, redisClient } = config;
    
    const [action, ...params] = data.split(':');
    const paymentType = params[params.length - 1]; 

    const useStars = paymentType === 'stars';

    if (!useStars && !TELEGRAM_PROVIDER_TOKEN) {
         await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Оплата валютой не настроена.");
         return;
    }

    const currency = useStars ? "XTR" : TELEGRAM_PAYMENT_CURRENCY;
    
    if (!MONGODB_URI) return;
    let mongoClient: MongoClient | undefined;
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const productsCollection = mongoClient.db(dbName).collection("products");

        let title: string;
        let description: string;
        let payload: string;
        let prices: {label: string, amount: number}[] = [];
        let totalAmount = 0;

        if (action === 'buy_now') {
           const [productId, quantityStr] = params;
           const quantity = parseInt(quantityStr, 10) || 1;
           const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
           if (!product) {
               await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Товар не найден.");
               return;
           }
           title = product.invoiceTitle;
           description = product.invoiceDescription;
           payload = `product:${product._id}:${quantity}:${paymentType}`;
           const singlePrice = useStars ? product.price : toSmallestUnit(product.priceReal);
           prices = [{ label: `${product.invoiceTitle} x${quantity}`, amount: singlePrice * quantity }];
           totalAmount = prices[0].amount;

        } else if (action === 'checkout_cart') {
           const cartKey = getCartKey(chatId);
           const productIds = await redisClient.lRange(cartKey, 0, -1);
           if (productIds.length === 0) {
                await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Корзина пуста!");
                return;
           }
           const productObjectIds = productIds.map((id: string) => new ObjectId(id));
           const productsInDb = await productsCollection.find({ _id: { $in: productObjectIds } }).toArray();
           
           const productMap = new Map(productsInDb.map(p => [p._id.toString(), p]));
           
           const productCounts: {[key: string]: number} = productIds.reduce((acc: any, id: string) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});

           title = "Оплата заказа из корзины";
           description = `Оплата ${productIds.length} товаров`;
           payload = `cart_checkout:${chatId}:${paymentType}`;

            for (const product of productsInDb) {
                const count = productCounts[product._id.toString()];
                if (count > 0) {
                     const singlePrice = useStars ? product.price : toSmallestUnit(product.priceReal);
                     prices.push({
                        label: `${product.invoiceTitle} x${count}`,
                        amount: singlePrice * count
                    });
                }
            }
            totalAmount = prices.reduce((sum, p) => sum + p.amount, 0);
        } else {
             await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Неизвестное действие.");
             return;
        }

        if (totalAmount <= 0) {
            await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId, "Нечего оплачивать.");
            return;
        }
       
        await sendInvoice(
           TELEGRAM_TOKEN,
           chatId,
           title,
           description,
           payload,
           useStars ? undefined : TELEGRAM_PROVIDER_TOKEN,
           currency,
           prices,
        );
        await answerCallbackQuery(TELEGRAM_TOKEN, callbackQueryId);
    } catch(e) {
        console.error("Error in handleCheckout:", e);
    } finally {
        if (mongoClient) await mongoClient.close();
    }
}
