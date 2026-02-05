'use client';
import type { ReactNode } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMedication } from '@/context/medication-context';
import type { Medication } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

const timeSchema = z.object({
  value: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
});

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  dosage: z.string().min(1, 'Dosage is required.'),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'custom']),
    times: z.array(timeSchema).min(1, 'At least one time is required.'),
    days: z.array(z.number()).optional(),
  }),
  refill: z.object({
    quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
    reminderThreshold: z.coerce.number().min(0, 'Threshold cannot be negative.'),
  }),
});

type MedicationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication?: Medication;
  /** Initial values to pre-fill the form (e.g., from OCR scan) */
  initialValues?: Partial<Medication>;
  trigger?: ReactNode;
};

export function MedicationFormSheet({ open, onOpenChange, medication, initialValues, trigger }: MedicationFormProps) {
  const { addMedication, updateMedication } = useMedication();
  
  const getDefaultValues = () => {
    if (medication) {
      const { id: _id, ...rest } = medication;
      return {
        ...rest,
        schedule: { ...rest.schedule, times: rest.schedule.times.map((t) => ({ value: t })) },
      };
    }

    if (initialValues) {
      return {
        name: initialValues.name || '',
        dosage: initialValues.dosage || '',
        schedule: {
          frequency: initialValues.schedule?.frequency || 'daily' as const,
          times: initialValues.schedule?.times?.map((t) => ({ value: t })) || [{ value: '09:00' }],
          days: initialValues.schedule?.days || [],
        },
        refill: {
          quantity: initialValues.refill?.quantity || 30,
          reminderThreshold: initialValues.refill?.reminderThreshold || 5,
        },
      };
    }

    return {
      name: '',
      dosage: '',
      schedule: { frequency: 'daily' as const, times: [{ value: '09:00' }], days: [] },
      refill: { quantity: 30, reminderThreshold: 5 },
    };
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'schedule.times',
  });

  // Reset form whenever the sheet opens or the source data (medication / initialValues) changes,
  // so we always show current values when editing or pre-filling from scan.
  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medication?.id, medication?.name, initialValues?.name, initialValues?.dosage]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      schedule: { ...values.schedule, times: values.schedule.times.map((t) => t.value) },
    };
    if (medication) {
      updateMedication({ ...medication, ...payload });
      toast({ title: 'Medication Updated', description: `${values.name} has been updated.` });
    } else {
      addMedication(payload);
      toast({ title: 'Medication Added', description: `${values.name} has been added to your list.` });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{medication ? 'Edit Medication' : 'Add New Medication'}</SheetTitle>
          <SheetDescription>
            {medication ? 'Update the details of your medication.' : 'Fill in the details for your new medication.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Ibuprofen" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage</FormLabel>
                  <FormControl><Input placeholder="e.g., 200mg" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-medium text-sm">Schedule</h3>
                <FormField
                  control={form.control}
                  name="schedule.frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                 <div>
                    <FormLabel>Times</FormLabel>
                    {fields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`schedule.times.${index}.value`}
                        render={({ field }) => (
                            <FormItem className='flex items-center gap-2 mt-2'>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </FormItem>
                        )}
                      />
                    ))}
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ value: '09:00' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Time
                    </Button>
                </div>
             </div>

             <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium text-sm">Refill Information</h3>
                <div className='grid grid-cols-2 gap-4'>
                    <FormField control={form.control} name="refill.quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Quantity</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="refill.reminderThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder at</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
             </div>

            <SheetFooter>
              <Button type="submit">
                {medication ? 'Save Changes' : 'Add Medication'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
