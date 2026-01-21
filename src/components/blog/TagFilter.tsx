'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
                                ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                        )}
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
    );
}
