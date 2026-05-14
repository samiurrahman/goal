'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

const toolbarButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-white';

// Formatting tags we keep when pasting from external sources. Everything else
// is unwrapped — its text content is preserved but the tag (and any style /
// class / bgcolor it carried) is dropped, so background colors, fonts, and
// layout styling from the source site don't leak into the editor.
const ALLOWED_PASTE_TAGS = new Set([
  'P',
  'BR',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'A',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
]);

// Tags removed entirely, including their content.
const DROP_PASTE_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'META',
  'LINK',
  'TITLE',
  'HEAD',
  'NOSCRIPT',
  'IFRAME',
]);

// Strip styling/classes from pasted HTML while keeping basic structure.
// Allowed tags lose every attribute (except href on links); disallowed tags
// are unwrapped so their plain content survives.
const sanitizePastedHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const clean = (node: Node) => {
    // Iterate a static copy — we mutate the tree as we go.
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        // Comments (e.g. Word's <!--StartFragment-->), etc.
        child.parentNode?.removeChild(child);
        return;
      }

      const el = child as HTMLElement;
      const tag = el.tagName;

      if (DROP_PASTE_TAGS.has(tag)) {
        el.remove();
        return;
      }

      // Recurse first so children are clean before we decide on `el`.
      clean(el);

      if (ALLOWED_PASTE_TAGS.has(tag)) {
        Array.from(el.attributes).forEach((attr) => {
          if (tag === 'A' && attr.name === 'href') return;
          el.removeAttribute(attr.name);
        });
      } else {
        // span / div / font / table … — unwrap, promoting cleaned children.
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
  };

  clean(doc.body);
  return doc.body.innerHTML;
};

// Escape plain text for safe insertion, preserving line breaks.
const escapePlainText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Enter text',
  minHeightClassName = 'min-h-[220px]',
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastSelectionRef = useRef<Range | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const saveSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      lastSelectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = lastSelectionRef.current;

    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  // Intercept paste so content copied from other websites doesn't drag in
  // their background colors, fonts, and layout styling. We keep basic
  // formatting (bold, lists, headings, links) and drop everything else.
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const clipboard = event.clipboardData;
    const html = clipboard.getData('text/html');
    const toInsert = html
      ? sanitizePastedHtml(html)
      : escapePlainText(clipboard.getData('text/plain'));

    document.execCommand('insertHTML', false, toInsert);
    saveSelection();
    emitChange();
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const promptCommand = (command: 'createLink' | 'insertImage') => {
    const label = command === 'createLink' ? 'link URL' : 'image URL';
    const url = window.prompt(`Enter ${label}`);
    if (!url?.trim()) return;
    runCommand(command, url.trim());
  };

  const clearFormatting = () => {
    runCommand('removeFormat');
    runCommand('formatBlock', 'p');
  };

  const toolbarAction = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    action();
  };

  const isEmpty =
    !value ||
    value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, '')
      .trim() === '';

  return (
    <div className="overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex min-h-[54px] flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
        <button
          type="button"
          className={toolbarButtonClass}
          title="Bold"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('bold'))}
        >
          <i className="las la-bold" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Italic"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('italic'))}
        >
          <i className="las la-italic" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Underline"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('underline'))}
        >
          <i className="las la-underline" />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-neutral-800" />
        <button
          type="button"
          className={toolbarButtonClass}
          title="Numbered list"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('insertOrderedList'))}
        >
          <i className="las la-list-ol" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Bulleted list"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('insertUnorderedList'))}
        >
          <i className="las la-list-ul" />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-neutral-800" />
        <button
          type="button"
          className={toolbarButtonClass}
          title="Heading"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('formatBlock', 'h3'))}
        >
          <i className="las la-heading" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Paragraph"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('formatBlock', 'p'))}
        >
          <i className="las la-paragraph" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Align left"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('justifyLeft'))}
        >
          <i className="las la-align-left" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Align center"
          onMouseDown={(e) => toolbarAction(e, () => runCommand('justifyCenter'))}
        >
          <i className="las la-align-center" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Insert link"
          onMouseDown={(e) => toolbarAction(e, () => promptCommand('createLink'))}
        >
          <i className="las la-link" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Insert image"
          onMouseDown={(e) => toolbarAction(e, () => promptCommand('insertImage'))}
        >
          <i className="las la-image" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Clear formatting"
          onMouseDown={(e) => toolbarAction(e, clearFormatting)}
        >
          <i className="las la-remove-format" />
        </button>
      </div>
      <div className="relative">
        {isEmpty && !isFocused ? (
          <div className="pointer-events-none absolute left-4 top-4 text-sm text-slate-500 dark:text-neutral-400">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          className={`${minHeightClassName} w-full overflow-y-auto bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none prose prose-sm max-w-none prose-slate dark:prose-invert dark:bg-neutral-900 dark:text-neutral-100`}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            saveSelection();
          }}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
