'use server';

import { suggestOptimalSchedule, type SmartScheduleInput } from '@/ai/flows/smart-schedule-suggestions';
import { askGlobalAssistant, type GlobalAssistantInput } from '@/ai/flows/global-assistant';
import { z } from 'zod';

const SmartScheduleActionInput = z.object({
  medicationName: z.string(),
  dosage: z.string(),
  currentSchedule: z.array(z.string()).optional(),
  intakeLogs: z.array(
    z.object({
      date: z.string(),
      time: z.string(),
    })
  ),
  userNeeds: z.string(),
});

export async function getSmartScheduleSuggestions(input: SmartScheduleInput) {
  const parsedInput = SmartScheduleActionInput.safeParse(input);

  if (!parsedInput.success) {
    console.error('Invalid input for smart schedule:', parsedInput.error);
    throw new Error('Invalid input.');
  }

  try {
    const result = await suggestOptimalSchedule(parsedInput.data);
    return result;
  } catch (error) {
    console.error('Error getting smart schedule suggestions:', error);
    return { error: 'Failed to generate suggestions. Please try again.' };
  }
}

const GlobalAssistantActionInput = z.object({
  pageContext: z.enum(['dashboard', 'medications', 'reports']),
  userMessage: z.string().min(1),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      schedule: z.object({
        frequency: z.string(),
        times: z.array(z.string()),
      }),
    })
  ),
  todayLogs: z.array(
    z.object({
      medicationName: z.string(),
      time: z.string(),
      status: z.enum(['taken', 'missed', 'skipped']),
    })
  ).optional(),
  adherenceStats: z.object({
    totalScheduled: z.number(),
    totalTaken: z.number(),
    adherenceRate: z.number(),
  }).optional(),
});

export async function getGlobalAssistantResponse(input: GlobalAssistantInput) {
  const parsedInput = GlobalAssistantActionInput.safeParse(input);

  if (!parsedInput.success) {
    console.error('Invalid input for global assistant:', parsedInput.error);
    throw new Error('Invalid input.');
  }

  try {
    const result = await askGlobalAssistant(parsedInput.data);
    return result;
  } catch (error) {
    console.error('Error getting global assistant response:', error);
    return { error: 'Failed to get response. Please try again.' };
  }
}
