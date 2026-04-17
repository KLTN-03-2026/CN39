import { Handle, Position } from '@xyflow/react';

export default function PhaseNode({ data }: any) {
  const { title, isLocked } = data;
  let containerClass = 'flex items-center justify-center p-2 rounded-md text-center w-56 h-12 transition-all relative border-4 border-black font-[700] text-[15px] text-black whitespace-normal break-words ' + 
                       (isLocked ? 'bg-gray-100 opacity-60 border-dashed' : 'bg-[#ffff00] cursor-pointer hover:-translate-y-0.5');

  return (
    <div className={containerClass}>
      <Handle type="target" position={Position.Top} id="top" className="opacity-0" />
      {data.label || title}
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0" />
      <Handle type="source" position={Position.Left} id="left" className="opacity-0" />
      <Handle type="source" position={Position.Right} id="right" className="opacity-0" />
    </div>
  );
}
