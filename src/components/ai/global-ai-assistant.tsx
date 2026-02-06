'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMedication } from '@/context/medication-context';
import { getGlobalAssistantResponse } from '@/app/actions';
import type { PageContext, GlobalAssistantOutput } from '@/ai/flows/global-assistant';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  Loader2,
  LayoutDashboard,
  Pill,
  BarChart3,
  Bot,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
};

const pageContextMap: Record<string, PageContext> = {
  '/dashboard': 'dashboard',
  '/medications': 'medications',
  '/reports': 'reports',
};

const pageInfo: Record<PageContext, { label: string; icon: typeof LayoutDashboard; description: string; placeholder: string }> = {
  dashboard: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: "I can help you with today's schedule and medications.",
    placeholder: "Ask about today's medications, reminders, or health tips...",
  },
  medications: {
    label: 'Medications',
    icon: Pill,
    description: 'I can answer questions about your medications.',
    placeholder: 'Ask about side effects, timing, interactions...',
  },
  reports: {
    label: 'Reports',
    icon: BarChart3,
    description: 'I can help you understand your adherence patterns.',
    placeholder: 'Ask about your adherence trends or how to improve...',
  },
};

export function GlobalAIAssistant() {
  const pathname = usePathname();
  const { medications, logs, loading: medsLoading } = useMedication();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pageContext: PageContext = pageContextMap[pathname] || 'dashboard';
  const currentPageInfo = pageInfo[pageContext];
  const PageIcon = currentPageInfo.icon;

  // Reset messages when page changes
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [pathname]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when sheet opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const calculateAdherenceStats = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const recentLogs = logs.filter(log => {
      const logDate = new Date(log.time);
      return logDate >= thirtyDaysAgo;
    });

    const totalTaken = recentLogs.filter(log => log.status === 'taken').length;
    const totalScheduled = recentLogs.length || 1;
    const adherenceRate = Math.round((totalTaken / totalScheduled) * 100);

    return { totalScheduled, totalTaken, adherenceRate };
  };

  const getTodayLogs = () => {
    const today = new Date().toDateString();
    return logs
      .filter(log => new Date(log.time).toDateString() === today)
      .map(log => ({
        medicationName: log.medicationName,
        time: log.time,
        status: log.status,
      }));
  };

  const handleSend = (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isPending) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    startTransition(async () => {
      try {
        const result = await getGlobalAssistantResponse({
          pageContext,
          userMessage: text,
          medications: medications.map(m => ({
            name: m.name,
            dosage: m.dosage,
            schedule: {
              frequency: m.schedule.frequency,
              times: m.schedule.times,
            },
          })),
          todayLogs: getTodayLogs(),
          adherenceStats: calculateAdherenceStats(),
        });

        if ('error' in result) {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
          ]);
        } else {
          const assistantMessage: Message = {
            role: 'assistant',
            content: result.response,
            suggestions: result.suggestions,
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } catch {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
        ]);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  if (medsLoading) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-6 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left font-headline">PillPal AI</SheetTitle>
                <SheetDescription className="text-left text-xs">
                  Your medication assistant
                </SheetDescription>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <PageIcon className="h-3 w-3" />
              {currentPageInfo.label}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">{currentPageInfo.description}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {pageContext === 'dashboard' && (
                    <>
                      <SuggestionChip onClick={handleSuggestionClick}>
                        What medications do I have today?
                      </SuggestionChip>
                      <SuggestionChip onClick={handleSuggestionClick}>
                        How am I doing with my adherence?
                      </SuggestionChip>
                    </>
                  )}
                  {pageContext === 'medications' && (
                    <>
                      <SuggestionChip onClick={handleSuggestionClick}>
                        What are common medication interactions?
                      </SuggestionChip>
                      <SuggestionChip onClick={handleSuggestionClick}>
                        Tips for remembering to take my pills
                      </SuggestionChip>
                    </>
                  )}
                  {pageContext === 'reports' && (
                    <>
                      <SuggestionChip onClick={handleSuggestionClick}>
                        How can I improve my adherence?
                      </SuggestionChip>
                      <SuggestionChip onClick={handleSuggestionClick}>
                        Why is medication adherence important?
                      </SuggestionChip>
                    </>
                  )}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index}>
                  <div
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 max-w-[85%]',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 ml-11 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, i) => (
                        <SuggestionChip key={i} onClick={handleSuggestionClick}>
                          {suggestion}
                        </SuggestionChip>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {isPending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl px-4 py-2.5 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder={currentPageInfo.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="pr-12 resize-none"
              disabled={isPending}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are for informational purposes only. Always consult your healthcare provider.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SuggestionChip({
  children,
  onClick,
}: {
  children: string;
  onClick: (text: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(children)}
      className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
    >
      {children}
    </button>
  );
}
