import React from 'react';
import { CheckCircle } from 'lucide-react';
import { parseCarouselPrompt } from '../utils/carouselParser';

interface PostPreviewProps {
    postData: any;
    content: string;
    onCreatePost: (postData: any) => void;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ postData, content, onCreatePost }) => {
    // Handle new contents array format
    const hasContents = 'contents' in postData && Array.isArray(postData.contents);
    
    // Remove any JSON markdown blocks from the content
    const cleanContent = content.replace(/```json[\s\S]*?```/g, '').trim();
    
    return (
        <div className="bg-gradient-to-br from-secondary/10 to-primary/10 rounded-xl p-6 my-3 shadow-md border border-secondary/20">
            {cleanContent && (
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <p className="font-semibold text-foreground text-base font-serif">{cleanContent}</p>
                </div>
            )}
            
            <div className="bg-card rounded-lg p-5 mb-4 space-y-4">
                {hasContents ? (
                    // New simplified format with contents array
                    <div>
                        <h4 className="font-bold text-foreground text-sm mb-2">📱 Generated Content</h4>
                        <div className="space-y-3">
                            {postData.contents.map((content: any, idx: number) => (
                                <div key={idx} className="bg-muted/30 rounded-lg p-3 border border-border">
                                    <div className="font-semibold text-primary text-sm mb-2 capitalize flex items-center gap-2">
                                        {content.platform}
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                            content.contentType === 'video' 
                                                ? 'bg-purple-100 text-purple-700' 
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {content.contentType}
                                        </span>
                                        {content.format && (
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                                {content.format}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="font-semibold text-xs text-muted-foreground">Headline:</span>
                                            <p className="text-muted-foreground text-sm font-medium font-serif">{content.title}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-xs text-muted-foreground">Caption:</span>
                                            <p className="text-muted-foreground text-sm font-serif">{content.description}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-xs text-muted-foreground">
                                                {content.contentType === 'video' ? '🎥 Video' : '🖼️ Image'} Prompt:
                                            </span>
                                            {(() => {
                                                const carouselSlides = parseCarouselPrompt(content.prompt);
                                                if (carouselSlides) {
                                                    return (
                                                        <div className="mt-2 space-y-2">
                                                            {carouselSlides.map((slide) => (
                                                                <div key={slide.number} className="bg-background/50 rounded p-2 border border-border/50">
                                                                    <div className="font-semibold text-xs text-primary mb-1">
                                                                        Slide {slide.number}
                                                                    </div>
                                                                    <p className="text-muted-foreground text-xs italic font-serif">
                                                                        {slide.prompt}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return <p className="text-muted-foreground text-sm italic font-serif">{content.prompt}</p>;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Legacy format support
                    <>
                        {postData.topic && (
                            <div>
                                <h4 className="font-bold text-foreground text-sm mb-1">📝 Topic</h4>
                                <p className="text-muted-foreground font-serif">{postData.topic}</p>
                            </div>
                        )}
                        
                        {(() => {
                            const { topic, imageSuggestion, videoSuggestion, ...platformContent } = postData;
                            const platforms = Object.keys(platformContent);
                            
                            return (
                                <>
                                    {platforms.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm mb-2">📱 Platform Content</h4>
                                            <div className="space-y-3">
                                                {platforms.map((platform) => {
                                                    const content = platformContent[platform];
                                                    
                                                    // Handle both string and object content
                                                    const renderContent = () => {
                                                        if (typeof content === 'string') {
                                                            return <p className="text-muted-foreground text-sm whitespace-pre-wrap font-serif">{content}</p>;
                                                        }
                                                        
                                                        // Content is an object with type-specific fields
                                                        return (
                                                            <div className="space-y-2">
                                                                {content.title && (
                                                                    <div>
                                                                        <span className="font-semibold text-xs text-muted-foreground">Headline:</span>
                                                                        <p className="text-muted-foreground text-sm font-medium font-serif">{content.title}</p>
                                                                    </div>
                                                                )}
                                                                {content.description && (
                                                                    <div>
                                                                        <span className="font-semibold text-xs text-muted-foreground">Caption:</span>
                                                                        <p className="text-muted-foreground text-sm font-serif">{content.description}</p>
                                                                    </div>
                                                                )}
                                                                {content.content && (
                                                                    <div>
                                                                        <span className="font-semibold text-xs text-muted-foreground">Content:</span>
                                                                        <p className="text-muted-foreground text-sm whitespace-pre-wrap font-serif">{content.content}</p>
                                                                    </div>
                                                                )}
                                                                {content.hashtags && Array.isArray(content.hashtags) && content.hashtags.length > 0 && (
                                                                    <div>
                                                                        <span className="font-semibold text-xs text-muted-foreground">Hashtags:</span>
                                                                        <p className="text-indigo-600 text-sm">{content.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>
                                                                    </div>
                                                                )}
                                                                {content.type && (
                                                                    <div className="text-xs text-muted-foreground italic mt-1">
                                                                        Type: {content.type}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    };
                                                    
                                                    return (
                                                        <div key={platform} className="bg-muted/30 rounded-lg p-3 border border-border">
                                                            <div className="font-semibold text-primary text-sm mb-2 capitalize flex items-center gap-2">
                                                                {platform}
                                                                {typeof content === 'object' && content.type === 'video' && (
                                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Video</span>
                                                                )}
                                                                {typeof content === 'object' && content.type === 'text' && (
                                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Text</span>
                                                                )}
                                                            </div>
                                                            {renderContent()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {imageSuggestion && (
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm mb-1">🖼️ Image Suggestion</h4>
                                            {(() => {
                                                const carouselSlides = parseCarouselPrompt(imageSuggestion);
                                                if (carouselSlides) {
                                                    return (
                                                        <div className="mt-2 space-y-2">
                                                            {carouselSlides.map((slide) => (
                                                                <div key={slide.number} className="bg-background/50 rounded p-2 border border-border/50">
                                                                    <div className="font-semibold text-xs text-primary mb-1">
                                                                        Slide {slide.number}
                                                                    </div>
                                                                    <p className="text-muted-foreground text-xs italic font-serif">
                                                                        {slide.prompt}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return <p className="text-muted-foreground text-sm italic font-serif">{imageSuggestion}</p>;
                                            })()}
                                        </div>
                                    )}
                                    
                                    {videoSuggestion && (
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm mb-1">🎥 Video Suggestion</h4>
                                            {(() => {
                                                const carouselSlides = parseCarouselPrompt(videoSuggestion);
                                                if (carouselSlides) {
                                                    return (
                                                        <div className="mt-2 space-y-2">
                                                            {carouselSlides.map((slide) => (
                                                                <div key={slide.number} className="bg-background/50 rounded p-2 border border-border/50">
                                                                    <div className="font-semibold text-xs text-primary mb-1">
                                                                        Slide {slide.number}
                                                                    </div>
                                                                    <p className="text-muted-foreground text-xs italic font-serif">
                                                                        {slide.prompt}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return <p className="text-muted-foreground text-sm italic font-serif">{videoSuggestion}</p>;
                                            })()}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>
                )}
            </div>
            
            <button
                onClick={() => onCreatePost(postData)}
                className="w-full flex items-center justify-center py-3 px-4 shadow-lg shadow-primary/20 text-base font-bold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all font-sans"
            >
                <CheckCircle className="w-5 h-5 mr-2" />
                Create This Post
            </button>
        </div>
    );
};
