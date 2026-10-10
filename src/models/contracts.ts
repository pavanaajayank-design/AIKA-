import type { Plan, Place, Trip } from '../../lib/aika/engine';
export type DataSource = 'demo' | 'user' | 'provider';
export type Forecast = {
    temperature: number;
    rain: number | null;
    period: string;
    source: DataSource;
    fetchedAt?: string;
};
export type PlanResult = {
    plan: Plan;
    places: (Place & {
        assessment: Plan;
    })[];
    forecast: Forecast | null;
    aiAvailable: boolean;
    providerMessage: string;
    source: DataSource;
};
export type AppSession = {
    id: string;
    name: string;
    email: string;
    mode: 'demo' | 'authenticated';
};
export type DemoSession = AppSession & {
    mode: 'demo';
};
export type AuthInput = {
    email: string;
    password: string;
    name?: string;
};
export type SignUpResult = {
    session: AppSession | null;
    confirmationRequired: boolean;
};
export type AuthStateListener = (session: AppSession | null, event: string) => void;
export type TripStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
export type SavedTrip = {
    id: string;
    title: string;
    input: Trip;
    result: PlanResult;
    status: TripStatus;
    createdAt: string;
    updatedAt: string;
    source: 'demo' | 'database';
};
export type HelpReply = {
    text: string;
    source: 'local-help' | 'gemini';
};
export interface AuthService {
    readonly mode: 'demo' | 'supabase';
    signIn(input: AuthInput): Promise<AppSession>;
    signUp(input: AuthInput): Promise<SignUpResult>;
    signOut(): Promise<void>;
    restoreSession(): Promise<AppSession | null>;
    onAuthStateChange(listener: AuthStateListener): () => void;
    requestPasswordReset(email: string): Promise<void>;
    updatePassword(password: string): Promise<AppSession>;
}
export interface TripsService {
    list(): Promise<SavedTrip[]>;
    create(input: Trip, result: PlanResult): Promise<SavedTrip>;
    update(id: string, change: Partial<Pick<SavedTrip, 'status' | 'title' | 'input' | 'result'>>): Promise<SavedTrip>;
    remove(id: string): Promise<void>;
    clear(): void;
}
export interface PlannerService {
    plan(input: Trip): Promise<PlanResult>;
}
export interface HelpService {
    answer(message: string): Promise<HelpReply>;
}
export interface Services {
    mode: 'demo' | 'api';
    auth: AuthService;
    trips: TripsService;
    planner: PlannerService;
    help: HelpService;
}
