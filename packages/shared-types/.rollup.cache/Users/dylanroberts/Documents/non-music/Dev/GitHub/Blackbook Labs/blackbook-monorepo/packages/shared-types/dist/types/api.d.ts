export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}
export interface ApiError {
    message: string;
    code: string;
    details?: Record<string, any>;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
