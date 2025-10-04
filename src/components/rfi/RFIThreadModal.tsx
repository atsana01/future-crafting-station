import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Send, 
  CheckCircle, 
  Upload, 
  X, 
  FileText, 
  Download,
  AlertCircle 
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RFI {
  id: string;
  ticket_id: string;
  created_by: string;
  status: 'open' | 'resolved';
  title: string;
  question: string;
  created_at: string;
  resolved_at: string | null;
}

interface RFIMessage {
  id: string;
  rfi_id: string;
  author_id: string;
  body: string;
  created_at: string;
  is_hidden: boolean;
}

interface RFIAttachment {
  id: string;
  rfi_id: string;
  message_id: string | null;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface RFIThreadModalProps {
  rfi: RFI;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

const RFIThreadModal = ({ rfi, isOpen, onClose, onStatusChange }: RFIThreadModalProps) => {
  const [messages, setMessages] = useState<RFIMessage[]>([]);
  const [attachments, setAttachments] = useState<RFIAttachment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchAttachments();
      getCurrentUser();
      subscribeToMessages();
    }
  }, [isOpen, rfi.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('rfi_messages')
      .select('*')
      .eq('rfi_id', rfi.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('rfi_attachments')
      .select('*')
      .eq('rfi_id', rfi.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching attachments:', error);
      return;
    }

    setAttachments(data || []);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`rfi-messages-${rfi.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rfi_messages',
          filter: `rfi_id=eq.${rfi.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && files.length === 0) {
      toast.error('Please enter a message or attach files');
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('rfi_messages')
        .insert({
          rfi_id: rfi.id,
          author_id: user.id,
          body: newMessage.trim()
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `ticket/${rfi.ticket_id}/rfi/${rfi.id}/${message.id}/${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('rfi-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }

          await supabase.from('rfi_attachments').insert({
            rfi_id: rfi.id,
            message_id: message.id,
            storage_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          });
        }
      }

      setNewMessage('');
      setFiles([]);
      fetchMessages();
      fetchAttachments();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('rfis')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', rfi.id);

      if (error) throw error;

      toast.success('RFI marked as resolved');
      onStatusChange();
      onClose();
    } catch (error: any) {
      console.error('Error resolving RFI:', error);
      toast.error('Failed to resolve RFI');
    }
  };

  const downloadAttachment = async (attachment: RFIAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('rfi-attachments')
        .createSignedUrl(attachment.storage_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download file');
    }
  };

  const questionAttachments = attachments.filter(a => a.message_id === null);
  const messageAttachments = (messageId: string) => 
    attachments.filter(a => a.message_id === messageId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{rfi.title}</DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    RFI-{rfi.id.slice(0, 8)}
                  </span>
                  <Badge variant={rfi.status === 'open' ? 'secondary' : 'outline'}>
                    {rfi.status === 'open' ? 'Open' : 'Resolved'}
                  </Badge>
                </div>
              </div>
              {rfi.status === 'open' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResolveDialog(true)}
                  className="text-success border-success hover:bg-success/10"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Original Question */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Original Question</p>
                <p className="text-sm whitespace-pre-wrap">{rfi.question}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(rfi.created_at), 'MMM dd, yyyy - HH:mm')}
                </p>
                {questionAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {questionAttachments.map(att => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 p-2 bg-background rounded cursor-pointer hover:bg-accent"
                        onClick={() => downloadAttachment(att)}
                      >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm flex-1">{att.file_name}</span>
                        <Download className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages Thread */}
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((msg) => {
                const isOwn = msg.author_id === currentUserId;
                const msgAttachments = messageAttachments(msg.id);
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      {msgAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msgAttachments.map(att => (
                            <div
                              key={att.id}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                                isOwn ? 'bg-primary-foreground/10' : 'bg-background'
                              }`}
                              onClick={() => downloadAttachment(att)}
                            >
                              <FileText className="w-3 h-3" />
                              <span className="text-xs flex-1">{att.file_name}</span>
                              <Download className="w-3 h-3" />
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Reply Input */}
          {rfi.status === 'open' && (
            <div className="space-y-2 pt-4 border-t">
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => document.getElementById('rfi-thread-file')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={sending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <input
                id="rfi-thread-file"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark RFI as Resolved?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the RFI as resolved and move it to the resolved section.
              You can still view the thread but won't be able to add new replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve}>
              Mark as Resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RFIThreadModal;
