'use client';

import { useState, useEffect } from 'react';
import { Camera, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Medication } from '@/lib/types';
import { parsePrescriptionText } from '@/lib/prescription-parser';

type PrescriptionScanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called when OCR completes and parsed medication data is ready.
   * Passes the parsed medication data to pre-fill the form.
   */
  onContinue: (parsedMedication?: Partial<Medication>) => void;
};

export function PrescriptionScanDialog({
  open,
  onOpenChange,
  onContinue,
}: PrescriptionScanDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Partial<Medication> | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setParsedData(null);
      setError(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next);
    setParsedData(null);
    setError(null);
  };

  const handleScan = async (): Promise<Partial<Medication> | null> => {
    if (!file) return null;

    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/prescription-scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan prescription');
      }

      const { text } = await response.json();
      const parsed = parsePrescriptionText(text);

      // Convert parsed data to Medication format
      const medicationData: Partial<Medication> = {
        name: parsed.name || '',
        dosage: parsed.dosage || '',
        schedule: parsed.schedule || {
          frequency: 'daily',
          times: ['09:00'],
        },
        refill: parsed.refill || {
          quantity: 30,
          reminderThreshold: 5,
        },
      };

      setParsedData(medicationData);
      return medicationData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan prescription');
      return null;
    } finally {
      setScanning(false);
    }
  };

  const handleContinue = async () => {
    if (!file) return;

    if (!parsedData) {
      // Scan first and wait for result before closing
      const result = await handleScan();
      if (result) {
        onOpenChange(false);
        onContinue(result);
      }
      return;
    }

    onOpenChange(false);
    onContinue(parsedData);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null);
      setPreviewUrl(null);
      setParsedData(null);
      setError(null);
      setScanning(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan prescription</DialogTitle>
          <DialogDescription>
            Upload a clear photo or PDF of your prescription. We&apos;ll extract the medication
            details automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2 rounded-lg border border-dashed p-4 text-center">
            <div className="flex justify-center gap-4 pb-2">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Take a photo or upload a file</p>
            <p className="text-xs text-muted-foreground">
              Supported formats: images (JPG, PNG, HEIC) and PDFs. Make sure the text is sharp
              and readable.
            </p>
            <div className="mt-3 flex justify-center">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent">
                <span>Choose file</span>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={scanning}
                />
              </label>
            </div>
            {file && (
              <p className="mt-2 text-xs text-muted-foreground">
                Selected:&nbsp;
                <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          {previewUrl && file && file.type.startsWith('image/') && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <div className="max-h-64 overflow-hidden rounded-md border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Prescription preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {parsedData && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Scanned successfully!</p>
                <p className="text-xs">
                  {parsedData.name && `Medication: ${parsedData.name}`}
                  {parsedData.dosage && ` • Dosage: ${parsedData.dosage}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review and confirm the details in the form.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {file && !parsedData && !scanning && (
            <Button onClick={handleScan} className="w-full" variant="outline">
              Scan prescription
            </Button>
          )}

          {scanning && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Scanning prescription...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={scanning}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!file || scanning}>
            {parsedData ? 'Continue to form' : 'Scan & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

