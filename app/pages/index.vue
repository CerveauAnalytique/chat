<script setup lang="ts">
import { ref, nextTick, onMounted, computed, watch } from 'vue'
import {
  Link2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Plus,
  Database,
  ChevronDown,
  Mic,
  MicOff,
  Send,
  FileSpreadsheet,
  FileText,
  X,
  Share2,
  SlidersHorizontal,
  Bot,
  Sparkles,
  Info,
  ExternalLink,
  Settings,
  Globe,
  Lock,
  Users,
  PanelLeft,
  PanelLeftClose,
  SquarePen,
  Search,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit2,
  Compass,
  ArrowUpRight,
  ArrowRight,
  LogOut,
  User,
  RotateCcw,
  LogIn,
  Image as ImageIcon,
  Library,
  Clock,
  Puzzle,
  Folder,
  Terminal,
  Cpu,
  Cloud
} from 'lucide-vue-next'

useHead({
  title: 'AI Data Agent'
})

// Authentication
const { user, initAuth, logout } = useAuth()
const { config: sdkConfig, initSdk, generateChatResponse } = useSdk()
const router = useRouter()

// Sidebar state
const isSidebarOpen = ref(true)
const searchQuery = ref('')
const showSearchInput = ref(false)
const activeChatMenuId = ref<string | null>(null)
const editingChatId = ref<string | null>(null)
const editingChatTitle = ref('')

// Message interface
interface Message {
  id: string
  role: 'user' | 'assistant'
  author: string
  timeAgo: string
  content: string
  files?: Array<{ name: string; size: string; type: string }>
  liked?: boolean
  disliked?: boolean
  copied?: boolean
}

// Conversation interface for sidebar history
interface Conversation {
  id: string
  title: string
  dateGroup: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Previous 30 Days'
  agent: string
  messages: Message[]
}

const defaultConversations: Conversation[] = [
  { id: 'c-1', title: 'Antwoord afspraak maandag', dateGroup: 'Today', agent: 'Prysel Ai', messages: [] },
  { id: 'c-2', title: 'Maanlanding bevestigen', dateGroup: 'Today', agent: 'Prysel Ai', messages: [] },
  { id: 'c-3', title: 'Toekomstige partner visualiseren', dateGroup: 'Today', agent: 'Prysel Ai', messages: [] },
  { id: 'c-4', title: 'Netjes bod schrijven', dateGroup: 'Yesterday', agent: 'Prysel Ai', messages: [] },
  { id: 'c-5', title: 'Afkorting Nederland', dateGroup: 'Yesterday', agent: 'Prysel Ai', messages: [] },
  { id: 'c-6', title: 'Loes ai code vergelijken', dateGroup: 'Previous 7 Days', agent: 'Prysel Ai', messages: [] },
  { id: 'c-7', title: 'Spelfouten verbeteren', dateGroup: 'Previous 7 Days', agent: 'Prysel Ai', messages: [] },
  { id: 'c-8', title: 'Terugkomst interpreteren', dateGroup: 'Previous 30 Days', agent: 'Prysel Ai', messages: [] }
]

// Default conversations initialized matching ChatGPT screenshot
const conversations = ref<Conversation[]>([...defaultConversations])
const activeChatId = ref<string>('chat-new')

// Input prompt text (starts clean)
const inputPrompt = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const chatContainerRef = ref<HTMLElement | null>(null)
const isTyping = ref(false)
const isRecording = ref(false)

// Attached files (starts clean)
const attachedFiles = ref<Array<{ id: string; name: string; size: string; type: string }>>([])
const showFilePreview = ref(false)

// Dropdowns & Modals
const showAgentMenu = ref(false)
const showDataSourceMenu = ref(false)
const showModelMenu = ref(false)
const showToneMenu = ref(false)
const showEditModal = ref(false)
const showPublishModal = ref(false)
const showUserProfileMenu = ref(false)
const showNavUserMenu = ref(false)
const showSearchModal = ref(false)
const modalSearchQuery = ref('')
const showUserAccountModal = ref(false)
const activeUserTab = ref<'general' | 'subscription' | 'security' | 'data'>('general')
const showUpgradeModal = ref(false)
const showFeatureModal = ref(false)
const activeFeatureType = ref('images')
const showSdkModal = ref(false)
const showVoiceMode = ref(false)

const handleVoiceSpeech = (spokenText: string) => {
  let targetConv = conversations.value.find(c => c.id === activeChatId.value)
  if (!targetConv || activeChatId.value === 'chat-new') {
    const newId = 'chat-' + Date.now()
    targetConv = {
      id: newId,
      title: spokenText.slice(0, 30) + (spokenText.length > 30 ? '...' : ''),
      dateGroup: 'Today',
      agent: currentAgent.value,
      messages: []
    }
    conversations.value.unshift(targetConv)
    activeChatId.value = newId
  }
  targetConv.messages.push({
    id: 'user-voice-' + Date.now(),
    role: 'user',
    author: user.value?.name || 'Me',
    timeAgo: 'Just now',
    content: spokenText
  })
}

const openFeatureModal = (type: string) => {
  activeFeatureType.value = type
  showFeatureModal.value = true
}

const modalSearchResults = computed(() => {
  if (!modalSearchQuery.value.trim()) return conversations.value
  const q = modalSearchQuery.value.toLowerCase()
  return conversations.value.filter(c => 
    c.title.toLowerCase().includes(q) || 
    c.messages.some(m => m.content.toLowerCase().includes(q))
  )
})

const selectSearchResult = (chatId: string) => {
  selectConversation(chatId)
  showSearchModal.value = false
  modalSearchQuery.value = ''
}

const toastMessage = ref('')
const toastVisible = ref(false)

// Prysel Ai Agent configuration
const currentAgent = ref('Prysel Ai')
const agentList = ref(['Prysel Ai', 'Prysel Ai Finance', 'Prysel Ai Code Cloud', 'Prysel Ai Database Pro'])

// Database app called Prysel Ai
const selectedDataSource = ref('Prysel Ai')
const dataSourceOptions = ['Prysel Ai', 'Prysel Ai European Cloud DB', 'Prysel Ai Analytics Lake', 'Corporate Spreadsheets']

const selectedModel = ref('claude-3-sonnet')
const modelOptions = [
  { id: 'claude-3-sonnet', name: 'claude-3-sonnet', provider: 'anthropic', desc: 'Balanced intelligence & speed' },
  { id: 'claude-3-5-sonnet', name: 'claude-3.5-sonnet', provider: 'anthropic', desc: 'Highest intelligence & coding' },
  { id: 'gpt-4o', name: 'gpt-4o', provider: 'openai', desc: 'Versatile multimodal reasoning' },
  { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro', provider: 'google', desc: 'Ultra-long 2M token context' }
]

const selectedTone = ref('Tone')
const toneOptions = ['Default', 'Analytical', 'Concise', 'Executive Summary', 'Friendly']

// Toast notification helper
const showToast = (msg: string) => {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
  }, 2500)
}

// Current active conversation
const currentConversation = computed(() => {
  return conversations.value.find(c => c.id === activeChatId.value)
})

// Current messages
const messages = computed(() => {
  return currentConversation.value ? currentConversation.value.messages : []
})

// Filtered conversations by search query
const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) return conversations.value
  const q = searchQuery.value.toLowerCase()
  return conversations.value.filter(c => c.title.toLowerCase().includes(q))
})

// Grouped conversations
const groupedConversations = computed(() => {
  const groups: Record<string, Conversation[]> = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Previous 30 Days': []
  }

  for (const c of filteredConversations.value) {
    if (groups[c.dateGroup]) {
      groups[c.dateGroup].push(c)
    } else {
      groups['Today'].push(c)
    }
  }

  return groups
})


// Select a conversation from sidebar
const selectConversation = (id: string) => {
  activeChatId.value = id
  activeChatMenuId.value = null
  const conv = conversations.value.find(c => c.id === id)
  if (conv) {
    currentAgent.value = conv.agent
  }
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    isSidebarOpen.value = false
  }
}

const userDisplayName = computed(() => user.value?.name || 'Erickson Holding')
const userAvatarInitials = computed(() => {
  if (user.value?.name) {
    const parts = user.value.name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return user.value.name.slice(0, 2).toUpperCase()
  }
  return 'EL'
})

// Start New Clean Chat
const startNewChat = () => {
  activeChatId.value = 'chat-new'
  inputPrompt.value = ''
  attachedFiles.value = []
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.focus()
  }
  showToast('New chat ready')
}

