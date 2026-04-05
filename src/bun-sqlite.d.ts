declare module 'bun:sqlite' {
  export class Database {
    constructor(
      filename: string,
      options?: {
        readonly?: boolean;
        create?: boolean;
        readwrite?: boolean;
      }
    );
    query<Result = unknown>(
      sql: string
    ): {
      get(params?: Record<string, unknown>): Result | undefined;
      all(params?: Record<string, unknown>): Result[];
      run(params?: Record<string, unknown>): { lastInsertRowid: number; changes: number };
    };
    exec(sql: string): void;
    transaction<TArgs extends unknown[]>(
      callback: (...args: TArgs) => void
    ): (...args: TArgs) => void;
    close(throwOnError?: boolean): void;
  }
}
