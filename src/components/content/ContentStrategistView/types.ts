import { Post } from '@/types';

export interface ContentStrategistViewProps {
    onPostCreated: (post: Post) => void;
}

export type Message = {
    role: 'user' | 'model' | 'system';
    content: string;
    postData?: any;
    parameters?: any;
    isFirstMessage?: boolean;
    attachments?: Array<{
        type: 'image' | 'file';
        name: string;
        url: string;
        size?: number;
    }>;
    generatedImage?: string;
    generatedVideo?: string;
    isGeneratingMedia?: boolean;
    suggestions?: string[];
};

export interface AttachedFile {
    type: 'image' | 'file';
    name: string;
    url: string;
    size: number;
}

export interface CarouselSlide {
    number: number;
    prompt: string;
}
