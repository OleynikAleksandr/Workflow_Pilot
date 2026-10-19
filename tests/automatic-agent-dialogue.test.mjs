import test from 'node:test';
import {automaticDialogue} from './fixtures/automatic-agent-dialogue.mjs';
for(const experience of ['chat','work'])test('automatic dialogue through startup and Start: '+experience+' orchestrator, Chat executors, question/decision/commit and third assignment',
  {timeout:300000},async t=>{await automaticDialogue(t,experience);});