// Load Demo Data / Sample Conversation
const loadDemoChat = () => {
  const demoId = 'demo-chat-' + Date.now()
  const demoChat: Conversation = {
    id: demoId,
    title: 'Overall sales performance analysis',
    dateGroup: 'Today',
    agent: 'Prysel Ai',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        author: 'Me',
        timeAgo: '3 min ago',
        content: 'I need understand the data. Please analyze the overall sales performance.'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        author: 'Prysel Ai',
        timeAgo: '2 min ago',
        content: 'Could you specify the type of files and the information you require in the summary?'
      },
      {
        id: 'msg-3',
        role: 'user',
        author: 'Me',
        timeAgo: '2 min ago',
        content: "I'm thinking about spreadsheets. What should I be asking?"
      },
      {
        id: 'msg-4',
        role: 'assistant',
        author: 'Prysel Ai',
        timeAgo: '2 min ago',
        content: `For spreadsheets, consider asking:

- How can I compare data across multiple sheets?
- Can I detect discrepancies between versions?
- What's the best method to visualize data differences`
      }
    ]
  }

  conversations.value.unshift(demoChat)
  activeChatId.value = demoId
  inputPrompt.value = 'Combine those two files and summarise results'
  attachedFiles.value = [
    { id: 'f1', name: 'Q3_Regional_Sales_2024.xlsx', size: '1.4 MB', type: 'spreadsheet' },
    { id: 'f2', name: 'Q4_Regional_Sales_2024.xlsx', size: '1.8 MB', type: 'spreadsheet' }
  ]
  adjustTextareaHeight()
  showToast('Loaded sample demo chat')
}

// Clear all conversations (reset everything to clean)
const clearAllConversations = () => {
  conversations.value = []
  activeChatId.value = 'chat-new'
  inputPrompt.value = ''
  attachedFiles.value = []
  if (typeof window !== 'undefined') {
    localStorage.removeItem('luminar_conversations')
  }
  showToast('Cleaned all conversations')
}

// Delete conversation
const deleteConversation = (id: string, e?: Event) => {
  e?.stopPropagation()
  conversations.value = conversations.value.filter(c => c.id !== id)
  if (activeChatId.value === id) {
    if (conversations.value.length > 0) {
      activeChatId.value = conversations.value[0].id
    } else {
      activeChatId.value = 'chat-new'
    }
  }
  activeChatMenuId.value = null
  showToast('Conversation deleted')
}

// Rename conversation
const startRename = (chat: Conversation, e?: Event) => {
  e?.stopPropagation()
  editingChatId.value = chat.id
  editingChatTitle.value = chat.title
  activeChatMenuId.value = null
}

const saveRename = (chat: Conversation) => {
  if (editingChatTitle.value.trim()) {
    chat.title = editingChatTitle.value.trim()
  }
  editingChatId.value = null
}

// Copy message content
const copyMessage = async (msg: Message) => {
  try {
    await navigator.clipboard.writeText(msg.content)
    msg.copied = true
    showToast('Copied to clipboard')
    setTimeout(() => {
      msg.copied = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

// Copy share link
const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    showToast('Prysel Ai link copied to clipboard!')
  } catch (e) {
    showToast('Link copied!')
  }
}

// Like / Dislike handlers
const toggleLike = (msg: Message) => {
  if (msg.liked) {
    msg.liked = false
  } else {
    msg.liked = true
    msg.disliked = false
    showToast('Feedback submitted: helpful!')
  }
}

const toggleDislike = (msg: Message) => {
  if (msg.disliked) {
    msg.disliked = false
  } else {
    msg.disliked = true
    msg.liked = false
    showToast('Feedback submitted: unhelpful')
  }
}

// File removal
const removeFile = (id: string) => {
  attachedFiles.value = attachedFiles.value.filter(f => f.id !== id)
}

// File upload simulation
const fileInputRef = ref<HTMLInputElement | null>(null)
const triggerFileUpload = () => {
  fileInputRef.value?.click()
}
const handleFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i]
      attachedFiles.value.push({
        id: 'upload-' + Date.now() + '-' + i,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
        type: file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? 'spreadsheet' : 'document'
      })
    }
    showToast(`Added ${target.files.length} file(s)`)
  }
}

// Auto-grow textarea
const adjustTextareaHeight = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 180) + 'px'
  }
}

// Scroll to bottom
const scrollToBottom = async () => {
  await nextTick()
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  })
}

// Open Interactive Voice Mode with Neuriy Face
const toggleVoiceRecording = () => {
  showVoiceMode.value = true
}

// Send message
const sendMessage = async () => {
  const text = inputPrompt.value.trim()
  if (!text && attachedFiles.value.length === 0) return
  if (isTyping.value) return

  let targetConv = conversations.value.find(c => c.id === activeChatId.value)
  if (!targetConv || activeChatId.value === 'chat-new') {
    const newId = 'chat-' + Date.now()
    targetConv = {
      id: newId,
      title: text ? (text.slice(0, 30) + (text.length > 30 ? '...' : '')) : 'Prysel Ai Data Inquiry',
      dateGroup: 'Today',
      agent: currentAgent.value,
      messages: []
    }
    conversations.value.unshift(targetConv)
    activeChatId.value = newId
  } else if (targetConv.title === 'New conversation' && text) {
    targetConv.title = text.slice(0, 32) + (text.length > 32 ? '...' : '')
  }

  const currentAttached = [...attachedFiles.value]
  
  targetConv.messages.push({
    id: 'user-' + Date.now(),
    role: 'user',
    author: user.value?.name || 'Me',
    timeAgo: 'Just now',
    content: text || 'Please review the attached spreadsheets.',
    files: currentAttached.length > 0 ? currentAttached : undefined
  })

  inputPrompt.value = ''
  attachedFiles.value = []
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
  await scrollToBottom()

  isTyping.value = true
  try {
    const responseText = await generateChatResponse(text, currentAttached)
    targetConv.messages.push({
      id: 'assistant-' + Date.now(),
      role: 'assistant',
      author: currentAgent.value,
      timeAgo: 'Just now',
      content: responseText
    })
  } catch (err: any) {
    targetConv.messages.push({
      id: 'assistant-' + Date.now(),
      role: 'assistant',
      author: currentAgent.value,
      timeAgo: 'Just now',
      content: 'An error occurred while contacting the Prysel Ai SDK engine: ' + (err?.message || 'Unknown error')
    })
  } finally {
    isTyping.value = false
    await scrollToBottom()
  }
}

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    sendMessage()
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'b')) {
    e.preventDefault()
    isSidebarOpen.value = !isSidebarOpen.value
    showToast(isSidebarOpen.value ? 'Sidebar opened' : 'Sidebar hidden')
  } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearchModal.value = true
  } else if (e.key === 'Escape') {
    showSearchModal.value = false
    showUserAccountModal.value = false
    showUpgradeModal.value = false
    showFeatureModal.value = false
    showEditModal.value = false
    showPublishModal.value = false
    closeAllMenus()
  }
}

const handleLogout = () => {
  logout()
  showToast('Logged out successfully')
  router.push('/login')
}

// Close menus when clicking outside
const closeAllMenus = () => {
  showAgentMenu.value = false
  showDataSourceMenu.value = false
  showModelMenu.value = false
  showToneMenu.value = false
  showFilePreview.value = false
  activeChatMenuId.value = null
  showUserProfileMenu.value = false
  showNavUserMenu.value = false
}

// Local storage saving
watch(
  conversations,
  (val) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('luminar_conversations', JSON.stringify(val))
      } catch (e) {}
    }
  },
  { deep: true }
)

