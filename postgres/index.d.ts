export interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
  [key: string]: unknown;
}

export interface Queryable {
  query<Row = Record<string, unknown>>(
    text: string | Record<string, unknown>,
    values?: readonly unknown[]
  ): Promise<QueryResult<Row>>;
}

export interface PoolLike extends Queryable {
  connect(): Promise<Queryable & { release(): void }>;
  end(): Promise<void>;
}

export interface PostgresOptions {
  connectionString?: string;
  connectionStringEnv?: string;
  pool?: PoolLike;
  [poolOption: string]: unknown;
}

export interface ReadOptions {
  columns?: "*" | string[];
  limit?: number;
  client?: Queryable;
}

export interface WriteOptions {
  returning?: false | "*" | string[];
  client?: Queryable;
}

export interface UpsertOptions extends WriteOptions {
  updateColumns?: string[];
}

export interface Table<Row = Record<string, unknown>> {
  find(where?: Partial<Row>, options?: ReadOptions): Promise<Row[]>;
  findOne(where?: Partial<Row>, options?: ReadOptions): Promise<Row | null>;
  insert(record: Partial<Row>, options?: WriteOptions): Promise<Row | null | number>;
  insertMany(records: Partial<Row>[], options?: WriteOptions): Promise<Row[] | number>;
  update(changes: Partial<Row>, where: Partial<Row>, options?: WriteOptions): Promise<Row[] | number>;
  upsert(
    records: Partial<Row> | Partial<Row>[],
    conflictColumns: string[],
    options?: UpsertOptions
  ): Promise<Row | Row[] | null | number>;
  delete(where: Partial<Row>, options?: WriteOptions): Promise<Row[] | number>;
  remove(where: Partial<Row>, options?: WriteOptions): Promise<Row[] | number>;
}

export interface Transaction extends Queryable {
  client: Queryable;
  execute(text: string | Record<string, unknown>, values?: readonly unknown[]): Promise<number>;
  queryOne<Row = Record<string, unknown>>(
    text: string | Record<string, unknown>,
    values?: readonly unknown[]
  ): Promise<Row | null>;
  queryRows<Row = Record<string, unknown>>(
    text: string | Record<string, unknown>,
    values?: readonly unknown[]
  ): Promise<Row[]>;
  table<Row = Record<string, unknown>>(name: string): Table<Row>;
}

export interface PostgresClient extends Queryable {
  close(): Promise<void>;
  execute(text: string | Record<string, unknown>, values?: readonly unknown[]): Promise<number>;
  getPool(): PoolLike;
  queryOne<Row = Record<string, unknown>>(
    text: string | Record<string, unknown>,
    values?: readonly unknown[]
  ): Promise<Row | null>;
  queryRows<Row = Record<string, unknown>>(
    text: string | Record<string, unknown>,
    values?: readonly unknown[]
  ): Promise<Row[]>;
  table<Row = Record<string, unknown>>(name: string): Table<Row>;
  tx<Result>(callback: (transaction: Transaction) => Promise<Result>): Promise<Result>;
}

declare const postgres: PostgresClient & {
  create(options?: PostgresOptions): PostgresClient;
  quoteIdentifier(identifier: string): string;
};

export = postgres;
