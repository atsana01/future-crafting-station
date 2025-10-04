import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, FileText } from 'lucide-react';

interface CreateRFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onCreated: () => void;
}

const CreateRFIModal = ({ isOpen, onClose, ticketId, onCreated }: CreateRFIModalProps) => {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !question.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create RFI
      const { data: rfi, error: rfiError } = await supabase
        .from('rfis')
        .insert({
          ticket_id: ticketId,
          created_by: user.id,
          title: title.trim(),
          question: question.trim(),
          status: 'open'
        })
        .select()
        .single();

      if (rfiError) throw rfiError;

      // Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `ticket/${ticketId}/rfi/${rfi.id}/question/${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('rfi-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }

          // Save attachment record
          await supabase.from('rfi_attachments').insert({
            rfi_id: rfi.id,
            storage_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          });
        }
      }

      toast.success('RFI created successfully');
      onCreated();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating RFI:', error);
      toast.error(error.message || 'Failed to create RFI');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setQuestion('');
    setFiles([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request for Information (RFI)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">RFI Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Clarification on site access"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Describe what information you need..."
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {question.length}/2000 characters
            </p>
          </div>

          <div>
            <Label>Attachments (optional)</Label>
            <div className="space-y-2">
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
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
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('rfi-file-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Attachments
              </Button>
              <input
                id="rfi-file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRFIModal;
