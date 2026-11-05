import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { aiService, AIInput } from '../services/ai';
import { useSetStore, useStatsStore } from '../store';
import { Card, Quiz, SourceType, StudySet } from '../types';
import { calculateNextReviewDate, compressImage, safeHaptics, safeAlert } from '../utils';

export const createStudySetFormSchema = z
  .object({
    title: z.string().max(80, 'Title cannot exceed 80 characters').optional(),
    subject: z.string().min(1, 'Please select a subject'),
    content: z.string().max(50000, 'Content is too long'),
    sourceType: z.enum(['text', 'image', 'file']),
    imageUri: z.string().optional(),
    imageWidth: z.number().optional(),
    imageHeight: z.number().optional(),
    fileUri: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    base64Data: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceType === 'text') {
      if (!data.content || data.content.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter at least 10 characters of study notes to analyze',
          path: ['content'],
        });
      }
    } else if (data.sourceType === 'image') {
      if (!data.imageUri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please capture or choose a photo of your notes',
          path: ['imageUri'],
        });
      }
    } else if (data.sourceType === 'file') {
      if (!data.fileUri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a PDF or text document',
          path: ['fileUri'],
        });
      }
    }
  });

export type CreateStudySetFormData = z.infer<typeof createStudySetFormSchema>;

export interface SelectedImageState {
  uri: string;
  width?: number;
  height?: number;
  base64?: string;
}

export interface SelectedDocumentState {
  uri: string;
  name: string;
  size?: number;
  text?: string;
}

