// Platform wiring is shared by the real app and first-run integration fixtures.
export function startupSupported(platform, fixture = false) {
  return !fixture && ['darwin', 'win32'].includes(platform);
}

// bootstrap is the executor runtime of both systems. components exists only on Windows: the tools and the
// private Python that the package unpacks before control.py of the executor can run at all.
export function startupPlatformOptions({ platform, setup, bootstrap, components = null, ensureRuntime, control, inspectGit, installGit }) {
  if (!startupSupported(platform)) throw new Error('Unsupported startup platform');
  const windows = platform === 'win32';
  if (windows && !components) throw new Error('Windows startup requires the components of the package');
  return {
    platform,
    probeNode: () => setup.node(),
    prepareComponents: windows ? () => components.ensure() : undefined,
    probeGit: windows ? async () => {
      if (!(await components.inspect()).toolsReady) return false;
      setup.setRuntimeEnvironment(await components.workflowEnvironment());
      return true;
    } : inspectGit,
    installGit: windows ? async () => { throw new Error('Windows components are prepared automatically'); } : installGit,
    inspectRuntime: async () => {
      const current = await bootstrap.inspect();
      if (current.installed) return control('status');
      // Activation fails when a revoked key or a deleted tunnel keeps tunnel-client from becoming ready,
      // yet the local MCP is running: the wizard must still reach the tunnel step.
      if (current.attempted) return control('status').catch(() => null);
      return null;
    },
    prepareRuntime: async () => {
      // Both systems install and start the services here, after Git. macOS: the system Python they need
      // comes with Git. Windows: the components step has prepared the Python that runs control.py.
      await ensureRuntime();
      let status = await control('status');
      if (!status.mcp.ready || (status.tunnel.configured && !status.tunnel.ready))
        status = await control('start', { mcpOnly: !status.tunnel.configured });
      return status;
    },
    configureTunnel: async credentials => {
      try { await ensureRuntime(); }
      catch (error) {
        // A failing tunnel must not block entering a new one while the MCP itself is ready.
        const status = await control('status').catch(() => null);
        if (!status?.mcp?.ready) throw error;
      }
      return bootstrap.configureTunnel(credentials);
    },
  };
}
