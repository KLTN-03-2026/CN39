import { Handle, Position } from '@xyflow/react';

export default function RootNode({ data }: any) {
  return (
    <div className="flex items-center justify-center bg-transparent border-none w-56 text-center">
      <Handle type="target" position={Position.Top} id="top" className="opacity-0" />
      <span className="font-[700] text-3xl whitespace-nowrap text-black">{data.title}</span>
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0" />
    </div>
  );
}
