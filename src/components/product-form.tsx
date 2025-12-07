"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Info } from "lucide-react";
import type { Product } from "@/types";
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ProductFormProps {
  product: Partial<Product> | null;
  onSave: (product: Partial<Product>) => void;
  onCancel: () => void;
  isSaving: boolean;
  currency: string;
  useStars: boolean; // This is now just for context, not direct control
}

export function ProductForm({ product, onSave, onCancel, isSaving, currency }: ProductFormProps) {
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
    }
  }, [product]);

  if (!currentProduct) {
    return null;
  }

  const handleSave = () => {
    // Basic validation
    if (!currentProduct.buttonName || !currentProduct.invoiceTitle || !currentProduct.invoiceDescription) {
        alert("Пожалуйста, заполните все обязательные поля: Название кнопки, Заголовок счета, Описание счета.");
        return;
    }
    onSave(currentProduct);
  };
  
  const getKeyCount = (staticKey: string | undefined) => {
    if (!staticKey) return 0;
    return staticKey.split('\n').filter(k => k.trim() !== '').length;
  };

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>{currentProduct._id ? 'Редактировать товар' : 'Добавить новый товар'}</CardTitle>
              <CardDescription>Заполните информацию о товаре для продажи в боте.</CardDescription>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="p-category">Категория</Label>
            <Input id="p-category" value={currentProduct.category || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, category: e.target.value }))} placeholder="Например, Ключи" className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-buttonName">Название кнопки</Label>
            <Input id="p-buttonName" value={currentProduct.buttonName || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, buttonName: e.target.value }))} className="bg-background/50"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-invoiceTitle">Заголовок счета</Label>
            <Input id="p-invoiceTitle" value={currentProduct.invoiceTitle || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, invoiceTitle: e.target.value }))} className="bg-background/50"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-invoiceDescription">Описание счета</Label>
            <Textarea id="p-invoiceDescription" value={currentProduct.invoiceDescription || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, invoiceDescription: e.target.value }))} className="bg-background/50"/>
          </div>
           <div className="space-y-2">
            <Label htmlFor="p-productImageUrl">URL картинки для товара (необязательно)</Label>
            <Input id="p-productImageUrl" value={currentProduct.productImageUrl || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, productImageUrl: e.target.value }))} placeholder="https://example.com/image.png" className="bg-background/50"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="p-price-real">Цена (в {currency})</Label>
                <Input 
                    id="p-price-real" 
                    type="number" 
                    min="0" 
                    value={currentProduct.priceReal || 0} 
                    onChange={(e) => setCurrentProduct(p => ({ ...p, priceReal: Number(e.target.value) }))}
                    className="bg-background/50"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="p-price-stars">Цена (в ⭐)</Label>
                <Input 
                    id="p-price-stars" 
                    type="number" 
                    min="1" 
                    value={currentProduct.price || 1} 
                    onChange={(e) => setCurrentProduct(p => ({ ...p, price: Number(e.target.value) }))}
                    className="bg-background/50"
                />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-2 pt-2">
            <Switch id="p-type" checked={currentProduct.type === 'api'} onCheckedChange={(checked) => setCurrentProduct(p => ({ ...p, type: checked ? 'api' : 'static' }))} />
            <Label htmlFor="p-type">Генерация через API</Label>
          </div>

          {currentProduct.type === 'api' ? (
            <div className="space-y-4">
               <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Документация по API</AlertTitle>
                <AlertDescription>
                  <p>При покупке будет отправлен <strong>POST</strong>-запрос на указанный <strong>URL API</strong>.</p>
                  <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
                    <li><strong>Заголовок авторизации:</strong><br/><code className="text-foreground">Authorization: Bearer [Ваш API Token]</code></li>
                    <li><strong>Тело запроса (JSON):</strong><br/><code className="text-foreground">{`{ "validityDays": ${currentProduct.apiDays || 30} }`}</code></li>
                    <li><strong>Ожидаемый успешный ответ (JSON):</strong><br/><code className="text-foreground">{`{ "success": true, "key": "ВАШ_КЛЮЧ" }`}</code></li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="p-apiUrl">URL API</Label>
                <Input id="p-apiUrl" placeholder="https://example.com/api/generate" value={currentProduct.apiUrl || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, apiUrl: e.target.value }))} className="bg-background/50"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-apiToken">API Token (Bearer)</Label>
                <Input id="p-apiToken" placeholder="Ваш токен" value={currentProduct.apiToken || ''} onChange={(e) => setCurrentProduct(p => ({ ...p, apiToken: e.target.value }))} className="bg-background/50"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-apiDays">Срок действия ключа (дни)</Label>
                <Input id="p-apiDays" type="number" min="1" value={currentProduct.apiDays || 30} onChange={(e) => setCurrentProduct(p => ({ ...p, apiDays: Number(e.target.value) }))} className="bg-background/50"/>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <Label htmlFor="p-staticKey">Фиксированные ключи/текст</Label>
                 <span className="text-xs text-muted-foreground">Кол-во: {getKeyCount(currentProduct.staticKey)}</span>
              </div>
              <Textarea
                id="p-staticKey"
                placeholder="Введите по одному ключу в каждой строке..."
                value={currentProduct.staticKey || ''}
                onChange={(e) => setCurrentProduct(p => ({ ...p, staticKey: e.target.value }))}
                className="bg-background/50 h-64 font-mono text-xs"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
