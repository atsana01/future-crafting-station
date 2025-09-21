import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Paperclip, X, File, Send } from 'lucide-react';

interface UpdateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  onUpdateSent?: () => void;
}

const UpdateQuoteModal: React.FC<UpdateQuoteModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  onUpdateSent
}) => {
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive'
        });
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `quote-updates/${quoteRequestId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('secure-uploads')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('secure-uploads')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!additionalInfo.trim() && selectedFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide additional information or attach files',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      let fileUrls: string[] = [];
      if (selectedFiles.length > 0) {
        fileUrls = await uploadFiles();
      }

      // Create quote update entry
      const { error } = await supabase
        .from('quote_updates')
        .insert({
          quote_request_id: quoteRequestId,
          updated_by: user.data.user.id,
          update_type: 'client_update',
          message: additionalInfo.trim() || 'Client provided additional files',
          attachments: fileUrls.map(url => ({ url, name: selectedFiles[fileUrls.indexOf(url)]?.name }))
        });

      if (error) throw error;

      toast({
        title: 'Update Sent',
        description: 'Your additional information has been sent to the vendor',
      });

      onUpdateSent?.();
      onClose();
      
      // Reset form
      setAdditionalInfo('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send update',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Update Quote Request - "{projectTitle}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="additionalInfo">Additional Information</Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Provide any additional details, clarifications, or changes to your project requirements..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Attach Files (Images, PDFs, Documents)</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedFiles.length >= 5}
                className="w-full"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add Files {selectedFiles.length > 0 && `(${selectedFiles.length}/5)`}
              </Button>
              
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (!additionalInfo.trim() && selectedFiles.length === 0)}
              className="bg-gradient-primary"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateQuoteModal;