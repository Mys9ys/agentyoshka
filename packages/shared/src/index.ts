export type TrainingGrade = 'G0' | 'G1' | 'G2' | 'G3' | 'G4';

export type CultureTrack = 'pushkin' | 'dostoevsky' | 'neutral';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface AgentProfile {
  id: string;
  displayName: string;
  baseSkinId: string;
  level: number;
  cultureXp: number;
  trainingGrade: TrainingGrade;
  cultureTrack: CultureTrack;
}

export interface DailyEventSummary {
  id: string;
  title: string;
  weekday: Weekday;
  lessonChoice?: { a: string; b: string };
}

export interface ScenarioBeat {
  id: string;
  speaker: 'agent' | 'narrator';
  text: string;
}

export type LessonChoiceKey = 'a' | 'b';

export interface TodayProgress {
  dateKey: string;
  eventId: string | null;
  completed: boolean;
  choiceKey: LessonChoiceKey | null;
  hasLessonChoice: boolean;
  minigameId: string | null;
  hasMinigame: boolean;
  minigameScore: number | null;
}

export interface DemoAgentResponse {
  agent: AgentProfile;
  coins: number;
  source: string;
  today: TodayProgress;
}

export type ShopItemKind = 'skin' | 'upgrade';

export type ShopItemEffect = {
  cultureXp?: number;
  level?: number;
  productionMult?: number;
  bufferCapBonus?: number;
  coinsPerHourBonus?: number;
};

export interface ShopCatalogItem {
  id: string;
  kind: ShopItemKind;
  label: string;
  description: string;
  price: number;
  skinId?: string;
  minGrade?: TrainingGrade;
  effect?: ShopItemEffect;
  owned: boolean;
  equipped: boolean;
  locked: boolean;
  lockReason: string | null;
}

export interface ShopCatalogResponse {
  coins: number;
  agent: AgentProfile;
  techBranches: TechBranchView[];
  /** @deprecated используй techBranches */
  items?: ShopCatalogItem[];
}

export interface AgentUpgradeEntry {
  itemId: string;
  kind: ShopItemKind;
  label: string;
  description: string;
  purchasedAt: string;
  equipped?: boolean;
  effect: ShopItemEffect | null;
}

export interface AgentWardrobeEntry {
  skinId: string;
  label: string;
  owned: boolean;
  equipped: boolean;
}

export interface AgentProfileDetailResponse {
  agent: AgentProfile;
  coins: number;
  skin: { id: string; label: string };
  bio: string;
  wardrobe: AgentWardrobeEntry[];
  upgrades: AgentUpgradeEntry[];
  techBranches: TechBranchView[];
}

export type TechNodeStatus = 'locked' | 'available' | 'owned' | 'equipped';

export interface TechNodeView {
  id: string;
  kind: ShopItemKind;
  branch: string;
  tier: number;
  label: string;
  description: string;
  price: number;
  skinId?: string;
  effect: ShopItemEffect | null;
  requires: string[];
  status: TechNodeStatus;
  lockReason: string | null;
  canBuy: boolean;
  equipped: boolean;
}

export interface TechBranchView {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
  nodes: TechNodeView[];
  unlocked: number;
  total: number;
}

export type PersonalityAxis =
  | 'slang'
  | 'warmth'
  | 'brevity'
  | 'emoji'
  | 'literary'
  | 'playfulness';

export type PersonalityVector = Record<PersonalityAxis, number>;

export interface VoiceProfile {
  grade: TrainingGrade;
  gradeLabel: string;
  gradeRules: string;
  maxTokens: number;
  ageDays: number;
  raw: PersonalityVector;
  effective: PersonalityVector;
  /** 0..1 насколько агент отличается от «заводских» G0 */
  uniqueness: number;
  axisLabels: Record<PersonalityAxis, { label: string; hint: string }>;
}

export type AgentReplySource = 'template' | 'llm';

export interface ProductionRunView {
  id: string;
  dateKey: string;
  weekday: string;
  title: string;
  tagline: string;
  unclaimed: number;
  bufferCap: number;
  coinsPerHour: number;
  createdAt: string;
}

export interface TickStatus {
  label: string;
  tagline: string;
  active: boolean;
  lifeDay: number;
  durationDays: number;
  productionMult: number;
}

export interface DailyLoginRewardRow {
  day: number;
  coins: number;
  label: string;
  hardwareDrop?: string;
}

export interface DailyLoginStateResponse {
  ok: boolean;
  dateKey?: string;
  claimedToday?: boolean;
  loginStreak?: number;
  nextStreakDay?: number;
  todayReward?: DailyLoginRewardRow;
  rewardTable?: DailyLoginRewardRow[];
  tick?: TickStatus;
  error?: string;
}

export interface MachineComponentView {
  key: string;
  label: string;
  unit: string;
  icon: string;
  value: number;
  display?: string;
}

export interface MinigameCatalogEntry {
  id: string;
  title: string;
  tagline: string;
  implemented: boolean;
  calendarSlot: string | null;
  unlocked: boolean;
  requires: { ramGb?: number; gpuTier?: number; ssdGb?: number; hddGb?: number };
}

export interface MachineStateResponse {
  ok: boolean;
  tick?: TickStatus;
  stats?: { ramGb: number; gpuTier: number; ssdGb: number; hddGb: number; gpuLabel: string };
  components?: MachineComponentView[];
  minigames?: MinigameCatalogEntry[];
  catalog?: { total: number; implemented: number };
  error?: string;
}

export interface ProductionStateResponse {
  ok: boolean;
  coins?: number;
  totalPending?: number;
  tick?: TickStatus;
  bonuses?: {
    productionMult: number;
    bufferCapBonus: number;
    coinsPerHourBonus: number;
    tickMult?: number;
  };
  runs?: ProductionRunView[];
  error?: string;
}

export interface AgentReplyResponse {
  ok: boolean;
  slotId?: string;
  dateKey?: string;
  text?: string;
  source?: AgentReplySource;
  fromCache?: boolean;
  regensLeft?: number;
  voice?: { grade: TrainingGrade; maxTokens?: number };
  error?: string;
}
