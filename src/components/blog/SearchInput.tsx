'use client';

import { Search } from 'lucide-react';

type SearchInputProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchInput({ value, onChange }: SearchInputProps) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
                type="text"
                placeholder="Search for stocks, topics, or keywords..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-4 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 glass"
            />
        </div>
    );
}
