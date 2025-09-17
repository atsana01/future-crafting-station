import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  message_content: string;
  sent_at: string;
  message_type?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  clientId: string;
  vendorId: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  clientId,
  vendorId
}) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_request_id', quoteRequestId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setLoading(true);
    
    try {
      if (!currentUser) throw new Error('Not authenticated');

      const recipientId = currentUser.id === clientId ? vendorId : clientId;

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: recipientId,
          quote_request_id: quoteRequestId,
          message_content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat - "{projectTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4 border rounded-lg">
            <div className="space-y-4">
              {messages.map((message) => {
                const isCurrentUser = message.sender_id === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.message_type === 'rfi' && (
                        <div className="text-xs opacity-75 mb-1">RFI</div>
                      )}
                      <div className="text-sm">{message.message_content}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {formatTime(message.sent_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;