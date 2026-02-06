'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Pill,
  BarChart3,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Logo, LogoIcon } from '@/components/icons';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function MobileHeaderTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 md:hidden hover:bg-transparent"
      onClick={toggleSidebar}
      aria-label="Open menu"
    >
      <LogoIcon />
    </Button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/medications',
      label: 'Medications',
      icon: Pill,
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: BarChart3,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                asChild
                tooltip={item.label}
              >
                <a href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full max-w-full items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm overflow-hidden">
          <MobileHeaderTrigger />
          <SignedIn>
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <NotificationDropdown />
              <UserButton />
            </div>
          </SignedIn>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <GlobalAIAssistant />
      </SidebarInset>
    </SidebarProvider>
  );
}
