"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductView, Campaign, CampaignTemplate, CustomLink, BackgroundExportStatus, TelegramStats, BotUser, TelegramLog } from "@/types";

export function useDashboardState() {
  const [telegramStats, setTelegramStats] = useState<TelegramStats>({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    newToday: 0,
    newThisWeek: 0,
  });
  const [botUsers, setBotUsers] = useState<BotUser[]>([]);
  const [botUsersPage, setBotUsersPage] = useState(1);
  const [botUsersTotalPages, setBotUsersTotalPages] = useState(1);
  const [botUsersSearchQuery, setBotUsersSearchQuery] = useState("");
  
  const [activeAccordionItem, setActiveAccordionItem] = useState("telegram-panel");

  const tgFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingTg, setIsImportingTg] = useState(false);
  const [fileToImportTg, setFileToImportTg] = useState<File | null>(null);

  const { toast } = useToast();
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramProviderToken, setTelegramProviderToken] = useState("");
  const [telegramPaymentCurrency, setTelegramPaymentCurrency] = useState("RUB");
  const [telegramBotLink, setTelegramBotLink] = useState("");
  const [telegramShopButtonName, setTelegramShopButtonName] = useState("Магазин");
  const [telegramWelcome, setTelegramWelcome] = useState("");
  const [telegramWelcomeImageUrl, setTelegramWelcomeImageUrl] = useState("");
  const [telegramCustomLinks, setTelegramCustomLinks] = useState<CustomLink[]>([]);
  const [telegramLogsLimit, setTelegramLogsLimit] = useState(200);
  const [appUrl, setAppUrl] = useState("");

  const [webhookLog, setWebhookLog] = useState("");
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [telegramLogs, setTelegramLogs] = useState<TelegramLog[]>([]);
  const [projectLogs, setProjectLogs] = useState<any[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productView, setProductView] = useState<ProductView>('list');
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [currentCategoryView, setCurrentCategoryView] = useState<string | null>(null);

  const [tgBgExportStatus, setTgBgExportStatus] = useState<BackgroundExportStatus>({ status: 'idle', progress: 0, total: 0, filePath: null, error: null });
  const [isTgBgExportActionLoading, setIsTgBgExportActionLoading] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsTotalPages, setCampaignsTotalPages] = useState(1);
  const [currentCampaign, setCurrentCampaign] = useState<Partial<Campaign>>({ name: '', text: '', imageUrl: '', lifetimeHours: 24 });
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isCampaignActionLoading, setIsCampaignActionLoading] = useState<string | null>(null);

  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<CampaignTemplate> | null>(null);
  
  const fetchTelegramStats = useCallback(async () => {
    try {
      const response = await fetch('/api/telegram/stats');
      if (response.ok) {
        const data = await response.json();
        setTelegramStats(data);
      }
    } catch (error) {
      console.error('Error fetching Telegram stats:', error);
    }
  }, []);

  const fetchBotUsers = useCallback(async (page = 1, search = botUsersSearchQuery) => {
    try {
        const response = await fetch(`/api/telegram/stats?type=users&page=${page}&limit=15&search=${encodeURIComponent(search)}`);
        if(response.ok) {
            const data = await response.json();
            setBotUsers(data.users);
            setBotUsersPage(data.currentPage);
            setBotUsersTotalPages(data.totalPages);
        }
    } catch (error) {
        console.error("Error fetching bot users", error);
    }
  }, [botUsersSearchQuery]);

  const handleBotUsersSearch = () => {
    setBotUsersPage(1);
    fetchBotUsers(1, botUsersSearchQuery);
  }

  const handleBotUserPageChange = (newPage: number) => {
      setBotUsersPage(newPage);
      fetchBotUsers(newPage, botUsersSearchQuery);
  }

  const fetchLogs = useCallback(async (logType: 'telegram' | 'project') => {
    try {
      const response = await fetch(`/api/telegram?type=${logType}`);
      if (response.ok) {
        const data = await response.json();
        if (logType === 'telegram') {
          setTelegramLogs(data);
        } else {
          setProjectLogs(data);
        }
      } else {
        console.error(`Failed to fetch ${logType} logs, status:`, response.status);
      }
    } catch (error) {
      console.error(`Error fetching ${logType} logs:`, error);
    }
  }, []);

  const fetchCampaigns = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`/api/campaigns?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
        setCampaignsPage(data.currentPage);
        setCampaignsTotalPages(data.totalPages);
      } else {
        const errorData = await response.json();
        if (response.status !== 403) {
          toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось загрузить кампании: ${errorData.error}` });
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось загрузить кампании: ${error.message}` });
    }
  }, [toast]);

  const handleCampaignPageChange = (newPage: number) => {
    fetchCampaigns(newPage);
  }

  const fetchProductsAndCategories = useCallback(async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products?type=categories')
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products);
      } else {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить список товаров.' });
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setProductCategories(data.categories);
      } else {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить список категорий.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    }
  }, [toast]);

  const handleSaveConfig = useCallback(async (configToSave: any) => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save config');
      }
      toast({
        title: "Настройки сохранены",
        description: "Конфигурация была успешно обновлена.",
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        variant: "destructive",
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить конфигурацию.",
      });
    }
  }, [toast]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        setTelegramToken(data.TELEGRAM_TOKEN || "");
        setTelegramProviderToken(data.TELEGRAM_PROVIDER_TOKEN || "");
        setTelegramPaymentCurrency(data.TELEGRAM_PAYMENT_CURRENCY || "RUB");
        setTelegramBotLink(data.TELEGRAM_BOT_LINK || "");
        setTelegramShopButtonName(data.TELEGRAM_SHOP_BUTTON_NAME || "Магазин");
        setTelegramWelcome(data.TELEGRAM_WELCOME_MESSAGE || "🤖 Привет! Я твой магазин от https://t.me/MooNTooLKIT");
        setTelegramWelcomeImageUrl(data.TELEGRAM_WELCOME_IMAGE_URL || "");
        setTelegramCustomLinks(data.TELEGRAM_CUSTOM_LINKS || []);
        setTelegramLogsLimit(data.TELEGRAM_LOGS_LIMIT || 200);
        setAppUrl(data.NEXT_PUBLIC_APP_URL || "");
      } else {
        throw new Error("Failed to fetch config from server.");
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast({ variant: "destructive", title: "Ошибка загрузки настроек", description: "Не удалось загрузить конфигурацию с сервера." });
    }
  }, [toast]);

  const fetchTgBgExportStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/backup/telegram');
      if (response.ok) {
        const data = await response.json();
        setTgBgExportStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch tg bg export status", error);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchTelegramStats();
    fetchProductsAndCategories();
    fetchTgBgExportStatus();
  }, [fetchConfig, fetchProductsAndCategories, fetchTelegramStats, fetchTgBgExportStatus]);

  useEffect(() => {
    let dataInterval: NodeJS.Timeout;

    const setupIntervals = () => {
      if (document.visibilityState !== 'visible') return;

      if (activeAccordionItem === 'telegram-panel') {
        fetchTelegramStats();
        fetchBotUsers(botUsersPage, botUsersSearchQuery);
      } else if (activeAccordionItem === 'telegram-logs') {
        fetchLogs('telegram');
      } else if (activeAccordionItem === 'project-logs') {
        fetchLogs('project');
      } else if (activeAccordionItem === 'settings' || activeAccordionItem === 'telegram-bot-settings') {
        fetchTgBgExportStatus();
      } else if (activeAccordionItem === 'advertising') {
        fetchCampaigns(campaignsPage);
      }
    };

    setupIntervals(); // Initial fetch on tab change
    dataInterval = setInterval(setupIntervals, 5000);

    if (activeAccordionItem === 'products') {
      fetchProductsAndCategories();
      setCurrentCategoryView(null);
      setProductView('list');
    }

    if (activeAccordionItem === 'advertising') {
      fetchCampaigns(1);
    }
    
    return () => {
      if (dataInterval) clearInterval(dataInterval);
    }
  }, [activeAccordionItem, fetchLogs, fetchTelegramStats, fetchTgBgExportStatus, fetchCampaigns, fetchProductsAndCategories, fetchBotUsers, botUsersPage, botUsersSearchQuery, campaignsPage]);

  const handleClearDB = async () => {
    try {
      const response = await fetch('/api/data', {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear DB');
      }
      toast({
        title: "Данные очищены",
        description: "Все данные проекта были удалены.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка очистки",
        description: error.message,
      });
    }
  };

  const handleClearLogs = async (logType: 'telegram' | 'project') => {
    try {
      const response = await fetch(`/api/telegram?type=${logType}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMsg = 'Не удалось очистить логи';
        try {
            const data = await response.json();
            errorMsg = data.error || errorMsg;
          } catch (e) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      toast({
        title: "Логи очищены",
        description: data.message,
      });
      if(logType === 'telegram') fetchLogs('telegram');
      else fetchLogs('project');

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка очистки логов",
        description: error.message,
      });
    }
  };
  
  const handleFileSelectTg = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFileToImportTg(event.target.files[0]);
    } else {
      setFileToImportTg(null);
    }
  };

  const handleTriggerImportTg = () => {
    tgFileInputRef.current?.click();
  };

  const handleConfirmImportTg = async () => {
    if (!fileToImportTg) return;

    setIsImportingTg(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') throw new Error("Failed to read file content.");
        const data = JSON.parse(content);
        
        const response = await fetch('/api/backup/telegram?action=import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to import Telegram database');

        toast({ title: "Импорт завершен", description: result.message });
        await fetchTelegramStats();
        
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Ошибка импорта БД ТГ",
          description: error.message || "Убедитесь, что это корректный JSON файл.",
        });
      } finally {
        setIsImportingTg(false);
        setFileToImportTg(null);
        if (tgFileInputRef.current) tgFileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Ошибка чтения файла", description: "Не удалось прочитать выбранный файл." });
      setIsImportingTg(false);
      setFileToImportTg(null);
    };
    reader.readAsText(fileToImportTg);
  };

  const handleSetWebhook = async () => {
    setIsSettingWebhook(true);
    setWebhookLog("Подключение...");

    try {
      const response = await fetch('/api/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: telegramToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось установить вебхук.');
      }
      toast({
        title: "Вебхук установлен",
        description: data.message,
      });
      setWebhookLog(`Успех: ${data.message}`);
      await fetchConfig(); // Refetch config to get the new bot link
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка подключения",
        description: error.message,
      });
      setWebhookLog(`Ошибка: ${error.message}`);
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена.",
      duration: 2000,
    });
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    setIsSavingProduct(true);
    try {
      const method = productData._id ? 'PUT' : 'POST';
      const response = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить товар.');
      }
      toast({ title: 'Успех', description: 'Товар успешно сохранен.' });
      setProductView('list');
      setCurrentProduct(null);
      fetchProductsAndCategories();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: productId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить товар.');
      }
      toast({ title: 'Успех', description: 'Товар удален.' });
      fetchProductsAndCategories();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    }
  };

  const openProductForm = (category: string | null) => {
    setCurrentProduct({
      category: category || '',
      buttonName: '',
      invoiceTitle: '',
      invoiceDescription: '',
      price: 1,
      priceReal: 10,
      type: 'static',
      productImageUrl: '',
      staticKey: '',
      apiUrl: '',
      apiToken: '',
      apiDays: 30,
    });
    setProductView('form');
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Название категории не может быть пустым.' });
      return;
    }
    setIsAddingCategory(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_category', categoryName: newCategory }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать категорию.');
      }
      setProductCategories(data.categories);
      toast({ title: 'Успех', description: `Категория "${newCategory}" создана.` });
      setNewCategory('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_category', categoryName }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить категорию.');
      }
      setProductCategories(data.categories);
      toast({ title: 'Успех', description: `Категория "${categoryName}" удалена.` });
      fetchProductsAndCategories(); // Refresh products as their category might have changed
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    }
  };

  const handleCustomLinkChange = (index: number, field: 'text' | 'url' | 'showInGroups', value: string | boolean) => {
    const newLinks = [...telegramCustomLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setTelegramCustomLinks(newLinks);
  };

  const handleSaveCustomLinks = () => {
    handleSaveConfig({ TELEGRAM_CUSTOM_LINKS: telegramCustomLinks });
  };

  const handleAddCustomLink = () => {
    setTelegramCustomLinks(prev => [...prev, { text: '', url: '', showInGroups: true }]);
  };

  const handleRemoveCustomLink = (index: number) => {
    const newLinks = telegramCustomLinks.filter((_, i) => i !== index);
    setTelegramCustomLinks(newLinks);
    handleSaveConfig({ TELEGRAM_CUSTOM_LINKS: newLinks });
  };

  const handleBlurSave = (value: any, key: string) => {
    handleSaveConfig({ [key]: value });
  };

  const handleTgBgExportAction = async (action: 'start' | 'stop' | 'clear') => {
    setIsTgBgExportActionLoading(true);
    try {
      const response = await fetch('/api/backup/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось выполнить действие');
      }
      toast({ title: "Успех", description: data.message });
      fetchTgBgExportStatus();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    } finally {
      setIsTgBgExportActionLoading(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!currentTemplate || !currentTemplate.name || !currentTemplate.text) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Название и текст шаблона не могут быть пустыми.' });
      return;
    }

    // Since localStorage is not available in server components or during SSR,
    // we manage templates in state. For persistence, this should be an API call.
    if (currentTemplate.id) { // Editing existing
      setCampaignTemplates(prev => prev.map(t => t.id === currentTemplate.id ? currentTemplate as CampaignTemplate : t));
      toast({ title: 'Шаблон обновлен' });
    } else { // Creating new
      const newTemplate: CampaignTemplate = { ...currentTemplate, id: Date.now().toString() } as CampaignTemplate;
      setCampaignTemplates(prev => [...prev, newTemplate]);
      toast({ title: 'Шаблон создан' });
    }

    setIsTemplateDialogOpen(false);
    setCurrentTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    setCampaignTemplates(prev => prev.filter(t => t.id !== id));
    toast({ variant: 'destructive', title: 'Шаблон удален' });
  };

  const handleInsertTemplate = (text: string) => {
    setCurrentCampaign(prev => ({ ...prev, text: (prev.text || '') + text }));
    toast({ title: 'Шаблон вставлен' });
  }
  
  const handleCampaignAction = async (action: 'restart' | 'stop' | 'delete', campaignId: string) => {
    setIsCampaignActionLoading(campaignId);
    try {
        const isDelete = action === 'delete';
        const method = isDelete ? 'DELETE' : (action === 'stop' ? 'PUT' : 'POST');
        const body = isDelete 
            ? { campaignId } 
            : { action, campaignId };

        const response = await fetch('/api/campaigns', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Не удалось выполнить действие: ${action}`);
        }
        
        toast({ title: 'Успех', description: result.message || `Действие "${action}" выполнено.` });
        
        if (isDelete) {
            setCampaigns(prev => prev.filter(c => c._id !== campaignId));
        } else {
            fetchCampaigns(); // Refresh the list
        }

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    } finally {
        setIsCampaignActionLoading(null);
    }
  };

  const handleCreateCampaign = async () => {
    if (!currentCampaign.name || !currentCampaign.text) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Название и текст рассылки обязательны.' });
      return;
    }
    setIsCreatingCampaign(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCampaign)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Не удалось создать кампанию.');
      }
      toast({ title: 'Успех', description: 'Рассылка запущена.' });
      setCampaigns(prev => [result.campaign, ...prev]);
      setCurrentCampaign({ name: '', text: '', lifetimeHours: 24, imageUrl: '' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка создания кампании', description: error.message });
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleToggleUserData = async (chatId: number, data: any) => {
    try {
      const response = await fetch('/api/telegram/stats', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, ...data }),
      });
      const result = await response.json();
      if (!response.ok) {
          throw new Error(result.error || 'Не удалось обновить данные пользователя');
      }
      toast({ title: 'Успех', description: result.message });
      fetchBotUsers(botUsersPage, botUsersSearchQuery);
      fetchTelegramStats();
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    }
  };
  
  const handleToggleUserBan = (chatId: number, currentStatus: 'active' | 'banned') => {
      const newStatus = currentStatus === 'active' ? 'banned' : 'active';
      handleToggleUserData(chatId, { status: newStatus });
  };

  const handleToggleUserRole = (chatId: number, currentRole: 'user' | 'moderator') => {
      const newRole = currentRole === 'user' ? 'moderator' : 'user';
      handleToggleUserData(chatId, { role: newRole });
  };

  return {
    telegramStats,
    botUsers,
    botUsersPage,
    botUsersTotalPages,
    handleBotUserPageChange,
    botUsersSearchQuery,
    setBotUsersSearchQuery,
    handleBotUsersSearch,
    handleToggleUserBan,
    handleToggleUserRole,
    activeAccordionItem,
    setActiveAccordionItem,
    tgFileInputRef,
    isImportingTg,
    fileToImportTg,
    setFileToImportTg,
    handleFileSelectTg,
    handleTriggerImportTg,
    handleConfirmImportTg,
    handleClearDB,
    telegramLogs,
    handleClearLogs,
    copyToClipboard,
    telegramLogsLimit,
    projectLogs,
    productView,
    currentProduct,
    handleSaveProduct,
    setProductView,
    setCurrentProduct,
    isSavingProduct,
    telegramProviderToken,
    telegramPaymentCurrency,
    currentCategoryView,
    setCurrentCategoryView,
    openProductForm,
    isAddingCategory,
    newCategory,
    setNewCategory,
    handleAddCategory,
    productCategories,
    handleDeleteCategory,
    products,
    handleDeleteProduct,
    currentCampaign,
    setCurrentCampaign,
    campaigns,
    campaignsPage,
    campaignsTotalPages,
    handleCampaignPageChange,
    campaignTemplates,
    setCurrentTemplate,
    setIsTemplateDialogOpen,
    handleInsertTemplate,
    handleDeleteTemplate,
    isCreatingCampaign,
    handleCreateCampaign,
    handleCampaignAction,
    isCampaignActionLoading,
    telegramToken,
    setTelegramToken,
    handleBlurSave,
    telegramBotLink,
    setTelegramProviderToken,
    setTelegramPaymentCurrency,
    handleSaveConfig,
    telegramShopButtonName,
    setTelegramShopButtonName,
    telegramCustomLinks,
    handleCustomLinkChange,
    handleSaveCustomLinks,
    handleRemoveCustomLink,
    handleAddCustomLink,
    telegramWelcomeImageUrl,
    setTelegramWelcomeImageUrl,
    telegramWelcome,
    setTelegramWelcome,
    appUrl,
    isSettingWebhook,
    handleSetWebhook,
    webhookLog,
    setTelegramLogsLimit,
    tgBgExportStatus,
    handleTgBgExportAction,
    isTgBgExportActionLoading,
    isTemplateDialogOpen,
    handleSaveTemplate,
    currentTemplate
  };
}
