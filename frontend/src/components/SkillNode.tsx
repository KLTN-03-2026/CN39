import { Handle, Position } from '@xyflow/react';

export default function SkillNode({ data }: any) {
  const { isCompleted, isRequired, isLocked, title } = data;

  // Roadmap.sh style:
  // - Bắt buộc (Required): Màu vàng chanh, viền đen dày, chữ đen.
  // - Khoá (Locked)/Chưa học: Giữ nguyên style nhưng chưa có checkmark. Khi khoá có thể làm nhạt đi.
  // - Hoàn thành (Completed): Có hình tròn nhỏ màu xám/tím góc trái/phải với dấu tick.
  
  let containerClass = "flex items-center justify-center p-2 rounded-md text-center w-44 h-12 transition-all relative border-2 border-black bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] ";
  let textClass = "font-bold text-[13px] text-black whitespace-normal break-words ";

  if (isLocked) {
     containerClass = "flex items-center justify-center p-2 rounded-md text-center w-44 h-12 transition-all relative border-2 border-gray-400 bg-gray-100 ";
     textClass = "font-bold text-[13px] text-gray-400 whitespace-normal break-words";
  } else if (isRequired) {
     containerClass = "flex items-center justify-center p-2 rounded-md text-center w-44 h-12 transition-all relative border-2 border-black bg-yellow-300 shadow-[3px_3px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-yellow-400 hover:-translate-y-0.5 ";
  } else {
     // Topic tuỳ chọn bổ sung
     containerClass = "flex items-center justify-center p-2 rounded-md text-center w-44 h-12 transition-all relative border-2 border-black bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-y-0.5 ";
  }

  if (isCompleted) {
     // opacity-80 cho text khi completed để giống roadmap.sh
     textClass += " opacity-80 line-through";
  }

  return (
    <div className={containerClass}>
      {/* Hidden handles for smart routing */}
      <Handle type="target" position={Position.Left} isConnectable={false} className="opacity-0" />
      <Handle type="target" position={Position.Top} isConnectable={false} className="opacity-0" />
      
      <div className="flex flex-col items-center justify-center">
        <h3 className={textClass}>
          {title}
        </h3>
        
        {/* Checkmark icon giống roadmap.sh (tròn màu xám/tím ở góc viền) */}
        {isCompleted && (
          <span className="absolute -left-2.5 -bottom-2.5 flex justify-center items-center text-[10px] w-5 h-5 rounded-full border-2 border-black bg-purple-500 text-white z-10">
            ✓
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="opacity-0" />
    </div>
  );
}
