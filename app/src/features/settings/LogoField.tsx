import { ImagePlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { pb } from '../../auth/pb';
import type { Settings } from '../../data/schema';
import { Button } from '../../ui/Button';

/** Shows the current logo (protected file → short-lived token) or a newly picked one; reports picks and removals. */
export function LogoField({ settings, picked, onPick }: { settings: Settings; picked: Blob | null | undefined; onPick(f: Blob | null): void }) {
  const [serverUrl, setServerUrl] = useState('');
  const [pickedUrl, setPickedUrl] = useState('');

  useEffect(() => {
    if (!settings.logo || !navigator.onLine) return;
    let cancelled = false;
    pb.files
      .getToken()
      .then((token) => !cancelled && setServerUrl(pb.files.getURL(settings as never, settings.logo, { token })))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settings]);

  useEffect(() => {
    if (!picked) return setPickedUrl('');
    const url = URL.createObjectURL(picked);
    setPickedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const src = picked === null ? '' : pickedUrl || serverUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-surface-2">
        {src ? <img src={src} alt="Business logo" className="h-full w-full object-contain p-2" /> : <ImagePlus size={22} className="text-muted" />}
      </div>
      <div className="flex flex-col gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-line bg-surface px-3 text-[0.8125rem] font-semibold hover:bg-surface-2">
          {src ? 'Replace logo' : 'Upload logo'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = '';
            }}
          />
        </label>
        {src && (
          <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => onPick(null)}>
            Remove
          </Button>
        )}
        <span className="text-[0.75rem] text-muted">PNG, JPG, SVG or WebP · up to 5 MB</span>
      </div>
    </div>
  );
}
