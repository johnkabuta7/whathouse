import { Card, CardContent } from '@/components/ui/card';
import { mockMessages } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function Messages() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">Messages</h1>

      <div className="space-y-2">
        {mockMessages.map((msg, i) => (
          <Card
            key={msg.id}
            className={cn(
              'border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] animate-slide-up',
              msg.unread && 'ring-1 ring-primary/20'
            )}
            style={{ animationDelay: `${100 + i * 60}ms` }}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                msg.unread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {msg.contactName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn('text-sm font-semibold', msg.unread ? 'text-foreground' : 'text-muted-foreground')}>
                    {msg.contactName}
                  </p>
                  <p className="text-[10px] text-muted-foreground shrink-0">{msg.time}</p>
                </div>
                <p className={cn('text-xs truncate mt-0.5', msg.unread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {msg.lastMessage}
                </p>
              </div>
              {msg.unread && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
