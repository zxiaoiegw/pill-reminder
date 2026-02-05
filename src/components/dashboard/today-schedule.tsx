'use client';
import { useMedication } from '@/context/medication-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MedicationFormSheet } from '../medications/medication-form-sheet';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function TodaySchedule() {
  const { medications, logs, logIntake, isClient } = useMedication();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);

  const today = new Date();
  const todaySchedules = medications
    .flatMap(med => {
      const isToday = med.schedule.frequency === 'daily' || med.schedule.days?.includes(today.getDay());
      if (!isToday) return [];
      
      return med.schedule.times.map(time => ({
        medication: med,
        time,
        isTaken: logs.some(log => {
          const logDate = new Date(log.time);
          return log.medicationId === med.id &&
                 logDate.getDate() === today.getDate() &&
                 logDate.getMonth() === today.getMonth() &&
                 logDate.getFullYear() === today.getFullYear() &&
                 logDate.getHours() === parseInt(time.split(':')[0])
        })
      }));
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleLogIntake = async (medicationId: string, medicationName: string, dosage: string, time: string) => {
    const logTime = new Date();
    const [hours, minutes] = time.split(':');
    logTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await logIntake({
        medicationId,
        medicationName,
        time: logTime.toISOString(),
        status: 'taken',
        dosage,
      });

      toast({
        title: 'Success!',
        description: `${medicationName} intake logged.`,
        variant: 'default',
        className: 'bg-accent text-accent-foreground border-accent'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to log intake',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>

      </CardHeader>
      <CardContent className="overflow-hidden">
        {!isClient ? (
          <div className="space-y-4">
            <Skeleton className="h-[68px] w-full" />
            <Skeleton className="h-[68px] w-full" />
            <Skeleton className="h-[68px] w-full" />
          </div>
        ) : todaySchedules.length > 0 ? (
          <ul className="space-y-4">
            {todaySchedules.map(({ medication, time, isTaken }, index) => (
              <li key={`${medication.id}-${time}-${index}`} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-secondary/50 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-full shrink-0 ${isTaken ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}`}>
                    {isTaken ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{medication.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{medication.dosage} - {new Date(`1970-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isTaken ? "ghost" : "default"}
                  disabled={isTaken}
                  className="shrink-0"
                  onClick={() => handleLogIntake(medication.id, medication.name, medication.dosage, time)}
                >
                  {isTaken ? 'Taken' : 'Log Now'}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">You have no medications scheduled for today.</p>
            <MedicationFormSheet
              open={isSheetOpen}
              onOpenChange={setSheetOpen}
              trigger={
                <Button>
                  <PlusCircle className="mr-2" /> Add Medication
                </Button>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
