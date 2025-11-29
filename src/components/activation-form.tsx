"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ActivationFormProps {
  onActivate: (key: string) => void;
  isActivating: boolean;
  error: string | null;
  activationStep: string;
}

export function ActivationForm({ onActivate, isActivating, error, activationStep }: ActivationFormProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onActivate(key);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-3xl font-bold text-primary mb-2 animate-neon-glow">MooNTooLSTORE</h1>
      <p className="text-muted-foreground mb-6">Требуется активация</p>
      
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="grid w-full items-center gap-1.5 text-left">
          <Label htmlFor="activation-key">Ключ активации</Label>
          <Input
            id="activation-key"
            type="text"
            placeholder="Введите ваш ключ"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isActivating}
          />
        </div>

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ошибка активации</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        <Button type="submit" className="w-full" disabled={isActivating || !key}>
          {isActivating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Активация...
            </>
          ) : (
            'Активировать'
          )}
        </Button>

         {isActivating && activationStep && (
            <p className="text-sm text-muted-foreground animate-pulse pt-2">{activationStep}</p>
        )}
      </form>
    </div>
  );
}
