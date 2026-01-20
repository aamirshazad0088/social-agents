"use client";

import { Message } from "@/components/content/ContentStrategistView/types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function extractStringFromMessageContent(message: Message): string {
    return typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
            ? (message.content as any[])
                .filter(
                    (c: any) =>
                        (typeof c === "object" &&
                            c !== null &&
                            "type" in c &&
                            (c as { type: string }).type === "text") ||
                        typeof c === "string"
                )
                .map((c: any) =>
                    typeof c === "string"
                        ? c
                        : typeof c === "object" && c !== null && "text" in c
                            ? (c as { text?: string }).text || ""
                            : ""
                )
                .join("")
            : "";
}

export function extractSubAgentContent(data: unknown): string {
    if (typeof data === "string") {
        return data;
    }

    if (data && typeof data === "object") {
        const dataObj = data as Record<string, unknown>;

        // Try to extract description first
        if (dataObj.description && typeof dataObj.description === "string") {
            return dataObj.description;
        }

        // Then try prompt
        if (dataObj.prompt && typeof dataObj.prompt === "string") {
            return dataObj.prompt;
        }

        // For output objects, try result
        if (dataObj.result && typeof dataObj.result === "string") {
            return dataObj.result;
        }

        // Fallback to JSON stringification
        return JSON.stringify(data, null, 2);
    }

    // Fallback for any other type
    return JSON.stringify(data, null, 2);
}

export function isPreparingToCallTaskTool(messages: Message[]): boolean {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return false;

    // Adjusted to match local Message type (which has tool_calls)
    return (
        (lastMessage.role === "assistant" &&
            lastMessage.tool_calls?.some(
                (call: { name?: string }) => call.name === "task"
            )) ||
        false
    );
}

export function formatMessageForLLM(message: Message): string {
    let role: string;
    if (message.role === "user") {
        role = "Human";
    } else if (message.role === "assistant") {
        role = "Assistant";
    } else if (message.role === "tool" as any) { // Some roles might be 'tool' in reference
        role = `Tool Result`;
    } else {
        role = message.role || "Unknown";
    }

    const timestamp = message.id ? ` (${message.id.slice(0, 8)})` : "";

    let contentText = "";

    // Extract content text
    if (typeof message.content === "string") {
        contentText = message.content;
    } else if (Array.isArray(message.content)) {
        const contentArray = message.content as any[];
        const textParts: string[] = [];

        contentArray.forEach((part: any) => {
            if (typeof part === "string") {
                textParts.push(part);
            } else if (part && typeof part === "object" && part.type === "text") {
                textParts.push(part.text || "");
            }
        });

        contentText = textParts.join("\n\n").trim();
    }

    // Handle tool calls from .tool_calls property
    const toolCallsText: string[] = [];
    if (
        message.role === "assistant" &&
        message.tool_calls &&
        Array.isArray(message.tool_calls) &&
        message.tool_calls.length > 0
    ) {
        message.tool_calls.forEach((call: any) => {
            const toolName = call.name || "unknown_tool";
            const toolArgs = call.args ? JSON.stringify(call.args, null, 2) : "{}";
            toolCallsText.push(`[Tool Call: ${toolName}]\nArguments: ${toolArgs}`);
        });
    }

    // Combine content and tool calls
    const parts: string[] = [];
    if (contentText) {
        parts.push(contentText);
    }
    if (toolCallsText.length > 0) {
        parts.push(...toolCallsText);
    }

    if (parts.length === 0) {
        return `${role}${timestamp}: [Empty message]`;
    }

    if (parts.length === 1) {
        return `${role}${timestamp}: ${parts[0]}`;
    }

    return `${role}${timestamp}:\n${parts.join("\n\n")}`;
}

export function formatConversationForLLM(messages: Message[]): string {
    const formattedMessages = messages.map(formatMessageForLLM);
    return formattedMessages.join("\n\n---\n\n");
}

/**
 * OpenAI reasoning summary item structure.
 * Used when streaming reasoning tokens from OpenAI models.
 */
export type ReasoningSummaryItem = {
    type: "summary_text";
    text: string;
    index?: number;
};

/**
 * OpenAI reasoning structure in additional_kwargs.
 */
export type OpenAIReasoning = {
    id?: string;
    type: "reasoning";
    summary?: ReasoningSummaryItem[];
};

/**
 * Anthropic thinking content block structure.
 * Used when streaming extended thinking from Claude models.
 */
export type ThinkingContentBlock = {
    type: "thinking";
    thinking: string;
};

/**
 * Extended message type with reasoning support
 */
type MessageWithExtras = Message & {
    additional_kwargs?: { reasoning?: OpenAIReasoning };
    contentBlocks?: Array<{ type: string; thinking?: string; text?: string }>;
};

/**
 * Extracts reasoning/thinking content from an AI message.
 * Supports both OpenAI reasoning (additional_kwargs.reasoning.summary)
 * and Anthropic extended thinking (contentBlocks with type "thinking").
 *
 * Based on LangGraph SDK pattern:
 * https://github.com/langchain-ai/langgraphjs/blob/main/examples/ui-react/src/components/MessageBubble.tsx
 *
 * @param message - The AI message to extract reasoning from.
 * @returns a string of the reasoning/thinking content if found, undefined otherwise.
 */
export function getReasoningFromMessage(message: Message): string | undefined {
    const msg = message as MessageWithExtras;

    // Check for direct thinking property (from our streaming)
    if (msg.thinking && typeof msg.thinking === "string") {
        return msg.thinking;
    }

    // Check for OpenAI reasoning in additional_kwargs
    if (msg.additional_kwargs?.reasoning?.summary) {
        const { summary } = msg.additional_kwargs.reasoning;
        const content = summary
            .filter(
                (item): item is ReasoningSummaryItem =>
                    item.type === "summary_text" && typeof item.text === "string"
            )
            .map((item) => item.text)
            .join("");

        if (content.trim()) {
            return content;
        }
    }

    // Check for Anthropic thinking in contentBlocks
    if (msg.contentBlocks && Array.isArray(msg.contentBlocks)) {
        const thinkingBlocks = msg.contentBlocks.filter(
            (block): block is ThinkingContentBlock =>
                block.type === "thinking" && typeof block.thinking === "string"
        );

        if (thinkingBlocks.length > 0) {
            return thinkingBlocks.map((b) => b.thinking).join("\n");
        }
    }

    // Check for thinking in message.content array
    if (Array.isArray(msg.content)) {
        const thinkingContent: string[] = [];
        for (const block of msg.content) {
            if (
                typeof block === "object" &&
                block !== null &&
                "type" in block &&
                (block as { type: string }).type === "thinking" &&
                "thinking" in block &&
                typeof (block as { thinking: unknown }).thinking === "string"
            ) {
                thinkingContent.push((block as { thinking: string }).thinking);
            }
        }

        if (thinkingContent.length > 0) {
            return thinkingContent.join("\n");
        }
    }

    return undefined;
}
