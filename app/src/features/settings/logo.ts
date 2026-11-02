import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { pb } from '../../auth/pb';
import { useRow } from '../../data/hooks';
import { db } from '../../data/db';
import type { StoredFile } from '../../data/repo';
import { SETTINGS_ID, type Settings } from '../../data/schema';

const CACHE_KEY = 'logo-cache';
export const LOGO_MAX_SIDE = 1024;

export interface Size {
  width: number;
  height: number;
}

/** Caps the longest side at `max`, keeping the ratio. */
export function outputSize(crop: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(crop.width, crop.height));
  return { width: Math.round(crop.width * scale), height: Math.round(crop.height * scale) };
}

/** Size of the box that holds a w×h image rotated by `deg`. */
export function rotatedBounds(w: number, h: number, deg: number): Size {
  const r = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  return { width: Math.round(w * cos + h * sin), height: Math.round(w * sin + h * cos) };
}

/** Draws the cropped (and rotated) part of `src` to a PNG, so transparent padding survives. */
export async function cropImage(src: string, area: Size & { x: number; y: number }, rotation: number): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read that image'));
    el.src = src;
  });
  const box = rotatedBounds(img.naturalWidth, img.naturalHeight, rotation);
  const stage = document.createElement('canvas');
  stage.width = box.width;
  stage.height = box.height;
  const sctx = stage.getContext('2d')!;
  sctx.translate(box.width / 2, box.height / 2);
  sctx.rotate((rotation * Math.PI) / 180);
  sctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const out = outputSize(area, LOGO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(stage, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not crop that image');
  return new File([blob], 'logo.png', { type: 'image/png' });
}

export type LogoSource =
  | { kind: 'none' }
  | { kind: 'pending'; file: StoredFile }
  | { kind: 'cached'; file: StoredFile }
  | { kind: 'fetch'; name: string };

/** pending: the queued upload for settings.logo (undefined = nothing queued, null = queued removal). */
export function pickLogoSource(serverName: string, pending: StoredFile | null | undefined, cache: StoredFile | undefined): LogoSource {
  if (pending) return { kind: 'pending', file: pending };
  if (pending === null || !serverName) return { kind: 'none' };
  if (cache?.name === serverName) return { kind: 'cached', file: cache };
  return { kind: 'fetch', name: serverName };
}

/**
 * Object URL for the business logo that also works offline: an unsynced pick shows straight away,
 * and the server file is downloaded once (protected → short-lived token) and kept in the local db.
 */
export function useBusinessLogo(): string {
  const settings = useRow<Settings>('settings', SETTINGS_ID);
  const pending = useLiveQuery(async () => {
    const queued = await db.outbox.where('[collection+id]').equals(['settings', SETTINGS_ID]).toArray();
    const withLogo = queued.filter((e) => e.files && 'logo' in e.files).pop();
    return withLogo ? { file: withLogo.files!.logo } : { file: undefined };
  }, []);
  const cache = useLiveQuery(async () => ((await db.meta.get(CACHE_KEY))?.value as StoredFile | undefined) ?? null, []);

  const source = pending === undefined || cache === undefined ? null : pickLogoSource(settings?.logo ?? '', pending.file, cache ?? undefined);

  useEffect(() => {
    if (source?.kind !== 'fetch' || !settings || !navigator.onLine) return;
    let cancelled = false;
    (async () => {
      const token = await pb.files.getToken();
      const res = await fetch(pb.files.getURL(settings as never, source.name, { token }));
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      const file: StoredFile = { name: source.name, type: blob.type, data: await blob.arrayBuffer() };
      await db.meta.put({ key: CACHE_KEY, value: file });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [source?.kind, source?.kind === 'fetch' ? source.name : '', settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const file = source && (source.kind === 'pending' || source.kind === 'cached') ? source.file : null;
  const url = useMemo(() => (file ? URL.createObjectURL(new Blob([file.data], { type: file.type })) : ''), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}
