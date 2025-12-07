
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { TelegramDashboard } from "@/components/dashboard-tabs/telegram-dashboard";
import { ProductsTab } from "@/components/dashboard-tabs/products-tab";
import { AdvertisingTab } from "@/components/dashboard-tabs/advertising-tab";
import { TelegramSettingsTab } from "@/components/dashboard-tabs/telegram-settings-tab";
import { SystemSettingsTab } from "@/components/dashboard-tabs/system-settings-tab";
import { AboutTab } from "@/components/dashboard-tabs/about-tab";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  FileText,
  Bot,
  Store,
  Send,
  Settings,
  Users,
  Copy,
  Trash2,
  Info,
  Server,
} from "lucide-react";
import type { TelegramLog } from "@/types";

// This is the type for the props that DashboardUI will accept.
// It's essentially the return type of our useDashboardState hook.
type DashboardUIProps = ReturnType<typeof import('@/hooks/useDashboardState').useDashboardState>;

export function DashboardUI({
  // Destructure all the state and handlers from props
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
  currentTemplate,
  categoryModalOpen,
  setCategoryModalOpen,
  currentCategory,
  setCurrentCategory,
  openCategoryModal,
  handleSaveCategory,
  // bulk delete props
  selectedProductIds,
  setSelectedProductIds,
  handleDeleteSelectedProducts,
  telegramCategoriesImageUrl,
  setTelegramCategoriesImageUrl,
}: DashboardUIProps) {

  const renderContent = (itemName: string) => {
    switch (itemName) {
      case "telegram-panel":
        return <TelegramDashboard
          stats={telegramStats}
          botUsers={botUsers}
          botUsersPage={botUsersPage}
          botUsersTotalPages={botUsersTotalPages}
          onPageChange={handleBotUserPageChange}
          searchQuery={botUsersSearchQuery}
          setSearchQuery={setBotUsersSearchQuery}
          handleSearch={handleBotUsersSearch}
          handleToggleUserBan={handleToggleUserBan}
          handleToggleUserRole={handleToggleUserRole}
        />;
      case "products":
        return <ProductsTab
          productView={productView}
          currentProduct={currentProduct}
          handleSaveProduct={handleSaveProduct}
          setProductView={setProductView}
          setCurrentProduct={setCurrentProduct}
          isSavingProduct={isSavingProduct}
          telegramProviderToken={telegramProviderToken}
          telegramPaymentCurrency={telegramPaymentCurrency}
          currentCategoryView={currentCategoryView}
          setCurrentCategoryView={setCurrentCategoryView}
          openProductForm={openProductForm}
          isAddingCategory={isAddingCategory}
          handleSaveCategory={handleSaveCategory}
          productCategories={productCategories}
          handleDeleteCategory={handleDeleteCategory}
          products={products}
          handleDeleteProduct={handleDeleteProduct}
          categoryModalOpen={categoryModalOpen}
          setCategoryModalOpen={setCategoryModalOpen}
          currentCategory={currentCategory}
          setCurrentCategory={setCurrentCategory}
          openCategoryModal={openCategoryModal}
          selectedProductIds={selectedProductIds}
          setSelectedProductIds={setSelectedProductIds}
          handleDeleteSelectedProducts={handleDeleteSelectedProducts}
        />;
      case "advertising":
        return <AdvertisingTab
          currentCampaign={currentCampaign}
          setCurrentCampaign={setCurrentCampaign}
          campaigns={campaigns}
          campaignsPage={campaignsPage}
          campaignsTotalPages={campaignsTotalPages}
          onPageChange={handleCampaignPageChange}
          campaignTemplates={campaignTemplates}
          setCurrentTemplate={setCurrentTemplate}
          setIsTemplateDialogOpen={setIsTemplateDialogOpen}
          handleInsertTemplate={handleInsertTemplate}
          handleDeleteTemplate={handleDeleteTemplate}
          isCreatingCampaign={isCreatingCampaign}
          handleCreateCampaign={handleCreateCampaign}
          handleCampaignAction={handleCampaignAction}
          isCampaignActionLoading={isCampaignActionLoading}
        />;
      case "telegram-bot-settings":
        return <TelegramSettingsTab
          telegramToken={telegramToken}
          setTelegramToken={setTelegramToken}
          handleBlurSave={handleBlurSave}
          telegramBotLink={telegramBotLink}
          telegramProviderToken={telegramProviderToken}
          setTelegramProviderToken={setTelegramProviderToken}
          telegramPaymentCurrency={telegramPaymentCurrency}
          setTelegramPaymentCurrency={setTelegramPaymentCurrency}
          handleSaveConfig={handleSaveConfig}
          telegramShopButtonName={telegramShopButtonName}
          setTelegramShopButtonName={setTelegramShopButtonName}
          telegramCustomLinks={telegramCustomLinks}
          handleCustomLinkChange={handleCustomLinkChange}
          handleSaveCustomLinks={handleSaveCustomLinks}
          handleRemoveCustomLink={handleRemoveCustomLink}
          handleAddCustomLink={handleAddCustomLink}
          telegramWelcomeImageUrl={telegramWelcomeImageUrl}
          setTelegramWelcomeImageUrl={setTelegramWelcomeImageUrl}
          telegramCategoriesImageUrl={telegramCategoriesImageUrl}
          setTelegramCategoriesImageUrl={setTelegramCategoriesImageUrl}
          telegramWelcome={telegramWelcome}
          setTelegramWelcome={setTelegramWelcome}
          appUrl={appUrl}
          isSettingWebhook={isSettingWebhook}
          handleSetWebhook={handleSetWebhook}
          webhookLog={webhookLog}
          copyToClipboard={copyToClipboard}
        />;
      case "telegram-logs":
        return (
          <Card className="bg-transparent">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Логи вебхуков Telegram</CardTitle>
                  <CardDescription>Здесь отображаются последние {telegramLogsLimit} входящих запросов от Telegram.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(telegramLogs, null, 2))}>
                    <Copy className="mr-2 h-4 w-4" />
                    Скопировать все
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Очистить логи
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. Все логи вебхуков Telegram будут удалены.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleClearLogs('telegram')} className="bg-destructive hover:bg-destructive/90">
                          Да, очистить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full bg-background/50 rounded-md border p-4">
                {telegramLogs.length > 0 ? (
                  telegramLogs.map((log: TelegramLog, index: number) => (
                    <div key={index} className="mb-4 pb-4 border-b border-border last:border-b-0 last:mb-0 last:pb-0">
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <pre className="text-xs whitespace-pre-wrap break-all bg-background/50 p-3 rounded-md">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Ожидание входящих запросов от Telegram...</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        );
      case "project-logs":
        return (
          <Card className="bg-transparent">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Логи проекта</CardTitle>
                  <CardDescription>Здесь отображаются ошибки и важные события сервера.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(projectLogs, null, 2))}>
                    <Copy className="mr-2 h-4 w-4" />
                    Скопировать все
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Очистить логи
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. Все логи проекта будут удалены.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleClearLogs('project')} className="bg-destructive hover:bg-destructive/90">
                          Да, очистить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full bg-background/50 rounded-md border p-4">
                {projectLogs.length > 0 ? (
                  projectLogs.map((log, index) => (
                    <div key={index} className="mb-4 pb-4 border-b border-border last:border-b-0 last:mb-0 last:pb-0">
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <pre className="text-xs whitespace-pre-wrap break-all bg-background/50 p-3 rounded-md">
                        {log.message}{log.stack ? `\n\n${log.stack}` : ''}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Нет ошибок или событий проекта для отображения.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        );
      case "settings":
        return <SystemSettingsTab
          telegramLogsLimit={telegramLogsLimit}
          setTelegramLogsLimit={setTelegramLogsLimit}
          handleBlurSave={handleBlurSave}
          isImportingTg={isImportingTg}
          handleTriggerImportTg={handleTriggerImportTg}
          handleClearDB={handleClearDB}
          tgBgExportStatus={tgBgExportStatus}
          handleTgBgExportAction={handleTgBgExportAction}
          isTgBgExportActionLoading={isTgBgExportActionLoading}
        />;
      case "about":
        return <AboutTab />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 7L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 7L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <CardTitle className="text-3xl font-headline animate-neon-glow">MooNTooLSTORE</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground pt-2">Панель для управления вашим Telegram-ботом.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
          <AccordionItem value="telegram-panel">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Панель ТГ
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("telegram-panel")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="products">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" /> Товары
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("products")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="advertising">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Реклама
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("advertising")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="telegram-bot-settings">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" /> Настройки ТГ Бота
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("telegram-bot-settings")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="telegram-logs">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Логи Telegram
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("telegram-logs")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="project-logs">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" /> Логи Проекта
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("project-logs")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="settings">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Настройки Системы
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("settings")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="about">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" /> О программе
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderContent("about")}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <input
        type="file"
        ref={tgFileInputRef}
        className="hidden"
        accept=".json"
        onChange={handleFileSelectTg}
      />
      <Dialog open={!!fileToImportTg} onOpenChange={(open) => !open && setFileToImportTg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение импорта БД Telegram</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите импортировать файл <span className="font-bold text-foreground">{fileToImportTg?.name}</span>? Это действие удалит всех текущих пользователей бота и заменит их данными из файла. Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setFileToImportTg(null)} variant="secondary">Отмена</Button>
            <Button onClick={handleConfirmImportTg} disabled={isImportingTg} variant="destructive">Да, импортировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentTemplate?.id ? 'Редактировать шаблон' : 'Создать новый шаблон'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Название шаблона</Label>
              <input
                id="template-name"
                value={currentTemplate?.name || ''}
                onChange={(e) => setCurrentTemplate(t => t ? ({ ...t, name: e.target.value }) : { name: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-text">Текст шаблона</Label>
              <Textarea
                id="template-text"
                className="h-32"
                value={currentTemplate?.text || ''}
                onChange={(e) => setCurrentTemplate(t => t ? ({ ...t, text: e.target.value }) : { text: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsTemplateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveTemplate}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
