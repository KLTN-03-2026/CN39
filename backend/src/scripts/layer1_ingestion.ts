import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { pipeline } from '@xenova/transformers';

// ═══════════ CONFIG ═══════════
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'kltn_roadmap';
const REPO_PATH = 'roadmap-repo/src/data/roadmaps';
const TEMPLATE_OUT_DIR = 'src/models/templates/timeline-v2';

// Cấu trúc map folder beginner (Nếu có)
const BEGINNER_FOLDER_MAP: Record<string, string> = {
  'frontend': 'frontend-beginner',
  'backend': 'backend-beginner',
  'fullstack': 'fullstack-beginner',
  'devops': 'devops-beginner'
};

// ═══════════ UTILS ═══════════
function cleanLabel(label: string): string {
  if (!label) return '';
  return label
    .replace(/@feed@/g, '')
    .replace(/@official@/g, '')
    .replace(/@video@/g, '')
    .replace(/@course@/g, '')
    .replace(/@article@/g, '')
    .trim();
}

async function getEmbedding(text: string, embedder: any) {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ═══════════ INGESTION LOGIC ═══════════
async function runIngestion() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const roadmapTemplatesColl = db.collection('roadmaptemplates');
  const resourcesColl = db.collection('resources');

  // Khởi tạo AI Embedder
  console.log('Initializing AI Embedder...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  if (!fs.existsSync(TEMPLATE_OUT_DIR)) {
    fs.mkdirSync(TEMPLATE_OUT_DIR, { recursive: true });
  }

  const roadmapFolders = fs.readdirSync(REPO_PATH);

  for (const folder of roadmapFolders) {
    const jsonPath = path.join(REPO_PATH, folder, `${folder}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    console.log(`Processing Roadmap: ${folder}...`);
    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    // Gộp dữ liệu beginner nếu có
    const beginnerFolder = BEGINNER_FOLDER_MAP[folder];
    let beginnerNodes: any[] = [];
    if (beginnerFolder) {
      const bJsonPath = path.join(REPO_PATH, beginnerFolder, `${beginnerFolder}.json`);
      if (fs.existsSync(bJsonPath)) {
        console.log(`Merging Beginner data for ${folder}...`);
        const bData = JSON.parse(fs.readFileSync(bJsonPath, 'utf-8'));
        beginnerNodes = bData.nodes || [];
      }
    }

    const allNodes = [...(rawData.nodes || []), ...beginnerNodes];
    const allEdges = rawData.edges || [];

    // 1. Phân loại và Sắp xếp Nodes theo Y
    const sortedNodes = allNodes
      .filter(n => ['topic', 'subtopic', 'section', 'title'].includes(n.type))
      .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));

    // 2. Xây dựng cấu trúc Hierarchy
    const phases: any[] = [];
    let currentPhase: any = null;
    let roadmapTitle = folder;

    // Helper: Tìm Resource Markdown
    const findMarkdownContent = (nodeId: string, folderName: string) => {
      const searchFolders = [folderName];
      if (BEGINNER_FOLDER_MAP[folderName]) searchFolders.push(BEGINNER_FOLDER_MAP[folderName]);

      for (const sf of searchFolders) {
        const mdPath = path.join(REPO_PATH, sf, 'content', `${nodeId}.md`);
        if (fs.existsSync(mdPath)) {
          const content = fs.readFileSync(mdPath, 'utf-8');
          // Trích xuất description đơn giản (lấy đoạn đầu)
          const desc = content.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
          return { description: desc.substring(0, 300), fullContent: content };
        }
      }
      return { description: '', fullContent: '' };
    };

    for (const node of sortedNodes) {
      if (node.type === 'title') {
        roadmapTitle = cleanLabel(node.data?.label || roadmapTitle);
        continue;
      }

      if (node.type === 'section') {
        const label = cleanLabel(node.data?.label);
        if (label) {
          currentPhase = {
            phaseName: label,
            description: `Learning phase for ${label}`,
            topics: []
          };
          phases.push(currentPhase);
        }
        continue;
      }

      if (node.type === 'topic') {
        if (!currentPhase) {
          currentPhase = { phaseName: 'Getting Started', description: 'Initial steps', topics: [] };
          phases.push(currentPhase);
        }

        const label = cleanLabel(node.data?.label);
        const nodeId = node.id;
        const mdData = findMarkdownContent(nodeId, folder);

        // Lấy Resources từ metadata (links)
        const resources: any[] = [];
        if (node.data?.links) {
          node.data.links.forEach((l: any) => {
            let url = l.url;
            // Chuyển link roadmap sang nội bộ
            if (url.startsWith('https://roadmap.sh/')) {
               const slug = url.split('/').pop();
               if (slug && !slug.includes('.')) url = `/roadmap/preview/${slug}`;
            }

            resources.push({
              label: cleanLabel(l.title),
              url: url,
              type: l.type || 'article',
              isPremium: l.isPremium || false
            });
          });
        }

        const topicObj = {
          topicId: nodeId,
          title: label,
          description: mdData.description || `Learn about ${label}`,
          isRequired: node.data?.style?.backgroundColor === '#874efe' || node.data?.style?.backgroundColor === '#ffdf00',
          resources: resources,
          subTopics: []
        };

        // Tìm Subtopics liên kết với Topic này qua Edges
        const childEdges = allEdges.filter(e => e.source === nodeId);
        for (const edge of childEdges) {
          const childNode = allNodes.find(n => n.id === edge.target && n.type === 'subtopic');
          if (childNode) {
             const childLabel = cleanLabel(childNode.data?.label);
             const childMd = findMarkdownContent(childNode.id, folder);
             
             const subResources: any[] = [];
             if (childNode.data?.links) {
                childNode.data.links.forEach((l: any) => {
                   subResources.push({
                      label: cleanLabel(l.title),
                      url: l.url,
                      type: l.type || 'article'
                   });
                });
             }

             topicObj.subTopics.push({
               topicId: childNode.id,
               title: childLabel,
               description: childMd.description || `Subtopic of ${label}`,
               isRequired: true,
               resources: subResources
             });
          }
        }

        currentPhase.topics.push(topicObj);

        // Lưu vào DB Resources (nếu chưa có)
        for (const res of resources) {
          if (res.url.startsWith('http')) {
             const existing = await resourcesColl.findOne({ url: res.url });
             if (!existing) {
                const embedding = await getEmbedding(`${res.label} ${res.type}`, embedder);
                await resourcesColl.insertOne({
                  title: res.label,
                  url: res.url,
                  type: res.type,
                  tags: [folder, label.toLowerCase()],
                  embedding: embedding,
                  createdAt: new Date()
                });
             }
          }
        }
      }
    }

    // 3. Export Template JSON
    const templateJson = {
      title: roadmapTitle,
      slug: folder,
      phases: phases,
      updatedAt: new Date()
    };

    fs.writeFileSync(
      path.join(TEMPLATE_OUT_DIR, `${folder}.json`),
      JSON.stringify(templateJson, null, 2)
    );

    // 4. Update Database
    await roadmapTemplatesColl.updateOne(
      { slug: folder },
      { $set: templateJson },
      { upsert: true }
    );
  }

  console.log('Ingestion Complete!');
  await client.close();
}

runIngestion().catch(console.error);
