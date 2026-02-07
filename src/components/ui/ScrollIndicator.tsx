import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  scrollableRef: RefObject<HTMLElement | null> | RefObject<HTMLDivElement | null>;
  topOffset?: number; // Offset for top indicator (e.g., header height)
  dependencies?: any[]; // Dependencies to re-check scroll position (e.g., form data)
  className?: string;
}

export default function ScrollIndicator({ 
  scrollableRef, 
  topOffset = 73,
  dependencies = [],
  className = ''
}: ScrollIndicatorProps) {
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  // Check scroll position and show appropriate indicators
  useEffect(() => {
    const checkScrollPosition = () => {
      if (scrollableRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
        const isAtTop = scrollTop <= 5;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
        const hasScrollableContent = scrollHeight > clientHeight;
        
        // Show bottom indicator when there's more content below (not at bottom yet)
        setShowBottomIndicator(hasScrollableContent && !isAtBottom);
        
        // Show top indicator when there's more content above (not at top yet)
        setShowTopIndicator(hasScrollableContent && !isAtTop);
      }
    };

    // Check initially and on scroll
    checkScrollPosition();
    const scrollableElement = scrollableRef.current;
    if (scrollableElement) {
      scrollableElement.addEventListener('scroll', checkScrollPosition);
      // Also check on resize
      window.addEventListener('resize', checkScrollPosition);
      
      return () => {
        scrollableElement.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      };
    }
  }, [scrollableRef, ...dependencies]);

  return (
    <>
      {/* Top Scroll Indicator - shows when there's more content above */}
      {showTopIndicator && (
        <div 
          className={`sticky left-0 right-0 flex justify-center pointer-events-none z-[60] ${className}`}
          style={{ top: `${topOffset}px` }}
        >
          <div className="bg-gradient-to-b from-white via-white/95 to-transparent dark:from-gray-800 dark:via-gray-800/95 pb-3 pt-2 px-4 w-full">
            <ChevronUp className="w-5 h-5 text-primary-500 dark:text-primary-400 animate-bounce mx-auto" />
          </div>
        </div>
      )}
      
      {/* Bottom Scroll Indicator - shows when there's more content below */}
      {showBottomIndicator && (
        <div className={`absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none z-10 ${className}`}>
          <div className="bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-800 dark:via-gray-800/95 pt-6 pb-2 px-4 w-full rounded-b-lg">
            <ChevronDown className="w-5 h-5 text-primary-500 dark:text-primary-400 animate-bounce mx-auto" />
          </div>
        </div>
      )}
    </>
  );
}

