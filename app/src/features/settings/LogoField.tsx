import { motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useBusinessLogo } from './logo';
import { LogoCropDialog } from './LogoCropDialog';

const MAX_BYTES = 5 * 1024 * 1024;

/** Shows the current logo or a newly picked one; every pick goes through the crop dialog first. */
export function LogoField({ picked, onPick }: { picked: Blob | null | undefined; onPick(f: Blob | null): void }) {
  const saved = useBusinessLogo();
  const { show } = useToast();
  const [pickedUrl, setPickedUrl] = useState('');
  const [toCrop, setToCrop] = useState<File | null>(null);

  useEffect(() => {
    if (!picked) return setPickedUrl('');
    const url = URL.createObjectURL(picked);
    setPickedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const src = picked === null ? '' : pickedUrl || saved;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={
          src
            ? 'h-20 max-w-[240px] shrink-0 overflow-hidden rounded-lg border border-line shadow-1'
            : 'grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-surface-2'
        }
      >
        {src ? (
          <motion.img key={src} src={src} alt="Business logo" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="block h-full w-auto object-cover" />
        ) : (
          <ImagePlus size={22} className="text-muted" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-line bg-surface px-3 text-[0.8125rem] font-semibold hover:bg-surface-2">
            {src ? 'Replace logo' : 'Upload logo'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                if (f.size > MAX_BYTES) return show('That image is over 5 MB');
                setToCrop(f);
              }}
            />
          </label>
          {src && (
            <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => onPick(null)}>
              Remove
            </Button>
          )}
        </div>
        <span className="text-[0.75rem] text-muted">PNG, JPG, SVG or WebP · up to 5 MB · you can crop before saving</span>
      </div>
      <LogoCropDialog
        file={toCrop}
        onCancel={() => setToCrop(null)}
        onDone={(f) => {
          setToCrop(null);
          onPick(f);
        }}
      />
    </div>
  );
}
