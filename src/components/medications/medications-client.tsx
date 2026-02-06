'use client';
import { useState } from 'react';
import { useMedication } from '@/context/medication-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bot, MoreHorizontal, PlusCircle, Scan, Trash, Edit } from 'lucide-react';
import type { Medication } from '@/lib/types';
import { MedicationFormSheet } from './medication-form-sheet';
import { SmartScheduleDialog } from './smart-schedule-dialog';
import { PrescriptionScanDialog } from './prescription-scan-dialog';

/** Cleans up Radix Dialog/Sheet leftover state (pointer-events, inert) that can block clicks after close. */
function cleanupRadixOverlay() {
  if (typeof document === 'undefined') return;
  const run = () => {
    document.body.style.removeProperty('pointer-events');
    document.body.removeAttribute('inert');
    document.documentElement.removeAttribute('inert');
    document.querySelectorAll('[inert]').forEach((el) => el.removeAttribute('inert'));
  };
  requestAnimationFrame(() => run());
  setTimeout(run, 150);
}

export function MedicationsClient() {
  const { medications, deleteMedication } = useMedication();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | undefined>(undefined);
  const [tableKey, setTableKey] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [parsedMedication, setParsedMedication] = useState<Partial<Medication> | undefined>(undefined);

  const handleEdit = (med: Medication) => {
    setSelectedMedication(med);
    setSheetOpen(true);
  };

  const handleAddNew = (initialValues?: Partial<Medication>) => {
    setSelectedMedication(undefined);
    setParsedMedication(initialValues);
    setSheetOpen(true);
  };

  const handleScanPrescription = () => {
    setScanOpen(true);
  };

  const handleSmartSchedule = (med: Medication) => {
    setSelectedMedication(med);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={handleScanPrescription}>
          <Scan className="mr-2 h-4 w-4" />
          Scan prescription
        </Button>
        <Button onClick={() => handleAddNew()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Medication
        </Button>
      </div>

      <Card key={tableKey}>
        <CardHeader>
          <CardTitle>Your Medications</CardTitle>

        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medications.length > 0 ? (
                medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell>{med.dosage}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{med.schedule.frequency === 'daily' ? 'Daily' : 'Custom'} at</span>
                        <span className="text-muted-foreground text-xs">
                          {med.schedule.times.map(t => new Date(`1970-01-01T${t}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).join(', ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {med.refill.quantity <= med.refill.reminderThreshold ? (
                        <Badge variant="destructive" className="whitespace-nowrap w-fit px-3">Low: {med.refill.quantity} left</Badge>
                      ) : (
                        <span>{med.refill.quantity} left</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(med)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSmartSchedule(med)}>
                            <Bot className="mr-2 h-4 w-4" /> Smart Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMedication(med.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No medications added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PrescriptionScanDialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) {
            setParsedMedication(undefined);
          }
        }}
        onContinue={handleAddNew}
      />

      {sheetOpen && (
        <MedicationFormSheet
          open={true}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) {
              setSelectedMedication(undefined);
              setParsedMedication(undefined);
              setTableKey((k) => k + 1);
              setTimeout(cleanupRadixOverlay, 0);
            }
          }}
          medication={selectedMedication}
          initialValues={parsedMedication}
        />
      )}

      {dialogOpen && selectedMedication && (
        <SmartScheduleDialog
          open={true}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedMedication(undefined);
              setTimeout(cleanupRadixOverlay, 0);
            }
          }}
          medication={selectedMedication}
        />
      )}
    </>
  );
}
