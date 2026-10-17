const fs = require('fs');
const path = require('path');

// Cargar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  });
}

const { MongoClient } = require('mongodb');
const { neon } = require('@neondatabase/serverless');
const Groq = require('groq-sdk');

async function testAll() {
  console.log("=== INICIO DE DIAGNÓSTICO PROFUNDO NORA ITU ===");

  // 1. NEON POSTGRESQL TEST
  console.log("\n--- 1. NEON POSTGRESQL CONCURRENCIA ---");
  try {
    const sql = neon(process.env.DATABASE_URL);
    const start = Date.now();
    const res = await sql`SELECT NOW() as current_time, 1 as test`;
    console.log(`[Neon 1 Query]: OK en ${Date.now() - start}ms`, res[0]);

    // Test de concurrencia: 10 queries simultáneos
    const t0 = Date.now();
    const concurrentNeon = Array.from({ length: 10 }, (_, i) => 
      sql`SELECT ${i} as idx, NOW() as t`
    );
    const results = await Promise.all(concurrentNeon);
    console.log(`[Neon 10 Concurrent Queries]: OK en ${Date.now() - t0}ms (recibidos ${results.length})`);
  } catch (err) {
    console.error("[Neon Error]:", err.message);
  }

  // 2. MONGODB ATLAS CONCURRENCIA
  console.log("\n--- 2. MONGODB ATLAS TEST & CONCURRENCIA ---");
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    try {
      await client.connect();
      const db = client.db('nora_itu_db');
      console.log("[MongoDB Connected]");
      const col = db.collection('nora_conversations');
      
      // Check existing indexes
      const indexes = await col.indexes();
      console.log("[MongoDB Indexes en nora_conversations]:", indexes.map(idx => idx.name));

      // Test 10 concurrent writes & reads
      const t0 = Date.now();
      const writes = Array.from({ length: 10 }, (_, i) => 
        col.updateOne(
          { sessionId: `stress_test_${i}`, agentId: 'nora-itu' },
          { $push: { messages: { role: 'user', content: `Stress test ${i}` } } },
          { upsert: true }
        )
      );
      await Promise.all(writes);
      console.log(`[MongoDB 10 Concurrent Writes]: OK en ${Date.now() - t0}ms`);

      // Cleanup
      await col.deleteMany({ sessionId: { $regex: /^stress_test_/ } });
      console.log("[MongoDB Cleanup completed]");
      await client.close();
    } catch (err) {
      console.error("[MongoDB Error]:", err.message);
    }
  }

  // 3. GROQ API & MODELS & TOOLS TEST
  console.log("\n--- 3. GROQ API CAPACIDAD Y MODELOS ---");
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey });
    try {
      const list = await groq.models.list();
      const activeIds = list.data.map(m => m.id);
      console.log(`[Groq Modelos Disponibles (${activeIds.length})]:`);
      console.log(activeIds.filter(id => !id.includes('whisper')).slice(0, 10));

      // Test regular completion
      const testModel = "llama-3.3-70b-versatile";
      console.log(`\nProbando modelo de texto: ${testModel}`);
      const comp = await groq.chat.completions.create({
        model: testModel,
        messages: [{ role: 'user', content: 'Di "Nora OK" en 2 palabras' }],
        max_tokens: 20
      });
      console.log(`[Groq ${testModel} Response]:`, comp.choices[0]?.message?.content);

      // Test DeepSeek R1 with tools vs without tools
      const r1Model = activeIds.find(id => id.includes('deepseek-r1'));
      if (r1Model) {
        console.log(`\nProbando DeepSeek R1 (${r1Model}) SIN tools:`);
        try {
          const compR1 = await groq.chat.completions.create({
            model: r1Model,
            messages: [{ role: 'user', content: '2+2' }],
            max_tokens: 30
          });
          console.log(`[DeepSeek R1 Response]:`, compR1.choices[0]?.message?.content);
        } catch (e) {
          console.error(`[DeepSeek R1 Error sin tools]:`, e.message);
        }

        console.log(`\nProbando DeepSeek R1 (${r1Model}) CON tools (verificar si falla como sospechamos):`);
        try {
          await groq.chat.completions.create({
            model: r1Model,
            messages: [{ role: 'user', content: '2+2' }],
            max_tokens: 30,
            tools: [{
              type: "function",
              function: {
                name: "test_tool",
                description: "test",
                parameters: { type: "object", properties: { q: { type: "string" } } }
              }
            }]
          });
          console.log("[DeepSeek R1 con tools]: Sorprendentemente funcionó!");
        } catch (e) {
          console.error(`[DeepSeek R1 Error con tools - CONFIRMADO]:`, e.message);
        }
      }

      // Test TTS API on Groq SDK
      console.log("\nProbando TTS en Groq SDK:");
      try {
        if (groq.audio && groq.audio.speech) {
          console.log("[Groq SDK tiene groq.audio.speech]");
        } else {
          console.log("[Groq SDK NO TIENE groq.audio.speech nativo]:", Object.keys(groq.audio || {}));
        }
      } catch (e) {
        console.log("[Groq TTS Check Error]:", e.message);
      }

    } catch (err) {
      console.error("[Groq Error]:", err.message);
    }
  }

  // 4. SCRAPER TEST
  console.log("\n--- 4. SCRAPER RSS Y TIEMPOS DE RESPUESTA ---");
  const { scrapeNews } = require('../src/lib/scraper');
  const tScrape = Date.now();
  try {
    const newsGeneral = await scrapeNews('noticias_general', 3);
    console.log(`[Scraper noticias_general]: OK en ${Date.now() - tScrape}ms\n`, newsGeneral.slice(0, 200) + '...');
  } catch (err) {
    console.error("[Scraper Error]:", err.message);
  }

  console.log("\n=== FIN DE DIAGNÓSTICO ===");
}

testAll().catch(console.error);
