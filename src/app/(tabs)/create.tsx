import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller } from 'react-hook-form';
import { Image } from 'expo-image';
import { useCreateStudySet, createStudySetFormSchema, CreateStudySetFormData } from '../../hooks';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { ErrorView } from '../../components/ErrorView';
import { DEFAULT_SUBJECTS } from '../../constants/theme';
import { formatBytes, safeHaptics } from '../../utils';

const SAMPLE_TEXTS: { label: string; subject: string; title: string; content: string }[] = [
  {
    label: '🌿 Photosynthesis',
    subject: 'Biology',
    title: 'Photosynthesis & Light Reactions',
    content:
      'Photosynthesis is the biological process by which green plants, algae, and cyanobacteria convert light energy into chemical energy stored in glucose. The process occurs in chloroplasts and consists of two primary stages: the light-dependent reactions and the Calvin cycle (light-independent reactions). In the light reactions, chlorophyll absorbs photons in the thylakoid membrane, splitting water molecules into oxygen, protons, and electrons through photolysis. The Calvin cycle fixes carbon dioxide into glyceraldehyde-3-phosphate (G3P) using ATP and NADPH synthesized during the light reactions.',
  },
  {
    label: '💻 Sorting Algorithms',
    subject: 'Computer Science',
    title: 'Sorting Algorithms & Time Complexity',
    content:
      'Sorting algorithms arrange elements in a sequence according to a defined comparison operator. Quicksort is a divide-and-conquer algorithm that selects a pivot element and partitions the array into sub-arrays of elements less than and greater than the pivot. Its average-case time complexity is O(n log n), but degrades to O(n^2) when poor pivots are chosen. In contrast, MergeSort guarantees O(n log n) in all cases by recursively dividing the list in half and merging sorted halves, though it requires O(n) auxiliary space.',
  },
  {
    label: '🏛️ World History',
    subject: 'History',
    title: 'The Roman Republic & Senate',
    content:
      'The Roman Republic was the era of classical Roman civilization beginning with the overthrow of the Roman Kingdom in 509 BC and ending in 27 BC with the establishment of the Roman Empire. The Republic was governed by complex constitutional principles centered on separation of powers and checks and balances. The Senate served as the primary advisory council, while executive magistrates, including two annual consuls, directed the military and civil administration.',
  },
];

const SAMPLE_PHOTOS: {
  label: string;
  subject: string;
  title: string;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  content: string;
}[] = [
  {
    label: '🧬 Cell Biology Diagram',
    subject: 'Biology',
    title: 'Cell Organelles & Membrane Transport',
    imageUri: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80',
    imageWidth: 1200,
    imageHeight: 800,
    content:
      'Microscopic cellular structures showing mitochondria, cell membrane, nucleus, ribosomes, and endoplasmic reticulum.',
  },
  {
    label: '📐 Calculus Formulas',
    subject: 'Mathematics',
    title: 'Calculus Differentiation & Integrals',
    imageUri: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    imageWidth: 1200,
    imageHeight: 800,
    content:
      'Whiteboard notes featuring derivatives, chain rule, integration by parts, and trigonometric limits.',
  },
  {
    label: '⚗️ Organic Chemistry',
    subject: 'Chemistry',
    title: 'Organic Chemistry & Functional Groups',
    imageUri: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&q=80',
    imageWidth: 1200,
    imageHeight: 800,
    content:
      'Handwritten laboratory notes describing hydrocarbons, functional groups, reaction mechanisms, and molecular bonding.',
  },
];

const SAMPLE_DOCUMENTS: {
  label: string;
  subject: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileUri: string;
  content: string;
}[] = [
  {
    label: '📑 Biology Lecture PDF',
    subject: 'Biology',
    title: 'Cellular Respiration & ATP Synthesis',
    fileName: 'Cellular_Respiration_Lecture.pdf',
    fileSize: 245000,
    fileUri: 'sample://cellular-respiration.pdf',
    content:
      'Lecture slides covering glycolysis, Krebs cycle, electron transport chain, and oxidative phosphorylation in cellular respiration.',
  },
  {
    label: '💻 Algorithms Cheat Sheet',
    subject: 'Computer Science',
    title: 'Data Structures & Big-O Complexity',
    fileName: 'Algorithms_Data_Structures.md',
    fileSize: 180000,
    fileUri: 'sample://algorithms-cheatsheet.md',
    content:
      'Comprehensive reference notes on time complexity, graph algorithms, dynamic programming, and hash table collision resolution.',
  },
  {
    label: '🏛️ Modern History Document',
    subject: 'History',
    title: 'Industrial Revolution & Social Impact',
    fileName: 'Industrial_Revolution_Notes.pdf',
    fileSize: 310000,
    fileUri: 'sample://industrial-revolution.pdf',
    content:
      'Historical primary source document detailing technological innovations, urbanization, labor movements, and socio-economic transformation.',
  },
];

