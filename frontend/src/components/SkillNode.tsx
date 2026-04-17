import { Handle, Position } from '@xyflow/react';

export default function SkillNode({ data }: any) {
  const { isCompleted, isRequired, isLocked, title } = data;

  // Roadmap.sh style:
  // - Bắt buộc (Required): Màu vàng chanh, viền đen dày, chữ đen.
  // - Khoá (Locked)/Chưa học: Giữ nguyên style nhưng chưa có checkmark. Khi khoá có thể làm nhạt đi.
  // - Hoàn thành (Completed): Có hình tròn nhỏ màu xám/tím góc trái/phải với dấu tick.
  
  let containerClass = "flex items-center justify-center p-2 rounded text-center w-48 h-10 transition-all relative border-2 border-black bg-white cursor-pointer hover:bg-gray-50 hover:-translate-y-[2px] ";
  let textClass = "font-[500] text-[13px] text-black whitespace-normal break-words ";

  if (isLocked) {
     containerClass = "flex items-center justify-center p-2 rounded text-center w-48 h-10 transition-all relative border-2 border-dashed border-gray-400 bg-gray-50 opacity-70 cursor-not-allowed ";
     textClass = "font-[500] text-[13px] text-gray-500 whitespace-normal break-words";
  } else if (isRequired) {
     containerClass = "flex items-center justify-center p-2 rounded text-center w-48 h-10 transition-all relative border-2 border-black bg-[#ffdf00] cursor-pointer hover:-translate-y-[2px] hover:brightness-95 ";
  } else {
     // Topic tuỳ chọn bổ sung
  }

  return (
    <div className={containerClass}>
      {/* Explicit Target Handles for Side Topics */}
      <Handle type="target" position={Position.Left} id="left" isConnectable={false} className="opacity-0" />
      <Handle type="target" position={Position.Right} id="right" isConnectable={false} className="opacity-0" />
      
      <div className="flex flex-col items-center justify-center">
        <h3 className={textClass}>
          {title}
        </h3>
        
        {/* Dấu tick chỉ báo loại topic - LUÔN hiện (giống roadmap.sh) */}
        {!isLocked && (
          <span className={`absolute ${isRequired ? '-right-2.5' : '-left-2.5'} top-1/2 -translate-y-1/2 flex justify-center items-center text-[10px] w-5 h-5 rounded-full ${isRequired ? 'bg-purple-500' : 'bg-green-500'} text-white z-10`}>
            ✓
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="opacity-0" />
    </div>
  );
}
