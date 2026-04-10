import multer from 'multer';

// Sử dụng memoryStorage để file được lưu tạm trên RAM dưới dạng Buffer thay vì ghi ra vùng cứng
// Điều này giúp đọc file siêu tốc và dọn dẹp RAM tự động thông qua Garbage Collector của Node
const storage = multer.memoryStorage();

export const uploadCV = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn kích cỡ file là 5MB
  },
  fileFilter: (req, file, cb) => {
    // Chỉ chấp nhận file PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận dịnh dạng file PDF.'));
    }
  }
});
