import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fromMinor } from '../../lib/money';
import type { MasterKind, MasterRecord } from '../../data/schema';
import { Badge } from '../../ui/misc';
import { cn } from '../../ui/cn';
import { reorder } from './actions';

const pct = (bp: number) => `${fromMinor(bp, 2).replace(/\.?0+$/, '')}%`;

function meta(kind: MasterKind, r: MasterRecord): string {
  switch (kind) {
    case 'project_statuses':
    case 'task_statuses':
      return r.meaning === 'in_progress' ? 'In progress' : r.meaning === 'closed' ? 'Closed' : 'Open';
    case 'priorities':
      return `Level ${r.level ?? 0}`;
    case 'currencies':
      return `${r.symbol ?? ''} ${r.code ?? ''} · ${r.decimals ?? 2} decimals`;
    case 'tax_rates':
      return r.components?.length ? r.components.map((c) => `${c.name} ${pct(c.rate)}`).join(' + ') : 'No tax';
    case 'payment_terms':
      return r.days === 0 ? 'Due immediately' : `${r.days} days`;
    case 'units':
      return r.label ?? '';
    default:
      return '';
  }
}

function Row({ kind, r, onEdit }: { kind: MasterKind; r: MasterRecord; onEdit(): void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-md border border-line bg-surface pr-2 transition-shadow duration-fast',
        isDragging ? 'relative z-10 shadow-3' : 'shadow-1 hover:shadow-2',
        !r.active && 'opacity-60',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${r.name}`}
        className="cursor-grab touch-none self-stretch rounded-l-md px-2.5 text-muted hover:text-ink active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <button onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left">
        <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-[var(--surface-2)]" style={{ background: r.color }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold">{r.name}</span>
          {meta(kind, r) && <span className="block truncate text-[0.8125rem] text-muted">{meta(kind, r)}</span>}
        </span>
        {r.is_default && <Badge color="var(--accent)">Default</Badge>}
        {!r.active && <Badge>Inactive</Badge>}
        <ChevronRight size={18} className="text-muted transition-transform duration-fast group-hover:translate-x-0.5" />
      </button>
    </li>
  );
}

export function MasterList({ kind, rows, onEdit }: { kind: MasterKind; rows: MasterRecord[]; onEdit(r: MasterRecord): void }) {
  const [order, setOrder] = useState(rows.map((r) => r.id));
  useEffect(() => setOrder(rows.map((r) => r.id)), [rows]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    void reorder(kind, next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <motion.ul
          key={kind}
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.035 } } }}
          className="flex flex-col gap-2"
        >
          {order.map((id) => {
            const r = byId.get(id);
            return r ? (
              <motion.div key={id} variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}>
                <Row kind={kind} r={r} onEdit={() => onEdit(r)} />
              </motion.div>
            ) : null;
          })}
        </motion.ul>
      </SortableContext>
    </DndContext>
  );
}
