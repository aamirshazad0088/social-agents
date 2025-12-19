import { Post, PostContent, Platform } from '@/types';
import { PLATFORMS } from '@/constants';

export const handleCreatePost = (
    postData: any,
    onPostCreated: (post: Post) => void,
    setError: (error: string | null) => void
) => {
    // Handle new contents array format
    if (postData.contents && Array.isArray(postData.contents)) {
        // Extract platforms from contents array
        const platforms = postData.contents
            .map((item: any) => item.platform?.toLowerCase())
            .filter((p: string) => PLATFORMS.some(platform => platform.id === p)) as Platform[];

        if (platforms.length === 0) {
            setError("The generated content didn't specify any valid platforms.");
            return;
        }

        // Build content object from contents array
        const content: PostContent = {};
        let imagePrompt: string | undefined;
        let videoPrompt: string | undefined;

        postData.contents.forEach((item: any) => {
            const platform = item.platform?.toLowerCase() as Platform;
            if (PLATFORMS.some(p => p.id === platform)) {
                content[platform] = {
                    title: item.title,
                    description: item.description,
                    type: item.contentType,
                };

                // Collect image and video prompts (use first encountered or longest)
                if (item.contentType === 'image' && item.prompt) {
                    if (!imagePrompt || item.prompt.length > imagePrompt.length) {
                        imagePrompt = item.prompt;
                    }
                } else if (item.contentType === 'video' && item.prompt) {
                    if (!videoPrompt || item.prompt.length > videoPrompt.length) {
                        videoPrompt = item.prompt;
                    }
                }
            }
        });

        // Set image and video suggestions if found
        if (imagePrompt) {
            content.imageSuggestion = imagePrompt;
        }
        if (videoPrompt) {
            content.videoSuggestion = videoPrompt;
        }

        const newPost: Post = {
            id: crypto.randomUUID(),
            topic: "AI Generated Content",
            platforms,
            postType: 'post',
            content,
            status: 'ready_to_publish',
            createdAt: new Date().toISOString(),
            isGeneratingImage: false,
            isGeneratingVideo: false,
            videoGenerationStatus: '',
        };

        onPostCreated(newPost);
        return;
    }

    // Legacy format support
    const { topic, postType, imageSuggestion, videoSuggestion, ...platformContent } = postData;

    // Extract valid platforms from the generated content
    const platforms = Object.keys(platformContent).filter(
        key => PLATFORMS.some(p => p.id === key)
    ) as Platform[];

    if (platforms.length === 0) {
        setError("The generated content didn't specify any valid platforms.");
        return;
    }

    // Build content object with proper structure for each platform
    const content: PostContent = {};
    platforms.forEach(platform => {
        if (platformContent[platform]) {
            content[platform] = platformContent[platform];
        }
    });

    // Enhance image suggestion for Gemini API
    let enhancedImageSuggestion = imageSuggestion;
    if (imageSuggestion) {
        const hasQualityKeywords = /high.?resolution|4k|professional|cinematic|studio|detailed/i.test(imageSuggestion);
        if (!hasQualityKeywords) {
            enhancedImageSuggestion = `${imageSuggestion}. Style: high-resolution, professional, cinematic quality. Perfect for social media.`;
        }
        content.imageSuggestion = enhancedImageSuggestion;
    }

    // Enhance video suggestion for Gemini API
    let enhancedVideoSuggestion = videoSuggestion;
    if (videoSuggestion) {
        const hasTechKeywords = /9:16|vertical|15.?sec|30.?sec|45.?sec|60.?sec|duration|pacing|cinematic/i.test(videoSuggestion);
        if (!hasTechKeywords) {
            enhancedVideoSuggestion = `${videoSuggestion}. Format: 9:16 vertical video, 30-45 seconds duration. Cinematic quality, professional editing, engaging pacing. Suitable for social media (TikTok, Instagram Reels, YouTube Shorts).`;
        }
        content.videoSuggestion = enhancedVideoSuggestion;
    }

    const newPost: Post = {
        id: crypto.randomUUID(),
        topic: topic || "AI Generated Content",
        platforms,
        postType: postType || 'post',
        content,
        status: 'ready_to_publish',
        createdAt: new Date().toISOString(),
        isGeneratingImage: false,
        isGeneratingVideo: false,
        videoGenerationStatus: '',
    };

    onPostCreated(newPost);
};