export default function CreateScreen() {
  const [activeTab, setActiveTab] = React.useState<'text' | 'image' | 'file'>('text');

  const {
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
  } = useCreateStudySet();

  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const currentSubject = watch('subject');
  const currentContent = watch('content');

  const handleSwitchTab = (type: 'text' | 'image' | 'file') => {
    setActiveTab(type);
    setValue('sourceType', type, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    clearError();
    form.clearErrors();
    void safeHaptics('light');
  };

  const handleSelectSample = (sample: (typeof SAMPLE_TEXTS)[number]) => {
    setActiveTab('text');
    setValue('sourceType', 'text', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('subject', sample.subject, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('title', sample.title, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('content', sample.content, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    clearError();
    form.clearErrors();
    void safeHaptics('light');
  };

  const handleSelectPhotoSample = (sample: (typeof SAMPLE_PHOTOS)[number]) => {
    setActiveTab('image');
    selectPhotoSample(sample);
  };

  const handleSelectDocumentSample = (sample: (typeof SAMPLE_DOCUMENTS)[number]) => {
    setActiveTab('file');
    selectDocumentSample(sample);
  };

  const handlePressGenerate = async () => {
    if (isProcessingMedia || isGenerating) return;

    const currentValues = form.getValues();

    const dataToValidate: CreateStudySetFormData = {
      title: currentValues.title ?? '',
      subject: currentValues.subject || 'General',
      content: currentValues.content ?? '',
      sourceType: activeTab,
      imageUri: selectedImage?.uri,
      imageWidth: selectedImage?.width,
      imageHeight: selectedImage?.height,
      fileUri: selectedDocument?.uri,
      fileName: selectedDocument?.name,
      fileSize: selectedDocument?.size,
      base64Data: selectedImage?.base64,
    };

    const validationResult = createStudySetFormSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.warn('Form validation errors:', validationResult.error.format());
      void safeHaptics('warning');
      await form.trigger();
      return;
    }

    void generateSet(validationResult.data);
  };

  const isSubmitDisabled =
    (activeTab === 'text' && (!currentContent || currentContent.trim().length < 10)) ||
    (activeTab === 'image' && !selectedImage) ||
    (activeTab === 'file' && !selectedDocument) ||
    isProcessingMedia ||
    isGenerating;

  return (
    <SafeAreaView
      className="flex-1 bg-surface-subtle dark:bg-surface-dark"
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-5">
            <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Create Study Set
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              Snap photos, pick files, or paste notes to generate AI study materials
            </Text>
          </View>

          {/* AI Generating Loading State */}
          {isGenerating ? (
            <Card className="p-6 mb-6 items-center">
              <View className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-950/60 items-center justify-center mb-4">
                <Text className="text-3xl">✨</Text>
              </View>

              <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
                Generating Your Study Set
              </Text>

              <Text className="text-xs font-medium text-primary-600 dark:text-primary-400 text-center mb-4">
                {progressMessage}
              </Text>

              <ProgressBar
                progress={progressPercentage}
                color="primary"
                height={8}
                className="mb-6"
              />

              {/* Skeleton placeholders */}
              <View className="w-full gap-2.5">
                <LoadingSkeleton width="75%" height={18} borderRadius={8} />
                <LoadingSkeleton width="100%" height={14} borderRadius={6} />
                <LoadingSkeleton width="90%" height={14} borderRadius={6} />
                <LoadingSkeleton width="60%" height={14} borderRadius={6} />
              </View>
            </Card>
          ) : (
            <>
              {/* Error View if previous attempt failed */}
              {errorMessage ? (
                <ErrorView
                  title="AI Generation Failed"
                  message={errorMessage}
                  onRetry={retry}
                  onDismiss={clearError}
                  className="mb-6"
                />
              ) : null}

              {/* Source Mode Tabs */}
              <View className="flex-row gap-2 mb-5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Text input mode"
                  onPress={() => handleSwitchTab('text')}
                  className={`flex-1 py-2.5 rounded-xl items-center ${
                    activeTab === 'text'
                      ? 'bg-white dark:bg-surface-darkSubtle shadow-sm'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'text'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    📝 Text / Notes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Photo mode"
                  onPress={() => handleSwitchTab('image')}
                  className={`flex-1 py-2.5 rounded-xl items-center ${
                    activeTab === 'image'
                      ? 'bg-white dark:bg-surface-darkSubtle shadow-sm'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'image'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    📸 Photo / Scan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Document file mode"
                  onPress={() => handleSwitchTab('file')}
                  className={`flex-1 py-2.5 rounded-xl items-center ${
                    activeTab === 'file'
                      ? 'bg-white dark:bg-surface-darkSubtle shadow-sm'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'file'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    📄 Document
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Set Title (Optional)"
                    placeholder="Leave empty for auto-generated AI title"
                    value={value}
                    onChangeText={onChange}
                    onClear={() => onChange('')}
                    error={errors.title?.message}
                    containerClassName="mb-4"
                  />
                )}
              />

              {/* Subject Selector */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Subject Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {DEFAULT_SUBJECTS.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      selected={currentSubject === s}
                      onPress={() => setValue('subject', s, { shouldValidate: true })}
                      size="sm"
                    />
                  ))}
                </ScrollView>
                {Boolean(errors.subject) && (
                  <Text className="text-xs text-rose-500 font-medium mt-1.5 ml-1">
                    {errors.subject?.message}
                  </Text>
                )}
              </View>

              {/* TEXT MODE */}
              {activeTab === 'text' && (
                <>
                  {/* Quick Fill Samples */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Quick Load Demo Notes
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {SAMPLE_TEXTS.map((sample) => {
                        const isSelected =
                          watch('title') === sample.title &&
                          watch('content') === sample.content;
                        return (
                          <Chip
                            key={sample.label}
                            label={sample.label}
                            selected={isSelected}
                            onPress={() => handleSelectSample(sample)}
                            size="sm"
                          />
                        );
                      })}
                    </ScrollView>
                  </View>

                  <Controller
                    control={control}
                    name="content"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Study Material Content"
                        placeholder="Paste your lecture notes, summaries, or textbook sections here (minimum 10 characters)..."
                        value={value}
                        onChangeText={onChange}
                        onClear={() => onChange('')}
                        multiline
                        numberOfLines={8}
                        error={errors.content?.message}
                        containerClassName="mb-6"
                        helperText={`${value ? value.length : 0} characters`}
                      />
                    )}
                  />
                </>
              )}

              {/* PHOTO MODE */}
              {activeTab === 'image' && (
                <View className="mb-6">
                  {/* Quick Fill Photo Samples */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Quick Load Sample Photo Notes
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {SAMPLE_PHOTOS.map((sample) => {
                        const isSelected =
                          selectedImage?.uri === sample.imageUri && watch('title') === sample.title;
                        return (
                          <Chip
                            key={sample.label}
                            label={sample.label}
                            selected={isSelected}
                            onPress={() => handleSelectPhotoSample(sample)}
                            size="sm"
                          />
                        );
                      })}
                    </ScrollView>
                  </View>

                  {isProcessingMedia ? (
                    <Card className="items-center justify-center py-12">
                      <ActivityIndicator size="large" color="#4F46E5" />
                      <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-3">
                        Compressing & optimizing image...
                      </Text>
                    </Card>
                  ) : selectedImage ? (
                    <Card className="p-4">
                      {/* Image Preview */}
                      <View className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3 border border-slate-200 dark:border-slate-700">
                        <Image
                          source={{ uri: selectedImage.uri }}
                          style={{ width: '100%', height: 220 }}
                          contentFit="cover"
                          transition={200}
                        />
                      </View>

                      {/* Image Metadata & Notice */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                            Optimized JPEG
                          </Text>
                          {Boolean(selectedImage.width && selectedImage.height) && (
                            <Text className="text-[11px] text-slate-400">
                              {selectedImage.width} × {selectedImage.height}px
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={removePhoto}
                          className="px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60"
                        >
                          <Text className="text-xs font-semibold text-rose-600">Remove</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Photo Demo Note */}
                      <View className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900 mb-3">
                        <View className="flex-row items-center gap-1.5 mb-1">
                          <Text className="text-xs">💡</Text>
                          <Text className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            Photo Mode Active
                          </Text>
                        </View>
                        <Text className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                          Your photo is compressed and ready. The AI uses multimodal visual
                          analysis based on {currentSubject} to produce realistic
                          diagram summaries, flashcards, and quizzes.
                        </Text>
                      </View>

                      <View className="flex-row gap-2">
                        <Button
                          label="Retake Photo"
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onPress={() => void takePhoto()}
                        />
                        <Button
                          label="Change Photo"
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onPress={() => void pickPhoto()}
                        />
                      </View>
                    </Card>
                  ) : (
                    <Card className="items-center justify-center py-10 border-dashed border-2 border-slate-300 dark:border-slate-700">
                      <View className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/60 items-center justify-center mb-3">
                        <Text className="text-3xl">📸</Text>
                      </View>

                      <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Capture Notes or Textbook
                      </Text>

                      <Text className="text-xs text-slate-400 text-center max-w-[260px] mb-5 leading-relaxed">
                        Snap handwritten lecture notes, whiteboard slides, or textbook
                        pages with automatic compression.
                      </Text>

                      <View className="flex-row gap-3">
                        <Button
                          label="Take Photo"
                          variant="primary"
                          size="sm"
                          onPress={() => void takePhoto()}
                        />
                        <Button
                          label="Choose from Gallery"
                          variant="outline"
                          size="sm"
                          onPress={() => void pickPhoto()}
                        />
                      </View>

                      {Boolean(errors.imageUri) && (
                        <Text className="text-xs text-rose-500 font-medium mt-3">
                          {errors.imageUri?.message}
                        </Text>
                      )}
                    </Card>
                  )}
                </View>
              )}

              {/* FILE MODE */}
              {activeTab === 'file' && (
                <View className="mb-6">
                  {/* Quick Fill Document Samples */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Quick Load Sample Documents
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {SAMPLE_DOCUMENTS.map((sample) => {
                        const isSelected =
                          selectedDocument?.uri === sample.fileUri && watch('title') === sample.title;
                        return (
                          <Chip
                            key={sample.label}
                            label={sample.label}
                            selected={isSelected}
                            onPress={() => handleSelectDocumentSample(sample)}
                            size="sm"
                          />
                        );
                      })}
                    </ScrollView>
                  </View>

                  {selectedDocument ? (
                    <Card className="p-4">
                      {/* Document Preview Box */}
                      <View className="flex-row items-center gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3">
                        <View className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950/60 items-center justify-center">
                          <Text className="text-2xl">
                            {selectedDocument.name.toLowerCase().endsWith('.pdf') ? '📕' : '📄'}
                          </Text>
                        </View>

                        <View className="flex-1">
                          <Text
                            className="text-sm font-bold text-slate-900 dark:text-slate-100"
                            numberOfLines={1}
                          >
                            {selectedDocument.name}
                          </Text>
                          <Text className="text-xs text-slate-400 mt-0.5">
                            {formatBytes(selectedDocument.size)} ·{' '}
                            {selectedDocument.name.toLowerCase().endsWith('.pdf')
                              ? 'PDF Document'
                              : 'Text Document'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={removeDocument}
                          className="p-1 rounded-full bg-slate-200 dark:bg-slate-700"
                        >
                          <Text className="text-xs text-slate-600 dark:text-slate-300 px-1">
                            ✕
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* File Demo Notice */}
                      <View className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900 mb-3">
                        <View className="flex-row items-center gap-1.5 mb-1">
                          <Text className="text-xs">💡</Text>
                          <Text className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                            Document Ready
                          </Text>
                        </View>
                        <Text className="text-[11px] text-indigo-700 dark:text-indigo-300/90 leading-relaxed">
                          Your document is linked. The AI synthesizes full structured
                          materials for {currentSubject} based on document analysis.
                        </Text>
                      </View>

                      <Button
                        label="Select Different Document"
                        size="sm"
                        variant="outline"
                        fullWidth
                        onPress={() => void pickDocument()}
                      />
                    </Card>
                  ) : (
                    <Card className="items-center justify-center py-10 border-dashed border-2 border-slate-300 dark:border-slate-700">
                      <View className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/60 items-center justify-center mb-3">
                        <Text className="text-3xl">📄</Text>
                      </View>

                      <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Select PDF or Text File
                      </Text>

                      <Text className="text-xs text-slate-400 text-center max-w-[260px] mb-5 leading-relaxed">
                        Import lecture slides, readings, or notes from your device storage.
                      </Text>

                      <Button
                        label="Browse Documents"
                        variant="primary"
                        size="sm"
                        onPress={() => void pickDocument()}
                      />

                      {Boolean(errors.fileUri) && (
                        <Text className="text-xs text-rose-500 font-medium mt-3">
                          {errors.fileUri?.message}
                        </Text>
                      )}
                    </Card>
                  )}
                </View>
              )}

              {/* Action Button */}
              <Button
                label={isGenerating ? 'Generating Study Set...' : 'Generate AI Study Set ✨'}
                size="lg"
                fullWidth
                loading={isGenerating}
                disabled={isSubmitDisabled}
                onPress={() => {
                  void handlePressGenerate();
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
