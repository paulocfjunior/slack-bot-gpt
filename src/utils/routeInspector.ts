function joinPaths(...parts: string[]): string {
  return parts
    .map(p => p.replace(/\/+$/, '').replace(/^\/+/, '')) // trim leading/trailing slashes
    .filter(Boolean)
    .join('/')
    .replace(/^/, '/'); // ensure one leading slash
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRoutePath(layer: any): string {
  if (!layer.regexp || !layer.keys) return '';

  let path = '';
  const keys = layer.keys;

  let match = layer.regexp
    .toString()
    .replace('/^', '')
    .replace('\\/?(?=\\/|$)/i', '')
    .replace('/i', '')
    .replace('$/', '')
    .replace(/\\\//g, '/');

  if (keys.length) {
    keys.forEach((k: { name: string }) => {
      match = match.replace('(?:([^\\/]+?))', `:${k.name}`);
    });
  }

  path = match;
  return path.startsWith('/') ? path : `/${path}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function printRoutes(stack: any[], basePath = '') {
  for (const layer of stack) {
    if (layer.route) {
      const fullPath = joinPaths(basePath, layer.route.path);
      const methods = Object.keys(layer.route.methods)
        .map(method => method.toUpperCase())
        .join(', ');
      console.log(`${methods.padEnd(10)} ${fullPath}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      const subPath = getRoutePath(layer);
      const newBase = joinPaths(basePath, subPath);
      printRoutes(layer.handle.stack, newBase);
    }
  }
}