onMounted(() => {
  initAuth()
  initSdk()
  adjustTextareaHeight()
  window.addEventListener('keydown', handleGlobalKeydown)

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('luminar_conversations')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          conversations.value = parsed
          activeChatId.value = 'chat-new'
        } else {
          conversations.value = [...defaultConversations]
          activeChatId.value = 'chat-new'
        }
      } else {
        conversations.value = [...defaultConversations]
        activeChatId.value = 'chat-new'
      }
    } catch (e) {
      conversations.value = [...defaultConversations]
      activeChatId.value = 'chat-new'
    }
  }
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-white text-gray-900 flex font-sans selection:bg-sky-100 selection:text-sky-900" @click="closeAllMenus">
    <!-- Hidden File Input for Attachments -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="handleFileUpload"
    />

    <!-- Toast Notification -->
    <Transition name="fade">
      <div
        v-if="toastVisible"
        class="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-gray-700/50"
      >
        <Check class="w-3.5 h-3.5 text-emerald-400" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- MOBILE SIDEBAR BACKDROP -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
      @click="isSidebarOpen = false"
    />

    <!-- CHATGPT SIDEBAR -->
    <aside
      class="fixed inset-y-0 left-0 z-40 md:static flex flex-col bg-[#f9f9f9] border-r border-[#ececec] transition-all duration-300 ease-in-out select-none"
      :class="isSidebarOpen ? 'w-[260px] translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'"
    >
      <div class="w-[260px] h-full flex flex-col justify-between overflow-hidden">
        <!-- Sidebar Top Header -->
        <div class="px-3 pt-3.5 pb-1 flex items-center justify-between">
          <img src="/assets/img/prysel.svg" alt="Prysel Ai" class="h-6 w-auto object-contain ml-1" />
          <div class="flex items-center gap-0.5">
            <!-- Search Icon Button (opens popup search modal) -->
            <button
              class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/[0.05] transition-colors"
              title="Search (⌘K)"
              @click="showSearchModal = true"
            >
              <Search class="w-4 h-4 stroke-[1.9]" />
            </button>

            <!-- Sidebar Toggle Icon Button ([ | ] icon from screenshot) -->
            <button
              class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/[0.05] transition-colors"
              title="Close sidebar (⌘+S)"
              @click="isSidebarOpen = false"
            >
              <svg class="w-4 h-4 stroke-[1.8] text-gray-600 hover:text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M15 3v18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Scrollable Navigation and Recents Area -->
        <div class="flex-1 overflow-y-auto px-2 pt-1 pb-2 space-y-0.5 chatgpt-sidebar text-sm">
          <!-- New chat button (active pill style from screenshot) -->
          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[#ececec] hover:bg-[#e3e3e3] text-[#0d0d0d] text-[14px] font-medium transition-colors text-left"
            @click="startNewChat"
          >
            <SquarePen class="w-4 h-4 stroke-[1.85] text-gray-800 flex-shrink-0" />
            <span>New chat</span>
          </button>

          <!-- Navigation items (all opening rich interactive popups) -->
          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('images')"
          >
            <ImageIcon class="w-4 h-4 stroke-[1.85] text-gray-700 flex-shrink-0" />
            <span>Images</span>
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('library')"
          >
            <Library class="w-4 h-4 stroke-[1.85] text-gray-700 flex-shrink-0" />
            <span>Library</span>
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('scheduled')"
          >
            <Clock class="w-4 h-4 stroke-[1.85] text-gray-700 flex-shrink-0" />
            <span>Scheduled</span>
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('plugins')"
          >
            <Puzzle class="w-4 h-4 stroke-[1.85] text-gray-700 flex-shrink-0" />
            <span>Plugins</span>
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('projects')"
          >
            <Folder class="w-4 h-4 stroke-[1.85] text-gray-700 flex-shrink-0" />
            <span>Projects</span>
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('cloud')"
          >
            <Cloud class="w-4 h-4 stroke-[1.85] text-sky-600 flex-shrink-0" />
            <span>Cloud Hosting</span>
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-black/[0.04] transition-colors text-left text-[14px]"
            @click="openFeatureModal('more')"
          >
            <MoreHorizontal class="w-4 h-4 stroke-[1.85] text-gray-700 flex-shrink-0" />
            <span>More</span>
          </button>

          <!-- Recents Section -->
          <div class="pt-4 pb-1 px-3 text-[13px] font-medium text-[#8e8e8e]">
            Recents
          </div>

          <!-- Recents List -->
          <div class="space-y-0.5">
            <div
              v-for="chat in filteredConversations"
              :key="chat.id"
              class="relative group rounded-lg transition-colors"
              :class="activeChatId === chat.id ? 'bg-[#ececec] font-medium text-gray-900' : 'text-gray-800 hover:bg-black/[0.04]'"
            >
              <!-- Editing Chat Title Inline -->
              <div v-if="editingChatId === chat.id" class="px-2 py-1" @click.stop>
                <input
                  v-model="editingChatTitle"
                  class="w-full px-2 py-1 bg-white border border-gray-300 rounded text-[13px] text-gray-900 outline-none focus:border-gray-500"
                  autofocus
                  @keydown.enter="saveRename(chat)"
                  @keydown.esc="editingChatId = null"
                  @blur="saveRename(chat)"
                />
              </div>

              <!-- Normal Chat Item -->
              <div
                v-else
                class="flex items-center justify-between px-3 py-1.5 cursor-pointer rounded-lg text-[13.5px]"
                @click="selectConversation(chat.id)"
              >
                <span class="truncate pr-1">{{ chat.title }}</span>

                <!-- Hover 3-dots Menu Button -->
                <div class="relative flex-shrink-0" @click.stop>
                  <button
                    class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-300/60 text-gray-500 transition-opacity"
                    :class="{ 'opacity-100': activeChatMenuId === chat.id }"
                    title="Options"
                    @click="activeChatMenuId = activeChatMenuId === chat.id ? null : chat.id"
                  >
                    <MoreHorizontal class="w-3.5 h-3.5" />
                  </button>

                  <!-- Popover Dropdown -->
                  <div
                    v-if="activeChatMenuId === chat.id"
                    class="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-150 py-1 z-50 text-xs font-normal"
                  >
                    <button
                      class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                      @click="startRename(chat, $event)"
                    >
                      <Edit2 class="w-3.5 h-3.5 text-gray-400" />
                      <span>Rename</span>
                    </button>
                    <div class="my-0.5 border-t border-gray-100" />
                    <button
                      class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600"
                      @click="deleteConversation(chat.id, $event)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Bottom Footer: User Profile & Upgrade Button -->
        <div class="p-3 border-t border-gray-200/60 relative" @click.stop>
          <div class="flex items-center justify-between">
            <div
              class="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer hover:opacity-85 transition-opacity"
              @click="showUserAccountModal = true"
            >
              <!-- Avatar: SunflowerAvatar when logged in, or green badge -->
              <SunflowerAvatar v-if="user" className="w-7 h-7 border border-neutral-200" />
              <div v-else class="w-7 h-7 rounded-full bg-[#10a37f] text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {{ userAvatarInitials }}
              </div>
              <div class="truncate text-left">
                <div class="text-[13px] font-medium text-gray-900 truncate leading-tight">{{ userDisplayName }}</div>
                <div class="text-[11.5px] text-gray-500 leading-tight">Free</div>
              </div>
            </div>

            <!-- Upgrade Button (opens popup upgrade modal) -->
            <button
              class="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-100 text-xs font-medium text-gray-800 transition-colors shadow-2xs flex-shrink-0 ml-2"
              @click="showUpgradeModal = true"
            >
              Upgrade
            </button>
          </div>

          <!-- User Menu Popup -->
          <div
            v-if="showUserProfileMenu"
            class="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-150 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            <div class="px-3 py-1.5 text-[11px] text-gray-400 font-medium">{{ user ? user.email : 'user@prysel.ai' }}</div>
            <div class="border-t border-gray-100 my-1" />
            <button
              class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
              @click="showUserAccountModal = true; showUserProfileMenu = false"
            >
              <Settings class="w-3.5 h-3.5 text-gray-400" />
              <span>User Panel & Settings</span>
            </button>
            <button
              class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600"
              @click="clearAllConversations(); showUserProfileMenu = false"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Reset & clean all</span>
            </button>
            <div class="border-t border-gray-100 my-1" />
            <button
              v-if="user"
              class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600"
              @click="handleLogout(); showUserProfileMenu = false"
            >
              <LogOut class="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
            <NuxtLink
              v-else
              to="/login"
              class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
              @click="showUserProfileMenu = false"
            >
              <LogIn class="w-3.5 h-3.5 text-gray-400" />
              <span>Sign in</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </aside>

    <!-- MAIN CHAT AREA WRAPPER -->
    <div class="flex-1 flex flex-col h-full overflow-y-auto relative">
      <!-- Top Header -->
      <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 h-14 px-4 sm:px-6 flex items-center justify-between">
        <!-- Left: Sidebar Toggle & Prysel Ai Logo & Agent Switcher -->
        <div class="flex items-center gap-2">
          <!-- Sidebar Toggle Icon Button (only shown when sidebar is closed to prevent double icon) -->
          <button
            v-if="!isSidebarOpen"
            class="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Open sidebar (⌘+S)"
            @click="isSidebarOpen = true"
          >
            <PanelLeft class="w-4 h-4 stroke-[1.8]" />
          </button>

          <!-- Prysel Ai Agent Switcher with official logo -->
          <div class="relative" @click.stop>
            <button
              class="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
              @click="showAgentMenu = !showAgentMenu"
            >
              <!-- Official Prysel Ai Icon -->
              <img
                src="/assets/img/prysel.svg"
                alt="Prysel Ai"
                class="h-5 w-auto object-contain"
              />

              <span class="text-sm font-semibold text-gray-800 tracking-tight max-w-[34vw] sm:max-w-[220px] truncate">{{ currentAgent }}</span>
              <ChevronDown class="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-transform duration-200" :class="{ 'rotate-180': showAgentMenu }" />
            </button>

            <!-- Agent Switcher Menu -->
            <div
              v-if="showAgentMenu"
              class="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <div class="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Switch Prysel Ai Agent</div>
              <button
                v-for="agent in agentList"
                :key="agent"
                class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-gray-700 font-medium"
                @click="currentAgent = agent; showAgentMenu = false; showToast(`Switched to ${agent}`)"
              >
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :class="agent === currentAgent ? 'bg-sky-600' : 'bg-transparent'" />
                  <span>{{ agent }}</span>
                </div>
                <Check v-if="agent === currentAgent" class="w-3.5 h-3.5 text-sky-600" />
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Action Buttons & Auth Button -->
        <div class="flex items-center gap-2">
          <!-- Neuriy Face (triggers interactive Voice Control Mode) -->
          <button
            class="h-8 px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 group"
            title="Neuriy AI Voice Control & Interactive Persona"
            @click="showVoiceMode = true"
          >
            <NeuriyFace size="xs" :is-speaking="isTyping" :is-listening="showVoiceMode" />
          </button>

          <!-- Publish Agent Button -->
          <button
            class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-800 transition-colors shadow-2xs"
            @click="showPublishModal = true"
          >
            Publish agent
          </button>

          <span class="w-px h-5 bg-gray-200 mx-0.5" />

          <!-- Logged In User Profile (style from lsky-eu) -->
          <div v-if="user" class="relative" @click.stop>
            <button
              type="button"
              class="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-neutral-100 transition-colors focus:outline-none border border-transparent hover:border-neutral-200"
              @click="showNavUserMenu = !showNavUserMenu"
            >
              <SunflowerAvatar className="w-7 h-7 border border-neutral-200" />
              <span class="hidden sm:inline text-xs font-semibold text-neutral-800 max-w-[120px] truncate">
                {{ user.name || user.email?.split('@')[0] }}
              </span>
              <ChevronDown class="w-3 h-3 text-neutral-400 transition-transform duration-200" :class="{ 'rotate-180': showNavUserMenu }" />
            </button>

            <!-- User Dropdown (matching lsky-eu style) -->
            <div
              v-if="showNavUserMenu"
              class="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal"
            >
              <div class="px-3 py-2 border-b border-neutral-100 mb-1">
                <p class="text-xs font-semibold text-neutral-900 truncate">
                  {{ user.name || 'Account' }}
                </p>
                <p class="text-[11px] text-neutral-500 truncate">{{ user.email }}</p>
              </div>
              <button
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-50 text-neutral-700"
                @click="showEditModal = true; showNavUserMenu = false"
              >
                <Settings class="w-3.5 h-3.5 text-neutral-400" />
                <span>Account Settings</span>
              </button>
              <div class="h-px bg-neutral-100 my-1" />
              <button
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 font-medium"
                @click="handleLogout(); showNavUserMenu = false"
              >
                <LogOut class="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>

          <!-- Logged Out Sign In link -->
          <NuxtLink
            v-else
            to="/login"
            class="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-800 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <User class="w-3.5 h-3.5 text-neutral-600" />
            <span>Sign in</span>
          </NuxtLink>
        </div>
      </header>

      <!-- Main Chat Container -->
      <main ref="chatContainerRef" class="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-52 flex flex-col justify-center">

        <!-- CLEAN FIRST-TIME WELCOME SCREEN WITH Prysel Ai LOGO -->
        <div v-if="messages.length === 0" class="my-auto py-8 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
          <!-- Official Prysel Ai Logo Header -->
          <div class="flex flex-col items-center gap-3">
            <img
              src="/assets/img/prysel.svg"
              alt="Prysel Ai"
              class="h-12 w-auto object-contain hover:scale-105 transition-transform"
            />
          </div>

          <div class="space-y-1.5 max-w-md">
            <h2 class="text-xl font-semibold text-gray-900 tracking-tight">How can Prysel Ai assist your data today?</h2>
            <p class="text-xs text-gray-500 leading-relaxed">
              Connect to the Prysel Ai database, query spreadsheets, compare performance, and discover insights.
            </p>
          </div>
        </div>

        <!-- ACTIVE MESSAGES STREAM -->
        <div v-else class="space-y-7">
          <!-- Date Separator -->
          <div class="relative my-8 flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-100" />
            </div>
            <div class="relative bg-white px-4">
              <span class="text-[11px] font-medium text-gray-400 tracking-wider">TODAY</span>
            </div>
          </div>

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.role === 'user' ? 'items-end' : 'items-start'"
          >
            <!-- USER MESSAGE -->
            <div
              v-if="msg.role === 'user'"
              class="max-w-[85%] sm:max-w-[78%] bg-neutral-100/80 rounded-2xl p-4 text-gray-800 space-y-1.5 shadow-2xs border border-neutral-200/40"
            >
              <div class="text-[11px] text-gray-400 font-normal">
                {{ msg.author }} <span class="mx-1">•</span> {{ msg.timeAgo }}
              </div>
              <div class="text-sm font-normal leading-relaxed text-gray-800 whitespace-pre-wrap">
                {{ msg.content }}
              </div>

              <!-- Attached files chips inside user bubble if sent with attachments -->
              <div v-if="msg.files && msg.files.length" class="pt-2 flex flex-wrap gap-1.5">
                <div
                  v-for="f in msg.files"
                  :key="f.name"
                  class="flex items-center gap-1.5 bg-white/90 border border-neutral-200/80 rounded-lg px-2.5 py-1 text-xs text-gray-700 shadow-2xs"
                >
                  <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600" />
                  <span class="font-medium text-[11px]">{{ f.name }}</span>
                  <span class="text-[10px] text-gray-400">({{ f.size }})</span>
                </div>
              </div>
            </div>

            <!-- ASSISTANT MESSAGE -->
            <div
              v-else
              class="max-w-[90%] sm:max-w-[85%] text-gray-800 space-y-2 group"
            >
              <div class="text-[11px] text-gray-400 font-normal">
                <span class="font-medium text-gray-800">{{ msg.author }}</span>
                <span class="mx-1">•</span>
                <span>{{ msg.timeAgo }}</span>
              </div>

              <!-- Content -->
              <div class="text-sm font-normal leading-relaxed text-gray-800 whitespace-pre-wrap">
                {{ msg.content }}
              </div>

              <!-- Action buttons: Thumbs up, Thumbs down, Copy -->
              <div class="flex items-center gap-3 pt-1 text-gray-400">
                <button
                  class="p-1 rounded hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  :class="{ 'text-sky-600': msg.liked }"
                  title="Helpful"
                  @click="toggleLike(msg)"
                >
                  <ThumbsUp class="w-3.5 h-3.5 stroke-[1.75]" :fill="msg.liked ? 'currentColor' : 'none'" />
                </button>

                <button
                  class="p-1 rounded hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  :class="{ 'text-rose-500': msg.disliked }"
                  title="Unhelpful"
                  @click="toggleDislike(msg)"
                >
                  <ThumbsDown class="w-3.5 h-3.5 stroke-[1.75]" :fill="msg.disliked ? 'currentColor' : 'none'" />
                </button>

                <button
                  class="p-1 rounded hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  :class="{ 'text-emerald-600': msg.copied }"
                  title="Copy response"
                  @click="copyMessage(msg)"
                >
                  <Check v-if="msg.copied" class="w-3.5 h-3.5 text-emerald-600" />
                  <Copy v-else class="w-3.5 h-3.5 stroke-[1.75]" />
                </button>
              </div>
            </div>
          </div>

          <!-- Assistant Typing Indicator -->
          <div v-if="isTyping" class="flex flex-col items-start space-y-2">
            <div class="text-[11px] text-gray-400 font-normal">
              <span class="font-medium text-gray-800">{{ currentAgent }}</span>
              <span class="mx-1">•</span>
              <span>typing...</span>
            </div>
            <div class="flex items-center gap-1.5 py-2 px-3 bg-gray-50 rounded-xl">
              <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms;" />
              <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms;" />
              <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms;" />
            </div>
          </div>
        </div>
      </main>

      <!-- Bottom Docked Prompt Box Container -->
      <div class="fixed bottom-0 right-0 left-0 transition-all duration-300 pointer-events-none z-30" :class="isSidebarOpen ? 'md:left-64' : 'left-0'">
        <div class="bg-gradient-to-t from-white via-white/95 to-transparent pt-6 pb-4 px-4 sm:px-6 w-full">
          <div class="max-w-3xl mx-auto w-full pointer-events-auto relative">

            <!-- FLOATING DOCUMENT CARDS PREVIEW (Shown dynamically when files are attached) -->
            <div
              v-if="attachedFiles.length > 0"
              class="relative -mb-3.5 ml-4 inline-block z-10 select-none cursor-pointer"
              @click.stop="showFilePreview = !showFilePreview"
            >
              <!-- The stacked cards container -->
              <div class="relative w-18 h-14 flex items-center justify-center group" title="Click to view attached files">
                <!-- Background Sheet (tilted left -8 deg) -->
                <div
                  class="absolute inset-0 w-11 h-13 bg-white rounded-lg border border-gray-200/90 shadow-sm transform -rotate-8 -translate-x-1.5 translate-y-1 transition-transform group-hover:-rotate-12 flex flex-col p-1.5 justify-between"
                >
                  <div class="space-y-1">
                    <div class="w-4 h-1 bg-gray-200 rounded-full" />
                    <div class="w-7 h-1 bg-gray-100 rounded-full" />
                    <div class="w-6 h-1 bg-gray-100 rounded-full" />
                  </div>
                  <div class="w-5 h-1 bg-gray-100 rounded-full" />
                </div>

                <!-- Foreground Sheet (tilted right +4 deg) -->
                <div
                  class="absolute inset-0 w-11 h-13 bg-white rounded-lg border border-gray-200/90 shadow-md transform rotate-4 translate-x-1.5 translate-y-0.5 transition-transform group-hover:rotate-6 flex flex-col p-1.5 justify-between"
                >
                  <div class="space-y-1">
                    <div class="w-5 h-1 bg-sky-200 rounded-full" />
                    <div class="w-7 h-1 bg-gray-200 rounded-full" />
                    <div class="w-6 h-1 bg-gray-100 rounded-full" />
                  </div>
                  <div class="w-4 h-1 bg-gray-100 rounded-full" />
                </div>

                <!-- Purple '+N' badge overlapping the top-right of the sheets -->
                <div class="absolute -top-1 -right-0.5 bg-[#ede9fe] text-[#7c3aed] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-purple-200 shadow-xs flex items-center justify-center min-w-[20px] transition-transform group-hover:scale-110">
                  +{{ attachedFiles.length }}
                </div>
              </div>

              <!-- Popover showing attached files list -->
              <div
                v-if="showFilePreview"
                class="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 text-xs space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                @click.stop
              >
                <div class="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Attached Documents</span>
                  <button class="text-gray-400 hover:text-gray-600" @click="showFilePreview = false">
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div
                  v-for="file in attachedFiles"
                  :key="file.id"
                  class="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 group"
                >
                  <div class="flex items-center gap-2 overflow-hidden">
                    <FileSpreadsheet class="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div class="truncate">
                      <div class="font-medium text-gray-800 text-[11px] truncate">{{ file.name }}</div>
                      <div class="text-[10px] text-gray-400">{{ file.size }}</div>
                    </div>
                  </div>
                  <button
                    class="text-gray-400 hover:text-rose-500 p-1 rounded transition-colors"
                    title="Remove file"
                    @click="removeFile(file.id)"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- MAIN PROMPT BOX -->
            <div class="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/90 shadow-lg shadow-gray-200/40 p-3.5 sm:p-4 transition-all focus-within:border-gray-300 focus-within:shadow-xl">
              <!-- Top Row: Add Attachment (+) & Database App called Prysel Ai -->
              <div class="flex items-center justify-between mb-2">
                <!-- (+) Add Attachment Button -->
                <button
                  class="w-7 h-7 rounded-full border border-gray-200/90 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
                  title="Add attachment"
                  @click="triggerFileUpload"
                >
                  <Plus class="w-3.5 h-3.5 stroke-[2.2]" />
                </button>

                <!-- Database App selector called Prysel Ai -->
                <div class="relative" @click.stop>
                  <button
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100/80 hover:bg-gray-200/70 text-gray-700 text-xs font-semibold transition-colors"
                    @click="showDataSourceMenu = !showDataSourceMenu"
                  >
                    <Database class="w-3.5 h-3.5 text-sky-600" />
                    <span>{{ selectedDataSource }}</span>
                    <ChevronDown class="w-3 h-3 text-gray-500" :class="{ 'rotate-180': showDataSourceMenu }" />
                  </button>

                  <!-- Data Source Dropdown -->
                  <div
                    v-if="showDataSourceMenu"
                    class="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div class="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Database Source</div>
                    <button
                      v-for="opt in dataSourceOptions"
                      :key="opt"
                      class="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-gray-50 text-gray-700 font-medium"
                      @click="selectedDataSource = opt; showDataSourceMenu = false"
                    >
                      <span>{{ opt }}</span>
                      <Check v-if="selectedDataSource === opt" class="w-3.5 h-3.5 text-sky-600" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Middle: Prompt Textarea -->
              <div class="my-1">
                <textarea
                  ref="textareaRef"
                  v-model="inputPrompt"
                  rows="1"
                  placeholder="Ask anything, analyze data, or attach spreadsheets..."
                  class="w-full bg-transparent resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed font-normal py-1 px-0"
                  @input="adjustTextareaHeight"
                  @keydown="handleKeydown"
                />
              </div>

              <!-- Bottom Toolbar: Model, Tone, Mic, Send -->
              <div class="flex items-center justify-between pt-2">
                <!-- Left Controls: Model & Tone -->
                <div class="flex items-center gap-2">
                  <!-- Model Selector Pill -->
                  <div class="relative" @click.stop>
                    <button
                      class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
                      @click="showModelMenu = !showModelMenu"
                    >
                      <!-- Anthropic Claude warm square logo icon -->
                      <div class="w-3.5 h-3.5 rounded bg-[#d97706] text-white flex items-center justify-center font-serif text-[9px] font-bold leading-none select-none">
                        A\
                      </div>
                      <span>{{ selectedModel }}</span>
                      <ChevronDown class="w-3 h-3 text-gray-400" :class="{ 'rotate-180': showModelMenu }" />
                    </button>

                    <!-- Model Selector Dropdown -->
                    <div
                      v-if="showModelMenu"
                      class="absolute left-0 bottom-full mb-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Select Model</div>
                      <button
                        v-for="m in modelOptions"
                        :key="m.id"
                        class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-gray-700"
                        @click="selectedModel = m.id; showModelMenu = false"
                      >
                        <div>
                          <div class="font-medium text-gray-800">{{ m.name }}</div>
                          <div class="text-[10px] text-gray-400">{{ m.desc }}</div>
                        </div>
                        <Check v-if="selectedModel === m.id" class="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                      </button>
                    </div>
                  </div>

                  <!-- Tone Selector Pill -->
                  <div class="relative" @click.stop>
                    <button
                      class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-gray-100/70 text-xs font-medium text-gray-600 transition-colors"
                      @click="showToneMenu = !showToneMenu"
                    >
                      <SlidersHorizontal class="w-3.5 h-3.5 text-gray-500" />
                      <span>{{ selectedTone }}</span>
                      <ChevronDown class="w-3 h-3 text-gray-400" :class="{ 'rotate-180': showToneMenu }" />
                    </button>

                    <!-- Tone Dropdown -->
                    <div
                      v-if="showToneMenu"
                      class="absolute left-0 bottom-full mb-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        v-for="t in toneOptions"
                        :key="t"
                        class="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-gray-50 text-gray-700 font-medium"
                        @click="selectedTone = t; showToneMenu = false"
                      >
                        <span>{{ t }}</span>
                        <Check v-if="selectedTone === t" class="w-3.5 h-3.5 text-sky-600" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Right Controls: Mic & Send Button -->
                <div class="flex items-center gap-2">
                  <!-- Microphone Button -->
                  <button
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                    :class="{ 'text-red-500 animate-pulse': isRecording }"
                    title="Voice input"
                    @click="toggleVoiceRecording"
                  >
                    <Mic v-if="!isRecording" class="w-4 h-4" />
                    <MicOff v-else class="w-4 h-4 text-rose-500" />
                  </button>

                  <!-- Send Button with Keyboard Badges ⌘ ⏎ -->
                  <button
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    :disabled="!inputPrompt.trim() && attachedFiles.length === 0"
                    @click="sendMessage"
                  >
                    <Send class="w-3.5 h-3.5" />
                    <span>Send</span>

                    <!-- Shortcut badges: ⌘ and ⏎ -->
                    <div class="flex items-center gap-1 ml-1 text-zinc-300">
                      <span class="bg-zinc-700/80 px-1 py-0.5 rounded text-[9px] font-mono leading-none">⌘</span>
                      <span class="bg-zinc-700/80 px-1 py-0.5 rounded text-[9px] font-mono leading-none">⏎</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer Disclaimer with Prysel Ai Branding -->
            <div class="text-center mt-2.5">
              <p class="text-[11px] text-gray-400">
                Prysel Ai is powered by European sovereign cloud infrastructure. Models are continuously updated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Agent Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click="showEditModal = false"
    >
      <div
        class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4"
        @click.stop
      >
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <img src="/assets/img/prysel.svg" class="h-5 w-auto object-contain" alt="Prysel Ai" />
            <h2 class="text-base font-semibold text-gray-800">Edit Prysel Ai Configuration</h2>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="showEditModal = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block text-gray-600 font-medium mb-1">Agent Name</label>
            <input
              v-model="currentAgent"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label class="block text-gray-600 font-medium mb-1">Agent Role & Capabilities</label>
            <textarea
              rows="3"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-sky-500"
              value="Expert in quantitative data analysis, spreadsheet parsing (Excel, CSV), identifying discrepancies across multiple sheets, and querying the Prysel Ai database."
            />
          </div>

          <div>
            <label class="block text-gray-600 font-medium mb-1">Default Knowledge Base</label>
            <select class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-sky-500">
              <option>Prysel Ai Database</option>
              <option>Corporate Sales Data & Financial Spreadsheets</option>
              <option>Customer CRM & Pipeline</option>
            </select>
          </div>
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            class="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
            @click="showEditModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-black"
            @click="showEditModal = false; showToast('Prysel Ai settings updated!')"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- Publish Agent Modal -->
    <div
      v-if="showPublishModal"
      class="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click="showPublishModal = false"
    >
      <div
        class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4"
        @click.stop
      >
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <Globe class="w-5 h-5 text-sky-600" />
            <h2 class="text-base font-semibold text-gray-800">Publish {{ currentAgent }}</h2>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="showPublishModal = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <p class="text-xs text-gray-500">
          Share this agent with your organization or create a public interactive chat link on Prysel Ai.
        </p>

        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
            <div class="flex items-center gap-2.5">
              <Users class="w-4 h-4 text-sky-600" />
              <div>
                <div class="font-medium text-gray-800">Prysel Ai Team Workspace</div>
                <div class="text-[10px] text-gray-400">Available to all members of your company</div>
              </div>
            </div>
            <input type="radio" name="access" checked class="text-sky-600" />
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl border border-gray-100">
            <div class="flex items-center gap-2.5">
              <Globe class="w-4 h-4 text-gray-500" />
              <div>
                <div class="font-medium text-gray-800">Public Web</div>
                <div class="text-[10px] text-gray-400">Anyone with the link can converse with this agent</div>
              </div>
            </div>
            <input type="radio" name="access" class="text-sky-600" />
          </div>
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            class="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
            @click="showPublishModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-black shadow-sm"
            @click="showPublishModal = false; showToast('Agent successfully published to Prysel Ai!')"
          >
            Publish Now
          </button>
        </div>
      </div>
    </div>

    <!-- 1. SEARCH POPUP MODAL (COMMAND PALETTE) -->
    <div
      v-if="showSearchModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 sm:pt-28 p-4 animate-in fade-in duration-150"
      @click="showSearchModal = false"
    >
      <div
        class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[75vh]"
        @click.stop
      >
        <!-- Top Search Input Row -->
        <div class="p-3 border-b border-neutral-100 flex items-center gap-3">
          <Search class="w-4 h-4 text-neutral-400 ml-1.5 flex-shrink-0" />
          <input
            v-model="modalSearchQuery"
            type="text"
            placeholder="Search conversations, prompts, or commands... (⌘K)"
            class="w-full text-sm text-neutral-800 placeholder-neutral-400 outline-none bg-transparent"
            autofocus
          />
          <button
            v-if="modalSearchQuery"
            class="p-1 rounded text-neutral-400 hover:text-neutral-700"
            @click="modalSearchQuery = ''"
          >
            <X class="w-3.5 h-3.5" />
          </button>
          <kbd class="px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 rounded border border-neutral-200 flex-shrink-0">
            ESC
          </kbd>
        </div>

        <!-- Quick Actions & Results List -->
        <div class="overflow-y-auto p-2 space-y-1 text-xs">
          <!-- When user has typed query: display matching conversations -->
          <div v-if="modalSearchQuery">
            <div class="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Conversations ({{ modalSearchResults.length }})
            </div>
            <div v-if="modalSearchResults.length === 0" class="px-3 py-6 text-center text-neutral-400 text-xs">
              No matching conversations found for "{{ modalSearchQuery }}"
            </div>
            <button
              v-for="chat in modalSearchResults"
              :key="chat.id"
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors flex items-center justify-between group"
              @click="selectSearchResult(chat.id)"
            >
              <div class="flex items-center gap-2.5 overflow-hidden">
                <MessageSquare class="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 flex-shrink-0" />
                <span class="text-xs font-medium text-neutral-800 truncate">{{ chat.title }}</span>
              </div>
              <span class="text-[10px] text-neutral-400">{{ chat.dateGroup }}</span>
            </button>
          </div>

          <!-- When query is empty: show quick navigation actions & recent chats -->
          <div v-else class="space-y-3">
            <div>
              <div class="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Quick Actions
              </div>
              <button
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors flex items-center gap-2.5 text-neutral-700"
                @click="startNewChat(); showSearchModal = false"
              >
                <SquarePen class="w-4 h-4 text-sky-600" />
                <span class="font-medium">New chat</span>
              </button>
              <button
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors flex items-center gap-2.5 text-neutral-700"
                @click="showUserAccountModal = true; showSearchModal = false"
              >
                <Settings class="w-4 h-4 text-neutral-500" />
                <span class="font-medium">User Panel & Preferences</span>
              </button>
              <button
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors flex items-center gap-2.5 text-neutral-700"
                @click="showUpgradeModal = true; showSearchModal = false"
              >
                <Sparkles class="w-4 h-4 text-amber-500" />
                <span class="font-medium">Upgrade to Prysel Ai Pro</span>
              </button>
            </div>

            <div>
              <div class="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Recent Chats
              </div>
              <button
                v-for="chat in conversations.slice(0, 5)"
                :key="chat.id"
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors flex items-center justify-between group"
                @click="selectSearchResult(chat.id)"
              >
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <MessageSquare class="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 flex-shrink-0" />
                  <span class="text-xs text-neutral-700 truncate">{{ chat.title }}</span>
                </div>
                <ArrowRight class="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. USER PROFILE & SETTINGS POPUP MODAL -->
    <div
      v-if="showUserAccountModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click="showUserAccountModal = false"
    >
      <div
        class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[85vh]"
        @click.stop
      >
        <!-- Modal Top Header -->
        <div class="p-4 px-6 border-b border-neutral-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <SunflowerAvatar className="w-10 h-10 border border-neutral-200" />
            <div>
              <h2 class="text-base font-bold text-neutral-900 leading-tight">{{ userDisplayName }}</h2>
              <p class="text-xs text-neutral-500">{{ user?.email || 'erickson@prysel.ai' }}</p>
            </div>
          </div>
          <button class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" @click="showUserAccountModal = false">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="px-6 border-b border-neutral-100 flex gap-4 text-xs font-medium text-neutral-500">
          <button
            class="py-3 border-b-2 transition-colors"
            :class="activeUserTab === 'general' ? 'border-neutral-900 text-neutral-900 font-semibold' : 'border-transparent hover:text-neutral-700'"
            @click="activeUserTab = 'general'"
          >
            General
          </button>
          <button
            class="py-3 border-b-2 transition-colors"
            :class="activeUserTab === 'subscription' ? 'border-neutral-900 text-neutral-900 font-semibold' : 'border-transparent hover:text-neutral-700'"
            @click="activeUserTab = 'subscription'"
          >
            Subscription & Cloud
          </button>
          <button
            class="py-3 border-b-2 transition-colors"
            :class="activeUserTab === 'security' ? 'border-neutral-900 text-neutral-900 font-semibold' : 'border-transparent hover:text-neutral-700'"
            @click="activeUserTab = 'security'"
          >
            Security & Auth
          </button>
          <button
            class="py-3 border-b-2 transition-colors"
            :class="activeUserTab === 'data' ? 'border-neutral-900 text-neutral-900 font-semibold' : 'border-transparent hover:text-neutral-700'"
            @click="activeUserTab = 'data'"
          >
            Data Controls
          </button>
        </div>

        <!-- Tab Body -->
        <div class="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          <!-- GENERAL TAB -->
          <div v-if="activeUserTab === 'general'" class="space-y-4">
            <div>
              <label class="block font-semibold text-neutral-700 mb-1">Display Name</label>
              <input
                v-model="userDisplayName"
                class="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label class="block font-semibold text-neutral-700 mb-1">Email Address</label>
              <input
                :value="user?.email || 'erickson@prysel.ai'"
                disabled
                class="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-500 bg-neutral-50 cursor-not-allowed"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-neutral-700 mb-1">Theme</label>
                <select class="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none">
                  <option>Light (System)</option>
                  <option>Dark</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold text-neutral-700 mb-1">Language</label>
                <select class="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none">
                  <option>English (US)</option>
                  <option>Nederlands</option>
                  <option>Deutsch</option>
                </select>
              </div>
            </div>
          </div>

          <!-- SUBSCRIPTION & CLOUD TAB -->
          <div v-else-if="activeUserTab === 'subscription'" class="space-y-4">
            <div class="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div class="space-y-1">
                <span class="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">CURRENT PLAN</span>
                <h3 class="text-sm font-bold text-neutral-900">Prysel Ai Free Tier</h3>
                <p class="text-[11px] text-neutral-500">Standard compute, basic spreadsheets, community support</p>
              </div>
              <button
                class="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-all"
                @click="showUserAccountModal = false; showUpgradeModal = true"
              >
                Upgrade to Pro
              </button>
            </div>

            <div class="space-y-2">
              <div class="font-semibold text-neutral-700">Cloud Infrastructure (Frankfurt DC-01)</div>
              <div class="p-3 rounded-xl border border-neutral-100 space-y-2 bg-white">
                <div class="flex items-center justify-between">
                  <span class="text-neutral-500">Region:</span>
                  <span class="font-semibold text-neutral-800">EU Central (Frankfurt)</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-neutral-500">GDPR Compliance:</span>
                  <span class="font-semibold text-emerald-600">100% Sovereign European Cloud</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-neutral-500">Database Engine:</span>
                  <span class="font-semibold text-neutral-800">Prysel Ai NVMe Analytics Lake</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SECURITY TAB -->
          <div v-else-if="activeUserTab === 'security'" class="space-y-4">
            <div class="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/60 space-y-1">
              <div class="font-semibold text-neutral-800">Cloud SDK OneAuth Session</div>
              <div class="text-[11px] text-neutral-500 leading-relaxed font-mono break-all">
                Token: prysel_oa_live_{{ user ? 'valid' : 'demo' }}...
              </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl border border-neutral-100">
              <div>
                <div class="font-semibold text-neutral-800">Two-Factor Authentication</div>
                <div class="text-[11px] text-neutral-500">Secure your account with authenticator app</div>
              </div>
              <button class="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium hover:bg-neutral-50" @click="showToast('2FA configuration saved')">
                Configure
              </button>
            </div>
            <button
              class="w-full py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
              @click="handleLogout(); showUserAccountModal = false"
            >
              Sign out from this session
            </button>
          </div>

          <!-- DATA TAB -->
          <div v-else-if="activeUserTab === 'data'" class="space-y-3">
            <div class="p-3.5 rounded-xl border border-neutral-100 space-y-1">
              <div class="font-semibold text-neutral-800">Export Conversation Data</div>
              <p class="text-[11px] text-neutral-500">Download a complete JSON export of all conversations and data analysis queries.</p>
              <button class="mt-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium hover:bg-neutral-50" @click="showToast('Data exported successfully')">
                Export Data (.JSON)
              </button>
            </div>

            <div class="p-3.5 rounded-xl border border-red-100 bg-red-50/30 space-y-1">
              <div class="font-semibold text-red-800">Clear All Conversations</div>
              <p class="text-[11px] text-neutral-500">Permanently delete all chats from local storage and restart with a clean state.</p>
              <button
                class="mt-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs"
                @click="clearAllConversations(); showUserAccountModal = false"
              >
                Clear all chats
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 px-6 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-50/40">
          <button
            class="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-white"
            @click="showUserAccountModal = false"
          >
            Close
          </button>
          <button
            class="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-black shadow-xs"
            @click="showToast('Profile updated'); showUserAccountModal = false"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>

    <!-- 3. UPGRADE POPUP MODAL -->
    <div
      v-if="showUpgradeModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click="showUpgradeModal = false"
    >
      <div
        class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200/80 space-y-6 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <img src="/assets/img/prysel.svg" class="h-6 w-auto object-contain" alt="Prysel Ai" />
              <h2 class="text-xl font-bold text-neutral-900">Upgrade to Prysel Ai Pro</h2>
            </div>
            <p class="text-xs text-neutral-500">Supercharge your data analysis with sovereign cloud infrastructure.</p>
          </div>
          <button class="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" @click="showUpgradeModal = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Plan Comparison Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Free Tier -->
          <div class="p-5 rounded-2xl border border-neutral-200 space-y-4 bg-white flex flex-col justify-between">
            <div class="space-y-2">
              <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Free</div>
              <div class="text-2xl font-bold text-neutral-900">€0 <span class="text-xs font-normal text-neutral-500">/ month</span></div>
              <p class="text-xs text-neutral-500">For individual exploration and basic spreadsheet parsing.</p>
              
              <div class="pt-3 space-y-2 text-xs text-neutral-700">
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Standard Claude 3 Sonnet</span>
                </div>
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Basic Prysel Ai Database queries</span>
                </div>
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Community support</span>
                </div>
              </div>
            </div>

            <button
              disabled
              class="w-full py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-400 bg-neutral-100 cursor-default"
            >
              Current Plan
            </button>
          </div>

          <!-- Prysel Ai Pro -->
          <div class="p-5 rounded-2xl border-2 border-neutral-900 space-y-4 bg-white flex flex-col justify-between relative shadow-lg">
            <div class="absolute -top-3 right-4 bg-neutral-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
              RECOMMENDED
            </div>

            <div class="space-y-2">
              <div class="text-xs font-semibold text-sky-600 uppercase tracking-wider">Prysel Ai Pro</div>
              <div class="text-2xl font-bold text-neutral-900">€20 <span class="text-xs font-normal text-neutral-500">/ month</span></div>
              <p class="text-xs text-neutral-500">Unlimited intelligence, highest models, and sovereign datacenter priority.</p>
              
              <div class="pt-3 space-y-2 text-xs text-neutral-800">
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                  <span class="font-semibold">Claude 3.5 Sonnet & GPT-4o</span>
                </div>
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                  <span>Unlimited spreadsheet parsing & reconciliation</span>
                </div>
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                  <span>Ultra-long 2M token context window</span>
                </div>
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                  <span>Frankfurt DC-01 high-priority queue</span>
                </div>
                <div class="flex items-center gap-2">
                  <Check class="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                  <span>Dedicated 24/7 European ticket desk</span>
                </div>
              </div>
            </div>

            <button
              class="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md active:scale-99"
              @click="showToast('Upgraded to Prysel Ai Pro!'); showUpgradeModal = false"
            >
              Upgrade to Prysel Ai Pro
            </button>
          </div>
        </div>

        <p class="text-[11px] text-center text-neutral-400">
          Cancel anytime. Prices in EUR excl. VAT. Powered by sovereign European cloud infrastructure.
        </p>
      </div>
    </div>

    <!-- 4. FEATURE POPUP MODAL (Images, Library, Scheduled, Plugins, Projects, Codex, More) -->
    <div
      v-if="showFeatureModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click="showFeatureModal = false"
    >
      <div
        class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[80vh]"
        @click.stop
      >
        <div class="p-4 px-6 border-b border-neutral-100 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              <ImageIcon v-if="activeFeatureType === 'images'" class="w-4 h-4" />
              <Library v-else-if="activeFeatureType === 'library'" class="w-4 h-4" />
              <Clock v-else-if="activeFeatureType === 'scheduled'" class="w-4 h-4" />
              <Puzzle v-else-if="activeFeatureType === 'plugins'" class="w-4 h-4" />
              <Folder v-else-if="activeFeatureType === 'projects'" class="w-4 h-4" />
              <Cloud v-else-if="activeFeatureType === 'cloud'" class="w-4 h-4 text-sky-600" />
              <MoreHorizontal v-else class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-neutral-900 capitalize">{{ activeFeatureType }}</h2>
              <p class="text-[11px] text-neutral-500">Prysel Ai integrated workspace</p>
            </div>
          </div>
          <button class="p-1 rounded-lg text-neutral-400 hover:text-neutral-700" @click="showFeatureModal = false">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          <!-- IMAGES -->
          <div v-if="activeFeatureType === 'images'" class="space-y-3">
            <p class="text-neutral-600">Visual data graphs, charts, and generated images for your conversations.</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl border border-neutral-100 bg-neutral-50 text-center space-y-2">
                <FileSpreadsheet class="w-8 h-8 mx-auto text-emerald-600" />
                <div class="font-medium text-neutral-800">Q4 Sales Cohort</div>
                <div class="text-[10px] text-neutral-400">PNG • 1.2 MB</div>
              </div>
              <div class="p-3 rounded-xl border border-neutral-100 bg-neutral-50 text-center space-y-2">
                <FileSpreadsheet class="w-8 h-8 mx-auto text-sky-600" />
                <div class="font-medium text-neutral-800">Regional Revenue Chart</div>
                <div class="text-[10px] text-neutral-400">SVG • 420 KB</div>
              </div>
            </div>
          </div>

          <!-- LIBRARY -->
          <div v-else-if="activeFeatureType === 'library'" class="space-y-2">
            <p class="text-neutral-600">Saved data prompts and reference documentation.</p>
            <div class="p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer" @click="inputPrompt = 'Perform multi-sheet delta analysis across Q3 and Q4 sales.'; showFeatureModal = false">
              <div class="font-semibold text-neutral-800">Multi-Sheet Delta Analysis</div>
              <div class="text-[11px] text-neutral-500">Compare columns, match customer keys, and detect numeric variances.</div>
            </div>
            <div class="p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer" @click="inputPrompt = 'Audit database records for missing values and currency exchange anomalies.'; showFeatureModal = false">
              <div class="font-semibold text-neutral-800">Database Record Audit</div>
              <div class="text-[11px] text-neutral-500">Check schema integrity and identify unmapped IDs.</div>
            </div>
          </div>

          <!-- SCHEDULED -->
          <div v-else-if="activeFeatureType === 'scheduled'" class="space-y-3">
            <p class="text-neutral-600">Automated query tasks and recurring executive reports.</p>
            <div class="p-3 rounded-xl border border-neutral-100 space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-neutral-800">Weekly Revenue Summary</span>
                <span class="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Active</span>
              </div>
              <p class="text-[11px] text-neutral-500">Runs every Monday at 08:00 CET against Prysel Ai Database.</p>
            </div>
          </div>

          <!-- PLUGINS -->
          <div v-else-if="activeFeatureType === 'plugins'" class="space-y-2">
            <p class="text-neutral-600">Connect Prysel Ai with your European cloud data ecosystem.</p>
            <div class="p-3 rounded-xl border border-neutral-100 flex items-center justify-between">
              <div>
                <div class="font-semibold text-neutral-800">Prysel Ai Database (PostgreSQL)</div>
                <div class="text-[11px] text-neutral-500">Direct SQL query and live analytics lake</div>
              </div>
              <span class="text-emerald-600 font-semibold text-[11px]">Connected</span>
            </div>
            <div class="p-3 rounded-xl border border-neutral-100 flex items-center justify-between">
              <div>
                <div class="font-semibold text-neutral-800">n8n Sovereign Automation</div>
                <div class="text-[11px] text-neutral-500">Self-hosted workflow engine on EU VPS</div>
              </div>
              <span class="text-neutral-400 font-medium text-[11px]">Available</span>
            </div>
          </div>

          <!-- PROJECTS -->
          <div v-else-if="activeFeatureType === 'projects'" class="space-y-2">
            <p class="text-neutral-600">Workspaces to group related conversations and spreadsheets.</p>
            <div class="p-3 rounded-xl border border-neutral-100 flex items-center justify-between hover:bg-neutral-50 cursor-pointer" @click="showFeatureModal = false; showToast('Switched to Finance Q4 project')">
              <div>
                <div class="font-semibold text-neutral-800">Finance & Revenue Q4</div>
                <div class="text-[11px] text-neutral-500">8 conversations • 4 sheets attached</div>
              </div>
              <ArrowRight class="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          <!-- CLOUD HOSTING -->
          <div v-else-if="activeFeatureType === 'cloud'" class="space-y-3">
            <p class="text-neutral-600">Prysel Ai Self-Hosted Cloud Infrastructure — OpenNebula KVM virtualization, Ceph/ZFS datastores, and sovereign European server clusters.</p>
            
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl border border-neutral-100 bg-neutral-50/70 space-y-1">
                <div class="text-[10px] text-neutral-400 uppercase font-semibold">Self-Hosted Cluster</div>
                <div class="font-bold text-neutral-900 text-xs">Frankfurt DC-01</div>
                <div class="text-[10px] text-emerald-600 font-medium">● 8/8 KVM Nodes Online</div>
              </div>
              <div class="p-3 rounded-xl border border-neutral-100 bg-neutral-50/70 space-y-1">
                <div class="text-[10px] text-neutral-400 uppercase font-semibold">Datastore Backend</div>
                <div class="font-bold text-neutral-900 text-xs">Ceph NVMe + ZFS</div>
                <div class="text-[10px] text-sky-600 font-medium">3x Replicated Storage</div>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] space-y-1">
              <div class="text-sky-400"># Prysel Ai Self-Hosting Daemon</div>
              <div>$ prysel-agent --status --cluster=eu-central-1</div>
              <div class="text-emerald-400">✓ OpenNebula KVM Orchestrator: Connected</div>
              <div class="text-emerald-400">✓ European Datacenter: 100% GDPR Sovereign</div>
            </div>

            <button
              class="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-black transition-colors text-xs shadow-xs"
              @click="showFeatureModal = false; showToast('Navigating to Prysel Ai Self-Hosted Cloud Console...')"
            >
              <Cloud class="w-3.5 h-3.5 text-sky-400" />
              <span>Manage Self-Hosted Cloud</span>
            </button>
          </div>

          <!-- MORE -->
          <div v-else class="space-y-2">
            <button class="w-full text-left p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors" @click="showFeatureModal = false; showSearchModal = true">
              <div class="font-semibold text-neutral-800">Open Command Palette (⌘K)</div>
              <div class="text-[11px] text-neutral-500">Quickly find any chat or action</div>
            </button>
            <button class="w-full text-left p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors" @click="showFeatureModal = false; showUserAccountModal = true">
              <div class="font-semibold text-neutral-800">Open User Panel & Settings</div>
              <div class="text-[11px] text-neutral-500">Manage account, theme, and security</div>
            </button>
          </div>
        </div>

        <div class="p-4 px-6 border-t border-neutral-100 flex justify-end bg-neutral-50/40">
          <button
            class="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-black shadow-xs"
            @click="showFeatureModal = false"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- 5. INTERACTIVE VOICE CONTROL MODE (WITH NEURIY FACE IN THE MIDDLE) -->
    <VoiceModeOverlay v-model="showVoiceMode" @submit-speech="handleVoiceSpeech" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

/* Custom scrollbar for sidebar */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* ChatGPT sidebar smooth scrollbar */
.chatgpt-sidebar::-webkit-scrollbar {
  width: 5px;
}
.chatgpt-sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.chatgpt-sidebar::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}
.chatgpt-sidebar:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.14);
}
</style>
