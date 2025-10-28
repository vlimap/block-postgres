/// <reference lib="webworker" />

import { PgParser, unwrapParseResult } from '@supabase/pg-parser';
import { sqlToDbModelWithDbml } from '../lib/dbmlToModel';

type WorkerRequest =
  | { kind: 'validate'; sql: string }
  | { kind: 'build'; sql: string };

type WorkerResponse =
  | { kind: 'validated' }
  | { kind: 'model'; payload: any }
  | { kind: 'error'; message: string };

const parser = new PgParser({ version: 17 });

const handleMessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    const sql = message.sql ?? '';
    if (!sql.trim()) {
      postMessage({ kind: 'model', payload: null } satisfies WorkerResponse);
      return;
    }

    if (message.kind === 'validate') {
      await unwrapParseResult(parser.parse(sql));
      postMessage({ kind: 'validated' } satisfies WorkerResponse);
      return;
    }

    if (message.kind === 'build') {
      await unwrapParseResult(parser.parse(sql));
      const model = sqlToDbModelWithDbml(sql);
      postMessage({ kind: 'model', payload: model } satisfies WorkerResponse);
      return;
    }
  } catch (error: any) {
    const messageText = error?.message ?? String(error);
    postMessage({ kind: 'error', message: messageText } satisfies WorkerResponse);
  }
};

self.addEventListener('message', handleMessage);

export default null as any;
