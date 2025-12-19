import React from 'react';

// Cache for rendered markdown to prevent re-processing same content
const markdownCache = new Map<string, React.ReactElement>();

export const renderMarkdown = (text: string): React.ReactElement => {
    // Return cached result if available
    if (markdownCache.has(text)) {
        return markdownCache.get(text)!;
    }
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: React.ReactElement[] = [];
    let numberedListItems: React.ReactElement[] = [];
    let codeBlockLines: string[] = [];
    let inCodeBlock = false;

    const renderLineContent = (line: string) => {
        return line.split(/(\*\*.*?\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-medium text-foreground">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={index} className="px-1.5 py-0.5 bg-muted text-foreground rounded text-sm font-mono">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };
    
    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1.5 my-3 ml-1">{listItems}</ul>);
            listItems = [];
        }
        if (numberedListItems.length > 0) {
            elements.push(<ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-3 ml-1">{numberedListItems}</ol>);
            numberedListItems = [];
        }
    };

    const flushCodeBlock = () => {
        if (codeBlockLines.length > 0) {
            elements.push(
                <pre key={`code-${elements.length}`} className="bg-muted rounded-lg p-4 overflow-x-auto my-3 border border-border">
                    <code className="text-sm font-mono text-foreground">{codeBlockLines.join('\n')}</code>
                </pre>
            );
            codeBlockLines = [];
        }
    };

    lines.forEach((line, i) => {
        // Handle code blocks
        if (line.trim().startsWith('```')) {
            flushList();
            if (inCodeBlock) {
                flushCodeBlock();
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            return;
        }

        if (inCodeBlock) {
            codeBlockLines.push(line);
            return;
        }

        // Handle headings
        if (line.trim().startsWith('###')) {
            flushList();
            elements.push(<h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-2">{line.trim().substring(3).trim()}</h3>);
        } else if (line.trim().startsWith('##')) {
            flushList();
            elements.push(<h2 key={i} className="text-[17px] font-semibold text-foreground mt-5 mb-2">{line.trim().substring(2).trim()}</h2>);
        } else if (line.trim().startsWith('# ')) {
            flushList();
            elements.push(<h1 key={i} className="text-lg font-semibold text-foreground mt-6 mb-3">{line.trim().substring(1).trim()}</h1>);
        }
        // Handle numbered lists
        else if (line.trim().match(/^\d+\.\s/)) {
            const content = line.trim().replace(/^\d+\.\s/, '');
            numberedListItems.push(<li key={i} className="pl-1 text-[15px] text-foreground">{renderLineContent(content)}</li>);
        }
        // Handle bullet lists
        else if (line.trim().startsWith('* ')) {
            listItems.push(<li key={i} className="pl-1 text-[15px] text-foreground">{renderLineContent(line.trim().substring(2))}</li>);
        } else if (line.trim().startsWith('- ')) {
            listItems.push(<li key={i} className="pl-1 text-[15px] text-foreground">{renderLineContent(line.trim().substring(2))}</li>);
        } 
        // Handle regular text
        else {
            flushList();
            if (line.trim() !== '') {
                elements.push(<p key={i} className="text-[15px] text-foreground leading-[1.65]">{renderLineContent(line)}</p>);
            } else {
                elements.push(<div key={i} className="h-3"></div>);
            }
        }
    });

    flushList();
    flushCodeBlock();

    const result = <div className="space-y-2.5">{elements}</div>;
    
    // Cache the result (limit cache size to prevent memory leaks)
    if (markdownCache.size > 100) {
        const firstKey = markdownCache.keys().next().value;
        if (firstKey) markdownCache.delete(firstKey);
    }
    markdownCache.set(text, result);
    
    return result;
};
