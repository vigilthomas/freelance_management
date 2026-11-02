import { motion } from 'framer-motion';
import { itemVariants } from '../../ui/motion';

// Full JSON export/import lands in Phase 6; server backups already run nightly.
export function BackupSection() {
  return (
    <motion.section variants={itemVariants} className="grid gap-6 rounded-lg border border-dashed border-line p-6 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-[1.125rem] font-bold">Backups</h2>
        <p className="mt-1 text-[0.8125rem] text-muted">Your server keeps a nightly backup (last 14).</p>
      </div>
      <p className="text-[0.875rem] text-muted">Export and import of all your data from here is coming in Phase 6.</p>
    </motion.section>
  );
}
