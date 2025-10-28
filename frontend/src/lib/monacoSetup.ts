import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/basic-languages/pgsql/pgsql.contribution';

let configured = false;

export const ensureMonacoSetup = () => {
  if (configured || typeof window === 'undefined') return;
  configured = true;

  loader.config({ monaco });

  const globalObject = window as typeof window & {
    MonacoEnvironment?: {
      getWorker: (moduleId: string, label: string) => Worker;
    };
  };

  globalObject.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      switch (label) {
        case 'json':
          return new jsonWorker();
        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker();
        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker();
        case 'typescript':
        case 'javascript':
          return new tsWorker();
        default:
          return new editorWorker();
      }
    },
  };
};
