export interface EmojiRow {
  id: string;
  name: string;
  emoji: string;
  is_pro: boolean;
  unlock_level: number;
  created_at: string;
}

export interface FrameRow {
  id: string;
  code: string;
  name: string;
  image_url: string | null;
  is_pro: boolean;
  unlock_level: number;
  created_at: string;
}

export interface TitleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_pro: boolean;
  unlock_level: number;
  created_at: string;
}

export interface OwnedItem {
  owned: boolean;
  unlocked_by_level: boolean;
  requires_pro: boolean;
  user_is_pro: boolean;
  can_equip: boolean;
}

export interface CosmeticsCatalogItem extends Record<string, unknown> {
  equipped?: boolean;
}
