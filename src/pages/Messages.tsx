import { useState } from 'react';
import { ArrowLeft, Send, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, useSendMessage } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function Messages() {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const { data: conversations, isLoading: convLoading } = useConversations();
  const { data: messages, isLoading: msgLoading } = useMessages(selectedChat);
  const sendMsg = useSendMessage();

  const activeConv = conversations?.find(c => c.id === selectedChat);

  const getContactName = (conv: any) => {
    if (!conv || !user) return 'Inconnu';
    if (conv.p1?.user_id === user.id) {
      return `${conv.p2?.first_name || ''} ${conv.p2?.last_name || ''}`.trim() || 'Inconnu';
    }
    return `${conv.p1?.first_name || ''} ${conv.p1?.last_name || ''}`.trim() || 'Inconnu';
  };

  const getContactInitials = (conv: any) => {
    const name = getContactName(conv);
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !selectedChat || !user) return;
    await sendMsg.mutateAsync({ conversationId: selectedChat, content: text.trim(), senderId: user.id });
    setNewMessage('');
  };

  if (convLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-32" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  // Chat view
  if (activeConv && selectedChat) {
    const contactName = getContactName(activeConv);
    const initials = getContactInitials(activeConv);

    return (
      <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-lg mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => setSelectedChat(null)} className="p-1 rounded-lg hover:bg-muted active:scale-95">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{contactName}</p>
            <p className="text-[10px] text-muted-foreground">En ligne</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {msgLoading && <Skeleton className="h-8 w-48" />}
          {messages?.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Commencez la conversation</p>}
          {messages?.map(msg => (
            <div key={msg.id} className={cn('flex', msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm',
                msg.sender_id === user?.id
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}>
                <p>{msg.content}</p>
                <p className={cn('text-[10px] mt-1', msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          <Button size="sm" variant="outline" className="rounded-xl text-xs whitespace-nowrap active:scale-95"
            onClick={() => sendMessage('Rappel : votre loyer est en attente de paiement.')}>
            <CreditCard className="h-3 w-3 mr-1" />Relancer paiement
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl text-xs whitespace-nowrap active:scale-95"
            onClick={() => sendMessage('Rappel amical : pensez à régler votre loyer. Merci !')}>
            <Clock className="h-3 w-3 mr-1" />Envoyer rappel
          </Button>
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(newMessage)}
            placeholder="Écrire un message..." className="rounded-xl flex-1" />
          <Button size="icon" className="rounded-xl shrink-0 active:scale-95" onClick={() => sendMessage(newMessage)} disabled={!newMessage.trim() || sendMsg.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">Messages</h1>

      {(!conversations || conversations.length === 0) && (
        <div className="text-center py-12">
          <p className="text-sm font-semibold text-muted-foreground">Aucune conversation</p>
          <p className="text-xs text-muted-foreground mt-1">Les conversations apparaîtront ici</p>
        </div>
      )}

      <div className="space-y-2">
        {conversations?.map((conv, i) => {
          const contactName = getContactName(conv);
          const initials = getContactInitials(conv);
          return (
            <Card key={conv.id} onClick={() => setSelectedChat(conv.id)}
              className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] animate-slide-up"
              style={{ animationDelay: `${100 + i * 60}ms` }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{contactName}</p>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || 'Nouvelle conversation'}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
