import { AsyncLocalStorage } from "async_hooks";

export interface TraceContext {
  traceId: string;
}

export const traceStore = new AsyncLocalStorage<TraceContext>();
