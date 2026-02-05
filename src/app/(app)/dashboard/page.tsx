'use client';

import { useUser } from '@clerk/nextjs';
import { AdherenceOverview } from '@/components/dashboard/adherence-overview';
import { TodaySchedule } from '@/components/dashboard/today-schedule';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.fullName ?? 'User';
  return (
    <div className="flex flex-col gap-8 min-w-0 w-full overflow-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Welcome back, {displayName}
        </h1>
        
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 min-w-0 w-full">
        <div className="lg:col-span-2 min-w-0 overflow-hidden">
            <TodaySchedule />
        </div>
        <div className="lg:col-span-1 min-w-0 overflow-hidden">
            <AdherenceOverview />
        </div>
      </div>
    </div>
  );
}
