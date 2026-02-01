'use client';

import { useMedication } from '@/context/medication-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  taken: {
    label: 'Taken',
    color: 'hsl(var(--primary))',
  },
  scheduled: {
    label: 'Scheduled',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;


export function AdherenceOverview() {
  const { logs, medications, isClient } = useMedication();

  const data = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });

    const scheduledDoses = medications.reduce((total, med) => {
      const isScheduledToday = med.schedule.frequency === 'daily' || med.schedule.days?.includes(date.getDay());
      return isScheduledToday ? total + med.schedule.times.length : total;
    }, 0);

    const takenDoses = logs.filter(log => {
      const logDate = new Date(log.time);
      return logDate.getDate() === date.getDate() &&
             logDate.getMonth() === date.getMonth() &&
             logDate.getFullYear() === date.getFullYear() &&
             log.status === 'taken';
    }).length;

    return {
      day,
      taken: takenDoses,
      scheduled: scheduledDoses,
    };
  }).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Adherence</CardTitle>
        <CardDescription>Your progress over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        {isClient ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
               <Tooltip
                  cursor={{ fill: 'hsl(var(--secondary))', radius: 'var(--radius)' }}
                  content={<ChartTooltipContent indicator="dot" />}
               />
              <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Bar dataKey="taken" fill="var(--color-taken)" radius={[4, 4, 0, 0]} name="Taken" />
              <Bar dataKey="scheduled" fill="var(--color-scheduled)" radius={[4, 4, 0, 0]} opacity={0.2} name="Scheduled" />
            </BarChart>
          </ChartContainer>
        ) : (
          <Skeleton className="h-[250px] w-full" />
        )}
      </CardContent>
    </Card>
  );
}
