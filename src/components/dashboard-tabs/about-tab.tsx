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
import { Link } from "lucide-react";

const links = [
    { title: "МАГАЗИН FUNPAY 1", url: "https://funpay.com/users/14429140/" },
    { title: "МАГАЗИН FUNPAY 2", url: "https://funpay.com/users/15054783/" },
    { title: "TG Группа", url: "https://t.me/MooNTooLKIT" },
    { title: "TG Чат", url: "https://t.me/+GMS4gtdMDy43NjAy" },
    { title: "TG Бот", url: "https://t.me/FunPayXScanBot" },
];

export function AboutTab() {
  return (
    <Card className="bg-transparent">
      <CardHeader>
        <CardTitle>О программе</CardTitle>
        <CardDescription>Полезные ссылки и информация о проекте.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Наши ресурсы</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {links.map((link, index) => (
              <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full justify-start">
                    <Link className="mr-2 h-4 w-4" />
                    {link.title}
                </Button>
              </a>
            ))}
          </div>
        </div>
         <div className="pt-4 text-center text-xs text-muted-foreground">
            MooNTooLSTORE v1.0.0
        </div>
      </CardContent>
    </Card>
  );
}