export function useCreateStudySet() {
  const addSet = useSetStore((state) => state.addSet);
  const recordSession = useStatsStore((state) => state.recordSession);

  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocumentState | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [progressMessage, setProgressMessage] = useState('Preparing study material...');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastAttemptedData = useRef<CreateStudySetFormData | null>(null);

  const form = useForm<CreateStudySetFormData>({
    resolver: zodResolver(createStudySetFormSchema),
    defaultValues: {
      title: '',
      subject: 'General',
      content: '',
      sourceType: 'text',
      imageUri: undefined,
      imageWidth: undefined,
      imageHeight: undefined,
      fileUri: undefined,
      fileName: undefined,
      fileSize: undefined,
      base64Data: undefined,
    },
  });

  const { setValue } = form;

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          safeAlert(
            'Camera Access Needed',
            'Please enable camera access in your device settings to take photos of notes.'
          );
          setErrorMessage('Camera access permission is required to take photos of notes.');
          void safeHaptics('warning');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setIsProcessingMedia(true);
          const original = result.assets[0];
          const compressed = await compressImage(original.uri, 1200, 0.75);
          const base64 = (compressed.base64 || original.base64) ?? undefined;

          setSelectedImage({
            uri: compressed.uri,
            width: compressed.width,
            height: compressed.height,
            base64,
          });

          setValue('sourceType', 'image', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          setValue('imageUri', compressed.uri, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          setValue('imageWidth', compressed.width);
          setValue('imageHeight', compressed.height);
          setValue('base64Data', base64);
          setErrorMessage(null);
          setIsProcessingMedia(false);
          void safeHaptics('light');
        }
      } else {
        // Web browser environment: launch image selector with base64
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setIsProcessingMedia(true);
          const original = result.assets[0];
          const base64 = original.base64 ?? undefined;

          setSelectedImage({
            uri: original.uri,
            width: original.width ?? 1200,
            height: original.height ?? 800,
            base64,
          });

          setValue('sourceType', 'image', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          setValue('imageUri', original.uri, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          setValue('imageWidth', original.width ?? 1200);
          setValue('imageHeight', original.height ?? 800);
          setValue('base64Data', base64);
          setErrorMessage(null);
          setIsProcessingMedia(false);
          void safeHaptics('light');
        }
      }
    } catch (err) {
      setIsProcessingMedia(false);
      const msg = err instanceof Error ? err.message : 'Failed to capture photo.';
      setErrorMessage(msg);
      safeAlert('Photo Error', msg);
      void safeHaptics('error');
    }
  }, [setValue]);

  // Pick photo from gallery
  const pickPhoto = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          safeAlert(
            'Photo Library Needed',
            'Please allow photo library access in your device settings to pick notes.'
          );
          setErrorMessage('Photo library permission is required to select photos of notes.');
          void safeHaptics('warning');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessingMedia(true);
        const original = result.assets[0];

        let finalUri = original.uri;
        let finalWidth = original.width ?? 1200;
        let finalHeight = original.height ?? 800;
        let base64 = original.base64 ?? undefined;

        if (Platform.OS !== 'web') {
          const compressed = await compressImage(original.uri, 1200, 0.75);
          finalUri = compressed.uri;
          finalWidth = compressed.width;
          finalHeight = compressed.height;
          base64 = (compressed.base64 || original.base64) ?? undefined;
        }

        setSelectedImage({
          uri: finalUri,
          width: finalWidth,
          height: finalHeight,
          base64,
        });

        setValue('sourceType', 'image', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        setValue('imageUri', finalUri, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        setValue('imageWidth', finalWidth);
        setValue('imageHeight', finalHeight);
        setValue('base64Data', base64);
        setErrorMessage(null);
        setIsProcessingMedia(false);
        void safeHaptics('light');
      }
    } catch (err) {
      setIsProcessingMedia(false);
      const msg = err instanceof Error ? err.message : 'Failed to select photo.';
      setErrorMessage(msg);
      safeAlert('Gallery Error', msg);
      void safeHaptics('error');
    }
  }, [setValue]);

  // Remove photo
  const removePhoto = useCallback(() => {
    setSelectedImage(null);
    setValue('imageUri', undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('imageWidth', undefined);
    setValue('imageHeight', undefined);
    setValue('base64Data', undefined);
    void safeHaptics('light');
  }, [setValue]);

  // Pick document
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          Platform.OS === 'android'
            ? '*/*'
            : ['application/pdf', 'text/plain', 'text/markdown', 'text/*', '*/*'],
        copyToCacheDirectory: Platform.OS !== 'web',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];

        // Attempt reading text content from text-based documents
        const lowerName = doc.name.toLowerCase();
        let extractedText = '';

        if (
          lowerName.endsWith('.txt') ||
          lowerName.endsWith('.md') ||
          lowerName.endsWith('.json') ||
          lowerName.endsWith('.csv')
        ) {
          try {
            if (Platform.OS === 'web') {
              const fileObj = (doc as { file?: File }).file;
              if (fileObj) {
                extractedText = await fileObj.text();
              }
            } else {
              extractedText = await FileSystem.readAsStringAsync(doc.uri, {
                encoding: FileSystem.EncodingType.UTF8,
              });
            }
          } catch (textErr) {
            console.warn('Could not read text file directly:', textErr);
          }
        }

        const effectiveContent =
          extractedText && extractedText.trim().length >= 10
            ? extractedText.trim()
            : `Document: ${doc.name}. Study material covering ${doc.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}.`;

        setSelectedDocument({
          uri: doc.uri,
          name: doc.name,
          size: doc.size,
          text: effectiveContent,
        });

        setValue('sourceType', 'file', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        setValue('fileUri', doc.uri, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        setValue('fileName', doc.name, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        setValue('fileSize', doc.size);
        setValue('content', effectiveContent, { shouldValidate: true });

        setErrorMessage(null);
        void safeHaptics('light');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to pick document file.';
      setErrorMessage(msg);
      safeAlert('Document Error', msg);
      void safeHaptics('error');
    }
  }, [setValue]);

  // Remove document
  const removeDocument = useCallback(() => {
    setSelectedDocument(null);
    setValue('fileUri', undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('fileName', undefined);
    setValue('fileSize', undefined);
    void safeHaptics('light');
  }, [setValue]);

  // Quick select photo sample
  const selectPhotoSample = useCallback(
    (sample: {
      imageUri: string;
      imageWidth: number;
      imageHeight: number;
      subject: string;
      title: string;
      content: string;
    }) => {
      setSelectedImage({
        uri: sample.imageUri,
        width: sample.imageWidth,
        height: sample.imageHeight,
      });

      setValue('sourceType', 'image', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('subject', sample.subject, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('title', sample.title, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('content', sample.content, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('imageUri', sample.imageUri, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('imageWidth', sample.imageWidth);
      setValue('imageHeight', sample.imageHeight);
      setErrorMessage(null);
      form.clearErrors();
      void safeHaptics('light');
    },
    [setValue, form]
  );

  // Quick select document sample
  const selectDocumentSample = useCallback(
    (sample: {
      fileUri: string;
      fileName: string;
      fileSize: number;
      subject: string;
      title: string;
      content: string;
    }) => {
      setSelectedDocument({
        uri: sample.fileUri,
        name: sample.fileName,
        size: sample.fileSize,
        text: sample.content,
      });

      setValue('sourceType', 'file', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('subject', sample.subject, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('title', sample.title, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('content', sample.content, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('fileUri', sample.fileUri, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('fileName', sample.fileName, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setValue('fileSize', sample.fileSize);
      setErrorMessage(null);
      form.clearErrors();
      void safeHaptics('light');
    },
    [setValue, form]
  );

  const generateSet = useCallback(
    async (formData: CreateStudySetFormData): Promise<StudySet | null> => {
      lastAttemptedData.current = formData;
      setIsGenerating(true);
      setErrorMessage(null);
      setProgressPercentage(15);
      setProgressMessage(
        formData.sourceType === 'image'
          ? 'Scanning photo notes & parsing visual contents with Gemini Vision...'
          : formData.sourceType === 'file'
          ? `Reading document "${formData.fileName ?? 'Study Document'}"...`
          : 'Analyzing notes & extracting core concepts...'
      );

      try {
        // Construct effective text payload for the AI service
        let effectiveContent = formData.content;
        if (formData.sourceType === 'image') {
          effectiveContent =
            formData.content && formData.content.trim().length >= 10
              ? formData.content
              : `Comprehensive study notes for ${formData.subject}: Visual diagrams, formulas, anatomical structures, and key handwritten notes captured from photo.`;
        } else if (formData.sourceType === 'file') {
          effectiveContent =
            formData.content && formData.content.trim().length >= 10
              ? formData.content
              : `Comprehensive document study material from "${formData.fileName ?? 'Study Document'}" covering core concepts, exam summaries, and key principles for ${formData.subject}.`;
        }

        const aiInput: AIInput = {
          content: effectiveContent,
          subjectHint: formData.subject,
          sourceType: formData.sourceType,
          imageUri: formData.imageUri,
          base64Data: formData.base64Data,
          mimeType: formData.sourceType === 'file' ? 'application/pdf' : 'image/jpeg',
        };

        // Step 1: Summary
        setProgressPercentage(35);
        setProgressMessage('Synthesizing structured overview & key points...');
        const summaryResult = await aiService.summarize(aiInput);

        // Step 2: Flashcards
        setProgressPercentage(65);
        setProgressMessage('Drafting active-recall flashcards with Leitner boxes...');
        const flashcardsResult = await aiService.generateFlashcards(aiInput);

        // Step 3: Quiz
        setProgressPercentage(85);
        setProgressMessage('Constructing multiple-choice questions & explanations...');
        const quizResult = await aiService.generateQuiz(aiInput);

        // Assemble Cards
        const cards: Card[] = flashcardsResult.cards.map((c, idx) => ({
          id: `card_${Date.now()}_${idx}`,
          question: c.question,
          answer: c.answer,
          box: 1,
          nextReview: calculateNextReviewDate(1),
        }));

        // Assemble Quiz
        const quizzes: Quiz[] = [
          {
            id: `quiz_${Date.now()}`,
            attempts: 0,
            lastScore: null,
            questions: quizResult.questions.map((q, idx) => ({
              id: `q_${Date.now()}_${idx}`,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
            })),
          },
        ];

        setProgressPercentage(100);
        setProgressMessage('Finalizing and saving study set...');

        // Final Title determination (user provided or AI generated)
        const finalTitle =
          formData.title && formData.title.trim().length > 0
            ? formData.title.trim()
            : summaryResult.title;

        // Save to Zustand store
        const createdSet = addSet({
          title: finalTitle,
          subject: formData.subject,
          summary: summaryResult.summary,
          keyPoints: summaryResult.keyPoints,
          sourceType: formData.sourceType as SourceType,
          cards,
          quizzes,
          imageUri: formData.imageUri,
          fileName: formData.fileName,
          fileSize: formData.fileSize,
        });

        // Record a study session
        recordSession(cards.length, 5);
        void safeHaptics('success');

        // Small pause to allow user to see 100% completion before navigating
        setTimeout(() => {
          router.push(`/set/${createdSet.id}`);
          setTimeout(() => {
            setIsGenerating(false);
          }, 400);
        }, 400);

        return createdSet;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while generating the study set.';
        setErrorMessage(message);
        setIsGenerating(false);
        void safeHaptics('error');
        return null;
      }
    },
    [addSet, recordSession]
  );

  const retry = useCallback(() => {
    if (lastAttemptedData.current) {
      generateSet(lastAttemptedData.current);
    }
  }, [generateSet]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    form,
    selectedImage,
    selectedDocument,
    isGenerating,
    isProcessingMedia,
    progressMessage,
    progressPercentage,
    errorMessage,
    generateSet,
    takePhoto,
    pickPhoto,
    removePhoto,
    pickDocument,
    removeDocument,
    selectPhotoSample,
    selectDocumentSample,
    retry,
    clearError,
  };
}
