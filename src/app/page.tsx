import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware теперь обрабатывает всю логику редиректа.
  // Эта страница может служить заглушкой или перенаправлять на activate как запасной вариант.
  redirect('/activate');
}
