import { AppConfig, User } from './types';

const USER_KEY = 'schema_user';
const CONFIG_KEY = 'schema_config';

/** Standardkonfiguration – justera cycleStartDate till ett känt referensdatum */
export const DEFAULT_CONFIG: AppConfig = {
  // 2026-01-05 är en måndag som fungerar som startpunkt.
  // Ändra detta i Inställningar om det inte stämmer.
  cycleStartDate: '2026-01-05',
  users: [],
};

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function getConfig(): AppConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const saved = JSON.parse(raw) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function setConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function addUser(user: User): void {
  const config = getConfig();
  const exists = config.users.some(
    (u) => u.name.toLowerCase() === user.name.toLowerCase()
  );
  if (!exists) {
    config.users = [...config.users, user];
    setConfig(config);
  }
}
