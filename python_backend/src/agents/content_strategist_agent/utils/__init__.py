"""
Content Strategist Agent - Utilities Module

Helper functions for content processing, message handling, etc.
"""
import logging
from typing import List

from ..schemas import ContentBlock

logger = logging.getLogger(__name__)


def build_multimodal_content(message: str, content_blocks: List[ContentBlock] = None) -> list:
    """
    Build multimodal content for LangChain message.
    
    Converts ContentBlocks to LangChain format:
    - text: {"type": "text", "text": "..."}
    - image: {"type": "image_url", "image_url": {"url": "data:mime;base64,..."}}
    - file: Extracted text content using document processor
    """
    from src.utils.document_processor import process_document_from_base64
    
    content = []
    document_texts = []
    
    if content_blocks:
        for block in content_blocks:
            if block.type == "image" and block.data:
                mime_type = block.mimeType or "image/png"
                data_url = f"data:{mime_type};base64,{block.data}"
                content.append({
                    "type": "image_url",
                    "image_url": {"url": data_url}
                })
            elif block.type == "file" and block.data:
                filename = None
                if block.metadata:
                    filename = block.metadata.get("filename") or block.metadata.get("name")
                
                mime_type = block.mimeType or "application/pdf"
                
                try:
                    extracted_text = process_document_from_base64(
                        data=block.data,
                        mime_type=mime_type,
                        filename=filename
                    )
                    if extracted_text:
                        document_texts.append(extracted_text)
                        logger.info(f"Extracted {len(extracted_text)} chars from document: {filename}")
                except Exception as e:
                    logger.error(f"Failed to process document {filename}: {e}")
                    document_texts.append(f"[Failed to process document: {filename}]")
                    
            elif block.type == "text" and block.text:
                content.append({
                    "type": "text",
                    "text": block.text
                })
    
    full_message = message
    
    if document_texts:
        doc_context = "\n\n---\n## Attached Documents\n\n"
        doc_context += "\n\n---\n\n".join(document_texts)
        doc_context += "\n\n---\n\n**User's Request:** "
        full_message = doc_context + message
    
    content.insert(0, {"type": "text", "text": full_message})
    
    if len(content) == 1 and content[0]["type"] == "text":
        return content[0]["text"]
    
    return content


def extract_text_content(content) -> str:
    """
    Extract text from LangChain message content.
    
    Content can be:
    - A plain string
    - A list of content blocks [{"type": "text", "text": "..."}]
    """
    if isinstance(content, str):
        return content
    
    if isinstance(content, list):
        text_parts = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
            elif isinstance(block, str):
                text_parts.append(block)
        return "\n".join(text_parts)
    
    return str(content)


__all__ = ["build_multimodal_content", "extract_text_content"]
