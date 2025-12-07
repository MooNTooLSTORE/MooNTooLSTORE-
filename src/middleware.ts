
"use server";
import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { cookies } from "next/headers";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Игнорируем служебные и статические файлы
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/activate' // Страница активации всегда доступна
  ) {
    return NextResponse.next();
  }

  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const isLoggedIn = session.isLoggedIn || false;

  const isProtectedPage = pathname.startsWith('/dashboard') || pathname.startsWith('/admin_panel');
  const isLoginPage = pathname === '/login';

  // Если пользователь залогинен и заходит на главную страницу, перенаправляем на /dashboard
  if (isLoggedIn && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Правило 1: Если пользователь НЕ залогинен и пытается зайти на защищенную страницу
  if (!isLoggedIn && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Правило 2: Если пользователь УЖЕ залогинен и пытается зайти на страницу входа
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Во всех остальных случаях - просто пропускаем.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
