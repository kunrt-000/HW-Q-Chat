// src/utils/webview/formatSelectedText.ts

type TextWrapper = "*" | "_" | "~" | "```";

// Import axios and the configuration
import axios from 'axios';
import { DEEPSEEK_R1_ENDPOINT, DEEPSEEK_R1_API_KEY } from '../config'; // Adjust the path as needed

async function translateText(text: string): Promise<string> {
  try {
    const response = await axios.post(DEEPSEEK_R1_ENDPOINT, {
      text,
      targetLanguage: 'your_target_language', // Replace with desired language code
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_R1_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text in case of error
  }
}

function setCaretPosition({
  focusOffset,
  anchorOffset,
  focusNode,
  wrapperLength,
}: {
  focusOffset: number;
  anchorOffset: number;
  focusNode: Node;
  wrapperLength: number;
}) {
  const selection = window.getSelection();
  if (!selection) return;
  if (!focusNode.firstChild) return;

  const range = document.createRange();
  const offset =
    focusOffset > anchorOffset
      ? focusOffset + wrapperLength
      : anchorOffset + wrapperLength;

  range.setStart(focusNode.firstChild, offset);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
}

async function sendMessage() {
  setTimeout(async () => {
    const messageInput = document.querySelector("#main footer div[contenteditable]");
    if (!messageInput) return;

    // Translate message text before sending
    const originalText = messageInput.innerHTML;
    const translatedText = await translateText(originalText);

    // Insert translated text into the message input
    messageInput.innerHTML = translatedText;

    const sendButtonSpan = document.querySelector("#main footer button span[data-icon=send]");
    if (!sendButtonSpan) return;

    const sendButton = sendButtonSpan.parentNode;
    if (!sendButton) return;

    const click_event = new MouseEvent("click", {
      bubbles: true,
    });
    sendButton.dispatchEvent(click_event);
  }, 0);
}

async function insertMessageText(text: string, autoSend = false) {
  const messageInput = document.querySelector("#main footer div[contenteditable]");

  if (!messageInput) return false;

  const translatedText = await translateText(text);

  return setTimeout(() => {
    messageInput.innerHTML = translatedText;

    const focusEvent = new FocusEvent("focus", {
      bubbles: true,
    });
    messageInput.dispatchEvent(focusEvent);

    const inputEvent = new InputEvent("input", {
      bubbles: true,
    });
    messageInput.dispatchEvent(inputEvent);

    if (autoSend) sendMessage();
  }, 0);
}

function formatSingleLine(selection: Selection, wrapper: TextWrapper) {
  if (!selection.anchorNode) return false;

  const anchorOffset = selection.anchorOffset;
  let focusOffset = selection.focusOffset;

  if (anchorOffset < focusOffset) {
    focusOffset += 1;
  }

  const anchorNodeValue = selection.anchorNode.nodeValue;
  if (!anchorNodeValue) {
    return false;
  }

  let anchorNodeValueAsArray = Array.from(anchorNodeValue);
  anchorNodeValueAsArray.splice(anchorOffset, 0, wrapper);

  if (selection.focusOffset > 0) {
    anchorNodeValueAsArray.join("");
    anchorNodeValueAsArray = Array.from(anchorNodeValueAsArray);
    anchorNodeValueAsArray.splice(focusOffset, 0, wrapper);
  }

  selection.anchorNode.nodeValue = anchorNodeValueAsArray.join("");

  return true;
}

function formatMultiLine(selection: Selection, wrapper: TextWrapper) {
  if (!selection.anchorNode) return;
  if (!selection.focusNode) return;

  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;

  const anchorNodeValue = selection.anchorNode.nodeValue;
  const focusNodeValue = selection.focusNode.nodeValue;
  if (!anchorNodeValue) return;
  if (!focusNodeValue) return;

  const anchorNodeValueAsArray = Array.from(anchorNodeValue);
  anchorNodeValueAsArray.splice(anchorOffset, 0, wrapper);
  selection.anchorNode.nodeValue = anchorNodeValueAsArray.join("");

  const focusNodeValueAsArray = Array.from(focusNodeValue);
  focusNodeValueAsArray.splice(focusOffset, 0, wrapper);
  selection.focusNode.nodeValue = focusNodeValueAsArray.join("");
}

export function formatSelectedText(wrapper: TextWrapper) {
  const messageInput = document.querySelector("#main footer div[contenteditable]");
  if (!messageInput) return;

  const selection = window.getSelection();
  if (!selection) return;
  if (!selection.anchorNode?.parentElement) return;

  const focusOffset = selection.focusOffset;
  const anchorOffset = selection.anchorOffset;

  if (selection.anchorNode == selection.focusNode) {
    const didFormat = formatSingleLine(selection, wrapper);
    if (!didFormat) return;
    if (messageInput.innerHTML.length !== 0) {
      insertMessageText(wrapper + messageInput.textContent + wrapper);
    } else {
      insertMessageText(wrapper + wrapper);
    }
    setTimeout(() => {
      if (!selection.focusNode) return;

      setCaretPosition({
        focusOffset: wrapper.length,
        anchorOffset: wrapper.length,
        focusNode: selection.focusNode,
        wrapperLength: 0,
      });
    }, 1);
  } else {
    formatMultiLine(selection, wrapper);
  }

  const replacement_text = selection.anchorNode.parentElement.innerHTML;
  insertMessageText(replacement_text);

  setTimeout(() => {
    if (!selection.focusNode) return;

    setCaretPosition({
      focusOffset: focusOffset,
      anchorOffset: anchorOffset,
      focusNode: selection.focusNode,
      wrapperLength: wrapper.length,
    });
  }, 1);
}
