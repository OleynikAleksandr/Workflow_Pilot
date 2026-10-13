// Temporary migration scope: main/root modules remain until T004–T008; bridges disappear in T011.
// Only these existing Kit modules may take part in a cycle. T007 removes/reviews this exception.
const kitCycle = '^packages/workflow-kit/src/lib/(transaction|task-integration|validate|task-assignment|actions|plan-review|recovery)\\.mjs$';
module.exports = {
  forbidden: [
    { name: 'execution-does-not-import-product', severity: 'error',
      from: { path: '^src/execution/' },
      to: { path: '^(src/(?!execution/|contracts/)|packages/workflow-kit/)' } },
    { name: 'system-execution-without-electron', severity: 'error',
      from: { path: '^src/execution/(commands|files|runtime|platform)/' }, to: { path: '(^|/)electron($|/)' } },
    { name: 'contracts-have-no-product-implementation', severity: 'error',
      from: { path: '^src/contracts/' }, to: { path: '^src/(?!contracts/)' } },
    { name: 'control-without-electron-or-frontend', severity: 'error',
      from: { path: '^src/control/' }, to: { path: '(^|/)electron($|/)|^src/frontend/' } },
    { name: 'control-uses-execution-facade', severity: 'error',
      from: { path: '^src/control/' }, to: { path: '^src/execution/(?!facade\\.mjs$)' } },
    { name: 'frontend-uses-contracts-not-execution', severity: 'error',
      from: { path: '^src/frontend/', pathNot: '^src/frontend/desktop/bootstrap\\.mjs$' }, to: { path: '^src/execution/' } },
    { name: 'no-new-cycles', severity: 'error', from: {}, to: { circular: true, via: { pathNot: kitCycle } } },
    { name: 'no-unresolved-imports', severity: 'error', from: {}, to: { couldNotResolve: true } },
  ],
  options: {
    doNotFollow: { path: '^(node_modules|resources/workflow-kit|\\.harness/kit)(/|$)' },
    exclude: { path: '^(resources/workflow-kit/|resources/chatgpt-page-observer-preload\\.cjs$|\\.harness/kit/)' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'node', 'default'] },
  },
};
