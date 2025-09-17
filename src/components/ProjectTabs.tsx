import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface ProjectTabsProps {
  activeProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  children: (projectId: string) => React.ReactNode;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ 
  activeProjectId, 
  onProjectChange, 
  children 
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      // Bypass TypeScript inference issues with explicit any typing
      const projectsQuery: any = (supabase as any)
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      const { data: projectsData, error } = projectsQuery;

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }
      
      setProjects(projectsData || []);
      
      // If no active project selected, select the first one
      if (!activeProjectId && projectsData && projectsData.length > 0) {
        onProjectChange(projectsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user, activeProjectId]);

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) return;

    try {
      setIsCreating(true);
      const { data, error } = await supabase
        .from('projects')
        .insert({
          client_id: user.id,
          title: newProjectName.trim(),
          description: '',
          status: 'draft',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      setShowCreateDialog(false);
      setNewProjectName('');
      
      // Select the newly created project
      if (data) {
        onProjectChange(data.id);
      }
      
      toast({
        title: "Success",
        description: "New project created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          title: newName.trim()
        })
        .eq('id', projectId)
        .eq('client_id', user?.id);

      if (error) throw error;

      await fetchProjects();
      setEditingProject(null);
      
      toast({
        title: "Success",
        description: "Project renamed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to rename project",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading projects...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
        <p className="text-muted-foreground mb-4">Create your first project to get started</p>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs value={activeProjectId || undefined} onValueChange={onProjectChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="flex-1 mr-4">
            {projects.map((project) => (
              <TabsTrigger key={project.id} value={project.id} className="group relative">
                {editingProject === project.id ? (
                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-xs px-1"
                      onBlur={() => {
                        if (editName.trim() && editName !== project.title) {
                          handleRenameProject(project.id, editName);
                        } else {
                          setEditingProject(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editName.trim() && editName !== project.title) {
                            handleRenameProject(project.id, editName);
                          } else {
                            setEditingProject(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingProject(null);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <span>{project.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(project.id);
                        setEditName(project.title);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateProject();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
                    {isCreating ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {projects.map((project) => (
          <TabsContent key={project.id} value={project.id}>
            {children(project.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ProjectTabs;