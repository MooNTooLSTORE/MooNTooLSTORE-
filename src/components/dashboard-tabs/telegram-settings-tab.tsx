"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plug, Copy, PlusCircle, Trash2, Save, Info } from "lucide-react";
import type { CustomLink } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface TelegramSettingsTabProps {
  telegramToken: string;
  setTelegramToken: (val: string) => void;
  handleBlurSave: (value: any, key: string) => void;
  telegramBotLink: string;
  telegramProviderToken: string;
  setTelegramProviderToken: (val: string) => void;
  telegramPaymentCurrency: string;
  setTelegramPaymentCurrency: (val: string) => void;
  handleSaveConfig: (config: any) => void;
  telegramShopButtonName: string;
  setTelegramShopButtonName: (val: string) => void;
  telegramCustomLinks: CustomLink[];
  handleCustomLinkChange: (index: number, field: 'text' | 'url' | 'showInGroups', value: string | boolean) => void;
  handleSaveCustomLinks: () => void;
  handleRemoveCustomLink: (index: number) => void;
  handleAddCustomLink: () => void;
  telegramWelcomeImageUrl: string;
  setTelegramWelcomeImageUrl: (val: string) => void;
  telegramWelcome: string;
  setTelegramWelcome: (val: string) => void;
  appUrl: string;
  isSettingWebhook: boolean;
  handleSetWebhook: () => void;
  webhookLog: string;
  copyToClipboard: (text: string) => void;
  telegramCategoriesImageUrl: string;
  setTelegramCategoriesImageUrl: (val: string) => void;
}

