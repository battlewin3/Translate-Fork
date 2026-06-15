export const T = {
  // App
  appTitle: "Translate",

  // Input
  uploadFile: "上传文件",
  dropOrClick: "拖放 PDF 或 DOCX 文件到此处, 或点击上传",
  dropHere: "释放文件以上传",
  fileSelected: "已选择文件",
  clickToChange: "点击更换文件",
  invalidFileType: "不支持的文件格式, 请上传 PDF 或 DOCX 文件",
  fileTooLarge: "文件较大, 翻译可能需要较长时间",
  orInputURL: "或输入在线链接",
  urlPlaceholder: "https://example.com/document.pdf",
  urlInvalid: "请输入有效的 PDF 或 DOCX 文件链接",
  fileTypeFile: "本地文件",
  fileTypeLink: "网络链接",

  // Service
  serviceLabel: "翻译服务",
  serviceSearch: "搜索翻译服务...",
  serviceLoading: "加载服务列表...",
  serviceError: "加载失败",
  serviceRetry: "重试",

  // Env keys
  envKeyDefaultLabel: "使用默认值",
  envKeyShowLabel: "显示密钥",
  envKeyHideLabel: "隐藏密钥",

  // Languages
  langFromLabel: "源语言",
  langToLabel: "目标语言",
  langSwap: "交换源语言和目标语言",
  langSearch: "搜索语言...",
  langLoading: "加载语言列表...",
  langError: "加载失败",

  // Output mode
  outputMode: "输出格式",
  outputModeMono: "仅译文",
  outputModeMonoDesc: "单语翻译文档",
  outputModeDual: "交替对照",
  outputModeDualDesc: "原文与译文交替页面",
  outputModeSide: "左右对照",
  outputModeSideDesc: "原文左, 译文右, 同页对比",

  // Page range
  pageRange: "页面范围",
  pageAll: "全部页面",
  pageFirst: "首页",
  pageFirst5: "前 5 页",
  pageCustom: "自定义",
  customPageHint: "例: 1-5,8,10",

  // Advanced options
  advancedOptions: "高级选项",
  threads: "线程数",
  skipFontSubset: "跳过字体子集化",
  ignoreCache: "忽略缓存",
  vfontLabel: "自定义公式字体正则",
  vfontHint: "正则表达式匹配公式字体名称",
  customPrompt: "自定义 LLM 提示词",
  translateMode: "翻译模式",
  modeFast: "快速",
  modePrecise: "精确",

  // Action
  translate: "开始翻译",
  cancel: "取消翻译",
  uploading: "上传中...",
  starting: "正在启动翻译...",
  translating: "正在翻译...",
  noFile: "请先选择文件或输入链接",

  // Progress
  progress: "翻译进度",
  estimatedTime: "预计剩余",
  elapsedTime: "已用时间",

  // Results
  complete: "翻译完成",
  cancelled: "翻译已取消, 配置已保留, 可以重新开始",
  failed: "翻译失败",

  // Download
  downloadResults: "下载结果",
  downloadMono: "下载译文 (仅译文)",
  downloadDual: "下载译文 (交替对照)",
  downloadSide: "下载译文 (左右对照)",
  downloadStarted: "已开始下载",

  // Cancel dialog
  cancelTitle: "取消翻译",
  cancelBody: "翻译进度将丢失, 且无法恢复。确定要取消吗？",
  cancelConfirm: "确定取消",
  cancelContinue: "继续翻译",

  // Error
  errorRetry: "重试",
  errorDismiss: "关闭",
  errorNetwork: "网络连接失败, 请检查网络后重试",

  // History
  historyTitle: "翻译历史",
  historyEmpty: "暂无翻译记录",
  historyClear: "清除历史",
  historyRetry: "重新翻译",

  // Theme
  themeLight: "浅色模式",
  themeDark: "深色模式",

  // Mobile
  tabConfig: "配置",
  tabPreview: "预览",

  // Preview
  preview: "文档预览",
  previewEmpty: "上传文件后自动预览",
  previewError: "无法加载 PDF 预览",

  // Footer / Tech
  techDetails: "技术详情",

  // Badge
  newFeature: "新功能",
} as const;
