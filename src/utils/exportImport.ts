import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { StudySet, Quiz } from '../types';
import { safeHaptics } from './media';

export interface ExportDeckPayload {
  version: 1;
  exportedAt: string;
  set: {
    title: string;
    subject: string;
    summary: string;
    keyPoints: string[];
    sourceType: StudySet['sourceType'];
    cards: {
      question: string;
      answer: string;
      box?: number;
      starred?: boolean;
    }[];
    quizzes: {
      questions: Quiz['questions'];
    }[];
  };
}

/**
 * Exports a study set as a shareable JSON file via native system share sheet.
 */
export async function exportStudyDeck(set: StudySet): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: ExportDeckPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      set: {
        title: set.title,
        subject: set.subject,
        summary: set.summary,
        keyPoints: set.keyPoints,
        sourceType: set.sourceType,
        cards: set.cards.map((c) => ({
          question: c.question,
          answer: c.answer,
          box: c.box,
          starred: c.starred,
        })),
        quizzes: set.quizzes.map((q) => ({
          questions: q.questions,
        })),
      },
    };

    const sanitizedTitle = set.title
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const fileName = `${sanitizedTitle || 'study_set'}.studyai.json`;
    const jsonString = JSON.stringify(payload, null, 2);

    // Web download fallback
    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        void safeHaptics('success');
        return { success: true };
      } catch (webErr) {
        return { success: false, error: 'Web download failed: ' + String(webErr) };
      }
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }

    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    void safeHaptics('success');
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: `Share "${set.title}" Deck`,
      UTI: 'public.json',
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to export deck';
    console.warn('Export deck error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Opens document picker to import a study set JSON file.
 * Returns parsed payload or error.
 */
export async function importStudyDeckFromFile(): Promise<{
  success: boolean;
  deckData?: ExportDeckPayload['set'];
  error?: string;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: 'Import cancelled' };
    }

    const asset = result.assets[0];
    let content = '';

    // Handle web blob reading
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(asset.uri);
        content = await response.text();
      } catch {
        const fileObj = (asset as { file?: File }).file;
        if (fileObj) {
          content = await fileObj.text();
        }
      }
    } else {
      content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    const parsed = JSON.parse(content) as unknown;

    // Validate minimal structure
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid file format. Expected JSON.' };
    }

    const candidate = parsed as Record<string, unknown>;
    const deckSet = (candidate.set ?? candidate) as Record<string, unknown>;

    if (!deckSet.title || typeof deckSet.title !== 'string') {
      return { success: false, error: 'Missing study set title in imported file.' };
    }

    const cardsArray = Array.isArray(deckSet.cards) ? deckSet.cards : [];
    if (cardsArray.length === 0) {
      return { success: false, error: 'The imported file contains no flashcards.' };
    }

    const cleanedCards = cardsArray.map((c: Record<string, unknown>) => ({
      question: String(c.question ?? 'Untitled Question'),
      answer: String(c.answer ?? 'No answer provided'),
      box: typeof c.box === 'number' && c.box >= 1 && c.box <= 3 ? (c.box as 1 | 2 | 3) : 1,
      starred: Boolean(c.starred),
    }));

    const deckData: ExportDeckPayload['set'] = {
      title: String(deckSet.title),
      subject: String(deckSet.subject ?? 'General'),
      summary: String(deckSet.summary ?? 'Imported study set.'),
      keyPoints: Array.isArray(deckSet.keyPoints)
        ? deckSet.keyPoints.map(String)
        : ['Imported learning material.'],
      sourceType: (['text', 'image', 'file'].includes(String(deckSet.sourceType))
        ? deckSet.sourceType
        : 'text') as StudySet['sourceType'],
      cards: cleanedCards,
      quizzes: Array.isArray(deckSet.quizzes) ? (deckSet.quizzes as Quiz[]) : [],
    };

    void safeHaptics('success');
    return { success: true, deckData };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Invalid JSON file';
    return { success: false, error: msg };
  }
}

/**
 * Generates and exports a clean, printable HTML revision cheat sheet for offline revision.
 */
export async function exportPrintableCheatSheet(set: StudySet): Promise<{ success: boolean; error?: string }> {
  try {
    const sanitizedTitle = set.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const fileName = `${sanitizedTitle || 'study_set'}_CheatSheet.html`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${set.title} · StudyAI Cheat Sheet</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      max-width: 820px;
      margin: 0 auto;
      padding: 30px 20px;
    }
    .header {
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .badge {
      display: inline-block;
      background: #e0e7ff;
      color: #4338ca;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    h2 {
      font-size: 15px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .summary-box {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
    }
    .key-points {
      list-style-type: disc;
      padding-left: 20px;
      margin: 10px 0;
    }
    .key-points li {
      font-size: 12.5px;
      margin-bottom: 6px;
      color: #1e293b;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .card-item {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .card-q {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .card-a {
      font-size: 11.5px;
      color: #475569;
      border-top: 1px dashed #e2e8f0;
      padding-top: 4px;
    }
    .quiz-item {
      margin-bottom: 12px;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .quiz-q {
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .quiz-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 11.5px;
      color: #475569;
    }
    .footer {
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="badge">${set.subject}</div>
      <h1 class="title">${set.title}</h1>
      <div class="meta">${set.cards.length} Flashcards · ${set.quizzes.length > 0 ? set.quizzes[0].questions.length : 0} Quiz Questions · Created with StudyAI</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 800; color: #4f46e5; font-size: 16px;">StudyAI 🧠</div>
      <div style="font-size: 10px; color: #64748b;">by Krish Rawal</div>
    </div>
  </div>

  <h2>📌 Executive Summary</h2>
  <div class="summary-box">
    ${set.summary}
  </div>

  <h2>⚡ High-Yield Key Points</h2>
  <ul class="key-points">
    ${set.keyPoints.map((pt) => `<li>${pt}</li>`).join('')}
  </ul>

  <h2>🃏 Flashcard Reference Deck (${set.cards.length} Cards)</h2>
  <div class="cards-grid">
    ${set.cards
      .map(
        (c, idx) => `
      <div class="card-item">
        <div class="card-q">Q${idx + 1}. ${c.question}</div>
        <div class="card-a"><strong>A:</strong> ${c.answer}</div>
      </div>`
      )
      .join('')}
  </div>

  ${
    set.quizzes.length > 0 && set.quizzes[0].questions.length > 0
      ? `
    <h2 style="margin-top: 30px;">📝 Practice Quiz</h2>
    ${set.quizzes[0].questions
      .map(
        (q, idx) => `
      <div class="quiz-item">
        <div class="quiz-q">${idx + 1}. ${q.question}</div>
        <div class="quiz-options">
          ${q.options
            .map(
              (opt, oIdx) => `
            <div><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${opt} ${
                oIdx === q.correctIndex ? '<span style="color: #059669; font-weight: 700;">(✓)</span>' : ''
              }</div>`
            )
            .join('')}
        </div>
      </div>`
      )
      .join('')}
  `
      : ''
  }

  <div class="footer">
    StudyAI Mobile Application · Developed by Krish Rawal · Active Recall & Spaced Repetition Cheat Sheet
  </div>
</body>
</html>`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          // Fallback download if popup blocked
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        void safeHaptics('success');
        return { success: true };
      } catch (webErr) {
        return { success: false, error: 'Web print export failed: ' + String(webErr) };
      }
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }

    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    void safeHaptics('success');
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/html',
      dialogTitle: `Print or Share "${set.title}" Cheat Sheet`,
      UTI: 'public.html',
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to export cheat sheet';
    return { success: false, error: msg };
  }
}
