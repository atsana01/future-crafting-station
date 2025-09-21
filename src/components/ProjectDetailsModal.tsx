import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, FileText, MapPin, Clock, DollarSign, Home, Palette, Image } from 'lucide-react';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    title: string;
    description: string;
    location?: string;
    budget_range?: string;
    timeline?: string;
    form_data?: any;
  };
  client: {
    full_name: string;
    avatar_url?: string;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type?: string;
  }>;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  project,
  client,
  attachments = []
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scope: true,
    rooms: false,
    sizes: false,
    styles: false,
    location: false,
    timeline: false,
    budget: false,
    notes: false,
    attachments: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formData = project.form_data || {};

  const CollapsibleSection = ({ 
    title, 
    icon: Icon, 
    section, 
    children 
  }: { 
    title: string; 
    icon: React.ComponentType<{ className?: string }>; 
    section: string; 
    children: React.ReactNode;
  }) => (
    <Collapsible 
      open={expandedSections[section]} 
      onOpenChange={() => toggleSection(section)}
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-medium">{title}</span>
          </div>
          {expandedSections[section] ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              {client.avatar_url ? (
                <img 
                  src={client.avatar_url} 
                  alt={client.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {client.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{project.title}</h2>
                <p className="text-sm text-muted-foreground">Project details from {client.full_name}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {/* Project Scope */}
          <CollapsibleSection title="Project Scope" icon={FileText} section="scope">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{project.description}</p>
              </div>
              {formData.projectType && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Project Type</h4>
                  <Badge variant="outline">{formData.projectType}</Badge>
                </div>
              )}
              {formData.serviceGroups && formData.serviceGroups.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Services Required</h4>
                  <div className="flex flex-wrap gap-1">
                    {formData.serviceGroups.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          <Separator />

          {/* Rooms & Spaces */}
          {formData.bedrooms || formData.bathrooms || formData.livingSpaces && (
            <>
              <CollapsibleSection title="Rooms & Spaces" icon={Home} section="rooms">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.bedrooms && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Bedrooms</h4>
                      <p className="text-sm">{formData.bedrooms}</p>
                    </div>
                  )}
                  {formData.bathrooms && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Bathrooms</h4>
                      <p className="text-sm">{formData.bathrooms}</p>
                    </div>
                  )}
                  {formData.livingSpaces && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Living Spaces</h4>
                      <p className="text-sm">{formData.livingSpaces}</p>
                    </div>
                  )}
                  {formData.kitchen && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Kitchen</h4>
                      <p className="text-sm">{formData.kitchen}</p>
                    </div>
                  )}
                  {formData.garden && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Garden</h4>
                      <p className="text-sm">{formData.garden}</p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Sizes & Dimensions */}
          {(formData.totalArea || formData.roomSizes) && (
            <>
              <CollapsibleSection title="Sizes & Dimensions" icon={Home} section="sizes">
                <div className="space-y-3">
                  {formData.totalArea && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Total Area</h4>
                      <p className="text-sm">{formData.totalArea} sqm</p>
                    </div>
                  )}
                  {formData.roomSizes && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Room Sizes</h4>
                      <div className="space-y-1">
                  {Object.entries(formData.roomSizes).map(([room, size]) => (
                    <div key={room} className="flex justify-between text-sm">
                      <span className="capitalize">{room}:</span>
                      <span>{String(size)} sqm</span>
                    </div>
                  ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Styles & Preferences */}
          {formData.designStyle && (
            <>
              <CollapsibleSection title="Styles & Preferences" icon={Palette} section="styles">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Design Style</h4>
                    <Badge variant="outline">{formData.designStyle}</Badge>
                  </div>
                  {formData.colorPreferences && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Color Preferences</h4>
                      <p className="text-sm">{formData.colorPreferences}</p>
                    </div>
                  )}
                  {formData.materialPreferences && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Material Preferences</h4>
                      <p className="text-sm">{formData.materialPreferences}</p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Location */}
          {project.location && (
            <>
              <CollapsibleSection title="Location" icon={MapPin} section="location">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Project Location</h4>
                  <p className="text-sm">{project.location}</p>
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Timeline */}
          {(project.timeline || formData.timeframe) && (
            <>
              <CollapsibleSection title="Timeline" icon={Clock} section="timeline">
                <div className="space-y-2">
                  {project.timeline && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Timeline</h4>
                      <p className="text-sm">{project.timeline}</p>
                    </div>
                  )}
                  {formData.timeframe && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Preferred Timeframe</h4>
                      <p className="text-sm">{formData.timeframe}</p>
                    </div>
                  )}
                  {formData.startDate && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Preferred Start Date</h4>
                      <p className="text-sm">{new Date(formData.startDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Budget */}
          {project.budget_range && (
            <>
              <CollapsibleSection title="Budget" icon={DollarSign} section="budget">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Budget Range</h4>
                  <p className="text-sm">{project.budget_range}</p>
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Additional Notes */}
          {formData.additionalInfo && (
            <>
              <CollapsibleSection title="Additional Notes" icon={FileText} section="notes">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Client Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{formData.additionalInfo}</p>
                </div>
              </CollapsibleSection>
              <Separator />
            </>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <CollapsibleSection title="Attachments" icon={Image} section="attachments">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="border rounded-lg p-3">
                    {attachment.file_type?.startsWith('image/') ? (
                      <img 
                        src={attachment.file_url} 
                        alt={attachment.file_name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-muted rounded flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs font-medium truncate">{attachment.file_name}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailsModal;