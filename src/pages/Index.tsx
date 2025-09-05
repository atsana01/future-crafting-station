import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { IdeaCard, type Idea } from "@/components/IdeaCard";
import { AddIdeaModal } from "@/components/AddIdeaModal";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { Lightbulb, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import heroBackground from "@/assets/hero-bg.jpg";

// Sample data
const initialIdeas: Idea[] = [
  {
    id: "1",
    title: "AI-Powered Community Garden",
    description: "Use IoT sensors and AI to optimize community gardens, automatically adjusting watering schedules and providing crop recommendations based on soil conditions and weather data.",
    category: "Technology",
    author: "Sarah Chen",
    likes: 24,
    createdAt: new Date("2024-01-15")
  },
  {
    id: "2", 
    title: "Skill-Swap Marketplace",
    description: "A platform where people can exchange skills directly - teach someone guitar in exchange for cooking lessons, or trade graphic design for home repairs.",
    category: "Social",
    author: "Marcus Johnson",
    likes: 18,
    createdAt: new Date("2024-01-14")
  },
  {
    id: "3",
    title: "Sustainable Packaging from Food Waste",
    description: "Convert fruit peels and vegetable scraps into biodegradable packaging materials through a simple chemical process, reducing both food waste and plastic pollution.",
    category: "Environment",
    author: "Elena Rodriguez",
    likes: 31,
    createdAt: new Date("2024-01-13")
  },
  {
    id: "4",
    title: "Micro-Learning for Busy Parents",
    description: "5-minute educational videos designed for parents to learn new skills during their kids' screen time - perfect for personal development in small windows.",
    category: "Education",
    author: "David Kim",
    likes: 12,
    createdAt: new Date("2024-01-12")
  }
];

const Index = () => {
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const { toast } = useToast();

  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          idea.author.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "All Categories" || 
                            idea.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [ideas, searchTerm, selectedCategory]);

  const handleAddIdea = (newIdeaData: Omit<Idea, "id" | "likes" | "createdAt">) => {
    const newIdea: Idea = {
      ...newIdeaData,
      id: Date.now().toString(),
      likes: 0,
      createdAt: new Date()
    };
    
    setIdeas(prev => [newIdea, ...prev]);
    toast({
      title: "Idea shared successfully!",
      description: "Your brilliant idea is now live for others to discover.",
    });
  };

  const handleLike = (ideaId: string) => {
    setIdeas(prev => prev.map(idea => {
      if (idea.id === ideaId) {
        return {
          ...idea,
          likes: idea.liked ? idea.likes - 1 : idea.likes + 1,
          liked: !idea.liked
        };
      }
      return idea;
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative bg-gradient-secondary overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(250, 245, 255, 0.9), rgba(250, 245, 255, 0.8)), url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-gradient-primary rounded-full shadow-custom-glow">
                <Lightbulb className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Share Your
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Brilliant </span>
              Ideas
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              A community platform where creativity meets collaboration. 
              Discover innovative ideas, share your own, and inspire others to build a better future.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AddIdeaModal onAddIdea={handleAddIdea} />
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <Sparkles className="h-4 w-4 mr-2" />
                Explore Ideas
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {filteredIdeas.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No ideas found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== "All Categories" 
                ? "Try adjusting your search or filters" 
                : "Be the first to share an idea!"
              }
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Latest Ideas ({filteredIdeas.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIdeas.map((idea) => (
                <IdeaCard 
                  key={idea.id} 
                  idea={idea} 
                  onLike={handleLike}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
