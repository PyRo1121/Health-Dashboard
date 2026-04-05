export interface LocalDayPageState {
  loading: boolean;
  localDay: string;
  saveNotice: string;
}

export function createLocalDayPageState<T extends object>(extra: T): LocalDayPageState & T {
  return {
    loading: true,
    localDay: '',
    saveNotice: '',
    ...extra,
  };
}

export async function loadLocalDayPageState<
  State extends { loading: boolean; localDay: string },
  Data,
>(
  state: State,
  localDay: string,
  loadData: (localDay: string) => Promise<Data>,
  applyData: (state: State, localDay: string, data: Data) => State
): Promise<State> {
  return applyData(state, localDay, await loadData(localDay));
}

export async function reloadLocalDayPageState<State extends { localDay: string }, Data>(
  state: State,
  loadData: (localDay: string) => Promise<Data>,
  applyData: (state: State, data: Data) => State,
  overrides: Partial<State> = {}
): Promise<State> {
  return {
    ...applyData(state, await loadData(state.localDay)),
    ...overrides,
  };
}
