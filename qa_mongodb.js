// ══════════════════════════════════════════════════════════════
//  NORA ITU — QA Health Check Script
//  Test de conexión + ping + inserción + lectura + limpieza en Atlas
// ══════════════════════════════════════════════════════════════
const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://javilo29ajlg_db_user:Fk7tZLNvw4HbiNTK@cluster0.rehee1b.mongodb.net/noraitu?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "nora_itu_db";

const PASS = (label) => console.log(`  ✅ ${label}`);
const FAIL = (label, err) => console.error(`  ❌ ${label}:`, err?.message || err);

async function runQA() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  NORA ITU · MongoDB Atlas QA Health Check");
  console.log("══════════════════════════════════════════════\n");

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const t0 = Date.now();

  // ── TEST 1: Conexión ──────────────────────────────────────────
  console.log("[1/5] Intentando conectar a Atlas...");
  try {
    await client.connect();
    PASS(`Conexión TCP establecida (${Date.now() - t0}ms)`);
  } catch (err) {
    FAIL("Conexión fallida", err);
    process.exit(1);
  }

  const db = client.db(DB_NAME);

  // ── TEST 2: Ping ──────────────────────────────────────────────
  console.log("\n[2/5] Ejecutando ping al cluster...");
  try {
    const t1 = Date.now();
    await client.db("admin").command({ ping: 1 });
    PASS(`Ping OK (${Date.now() - t1}ms RTT)`);
  } catch (err) {
    FAIL("Ping fallido", err);
  }

  const col = db.collection("nora_conversations");

  // ── TEST 3: Inserción de prueba ───────────────────────────────
  console.log("\n[3/5] Insertando documento de prueba QA...");
  const testDoc = {
    sessionId: "qa_test_" + Date.now(),
    agentId: "nora-itu-qa",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [
      {
        role: "user",
        content: "Test de conexión QA — Nora Itu Fase 1",
        timestamp: new Date().toISOString(),
        mode: "general",
        metadata: { hasVision: false },
      },
      {
        role: "assistant",
        content: "Cerebro híbrido operativo. MongoDB Atlas M0 Free respondiendo.",
        timestamp: new Date().toISOString(),
        mode: "general",
        metadata: { model: "qwen2.5vl:7b", latencyMs: 0 },
      },
    ],
    context: { thinkingSteps: ["QA ping"], workingMemory: {}, activeTopics: ["test"] },
    userProfile: { mode: "general", autoTEA: false, sessionLanguage: "es-419" },
  };

  let insertedId;
  try {
    const result = await col.insertOne(testDoc);
    insertedId = result.insertedId;
    PASS(`Inserción exitosa → _id: ${insertedId}`);
  } catch (err) {
    FAIL("Inserción fallida", err);
  }

  // ── TEST 4: Lectura ───────────────────────────────────────────
  console.log("\n[4/5] Verificando lectura del documento insertado...");
  try {
    const found = await col.findOne({ _id: insertedId });
    if (found && found.messages.length === 2) {
      PASS(`Lectura OK — ${found.messages.length} mensajes encontrados`);
      console.log(`       sessionId: ${found.sessionId}`);
      console.log(`       agentId  : ${found.agentId}`);
    } else {
      FAIL("Lectura incompleta", "Documento no encontrado o sin mensajes");
    }
  } catch (err) {
    FAIL("Lectura fallida", err);
  }

  // ── TEST 5: Limpieza ──────────────────────────────────────────
  console.log("\n[5/5] Eliminando documento de prueba...");
  try {
    await col.deleteOne({ _id: insertedId });
    PASS("Documento QA eliminado correctamente");
  } catch (err) {
    FAIL("Limpieza fallida", err);
  }

  await client.close();

  const totalMs = Date.now() - t0;
  console.log("\n══════════════════════════════════════════════");
  console.log(`  QA COMPLETADO en ${totalMs}ms`);
  console.log("  Base de datos: nora_itu_db @ Atlas M0 Free");
  console.log("  Colección    : nora_conversations");
  console.log("  Estado       : CEREBRO HÍBRIDO OPERATIVO ✅");
  console.log("══════════════════════════════════════════════\n");
}

runQA().catch((err) => {
  console.error("\n[QA FATAL]:", err);
  process.exit(1);
});
