"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Upload,
  Trash2,
  Archive,
  Download,
  Play,
  StopCircle,
} from "lucide-react";
import type { BackgroundExportStatus } from "@/types";

interface SystemSettingsTabProps {
  telegramLogsLimit: number;
  setTelegramLogsLimit: (val: number) => void;
  handleBlurSave: (value: any, key: string) => void;
  isImportingTg: boolean;
  handleTriggerImportTg: () => void;
  handleClearDB: () => void;
  tgBgExportStatus: BackgroundExportStatus;
  handleTgBgExportAction: (action: 'start' | 'stop' | 'clear') => void;
  isTgBgExportActionLoading: boolean;
}


export function SystemSettingsTab({
  telegramLogsLimit, setTelegramLogsLimit,
  handleBlurSave,
  isImportingTg, handleTriggerImportTg,
  handleClearDB,
  tgBgExportStatus, handleTgBgExportAction, isTgBgExportActionLoading,
}: SystemSettingsTabProps) {

  const handleDownloadBackup = () => {
    if (tgBgExportStatus.filePath) {
      const fileName = tgBgExportStatus.filePath.split(/[\\/]/).pop();
      if (fileName) {
          window.location.href = `/api/download?file=${encodeURIComponent(fileName)}`;
      }
    }
  }

  return (
    <Card className="bg-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Настройки Системы</CardTitle>
            <CardDescription>Управление подключениями, логами и данными.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">Настройки логов</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="telegram-logs-limit">Лимит логов Telegram</Label>
              <Input id="telegram-logs-limit" type="number" placeholder="200" value={telegramLogsLimit} onChange={(e) => setTelegramLogsLimit(Number(e.target.value))} onBlur={() => handleBlurSave(telegramLogsLimit, 'TELEGRAM_LOGS_LIMIT')} className="bg-background/50" />
              <p className="text-xs text-muted-foreground">Макс. кол-во запросов от Telegram для хранения.</p>
            </div>
          </div>
        </div>

        <Separator />
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">Управление данными</h3>
          <div className="space-y-6">
            <div className="p-4 bg-background/50 rounded-lg border space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Фоновый экспорт БД Telegram</Label>
                  <CardDescription>
                    Запускает процесс экспорта базы пользователей Telegram (`bot_users`). Готовый файл будет сохранен в папке `backups`.
                  </CardDescription>
                </div>
                 <div className="flex gap-2 items-center">
                    {isTgBgExportActionLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            {tgBgExportStatus.status === 'running' ? (
                                <Button variant="secondary" size="icon" onClick={() => handleTgBgExportAction('stop')} title="Остановить экспорт"><StopCircle className="h-5 w-5"/></Button>
                            ) : (
                                <Button variant="secondary" size="icon" onClick={() => handleTgBgExportAction('start')} title="Начать экспорт"><Play className="h-5 w-5"/></Button>
                            )}
                            <Button variant="destructive" size="icon" onClick={() => handleTgBgExportAction('clear')} title="Очистить статус"><Trash2 className="h-5 w-5"/></Button>
                        </>
                    )}
                 </div>
              </div>
                {(tgBgExportStatus.status !== 'idle' && tgBgExportStatus.status !== 'stopped') && (
                 <div className="space-y-2 pt-2">
                    <Progress value={tgBgExportStatus.total > 0 ? (tgBgExportStatus.progress / tgBgExportStatus.total) * 100 : 0} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{tgBgExportStatus.status}</span>
                        <span>{tgBgExportStatus.progress} / {tgBgExportStatus.total}</span>
                    </div>
                     {tgBgExportStatus.status === 'error' && <p className="text-sm text-destructive">{tgBgExportStatus.error}</p>}
                 </div>
                )}
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button variant="outline" onClick={handleTriggerImportTg} disabled={isImportingTg}>
                {isImportingTg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Загрузить базу
              </Button>
              <Button variant="outline" onClick={handleDownloadBackup} disabled={tgBgExportStatus.status !== 'completed'}>
                <Download className="mr-2 h-4 w-4" />
                Скачать базу
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Очистить данные проекта</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Вы абсолютно уверены?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие необратимо. Все данные, связанные с Telegram ботом, включая
                      статистику, товары, кампании и пользователей, будут навсегда удалены.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearDB} className="bg-destructive hover:bg-destructive/90">
                      Да, очистить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
