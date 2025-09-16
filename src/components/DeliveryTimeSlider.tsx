import React, { useState, useCallback } from 'react';

interface DeliveryTimeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const DeliveryTimeSlider: React.FC<DeliveryTimeSliderProps> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [trackElement, setTrackElement] = useState<HTMLElement | null>(null);

  const timeOptions = [
    { value: 0, label: 'ASAP' },
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
    { value: 9, label: '9 months' },
    { value: 12, label: '12 months' },
    { value: 15, label: '15 months' },
    { value: 18, label: '18 months' },
    { value: 21, label: '21 months' },
    { value: 24, label: '24 months' },
    { value: 27, label: '27 months' },
    { value: 30, label: '30 months' },
    { value: 33, label: '33 months' },
    { value: 36, label: '36+ months' }
  ];

  const getPercentage = useCallback((val: number) => {
    const maxIndex = timeOptions.length - 1;
    const index = timeOptions.findIndex(option => option.value === val);
    return (index / maxIndex) * 100;
  }, []);

  const getValue = useCallback((percentage: number) => {
    const maxIndex = timeOptions.length - 1;
    const index = Math.round((percentage / 100) * maxIndex);
    return timeOptions[Math.max(0, Math.min(index, maxIndex))].value;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !trackElement) return;

    const rect = trackElement.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newValue = getValue(percentage);
    onChange(newValue);
  }, [isDragging, trackElement, getValue, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const currentOption = timeOptions.find(option => option.value === value) || timeOptions[0];
  const currentPercentage = getPercentage(value);

  return (
    <div className="w-full space-y-4">
      <div className="relative h-8 flex items-center">
        {/* Track */}
        <div 
          ref={setTrackElement}
          className="w-full h-2 bg-muted rounded-full relative"
        >
          {/* Active range */}
          <div
            className="absolute h-2 bg-gradient-primary rounded-full"
            style={{
              left: '0%',
              width: `${currentPercentage}%`
            }}
          />
          
          {/* Handle */}
          <button
            className="absolute w-6 h-6 bg-primary border-2 border-primary-foreground rounded-full shadow-elegant hover:scale-110 transition-transform cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ left: `calc(${currentPercentage}% - 12px)`, top: '-8px' }}
            onMouseDown={() => setIsDragging(true)}
            aria-label="Delivery time"
          />
        </div>
      </div>
      
      {/* Value display */}
      <div className="flex justify-center">
        <span className="font-medium text-primary">{currentOption.label}</span>
      </div>
    </div>
  );
};

export default DeliveryTimeSlider;
