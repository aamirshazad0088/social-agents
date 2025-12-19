import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceInput = (setUserInput: (input: string) => void, setError: (error: string | null) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0])
                        .map((result: any) => result.transcript)
                        .join('');
                    setUserInput(transcript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    setIsListening(false);
                    setIsRecording(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                    setIsRecording(false);
                };
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [setUserInput]);

    const toggleVoiceInput = useCallback(() => {
        if (!recognitionRef.current) {
            setError('Voice input is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setIsRecording(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setIsRecording(true);
                setError(null);
            } catch (err) {
                setError('Failed to start voice input. Please try again.');
            }
        }
    }, [isListening, setError]);

    return {
        isRecording,
        isListening,
        toggleVoiceInput
    };
};
