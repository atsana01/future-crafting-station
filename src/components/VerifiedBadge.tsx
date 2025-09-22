import React from 'react';
import { CheckCircle } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = "", size = 16 }) => {
  return (
    <div title="ETEK Registered - Verified Professional Engineer" className="inline-flex items-center">
      <div className="relative">
        <CheckCircle 
          className={`text-green-500 drop-shadow-md filter ${className}`} 
          size={size}
          fill="currentColor"
        />
        <div className="absolute inset-0 bg-green-400/20 rounded-full blur-sm"></div>
      </div>
      <span className="ml-1 text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">ETEK</span>
    </div>
  );
};

export default VerifiedBadge;