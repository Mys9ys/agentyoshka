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
}

export interface DemoAgentResponse {
  agent: AgentProfile;
  coins: number;
  source: string;
  today: TodayProgress;
}
