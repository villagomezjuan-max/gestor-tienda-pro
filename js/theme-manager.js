/**
 * @file Gestor de temas para la aplicación.
 * @description Gestiona los temas claro y oscuro, permitiendo al usuario cambiar entre ellos.
 * @version 3.1.0
 */

class ThemeManager {
  constructor() {
    this.themeStorageKey = 'gestor_tienda_theme';
    this.darkThemeName = 'dark';
    this.lightThemeName = 'light';
    this.themeToggleButton = null;

    // Aplica el tema al iniciar
    this.applyTheme(this.getEffectiveTheme());

    document.addEventListener('DOMContentLoaded', () => {
      this.themeToggleButton = document.getElementById('themeToggle');
      if (this.themeToggleButton) {
        this.themeToggleButton.addEventListener('click', () => this.toggleTheme());
        this.updateIcon(this.getCurrentTheme());
      }
    });

    // Re-aplica el tema si cambia el negocio/tenant
    window.addEventListener('businessChanged', () => {
      this.applyTheme(this.getCurrentTheme());
    });
  }

  getStoredTheme() {
    try {
      return localStorage.getItem(this.themeStorageKey);
    } catch (error) {
      console.warn('ThemeManager: No se pudo leer el tema de localStorage', error);
      return null;
    }
  }

  setStoredTheme(theme) {
    try {
      localStorage.setItem(this.themeStorageKey, theme);
    } catch (error) {
      console.warn('ThemeManager: No se pudo guardar el tema en localStorage', error);
    }
  }

  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.darkThemeName;
    }
    return this.lightThemeName;
  }

  getEffectiveTheme() {
    const storedTheme = this.getStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }
    return this.getSystemPreference();
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || this.lightThemeName;
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateIcon(theme);
  }

  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === this.darkThemeName ? this.lightThemeName : this.darkThemeName;
    this.setStoredTheme(newTheme);
    this.applyTheme(newTheme);
  }

  setTheme(theme) {
    const newTheme = theme === this.darkThemeName ? this.darkThemeName : this.lightThemeName;
    this.setStoredTheme(newTheme);
    this.applyTheme(newTheme);
  }

  updateIcon(theme) {
    if (!this.themeToggleButton) {
      this.themeToggleButton = document.getElementById('themeToggle');
    }
    if (this.themeToggleButton) {
      const icon = this.themeToggleButton.querySelector('i');
      if (icon) {
        const isDark = theme === this.darkThemeName;
        icon.classList.toggle('fa-sun', isDark);
        icon.classList.toggle('fa-moon', !isDark);
      }
    }
  }
}

window.themeManager = new ThemeManager();
window.ThemeManager = ThemeManager;
