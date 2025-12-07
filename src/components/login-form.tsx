"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/actions";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
      <form action={login}>
        <CardHeader className="items-center text-center p-0 mb-6">
            <CardTitle className="text-3xl font-bold text-primary animate-neon-glow">MooNTooLSTORE</CardTitle>
            <CardDescription>
              Введите ваши учетные данные для доступа к панели.
            </CardDescription>
          </CardHeader>
        <CardContent className="grid gap-4 p-0">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ошибка входа</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="username">Имя пользователя</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-6">
          <Button className="w-full" type="submit">
            Войти
          </Button>
        </CardFooter>
      </form>
  );
}

export function LoginForm() {
    return (
        <Suspense fallback={<div>Загрузка...</div>}>
            <LoginFormContent />
        </Suspense>
    )
}
