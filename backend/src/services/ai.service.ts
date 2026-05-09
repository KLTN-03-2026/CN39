import { GoogleGenAI, Type } from '@google/genai';

// Quản lý xoay vòng API Key (Key Rotation)
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getNextGenAI(): GoogleGenAI {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`[Key Rotation] Chuyển sang API Key #${currentKeyIndex + 1}`);
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
}

// Function declaration cho Gap Analysis
const analyzeCVGapDeclaration: any = {
  name: "analyzeCVGap",
  description: "Trích xuất danh sách các kỹ năng (Topic slugs) mà ứng viên ĐÃ NẮM VỮNG dựa trên CV.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      completedSlugs: {
        type: Type.ARRAY,
        description: "Danh sách CHÍNH XÁC các topic slug mà ứng viên đã thành thạo.",
        items: { type: Type.STRING }
      }
    },
    required: ["completedSlugs"]
  }
};

class AIService {
  private genAI: GoogleGenAI;

  constructor() {
    if (API_KEYS.length === 0) {
      throw new Error("LỖI NGHIÊM TRỌNG: Thiếu biến môi trường GEMINI_API_KEY!");
    }
    this.genAI = new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
  }

  private async callWithRetry<T>(fn: (genAI: GoogleGenAI) => Promise<T>): Promise<T> {
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn(this.genAI);
      } catch (error: any) {
        const msg = error?.message || '';
        const isRetryable = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503') || msg.includes('UNAVAILABLE');
        if (isRetryable && attempt < MAX_RETRIES) {
          const delayMs = (attempt + 1) * 3000;
          if (API_KEYS.length > 1) this.genAI = getNextGenAI();
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Đã thử lại tối đa số lần cho phép.");
  }

  /**
   * AI Tutor — Trả lời câu hỏi dựa trên RAG context
   */
  public generateTutorReply = async (
    topicTitle: string, 
    message: string, 
    chatHistory: { role: string; content: string }[] = [],
    ragContext: { title: string; url: string; type: string; description?: string }[] = []
  ): Promise<string> => {
    try {
      const contextBlock = ragContext.length > 0
        ? ragContext.map((r, i) => `${i + 1}. [${r.type}] "${r.title}" — ${r.url}${r.description ? `\n   ${r.description}` : ''}`).join('\n')
        : 'Không có tài liệu bổ sung.';
      
      const contents = [
        ...chatHistory.slice(-10).map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: msg.content }]
        })),
        { role: 'user' as const, parts: [{ text: message }] }
      ];

      const response = await this.callWithRetry(genAI => 
        genAI.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config: {
            systemInstruction: `Bạn là AI Tutor chuyên về chủ đề: "${topicTitle}".

TÀI LIỆU THAM KHẢO (ưu tiên trả lời dựa trên đây):
${contextBlock}

QUY TẮC:
- Trả lời chính xác, ngắn gọn, dễ hiểu
- Nếu có tài liệu tham khảo liên quan → trích dẫn nguồn (VD: "Theo [tên tài liệu]...")
- Dùng markdown format: heading, bullet, code block khi cần
- Nếu câu hỏi nằm ngoài phạm vi topic → nhẹ nhàng hướng dẫn quay lại chủ đề`
          }
        })
      );
      return response.text || "Xin lỗi, tôi không thể trả lời lúc này.";
    } catch (err) { 
      console.error('[AI Tutor Error]:', err);
      return "Hệ thống AI đang bị gián đoạn. Vui lòng thử lại."; 
    }
  }

  /**
   * AI Match Template — Tìm slug roadmap phù hợp nhất với mục tiêu
   */
  public async findMatchingTemplate(goal: string, availableSlugs: string[]): Promise<string> {
    try {
      const response = await this.callWithRetry(genAI => 
        genAI.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Bạn là hệ thống matching. Nhiệm vụ: chọn ĐÚNG 1 slug từ danh sách phù hợp nhất với mục tiêu.

MỤC TIÊU: "${goal}"

DANH SÁCH SLUGS (chỉ được chọn từ đây):
${availableSlugs.join('\n')}

QUY TẮC:
- CHỈ trả về ĐÚNG 1 slug từ danh sách trên
- KHÔNG giải thích, KHÔNG thêm ký tự, KHÔNG tạo slug mới
- Ví dụ: nếu goal="Backend" → trả về: backend
- Ví dụ: nếu goal="AI Engineer" → trả về: ai-engineer

Trả lời:`,
        })
      );
      const rawSlug = (response.text || '').trim().replace(/['"` \n]/g, '').toLowerCase();
      // Validate: chỉ chấp nhận slug có trong danh sách
      const matched = availableSlugs.find(s => rawSlug.includes(s) || s.includes(rawSlug));
      const finalSlug = matched || availableSlugs[0] || 'backend';
      console.log(`[AI] Template match: goal="${goal}" → slug="${finalSlug}" (raw="${rawSlug}")`);
      return finalSlug;
    } catch (err) {
      console.error('[AI] findMatchingTemplate error:', err);
      return 'backend';
    }
  }

  /**
   * AI Gap Analysis — Đối chiếu CV với danh sách topics, trả về slugs đã biết
   */
  public async analyzeCVGap(goal: string, cvText: string, topicSlugs: string[]): Promise<string[]> {
    try {
      const response = await this.callWithRetry(genAI =>
        genAI.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `MỤC TIÊU: ${goal}

CV ỨNG VIÊN:
${cvText}

DANH SÁCH TOPIC SLUGS CẦN ĐỐI CHIẾU:
${topicSlugs.join(', ')}

YÊU CẦU: Phân tích CV và trả về danh sách slug mà ứng viên ĐÃ NẮM VỮNG.
Lưu ý SUY LUẬN NGẦM: Nếu họ là Web Developer → chắc chắn biết HTTP, HTML, CSS, JavaScript cơ bản.
CHỈ ĐƯỢC TRẢ VỀ SLUG CÓ TRONG DANH SÁCH TRÊN. KHÔNG TỰ TẠO SLUG MỚI.
GỌI FUNCTION analyzeCVGap.`,
          config: {
            tools: [{ functionDeclarations: [analyzeCVGapDeclaration] }]
          }
        })
      );
      const call = response.functionCalls?.[0];
      const rawSlugs = (call?.args?.completedSlugs as string[]) || [];
      // Validate: chỉ giữ slug nằm trong danh sách gốc
      const validSlugs = rawSlugs.filter(s => topicSlugs.includes(s));
      console.log(`[AI] Gap Analysis: ${validSlugs.length}/${topicSlugs.length} topics đã biết`);
      return validSlugs;
    } catch (err) {
      console.error('[AI] analyzeCVGap error:', err);
      return [];
    }
  }
}

export const aiService = new AIService();
