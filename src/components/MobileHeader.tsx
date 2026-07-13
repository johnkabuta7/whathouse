import { Bell } from 'lucide-react';
import { useMyGroupJoinRequestCounts } from '@/hooks/use-data';

export function MobileHeader() {
  const { data: requestCounts } = useMyGroupJoinRequestCounts();
  const totalRequests = requestCounts?.total || 0;

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4px)' }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-bold leading-tight flex-1">WhatHouse <span className="block text-[10px] font-medium opacity-80">Pro Immobilier</span></h1>
        <div className="relative">
          {totalRequests > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center px-1 z-10">
              {totalRequests}
            </span>
          )}
          <Bell className="h-5 w-5" />
        </div>
      </div>
    </header>
  );
}
