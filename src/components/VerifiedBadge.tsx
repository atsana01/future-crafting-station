import React from 'react';
import { CheckCircle } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = "", size = 16 }) => {
  return (
    <CheckCircle 
      className={`text-green-600 ${className}`} 
      size={size}
      title="ETEK Registered - Verified Professional Engineer"
    />
  );
};

export default VerifiedBadge;