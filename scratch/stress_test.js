async function runStressTest() {
  const url = 'https://nora-itu-core.vercel.app/api/nora-inference';
  const concurrency = 6;
  const requests = [
    { mode: 'general', userText: 'Hola Nora, ¿qué tiempo hace hoy en Ituzaingó?' },
    { mode: 'tea', userText: 'Hola Nora, explicame cómo cruzar la calle con seguridad' },
    { mode: 'lazarillo', userText: 'Tengo que caminar por una vereda con desniveles, dame orientación' },
    { mode: 'general', userText: '¿Cuáles son las últimas novedades de Franco Colapinto en F1?' },
    { mode: 'tea', userText: 'Nora, me siento abrumado por los ruidos fuertes, ayudame' },
    { mode: 'general', userText: '¿Dónde está ubicada la sede de UTN en Ituzaingó?' },
  ];

  console.log(`=== INICIANDO PRUEBA DE ESTRÉS CONCURRENTE (${concurrency} peticiones paralelas) ===`);
  const tStart = Date.now();

  const promises = requests.map(async (req, idx) => {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `stress_session_${idx}_${Date.now()}`,
          userText: req.userText,
          mode: req.mode
        })
      });
      const duration = Date.now() - t0;
      const model = res.headers.get('x-ai-model');
      const text = await res.text();
      return {
        idx,
        mode: req.mode,
        status: res.status,
        duration,
        model,
        ok: res.ok,
        length: text.length,
        snippet: text.slice(0, 100).replace(/\n/g, ' ')
      };
    } catch (err) {
      return {
        idx,
        mode: req.mode,
        status: 0,
        duration: Date.now() - t0,
        error: err.message,
        ok: false
      };
    }
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - tStart;

  console.log('\n=== RESULTADOS INDIVIDUALES ===');
  results.forEach(r => {
    console.log(`[Req #${r.idx} - ${r.mode}]: Status=${r.status} (${r.duration}ms) Model=${r.model || 'N/A'} - Snippet: "${r.snippet || r.error}"`);
  });

  const successCount = results.filter(r => r.ok).length;
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];

  console.log('\n=== MÉTRICAS CONSOLIDADAS ===');
  console.log(`Tiempo total ejecución: ${totalDuration}ms`);
  console.log(`Tasa de éxito: ${successCount}/${concurrency} (${((successCount/concurrency)*100).toFixed(1)}%)`);
  console.log(`Latencia Mínima: ${durations[0]}ms`);
  console.log(`Latencia Mediana (P50): ${p50}ms`);
  console.log(`Latencia Máxima (P95+): ${durations[durations.length - 1]}ms`);
}

runStressTest().catch(console.error);
