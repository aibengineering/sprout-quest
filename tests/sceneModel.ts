// Reads a crafting scene's model (assets/crafting3d/<id>.glb) without decoding its meshes: what the contract needs.
import { readFileSync, statSync } from 'node:fs';

interface Node { name?: string; mesh?: number; children?: number[] }

export function sceneModel(path: string) {
  const b = readFileSync(`public/${path}`);
  if (b.toString('ascii', 0, 4) !== 'glTF') throw Error(`${path}: not a glb`);
  const gltf = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  const nodes: Node[] = gltf.nodes;
  const meshes = (i: number): number => (nodes[i].mesh === undefined ? 0 : 1) + (nodes[i].children ?? []).reduce((n, c) => n + meshes(c), 0);
  const top: number[] = gltf.scenes[gltf.scene ?? 0].nodes;
  return {
    bytes: statSync(`public/${path}`).size,
    /** The top-level nodes (the layers), with how many meshes each holds. */
    layers: Object.fromEntries(top.map((i) => [nodes[i].name ?? '', meshes(i)])),
    compressed: (gltf.extensionsRequired ?? []).includes('EXT_meshopt_compression') as boolean,
    /** Does every mesh carry its toon settings (rim, glow, outline width) in COLOR_1? */
    toon: gltf.meshes.every((m: { primitives: { attributes: Record<string, number> }[] }) => m.primitives.every((p) => p.attributes.COLOR_1 !== undefined)) as boolean,
    textures: (gltf.textures ?? []).length as number,
  };
}
