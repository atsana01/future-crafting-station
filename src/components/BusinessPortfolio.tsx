import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, Plus, Trash2, Image, Eye, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PortfolioImage {
  url: string;
  caption: string;
  category: string;
}

interface BusinessPortfolioProps {
  selectedCategories: string[];
  portfolioImages: { [category: string]: PortfolioImage[] };
  onPortfolioUpdate: (images: { [category: string]: PortfolioImage[] }) => void;
}

const BusinessPortfolio: React.FC<BusinessPortfolioProps> = ({
  selectedCategories,
  portfolioImages,
  onPortfolioUpdate
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(selectedCategories[0] || '');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedCategory) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image.`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${selectedCategory}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName);

        return {
          url: urlData.publicUrl,
          caption: newImageCaption || file.name,
          category: selectedCategory
        };
      });

      const newImages = await Promise.all(uploadPromises);
      
      // Update portfolio images
      const updatedImages = { ...portfolioImages };
      if (!updatedImages[selectedCategory]) {
        updatedImages[selectedCategory] = [];
      }
      updatedImages[selectedCategory] = [...updatedImages[selectedCategory], ...newImages];
      
      onPortfolioUpdate(updatedImages);
      setNewImageCaption('');
      
      toast({
        title: "Success",
        description: `${newImages.length} image(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (category: string, imageIndex: number) => {
    const image = portfolioImages[category]?.[imageIndex];
    if (!image) return;

    try {
      // Extract file path from URL
      const urlParts = image.url.split('/');
      const bucketPath = urlParts.slice(-3).join('/'); // Get user_id/category/filename

      // Delete from storage
      const { error } = await supabase.storage
        .from('portfolio-images')
        .remove([bucketPath]);

      if (error) throw error;

      // Update local state
      const updatedImages = { ...portfolioImages };
      updatedImages[category] = updatedImages[category].filter((_, index) => index !== imageIndex);
      onPortfolioUpdate(updatedImages);

      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  if (selectedCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Portfolio</CardTitle>
          <CardDescription>Select vendor categories above to add portfolio images</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Please select at least one vendor category to start building your portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Portfolio</CardTitle>
        <CardDescription>
          Showcase your work by category. Images help clients understand your expertise.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category-select">Category</Label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select category</option>
                  {selectedCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="image-caption">Image Caption (Optional)</Label>
                <Input
                  id="image-caption"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  placeholder="Describe this project or image"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!selectedCategory || uploading}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedCategory || uploading}
                className="border-dashed"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Images'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Max 5MB per image. Supported formats: JPG, PNG, WebP
            </p>
          </div>
        </div>

        {/* Portfolio Galleries by Category */}
        {selectedCategories.map((category) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{category}</h3>
              <span className="text-sm text-muted-foreground">
                {portfolioImages[category]?.length || 0} images
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolioImages[category]?.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={image.url}
                      alt={image.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage(image.url)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(category, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Caption */}
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 rounded-b-lg">
                      {image.caption}
                    </div>
                  )}
                </div>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Image className="w-12 h-12 mx-auto mb-2" />
                  <p>No images uploaded for {category}</p>
                  <p className="text-xs">Upload images to showcase your {category.toLowerCase()} work</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Image Preview Modal */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Portfolio Image</DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="flex justify-center">
                <img
                  src={previewImage}
                  alt="Portfolio preview"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BusinessPortfolio;