import { CarouselSlide } from '../types';

export const parseCarouselPrompt = (prompt: string): CarouselSlide[] | null => {
    // Check if it's a carousel prompt
    if (!prompt.includes('CAROUSEL') || !prompt.includes('Slide')) {
        return null; // Not a carousel, return null
    }

    // Extract slides using regex
    const slideRegex = /Slide\s+(\d+):\s*([^]*?)(?=Slide\s+\d+:|$)/gi;
    const slides: CarouselSlide[] = [];
    let match;

    while ((match = slideRegex.exec(prompt)) !== null) {
        slides.push({
            number: parseInt(match[1]),
            prompt: match[2].trim()
        });
    }

    return slides.length > 0 ? slides : null;
};