export function TelegramSettingsTab({
  telegramToken, setTelegramToken,
  handleBlurSave,
  telegramBotLink,
  telegramProviderToken, setTelegramProviderToken,
  telegramPaymentCurrency, setTelegramPaymentCurrency,
  handleSaveConfig,
  telegramShopButtonName, setTelegramShopButtonName,
  telegramCustomLinks,
  handleCustomLinkChange,
  handleSaveCustomLinks,
  handleRemoveCustomLink,
  handleAddCustomLink,
  telegramWelcomeImageUrl, setTelegramWelcomeImageUrl,
  telegramWelcome, setTelegramWelcome,
  appUrl,
  isSettingWebhook, handleSetWebhook,
  webhookLog, copyToClipboard,
  telegramCategoriesImageUrl, setTelegramCategoriesImageUrl,
}: TelegramSettingsTabProps) {
  
  const currencies = [
    { value: 'RUB', label: 'RUB (Российский рубль)' },
    { value: 'USD', label: 'USD (Доллар США)' },
    { value: 'EUR', label: 'EUR (Евро)' },
    { value: 'UAH', label: 'UAH (Украинская гривна)' },
    { value: 'KZT', label: 'KZT (Казахстанский тенге)' },
    { value: 'BYN', label: 'BYN (Белорусский рубль)' },
    { value: 'GBP', label: 'GBP (Британский фунт)' },
    { value: 'CNY', label: 'CNY (Китайский юань)' },
    { value: 'JPY', label: 'JPY (Японская иена)' },
    { value: 'TRY', label: 'TRY (Турецкая лира)' },
    { value: 'INR', label: 'INR (Индийская рупия)' },
    { value: 'BRL', label: 'BRL (Бразильский реал)' },
    { value: 'CAD', label: 'CAD (Канадский доллар)' },
    { value: 'AUD', label: 'AUD (Австралийский доллар)' },
    { value: 'CHF', label: 'CHF (Швейцарский франк)' },
    { value: 'PLN', label: 'PLN (Польский злотый)' },
    { value: 'SEK', label: 'SEK (Шведская крона)' },
    { value: 'NOK', label: 'NOK (Норвежская крона)' },
    { value: 'DKK', label: 'DKK (Датская крона)' },
    { value: 'CZK', label: 'CZK (Чешская крона)' },
    { value: 'HUF', label: 'HUF (Венгерский форинт)' },
    { value: 'ILS', label: 'ILS (Израильский шекель)' },
    { value: 'AED', label: 'AED (Дирхам ОАЭ)' },
  ];

  return (
    <Card className="bg-transparent">
      <CardHeader>
        <CardTitle>Настройки Telegram Бота</CardTitle>
        <CardDescription>Управление подключением и поведением вашего Telegram бота.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram-token">Токен Telegram Бота</Label>
            <Input id="telegram-token" placeholder="123456:ABC-DEF1234..." value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} onBlur={() => handleBlurSave(telegramToken, 'TELEGRAM_TOKEN')} className="bg-background/50" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-2">
              <Label htmlFor="telegram-provider-token">Токен провайдера платежей</Label>
              <Input id="telegram-provider-token" placeholder="Live или Test токен от @BotFather" value={telegramProviderToken} onChange={(e) => setTelegramProviderToken(e.target.value)} onBlur={() => handleBlurSave(telegramProviderToken, 'TELEGRAM_PROVIDER_TOKEN')} className="bg-background/50" />
              <p className="text-xs text-muted-foreground">Для приема платежей в Stars оставьте пустым.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-currency">Валюта платежей</Label>
              <Select value={telegramPaymentCurrency} onValueChange={(value) => { setTelegramPaymentCurrency(value); handleSaveConfig({ TELEGRAM_PAYMENT_CURRENCY: value }); }} disabled={!telegramProviderToken}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Выберите валюту" />
                </SelectTrigger>
                <SelectContent>
                   {currencies.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>{currency.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Используется, если указан токен провайдера.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-shop-button-name">Название кнопки магазина</Label>
            <Input id="telegram-shop-button-name" placeholder="Магазин" value={telegramShopButtonName} onChange={(e) => setTelegramShopButtonName(e.target.value)} onBlur={() => handleBlurSave(telegramShopButtonName, 'TELEGRAM_SHOP_BUTTON_NAME')} className="bg-background/50" />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Кнопки-ссылки в главном меню</Label>
              <Button variant="outline" onClick={handleSaveCustomLinks}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить ссылки
              </Button>
            </div>
            {telegramCustomLinks.map((link, index) => (
              <div key={index} className="flex items-end gap-2 p-3 bg-background/50 rounded-lg border">
                <div className="flex-grow space-y-2">
                  <Label htmlFor={`link-text-${index}`}>Текст кнопки</Label>
                  <Input id={`link-text-${index}`} value={link.text} onChange={(e) => handleCustomLinkChange(index, 'text', e.target.value)} placeholder="Наш чат" />
                </div>
                <div className="flex-grow space-y-2">
                  <Label htmlFor={`link-url-${index}`}>URL-адрес</Label>
                  <Input id={`link-url-${index}`} value={link.url} onChange={(e) => handleCustomLinkChange(index, 'url', e.target.value)} placeholder="https://t.me/your_chat" />
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <Label htmlFor={`link-show-${index}`} className="text-xs">В группах</Label>
                  <Switch id={`link-show-${index}`} checked={link.showInGroups} onCheckedChange={(checked) => handleCustomLinkChange(index, 'showInGroups', checked)} />
                </div>
                <Button variant="destructive" size="icon" onClick={() => handleRemoveCustomLink(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddCustomLink}>
              <PlusCircle className="mr-2 h-4 w-4" /> Добавить кнопку
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="telegram-welcome-image">URL картинки для приветствия</Label>
            <Input id="telegram-welcome-image" placeholder="https://example.com/image.png" value={telegramWelcomeImageUrl} onChange={(e) => setTelegramWelcomeImageUrl(e.target.value)} onBlur={() => handleBlurSave(telegramWelcomeImageUrl, 'TELEGRAM_WELCOME_IMAGE_URL')} className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-categories-image">URL картинки для меню категорий</Label>
            <Input id="telegram-categories-image" placeholder="https://example.com/image.png" value={telegramCategoriesImageUrl} onChange={(e) => setTelegramCategoriesImageUrl(e.target.value)} onBlur={() => handleBlurSave(telegramCategoriesImageUrl, 'TELEGRAM_CATEGORIES_IMAGE_URL')} className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-welcome">Приветственное сообщение</Label>
            <Textarea id="telegram-welcome" placeholder="Введите приветствие..." value={telegramWelcome} onChange={(e) => setTelegramWelcome(e.target.value)} onBlur={() => handleBlurSave(telegramWelcome, 'TELEGRAM_WELCOME_MESSAGE')} className="bg-background/50 h-24" />
          </div>
          <Separator />
          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <Label htmlFor="app-url">Публичный URL приложения (для Webhook)</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-pointer"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Этот URL определяется автоматически из заголовков запроса <br/> или переменной окружения NEXT_PUBLIC_APP_URL.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             </div>
            <Input id="app-url" placeholder="Определяется автоматически..." value={appUrl} readOnly disabled className="bg-background/50 cursor-not-allowed" />
          </div>
          <Button onClick={handleSetWebhook} variant="outline" disabled={isSettingWebhook || !telegramToken}>
            {isSettingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
            Подключить бота (установить Webhook)
          </Button>
          {webhookLog && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="webhook-log">Лог подключения</Label>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookLog)} title="Скопировать лог">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                id="webhook-log"
                readOnly
                value={webhookLog}
                className="bg-background/50 h-24 text-xs"
                placeholder="Здесь будет результат подключения..."
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
