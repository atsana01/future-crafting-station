import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  likes: number;
  liked?: boolean;
  createdAt: Date;
}

interface IdeaCardProps {
  idea: Idea;
  onLike: (id: string) => void;
}

export function IdeaCard({ idea, onLike }: IdeaCardProps) {
  const [isLiked, setIsLiked] = useState(idea.liked || false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike(idea.id);
  };

  return (
    <Card className="group hover:shadow-custom-md transition-all duration-300 hover:-translate-y-1 bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-card-foreground leading-tight mb-2">
              {idea.title}
            </h3>
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-medium">
              {idea.category}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "transition-colors duration-200",
              isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {idea.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{idea.author}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {idea.likes + (isLiked && !idea.liked ? 1 : isLiked === false && idea.liked ? -1 : 0)}
            </span>
            <span>{idea.createdAt.toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}