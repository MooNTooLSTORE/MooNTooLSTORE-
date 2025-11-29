
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { deployToGithub } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanelPage() {
  const [uiRepo, setUiRepo] = useState("https://github.com/MooNTooLSTORE/MooNTooLSTORE_UI.git");
  const [apiRepo, setApiRepo] = useState("https://github.com/MooNTooLSTORE/MooNTooLSTOREAPI.git");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isDeploying, setIsDeploying] = useState<"ui" | "api" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("github_token");
      if (savedToken) setToken(savedToken);
      const savedUiRepo = localStorage.getItem("github_ui_repo");
      if (savedUiRepo) setUiRepo(savedUiRepo);
      const savedApiRepo = localStorage.getItem("github_api_repo");
      if (savedApiRepo) setApiRepo(savedApiRepo);
    } catch (error) {
      console.warn("Could not read from localStorage:", error);
    }
  }, []);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, key: string, value: string) => {
    setter(value);
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Could not save ${key} to localStorage:`, error);
    }
  };

  useEffect(() => {
    if (isDeploying) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/deploy-logs');
          if (response.ok) {
            const text = await response.text();
            const newLogs = text.split('\n').filter(log => log.trim() !== '');
            setLogs(newLogs);
            
            if (text.includes("SUCCESS:") || text.includes("КРИТИЧЕСКАЯ ОШИБКА:")) {
              setIsDeploying(null);
              if (text.includes("SUCCESS:")) {
                  toast({ title: "Успех", description: "Деплой успешно завершен!" });
              } else if (text.includes("КРИТИЧЕСКАЯ ОШИБКА:")) {
                  const match = text.match(/КРИТИЧЕСКАЯ ОШИБКА: (.*)/);
                  toast({ variant: "destructive", title: "Ошибка деплоя", description: match ? match[1] : "Произошла неизвестная ошибка." });
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch deploy logs:", error);
        }
      }, 1000); 

      return () => clearInterval(interval);
    }
  }, [isDeploying, toast]);
  
  useEffect(() => {
    if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);


  const handleDeploy = async (deployType: 'ui' | 'api') => {
    setLogs([`Подготовка к деплою ${deployType.toUpperCase()}...`]);
    setIsDeploying(deployType);
    
    const repoUrl = deployType === 'ui' ? uiRepo : apiRepo;
    
    try {
        const result = await deployToGithub(deployType, repoUrl, token);
        if (!result.success) throw new Error(result.error);
        toast({
            title: "Процесс запущен",
            description: `Начался процесс деплоя ${deployType.toUpperCase()}.`,
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Критическая ошибка запуска",
            description: e.message || `Не удалось запустить процесс деплоя ${deployType.toUpperCase()}.`,
        });
        setLogs(prev => [...prev, `КРИТИЧЕСКАЯ ОШИБКА ЗАПУСКА: ${e.message}`]);
        setIsDeploying(null);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
        const response = await fetch('/api/download-project');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Не удалось скачать проект.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `MooNTooLSTORE-project-${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast({ title: 'Загрузка началась', description: 'Проект успешно скачивается.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Ошибка скачивания', description: error.message });
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Панель управления</CardTitle>
          <CardDescription>
            Выгрузка проекта на GitHub и скачивание.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <h3 className="font-semibold">Синхронизация с GitHub</h3>
            <div className="space-y-2">
              <Label htmlFor="ui-repo">Репозиторий UI</Label>
              <Input
                id="ui-repo"
                type="text"
                value={uiRepo}
                onChange={(e) => handleInputChange(setUiRepo, "github_ui_repo", e.target.value)}
                disabled={!!isDeploying}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-repo">Репозиторий API</Label>
              <Input
                id="api-repo"
                type="text"
                value={apiRepo}
                onChange={(e) => handleInputChange(setApiRepo, "github_api_repo", e.target.value)}
                disabled={!!isDeploying}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github-token">Токен GitHub</Label>
              <div className="relative">
                <Input
                  id="github-token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => handleInputChange(setToken, "github_token", e.target.value)}
                  placeholder="Введите ваш Personal Access Token"
                  disabled={!!isDeploying}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                  disabled={!!isDeploying}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showToken ? 'Скрыть токен' : 'Показать токен'}</span>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={() => handleDeploy('ui')} disabled={!!isDeploying || !token || !uiRepo}>
                {isDeploying === 'ui' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeploying === 'ui' ? "Деплой UI..." : "Деплой UI"}
              </Button>
               <Button onClick={() => handleDeploy('api')} disabled={!!isDeploying || !token || !apiRepo}>
                {isDeploying === 'api' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeploying === 'api' ? "Деплой API..." : "Деплой API"}
              </Button>
            </div>
          </div>
          
           <div className="p-4 border rounded-lg bg-card space-y-4">
              <h3 className="font-semibold">Скачать проект</h3>
              <Button className="w-full" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Скачать ZIP
              </Button>
           </div>

          <div className="space-y-2">
              <Label htmlFor="deploy-logs">Логи деплоя:</Label>
              <ScrollArea id="deploy-logs" className="h-60 w-full rounded-md border p-4 bg-secondary" ref={logsContainerRef}>
                {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <p key={index} className="text-xs font-mono">{log}</p>
                    ))
                ) : (
                    <p className="text-xs text-muted-foreground">Ожидание начала деплоя...</p>
                )}
              </ScrollArea>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
