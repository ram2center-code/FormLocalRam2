import { create } from 'zustand';
import apiClient from '../api/axios';

export type SystemFontType = 'Sarabun' | 'IBMPlexSans';

export interface FontOption {
  key: SystemFontType;
  name: string;
  englishName: string;
  description: string;
  badge: string;
  tagColor: string;
  fontFamily: string;
  sampleThai: string;
}

export const AVAILABLE_FONTS: Record<SystemFontType, FontOption> = {
  Sarabun: {
    key: 'Sarabun',
    name: 'สารบรรณ (Sarabun)',
    englishName: 'TH Sarabun New / Sarabun',
    description: 'ฟอนต์มาตรฐานสำหรับระบบสารสนเทศราชการและโรงพยาบาล หัวมีขมวด อ่านง่าย ชัดเจน ถูกต้องตามระเบียบงานสารบรรณ',
    badge: 'แนะนำสำหรับโรงพยาบาล / สธ.',
    tagColor: 'blue',
    fontFamily: "'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sampleThai: 'แบบฟอร์มคัดกรองความเสี่ยงและบันทึกข้อมูลผู้รับบริการทางการแพทย์ 2569',
  },
  IBMPlexSans: {
    key: 'IBMPlexSans',
    name: 'ไอบีเอ็ม เพล็กซ์ (IBM Plex Sans)',
    englishName: 'IBM Plex Sans / IBM Plex Sans Thai',
    description: 'ฟอนต์ร่วมสมัย สไตล์โมเดิร์น ไร้หัว (Clean & Modern) สบายตา สไตล์เทคโนโลยีและแอปพลิเคชันระดับสากล',
    badge: 'สไตล์โมเดิร์น / สากล',
    tagColor: 'purple',
    fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Thai', 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sampleThai: 'แบบฟอร์มคัดกรองความเสี่ยงและบันทึกข้อมูลผู้รับบริการทางการแพทย์ 2569',
  },
};

const LOCAL_STORAGE_KEY = 'formlocal_system_font';

const applyFontToDom = (fontKey: SystemFontType) => {
  const fontConfig = AVAILABLE_FONTS[fontKey] || AVAILABLE_FONTS.Sarabun;
  document.documentElement.style.setProperty('--system-font', fontConfig.fontFamily);
  document.body.style.fontFamily = fontConfig.fontFamily;
};

// Initial font from localStorage
const getSavedFont = (): SystemFontType => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved === 'IBMPlexSans' || saved === 'Sarabun') {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage access errors
  }
  return 'Sarabun';
};

interface SettingsState {
  systemFont: SystemFontType;
  updatedAt: string | null;
  updatedBy: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  setSystemFont: (font: SystemFontType) => Promise<boolean>;
  getFontFamily: () => string;
}

const initialFont = getSavedFont();
applyFontToDom(initialFont);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  systemFont: initialFont,
  updatedAt: null,
  updatedBy: null,
  isLoading: false,
  isSaving: false,
  error: null,

  getFontFamily: () => {
    const current = get().systemFont;
    return AVAILABLE_FONTS[current]?.fontFamily || AVAILABLE_FONTS.Sarabun.fontFamily;
  },

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/settings');
      if (response.data?.success && response.data?.data?.systemFont) {
        const font: SystemFontType =
          response.data.data.systemFont === 'IBMPlexSans' ? 'IBMPlexSans' : 'Sarabun';
        
        localStorage.setItem(LOCAL_STORAGE_KEY, font);
        applyFontToDom(font);

        set({
          systemFont: font,
          updatedAt: response.data.data.updatedAt || null,
          updatedBy: response.data.data.updatedBy || null,
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.warn('Could not sync system settings from server, using local preference:', err);
      set({ isLoading: false });
    }
  },

  setSystemFont: async (font: SystemFontType) => {
    set({ isSaving: true, error: null });
    try {
      const response = await apiClient.patch('/settings', { systemFont: font });
      if (response.data?.success) {
        localStorage.setItem(LOCAL_STORAGE_KEY, font);
        applyFontToDom(font);

        set({
          systemFont: font,
          updatedAt: response.data.data?.updatedAt || new Date().toISOString(),
          updatedBy: response.data.data?.updatedBy || 'ADMIN',
          isSaving: false,
        });
        return true;
      }
      set({ isSaving: false });
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'ไม่สามารถบันทึกการตั้งค่าฟอนต์ได้';
      set({ isSaving: false, error: msg });
      throw new Error(msg);
    }
  },
}));
