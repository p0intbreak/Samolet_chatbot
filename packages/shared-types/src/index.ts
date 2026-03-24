export type TransportMode = 'public_transport' | 'car';

export type ImportantPlaceType = 'work' | 'study' | 'family' | 'other';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type ImportantPlace = {
  type: ImportantPlaceType;
  label: string;
  maxTravelMinutes?: number;
  priority: number;
};

export type SearchPreferences = {
  rawQuery?: string;
  rooms?: number;
  budgetMax?: number;
  transportMode: TransportMode;
  completionFilter?: 'ready' | 'building';
  completionYear?: number;
  importantPlaces: ImportantPlace[];
  priorities: {
    commuteWeight: number;
    budgetWeight: number;
    familyWeight: number;
  };
};

export type SearchQueryInput = {
  message: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  city: string;
  address: string;
  coordinates?: Coordinates | null;
  completionStatus: string;
  completionPeriod: string;
  sourceUrl: string;
  sourceName: 'novostroy.ru';
  locationTags: string[];
  tags: string[];
};

export type RankedProject = ProjectSummary & {
  score: number;
  explanation?: string;
};

export type ProjectSearchResponse = {
  reply: string;
  appliedFilters: {
    transportMode: TransportMode;
    detectedLocation?: string | null;
    completionFilter?: 'ready' | 'building';
    completionYear?: number;
  };
  projects: RankedProject[];
  totalProjects: number;
  clarifyingQuestion: string | null;
  suggestedNextActions: string[];
};
