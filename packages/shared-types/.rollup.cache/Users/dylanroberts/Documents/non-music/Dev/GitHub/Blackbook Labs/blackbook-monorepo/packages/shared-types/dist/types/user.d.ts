export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    createdAt: string;
    updatedAt: string;
}
export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    avatar: {
        useGravatar: boolean;
        customUrl?: string;
        syncWithPersonalAccount?: boolean;
    };
}
