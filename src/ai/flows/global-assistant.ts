'use server';

/**
 * @fileOverview Global AI assistant that adapts based on the current page context.
 * Provides context-aware medication assistance across Dashboard, Medications, and Reports pages.
 */

import OpenAI from 'openai';
import { z } from 'zod';

export type PageContext = 'dashboard' | 'medications' | 'reports';

const GlobalAssistantInputSchema = z.object({
  pageContext: z.enum(['dashboard', 'medications', 'reports']),
  userMessage: z.string(),
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

export type GlobalAssistantInput = z.infer<typeof GlobalAssistantInputSchema>;

const GlobalAssistantOutputSchema = z.object({
  response: z.string(),
  suggestions: z.array(z.string()).optional(),
});

export type GlobalAssistantOutput = z.infer<typeof GlobalAssistantOutputSchema>;

const jsonInstructions = `

IMPORTANT: You must respond in JSON format with this structure:
{
  "response": "Your helpful response here",
  "suggestions": ["Follow-up question 1?", "Follow-up question 2?"]
}

The "suggestions" array should contain 2-3 short follow-up questions the user might want to ask next.`;

const systemPrompts: Record<PageContext, string> = {
  dashboard: `You are PillPal AI, a friendly medication assistant helping users with their daily medication routine.

You're currently on the DASHBOARD page where users see:
- Today's medication schedule
- Quick adherence overview

Your role:
1. Answer questions about today's medications and schedule
2. Provide reminders and encouragement for medication adherence
3. Offer general health tips related to their medications
4. Help users understand their daily routine

Keep responses concise, friendly, and actionable. Use bullet points for clarity when listing multiple items.${jsonInstructions}`,

  medications: `You are PillPal AI, a knowledgeable medication assistant helping users manage their medications.

You're currently on the MEDICATIONS page where users can:
- View and manage all their medications
- See dosages and schedules
- Access smart schedule suggestions

Your role:
1. Answer questions about specific medications (side effects, interactions, timing)
2. Explain pharmacological best practices for medication timing
3. Help users understand their medication regimen
4. Provide guidance on medication management

Always emphasize that users should consult their healthcare provider for medical advice.
Keep responses informative but accessible.${jsonInstructions}`,

  reports: `You are PillPal AI, an insightful medication adherence analyst helping users understand their patterns.

You're currently on the REPORTS page where users see:
- Monthly adherence charts
- Calendar view of logged doses
- Historical medication data

Your role:
1. Explain adherence patterns and trends
2. Provide insights on medication-taking behavior
3. Suggest ways to improve adherence
4. Help users understand the importance of consistency

Be encouraging and constructive. Focus on progress and actionable improvements.
Keep responses motivating and data-driven.${jsonInstructions}`,
};

function buildUserPrompt(input: GlobalAssistantInput): string {
  const medicationsList = input.medications.length > 0
    ? input.medications.map(m => `- ${m.name} (${m.dosage}): ${m.schedule.times.join(', ')}`).join('\n')
    : 'No medications added yet.';

  let contextInfo = `Current Medications:\n${medicationsList}\n\n`;

  if (input.todayLogs && input.todayLogs.length > 0) {
    const logsText = input.todayLogs.map(l =>
      `- ${l.medicationName}: ${l.status} at ${new Date(l.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    ).join('\n');
    contextInfo += `Today's Activity:\n${logsText}\n\n`;
  }

  if (input.adherenceStats) {
    contextInfo += `Adherence Stats:\n- Total scheduled: ${input.adherenceStats.totalScheduled}\n- Total taken: ${input.adherenceStats.totalTaken}\n- Adherence rate: ${input.adherenceStats.adherenceRate}%\n\n`;
  }

  return `${contextInfo}User Question: ${input.userMessage}`;
}

export async function askGlobalAssistant(
  input: GlobalAssistantInput
): Promise<GlobalAssistantOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const parsed = GlobalAssistantInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Invalid input for global assistant.');
  }

  const openai = new OpenAI({ apiKey });
  const systemPrompt = systemPrompts[input.pageContext];
  const userPrompt = buildUserPrompt(input);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI.');
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    const result = GlobalAssistantOutputSchema.safeParse(parsed);
    if (!result.success) {
      // If JSON parsing works but doesn't match schema, try to extract response
      const rawParsed = parsed as Record<string, unknown>;
      return {
        response: typeof rawParsed.response === 'string'
          ? rawParsed.response
          : typeof rawParsed.answer === 'string'
            ? rawParsed.answer
            : content,
        suggestions: Array.isArray(rawParsed.suggestions)
          ? rawParsed.suggestions.filter((s): s is string => typeof s === 'string')
          : undefined,
      };
    }
    return result.data;
  } catch {
    // If JSON parsing fails, return the raw content as response
    return { response: content };
  }
}
