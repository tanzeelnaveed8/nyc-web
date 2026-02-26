'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to map page (main screen)
    router.replace('/map');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/icon.png"
          alt="NYC Precinct"
          width={96}
          height={96}
          className="rounded-xl object-cover"
        />
        <h1 className="text-2xl font-black text-[#0A1929]">NYC Precinct</h1>
      </div>
    </div>
  );
}
