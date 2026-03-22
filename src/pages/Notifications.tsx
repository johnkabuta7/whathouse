import { CreditCard, AlertTriangle, MessageSquare, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { mockNotifications } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const typeConfig = {
  payment: { icon: CreditCard, color: 'bg-accent/10 text-accent' },
  late: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
  message: { icon: MessageSquare, color: 'bg-primary/10 text-primary' },
  contract: { icon: FileText, color: 'bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]' },
};

export default function Notifications() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">Notifications</h1>

      <div className="space-y-2">
        {mockNotifications.map((notif, i) => {
          const config = typeConfig[notif.type];
          return (
            <Card
              key={notif.id}
              className={cn(
                'border-0 shadow-sm animate-slide-up',
                !notif.read && 'ring-1 ring-primary/20'
              )}
              style={{ animationDelay: `${100 + i * 60}ms` }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn('p-2 rounded-xl shrink-0', config.color)}>
                  <config.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', notif.read ? 'text-muted-foreground' : 'text-foreground')}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{notif.time}</p>
                </div>
                {!notif.read && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1" />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
