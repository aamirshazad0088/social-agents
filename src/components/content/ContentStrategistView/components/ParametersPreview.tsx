import React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

interface ParametersPreviewProps {
    parameters: {
        topic: string;
        platforms: string[];
        contentType: string;
        tone: string;
    };
    isLoading: boolean;
    onConfirm: () => void;
}

export const ParametersPreview: React.FC<ParametersPreviewProps> = ({ 
    parameters, 
    isLoading, 
    onConfirm 
}) => {
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="flex-1">
                <div className="bg-gradient-to-br from-secondary/10 to-primary/10 rounded-xl p-5 shadow-md border border-secondary/20">
                    <div className="bg-card p-4 rounded-lg mb-3 border border-border">
                        <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            Generation Parameters
                        </h4>
                        <div className="space-y-2 text-base">
                            <div className="flex">
                                <span className="font-semibold text-muted-foreground w-32">Topic:</span>
                                <span className="text-foreground">{parameters.topic}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-muted-foreground w-32">Platforms:</span>
                                <span className="text-foreground">{parameters.platforms.join(', ')}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-muted-foreground w-32">Content Type:</span>
                                <span className="text-foreground">{parameters.contentType}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-muted-foreground w-32">Tone:</span>
                                <span className="text-foreground">{parameters.tone}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-2.5 px-4 shadow-lg shadow-primary/20 text-base font-bold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Generate Scripts
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
