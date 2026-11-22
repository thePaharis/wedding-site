import "server-only";
import {Pool} from "pg";
import {postgresOptions} from "./postgres-options.mjs";
const globalDb=globalThis as unknown as {weddingPool?:Pool};
export function db() {
 if(!globalDb.weddingPool)globalDb.weddingPool=new Pool(postgresOptions());
 return globalDb.weddingPool;
}
