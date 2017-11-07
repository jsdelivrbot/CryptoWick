export class Settings {
  constructor(
    public geminiApiKey: string,
    public geminiApiSecret: string,

    public twilioAccountSid: string,
    public twilioAuthToken: string,
    public fromPhoneNumber: string,
    public toPhoneNumber: string) {}
}

export const SETTINGS_STORAGE_KEY = "settings";

export function saveSettings(settings: Settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}

export function loadSettings(): Settings | null {
  const settingsJson = localStorage.getItem("settings");

  return settingsJson ? JSON.parse(settingsJson) : null;
}