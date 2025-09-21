import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Paperclip, X, File, Image, Download } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  message_content: string;
  sent_at: string;
  message_type?: string;
  file_url?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  clientId: string;
  vendorId: string;
}

const EnhancedChatModal: React.FC<ChatModalProps> = ({
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelRef = useRef<any>(null);

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
      setupRealtimeSubscription();
    }

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [isOpen, quoteRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupRealtimeSubscription = () => {
    if (!quoteRequestId) return;

    const channel = supabase
      .channel(`chat-${quoteRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `quote_request_id=eq.${quoteRequestId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 10MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `chat-files/${quoteRequestId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('secure-uploads')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('secure-uploads')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !selectedFile) return;

    setLoading(true);
    let fileUrl = null;

    try {
      if (!currentUser) throw new Error('Not authenticated');

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        fileUrl = await uploadFile(selectedFile);
      }

      const recipientId = currentUser.id === clientId ? vendorId : clientId;

      const messageData = {
        sender_id: currentUser.id,
        recipient_id: recipientId,
        quote_request_id: quoteRequestId,
        message_content: selectedFile ? `📎 ${selectedFile.name}` : newMessage.trim(),
        message_type: (selectedFile ? 'file' : 'text') as 'text' | 'file' | 'quote' | 'system',
        file_url: fileUrl
      };

      console.log('Sending message with data:', messageData); // Debug log
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension && imageExtensions.includes(extension);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat - "{projectTitle}"
            <span className="text-sm font-normal text-muted-foreground">
              (Ticket ID: {quoteRequestId.slice(0, 8)}...)
            </span>
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
                      
                      {message.message_type === 'file' && message.file_url ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <File className="w-4 h-4" />
                            <span>File attachment</span>
                          </div>
                          
                          {isImageFile(message.message_content.replace('📎 ', '')) ? (
                            <div className="space-y-2">
                              <img 
                                src={message.file_url} 
                                alt="Shared image" 
                                className="max-w-full h-auto rounded border cursor-pointer"
                                onClick={() => window.open(message.file_url, '_blank')}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadFile(message.file_url!, message.message_content.replace('📎 ', ''))}
                                className="w-full"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadFile(message.file_url!, message.message_content.replace('📎 ', ''))}
                              className="w-full justify-start"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {message.message_content.replace('📎 ', '')}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">{message.message_content}</div>
                      )}
                      
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

          <div className="mt-4">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg mb-2">
                <File className="w-4 h-4" />
                <span className="text-sm flex-1">{selectedFile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading || uploading}
                className="flex-1"
              />
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Button 
                type="submit" 
                disabled={loading || uploading || (!newMessage.trim() && !selectedFile)}
                className="bg-gradient-primary"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedChatModal;