import React from 'react';

interface BibleTextRendererProps {
    text: string;
    className?: string;
    showVerseSuperscripts?: boolean;
}

/**
 * A reusable component to render Bible text with consistent styling:
 * - Verse numbers as bold superscripts
 * - Theme-aware text colors (gray-700 / gray-300)
 * - Subtle hover effects on verses
 */
const BibleTextRenderer: React.FC<BibleTextRendererProps> = ({
    text,
    className = "",
    showVerseSuperscripts = true
}) => {
    if (!text) return null;

    // Split by verse numbers like [1], [2], etc.
    const parts = text.split(/\[(\d+)\]/);

    return (
        <div className={`text-gray-700 dark:text-gray-300 leading-relaxed font-serif ${className}`}>
            {parts.map((part, index) => {
                if (showVerseSuperscripts && part.match(/^\d+$/)) {
                    // It's a verse number
                    return (
                        <sup
                            key={index}
                            className="text-[0.65rem] text-primary font-bold mr-1 select-none"
                        >
                            {part}
                        </sup>
                    );
                } else if (part.trim() === "") {
                    return null;
                } else {
                    // It's text
                    return (
                        <span
                            key={index}
                            className="hover:bg-gray-100 dark:hover:bg-white/5 transition-colors rounded px-0.5"
                        >
                            {part}
                        </span>
                    );
                }
            })}
        </div>
    );
};

export default BibleTextRenderer;
