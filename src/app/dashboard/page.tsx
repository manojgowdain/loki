// src/app/dashboard/page.tsx
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Smart Link Admin Dashboard</h1>
      <p className="mb-2">This is a placeholder for the admin interface.</p>
      <Link href="/links/create" className="text-blue-600 underline">
        Create a new short link
      </Link>
    </div>
  );
}
