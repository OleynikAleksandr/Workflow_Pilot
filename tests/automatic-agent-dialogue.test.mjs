import test from 'node:test';
import {automaticDialogue} from './fixtures/automatic-agent-dialogue.mjs';
for(const experience of ['chat','work'])test('automatic dialogue through startup and Start: '+experience+' orchestrator, Chat executors, question/decision/commit and third assignment',
  {timeout:300000},async t=>{await automaticDialogue(t,experience);});
test('orchestrator-owned dialogue: context request, multihop block, revision/result/acceptance, explicit integration and DOCS without user bubbles',
  {timeout:300000},async t=>{await automaticDialogue(t,'work',{owned:true,conversation:true});});
test('five simultaneous executors receive O-selected tasks and return checked results through real Start/MCP/SDK/Kit',
  {timeout:300000},async t=>{await automaticDialogue(t,'chat',{owned:true,workers:5});});
