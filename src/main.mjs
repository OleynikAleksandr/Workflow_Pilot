import * as electron from 'electron';
import { startDesktop } from './frontend/desktop/bootstrap.mjs';
await startDesktop(electron);
