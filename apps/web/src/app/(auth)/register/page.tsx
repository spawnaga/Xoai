import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Registration Disabled - Xoai Healthcare',
};

export default function RegisterPage() {
  redirect('/login');
}
