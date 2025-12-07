import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Power } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <form action={logout} className="absolute top-4 right-4 z-50">
        <Button type="submit" variant="ghost" size="icon">
          <Power className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">Выйти</span>
        </Button>
      </form>
    </div>
  );
}
