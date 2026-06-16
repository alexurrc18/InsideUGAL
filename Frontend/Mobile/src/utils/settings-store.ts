class SettingsStore {
  private theme: "system" | "light" | "dark" = "system";
  private lang: string = "ro";
  private listeners: Set<() => void> = new Set();

  getTheme() {
    return this.theme;
  }

  setTheme(theme: "system" | "light" | "dark") {
    this.theme = theme;
    this.notify();
  }

  getLang() {
    return this.lang;
  }

  setLang(lang: string) {
    this.lang = lang;
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const settingsStore = new SettingsStore();
