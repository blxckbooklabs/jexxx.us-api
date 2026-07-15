export interface Contact {
    id: string;
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}
export interface JournalEntry {
    id: string;
    userId: string;
    title: string;
    content: string;
    mood?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}
