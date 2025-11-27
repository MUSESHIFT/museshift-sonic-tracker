'use client';

import { useEffect } from 'react';

export default function Callback() {
  useEffect(() => {
    // Redirect back to main page - the hash will be handled there
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-xl">[ CONNECTING TO SPOTIFY... ]</div>
        <div className="text-green-600 text-sm mt-4">redirecting...</div>
      </div>
    </div>
  );
}
