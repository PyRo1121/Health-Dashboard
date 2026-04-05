import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadSobrietyPage,
  markSobrietyStatus,
  saveSobrietyCraving,
  saveSobrietyLapse,
  type SobrietyPageState,
} from '$lib/features/sobriety/controller';

type SobrietyRequest =
  | { action: 'load'; localDay: string; state: SobrietyPageState }
  | { action: 'markStatus'; state: SobrietyPageState; status: 'sober' | 'recovery'; notice: string }
  | { action: 'saveCraving'; state: SobrietyPageState }
  | { action: 'saveLapse'; state: SobrietyPageState };

export const POST = createDbActionPostHandler<SobrietyRequest, SobrietyPageState>({
  load: (db, body) => loadSobrietyPage(db, body.localDay, body.state),
  markStatus: (db, body) => markSobrietyStatus(db, body.state, body.status, body.notice),
  saveCraving: (db, body) => saveSobrietyCraving(db, body.state),
  saveLapse: (db, body) => saveSobrietyLapse(db, body.state),
});
