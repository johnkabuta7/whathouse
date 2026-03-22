import { useState } from 'react';
import { ArrowLeft, Send, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockMessages, ChatMessage } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  const activeChat = conversations.find(m => m.id === selectedChat);

  const sendMessage = (text: string) => {
    if (!text.trim() || !selectedChat) return;
    const msg: ChatMessage = {
      id: `new-${Date.now()}`,
      text: text.trim(),
      sender: 'me',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setConversations(prev =>
      prev.map(c =>
        c.id === selectedChat
          ? { ...c, messages: [...c.messages, msg], lastMessage: text.trim(), time: msg.time }
          : c
      )
    );
    setNewMessage('');
  };

  const sendQuickMessage = (text: string) => {
    sendMessage(text);
  };

  // Chat view
  if (activeChat) {
    return (
      <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-lg mx-auto">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => setSelectedChat(null)} className="p-1 rounded-lg hover:bg-muted active:scale-95">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            {activeChat.contactName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{activeChat.contactName}</p>
            <p className="text-[10px] text-muted-foreground">En ligne</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {activeChat.messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.sender === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm',
                msg.sender === 'me'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}>
                <p>{msg.text}</p>
                <p className={cn('text-[10px] mt-1', msg.sender === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs whitespace-nowrap active:scale-95"
            onClick={() => sendQuickMessage('Rappel : votre loyer est en attente de paiement.')}
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Relancer paiement
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs whitespace-nowrap active:scale-95"
            onClick={() => sendQuickMessage('Rappel amical : pensez à régler votre loyer. Merci !')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Envoyer rappel
          </Button>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(newMessage)}
            placeholder="Écrire un message..."
            className="rounded-xl flex-1"
          />
          <Button
            size="icon"
            className="rounded-xl shrink-0 active:scale-95"
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim()}
          >
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

      <div className="space-y-2">
        {conversations.map((msg, i) => (
          <Card
            key={msg.id}
            onClick={() => setSelectedChat(msg.id)}
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
              {msg.unread && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
