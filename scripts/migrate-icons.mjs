import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

// Full lucide → solar mapping (verified against solar-icon-set package)
const ICON_MAP = {
  AlertCircle:     'DangerTriangleOutline',
  AlertTriangle:   'DangerTriangleOutline',
  Archive:         'ArchiveOutline',
  ArrowLeft:       'ArrowLeftOutline',
  AtSign:          'LetterOutline',
  Award:           'CupFirstOutline',
  Bell:            'BellOutline',
  BellOff:         'BellOffOutline',
  Briefcase:       'CaseOutline',
  Building2:       'BuildingsOutline',
  Calendar:        'CalendarOutline',
  CalendarDays:    'CalendarOutline',
  CalendarOff:     'CalendarMarkOutline',
  CalendarPlus:    'CalendarAddOutline',
  CalendarX:       'CalendarMarkOutline',
  Camera:          'CameraOutline',
  Check:           'CheckCircleOutline',
  CheckCircle:     'CheckCircleOutline',
  CheckCircle2:    'CheckCircleOutline',
  ChevronDown:     'AltArrowDownOutline',
  ChevronRight:    'AltArrowRightOutline',
  ChevronUp:       'AltArrowUpOutline',
  ClipboardList:   'ClipboardListOutline',
  Clock:           'ClockCircleOutline',
  Copy:            'CopyOutline',
  Download:        'DownloadOutline',
  ExternalLink:    'ShareOutline',
  Eye:             'EyeOutline',
  EyeOff:          'EyeClosedOutline',
  Flame:           'FireOutline',
  Gift:            'GiftOutline',
  Heart:           'HeartOutline',
  Home:            'HomeOutline',
  ImagePlus:       'GalleryAddOutline',
  Info:            'InfoCircleOutline',
  KeyRound:        'KeyOutline',
  LayoutDashboard: 'WidgetOutline',
  Link2:           'LinkOutline',
  Loader2:         'RefreshCircleOutline',
  LogOut:          'LogoutOutline',
  Mail:            'LetterOutline',
  MapPin:          'MapPointOutline',
  Megaphone:       'UserSpeakOutline',
  Monitor:         'MonitorOutline',
  Newspaper:       'DocumentTextOutline',
  Package:         'BoxOutline',
  Pencil:          'PenOutline',
  Phone:           'PhoneOutline',
  Plus:            'AddCircleOutline',
  QrCode:          'QRCodeOutline',
  RefreshCw:       'RefreshOutline',
  Rocket:          'RocketOutline',
  RotateCcw:       'RestartOutline',
  ScanLine:        'ScannerOutline',
  SearchX:         'MagniferBugOutline',
  Shield:          'ShieldOutline',
  ShieldCheck:     'ShieldCheckOutline',
  Star:            'StarOutline',
  SwitchCamera:    'CameraRotateOutline',
  Tag:             'TagOutline',
  Ticket:          'TicketOutline',
  ToggleLeft:      'PowerOutline',
  ToggleRight:     'PowerOutline',
  Trash2:          'TrashBinTrashOutline',
  User:            'UserOutline',
  UserCheck:       'UserCheckOutline',
  UserX:           'UserCrossOutline',
  Users:           'UsersGroupRoundedOutline',
  X:               'CloseSquareOutline',
  XCircle:         'CloseCircleOutline',
  Zap:             'BoltOutline',
}

const lucideNames = Object.keys(ICON_MAP)
const files = globSync('apps/member/src/**/*.{tsx,ts}')
let totalFiles = 0

for (const file of files) {
  let content = readFileSync(file, 'utf8')
  const original = content

  // Replace lucide-react import lines
  // Handles: import { Foo, Bar, Baz } from 'lucide-react'
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g,
    (_, imports) => {
      const names = imports.split(',').map(s => s.trim()).filter(Boolean)
      const solarNames = [...new Set(names.map(n => ICON_MAP[n] ?? n))]
      return `import { ${solarNames.join(', ')} } from 'solar-icon-set'`
    }
  )

  // Replace JSX/variable usages of old icon names with new names
  // Process longest names first to avoid partial matches (e.g., CheckCircle2 before CheckCircle)
  const sorted = [...lucideNames].sort((a, b) => b.length - a.length)
  for (const lucideName of sorted) {
    const solarName = ICON_MAP[lucideName]
    if (lucideName === solarName) continue
    // Match icon names as identifiers in JSX tags, props, and variable assignments
    const tagRe = new RegExp(`(?<=</?|\\s|[{,=])${lucideName}(?=[\\s/>{},:)\\]])`, 'g')
    content = content.replace(tagRe, solarName)
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8')
    totalFiles++
    console.log(`✏️  ${file}`)
  }
}

console.log(`\n✅ Done. Modified ${totalFiles} files.`)
