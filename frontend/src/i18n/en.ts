export const EN = {
  // App
  appTitle: "Translate",

  // Input
  uploadFile: "Upload File",
  dropOrClick: "Drop a PDF or DOCX file here, or click to upload",
  dropHere: "Release to upload",
  fileSelected: "File selected",
  clickToChange: "Click to change file",
  invalidFileType: "Unsupported file format, please upload a PDF or DOCX file",
  fileTooLarge: "Large file — translation may take longer",
  orInputURL: "Or enter a URL",
  urlPlaceholder: "https://example.com/document.pdf",
  urlInvalid: "Please enter a valid PDF or DOCX file URL",
  fileTypeFile: "Local File",
  fileTypeLink: "URL Link",

  // Service
  serviceLabel: "Translation Service",
  serviceSearch: "Search services…",
  serviceLoading: "Loading services…",
  serviceError: "Failed to load",
  serviceRetry: "Retry",

  // Env keys
  envKeyDefaultLabel: "Use default",
  envKeyShowLabel: "Show key",
  envKeyHideLabel: "Hide key",

  // Languages
  langFromLabel: "Source Language",
  langToLabel: "Target Language",
  langSwap: "Swap source and target languages",
  langSearch: "Search languages…",
  langLoading: "Loading languages…",
  langError: "Failed to load",

  // Output mode
  outputMode: "Output Format",
  outputModeMono: "Translation Only",
  outputModeMonoDesc: "Monolingual translated document",
  outputModeDual: "Alternating Pages",
  outputModeDualDesc: "Original and translation on alternating pages",
  outputModeSide: "Side by Side",
  outputModeSideDesc: "Original left, translation right, same page",

  // Page range
  pageRange: "Page Range",
  pageAll: "All Pages",
  pageFirst: "First Page",
  pageFirst5: "First 5 Pages",
  pageCustom: "Custom",
  customPageHint: "e.g. 1-5,8,10",

  // Advanced options
  advancedOptions: "Advanced Options",
  threads: "Threads",
  threadsHint: "More threads speed up translation, but free services may rate-limit",
  skipFontSubset: "Skip font subsetting",
  skipFontSubsetHint: "Saves 1–5 s of post-processing; output files will be slightly larger. Disable for smaller PDFs at the cost of extra processing time.",
  ignoreCache: "Ignore cache",
  vfontLabel: "Custom formula font regex",
  vfontHint: "Regex matching formula font names",
  customPrompt: "Custom LLM prompt",
  translateMode: "Translation Mode",
  modeFast: "Fast",
  modePrecise: "Precise",

  // Action
  translate: "Start Translation",
  cancel: "Cancel Translation",
  uploading: "Uploading…",
  starting: "Starting translation…",
  translating: "Translating…",
  noFile: "Please select a file or enter a URL first",

  // Progress
  progress: "Progress",
  phaseLayout: "Analyzing page layout",
  phaseFinalizing: "Generating final file",
  estimatedTime: "Est. remaining",
  elapsedTime: "Elapsed",

  // Results
  complete: "Translation complete",
  cancelled: "Translation cancelled — settings preserved, ready to restart",
  failed: "Translation failed",

  // Download
  downloadResults: "Download Results",
  downloadMono: "Download Translation Only",
  downloadDual: "Download Alternating Pages",
  downloadSide: "Download Side by Side",
  downloadStarted: "Download started",

  // Cancel dialog
  cancelTitle: "Cancel Translation",
  cancelBody: "Translation progress will be lost and cannot be recovered. Are you sure you want to cancel?",
  cancelConfirm: "Yes, cancel",
  cancelContinue: "Continue translation",

  // Error
  errorRetry: "Retry",
  errorDismiss: "Dismiss",
  errorNetwork: "Network connection failed. Please check your connection and retry.",

  // History
  historyTitle: "Translation History",
  historyEmpty: "No translation history",
  historyClear: "Clear history",
  historyRetry: "Retranslate",

  // Theme
  themeLight: "Light mode",
  themeDark: "Dark mode",

  // Mobile
  tabConfig: "Settings",
  tabPreview: "Preview",

  // Preview
  preview: "Document Preview",
  previewEmpty: "Upload a file to preview",
  previewError: "Failed to load PDF preview",

  // Footer / Tech
  techDetails: "Technical Details",

  // Badge
  newFeature: "New",

  // Hardcoded strings that need i18n
  maxFileSize: "PDF / DOCX · Max 100 MB",
  urlInputPlaceholder: "Enter URL",
  confirm: "Confirm",
  backToFile: "Back to file upload",
  noMatch: "No matching service",
  today: "Today",
  statusCompleted: "Completed",
  statusFailed: "Failed",
  statusCancelled: "Cancelled",
  themeSystem: "System",
  resetToDefault: "Reset to defaults",
  testingService: "Testing…",
  testServiceConn: "Test connection",
  clearFile: "Clear file",
  noFileHint: "Drop a file in the preview area",
  noFileHintSub: "Editing options appear here after upload",
} as const;
