'use client';

import { cn } from '@/lib/utils';

type TagFilterProps = {
    tags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
};

export default function TagFilter({ tags, selectedTags, onToggleTag }: TagFilterProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                    <button
                        key={tag}
                        onClick={() => onToggleTag(tag)}
                        className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors",
                            isSelected
                                ? "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:border-amber-400/50 dark:text-amber-400"
                                : "border-border bg-secondary/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
    );
}
