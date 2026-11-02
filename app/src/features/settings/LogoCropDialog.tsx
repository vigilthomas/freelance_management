import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { cropImage } from './logo';

type Shape = 'square' | 'wide' | 'original';
const SHAPES: { value: Shape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'wide', label: 'Wide 2:1' },
  { value: 'original', label: 'Original' },
];

/** Lets the user frame a freshly picked logo (shape, zoom, pan, rotate) before it is kept. */
export function LogoCropDialog({ file, onCancel, onDone }: { file: File | null; onCancel(): void; onDone(f: Blob): void }) {
  const [url, setUrl] = useState('');
  const [natural, setNatural] = useState(1);
  const [shape, setShape] = useState<Shape>('square');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    setShape('square');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setError('');
    const img = new Image();
    img.onload = () => setNatural(img.naturalWidth / img.naturalHeight || 1);
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const aspect = shape === 'square' ? 1 : shape === 'wide' ? 2 : rotation % 180 ? 1 / natural : natural;

  async function apply() {
    if (!area) return;
    setBusy(true);
    try {
      onDone(await cropImage(url, area, rotation));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!file}
      onClose={onCancel}
      title="Crop your logo"
      wide
      actions={
        <>
          <Button variant="ghost" onClick={() => file && onDone(file)}>
            Use as is
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => void apply()} loading={busy} disabled={!area}>
            Apply crop
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>Drag to position, zoom out to add space around it. Square works best in the sidebar.</p>
        <div className="logo-crop-stage relative h-72 overflow-hidden rounded-md border border-line sm:h-80">
          {url && (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              minZoom={0.4}
              maxZoom={4}
              zoomSpeed={0.15}
              restrictPosition={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, px) => setArea(px)}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<Shape> id="logo-shape" value={shape} onChange={setShape} options={SHAPES} />
          <div className="flex items-center gap-2">
            <ZoomOut size={16} aria-hidden />
            <input
              type="range"
              min={0.4}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="w-28 accent-[var(--accent)]"
            />
            <ZoomIn size={16} aria-hidden />
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Rotate 90°"
              className="ml-1 rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>
        {error && <p className="text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}
