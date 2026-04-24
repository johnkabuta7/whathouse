import { useEffect, useState, useCallback } from 'react';

export interface ListingDraft {
  group_id: string;
  group_name?: string;
  title: string;
  description: string;
  zwandako_url: string;
  image_previews: string[]; // data URLs (base64) so they survive reload
  updated_at: number;
}

const KEY = 'listing_drafts_v1';

function readAll(): Record<string, ListingDraft> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ListingDraft>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('drafts-updated'));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function useDraft(groupId: string | undefined) {
  const [draft, setDraftState] = useState<ListingDraft | null>(() => {
    if (!groupId) return null;
    return readAll()[groupId] || null;
  });

  useEffect(() => {
    if (!groupId) { setDraftState(null); return; }
    setDraftState(readAll()[groupId] || null);
  }, [groupId]);

  const setDraft = useCallback((d: Partial<ListingDraft> | null) => {
    if (!groupId) return;
    const all = readAll();
    if (d === null) {
      delete all[groupId];
      setDraftState(null);
    } else {
      const merged: ListingDraft = {
        group_id: groupId,
        title: '',
        description: '',
        zwandako_url: '',
        image_previews: [],
        ...all[groupId],
        ...d,
        updated_at: Date.now(),
      };
      // Skip empty drafts
      if (!merged.title && !merged.description && !merged.zwandako_url && merged.image_previews.length === 0) {
        delete all[groupId];
        setDraftState(null);
      } else {
        all[groupId] = merged;
        setDraftState(merged);
      }
    }
    writeAll(all);
  }, [groupId]);

  return { draft, setDraft };
}

export function useAllDrafts() {
  const [drafts, setDrafts] = useState<ListingDraft[]>(() => Object.values(readAll()));
  useEffect(() => {
    const refresh = () => setDrafts(Object.values(readAll()).sort((a, b) => b.updated_at - a.updated_at));
    refresh();
    window.addEventListener('drafts-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('drafts-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return drafts;
}

export function deleteDraft(groupId: string) {
  const all = readAll();
  delete all[groupId];
  writeAll(all);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function dataUrlToFile(dataUrl: string, filename = `image-${Date.now()}.jpg`): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
