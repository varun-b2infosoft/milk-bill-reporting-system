declare module "oracledb" {
  export type Pool = any;
  export type Connection = any;
  export type ExecuteOptions = Record<string, unknown>;
  export type Result<T> = {
    rows?: T[];
    outBinds?: unknown;
  };

  const oracledb: any;
  export default oracledb;
}
