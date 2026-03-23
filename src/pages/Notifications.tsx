import { CreditCard, AlertTriangle, MessageSquare, FileText, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';

const typeConfig: Record<string, { icon: typeof CreditCard; color: string }> = {
  payment: { icon: CreditCard, color: 'bg-accent/10 text-accent' },
  late: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
  message: { icon: MessageSquare, color: 'bg-primary/10 text-primary' },
  contract: { icon: FileText, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
};

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-32" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  const items = notifications || [];
  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" className="text-xs font-semibold text-primary active:scale-95" onClick={() => markAllRead.mutate()}>
            <Check className="h-3 w-3 mr-1" />Tout lire
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm font-semibold text-muted-foreground">Aucune notification</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((notif, i) => {
          const config = typeConfig[notif.type] || typeConfig.message;
          return (
            <Card key={notif.id} onClick={() => !notif.is_read && markRead.mutate(notif.id)}
              className={cn('border-0 shadow-sm cursor-pointer animate-slide-up transition-all', !notif.is_read && 'ring-1 ring-primary/20')}
              style={{ animationDelay: `${100 + i * 60}ms` }}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn('p-2 rounded-xl shrink-0', config.color)}>
                  <config.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', notif.is_read ? 'text-muted-foreground' : 'text-foreground')}>{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                {!notif.is_read && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1" />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
