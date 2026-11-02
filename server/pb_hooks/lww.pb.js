/// <reference path="../pb_data/types.d.ts" />
// Last-write-wins guard: reject updates whose client timestamp is older than the stored one.
// Collections without updated_at (e.g. users) read as 0 on both sides and pass through.
onRecordUpdateRequest((e) => {
  if (e.record.getInt('updated_at') < e.record.original().getInt('updated_at')) {
    throw new ApiError(409, 'Stale update.', { code: 'stale' });
  }
  e.next();
});
