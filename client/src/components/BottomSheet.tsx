import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

export default function BottomSheet({ 
  children, 
  className,
  defaultExpanded = true 
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div 
      className={cn(
        "absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-out",
        isExpanded ? "translate-y-0" : "translate-y-[calc(100%-4rem)]",
        className
      )}
    >
      <div className="bg-background rounded-t-3xl shadow-lg border-t border-border">
        {/* Handle */}
        <div 
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-20">
          {children}
        </div>
      </div>
    </div>
  );
}
