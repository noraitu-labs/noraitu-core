import { RetryableError, FatalError } from "workflow";

export { RetryableError, FatalError };

export interface StepOptions {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

export interface StepContext {
  run: <T>(
    stepName: string,
    fn: () => Promise<T>,
    options?: StepOptions
  ) => Promise<T>;
}

export interface WorkflowResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  completedSteps: string[];
}

/**
 * Motor de orquestación durable 'createWorkflow' para Serverless en Vercel.
 * Segmenta la ejecución en pasos aislados ('step.run') con reintentos automáticos,
 * mitigación de timeouts y aislamiento de fallos en llamadas pesadas de IA.
 */
export function createWorkflow<TInput, TOutput>(
  workflowName: string,
  handler: (step: StepContext, input: TInput) => Promise<TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    const startTime = Date.now();
    const completedSteps: string[] = [];

    const step: StepContext = {
      run: async <T>(stepName: string, fn: () => Promise<T>, options?: StepOptions): Promise<T> => {
        const retries = options?.retries ?? 2;
        const backoffMs = options?.backoffMs ?? 1500;
        const timeoutMs = options?.timeoutMs ?? 30000;

        let attempt = 0;
        let lastError: any = null;

        while (attempt <= retries) {
          try {
            attempt++;
            console.log(`[Workflow: ${workflowName}] Ejecutando paso '${stepName}' (Intento ${attempt}/${retries + 1})`);

            // Ejecución con límite de tiempo por paso
            const stepPromise = fn();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new RetryableError(`Timeout de ${timeoutMs}ms en paso '${stepName}'`)), timeoutMs)
            );

            const result = await Promise.race([stepPromise, timeoutPromise]);
            completedSteps.push(stepName);
            console.log(`[Workflow: ${workflowName}] Paso '${stepName}' completado con éxito.`);
            return result;
          } catch (err: any) {
            lastError = err;
            console.warn(`[Workflow: ${workflowName}] Error en paso '${stepName}' (Intento ${attempt}):`, err?.message || err);

            if (err instanceof FatalError) {
              throw err;
            }

            if (attempt <= retries) {
              const delay = backoffMs * Math.pow(1.5, attempt - 1);
              console.log(`[Workflow: ${workflowName}] Reintentando paso '${stepName}' en ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        throw new RetryableError(
          `El paso '${stepName}' en el workflow '${workflowName}' falló tras ${retries + 1} intentos. Último error: ${lastError?.message || lastError}`
        );
      },
    };

    try {
      const result = await handler(step, input);
      const durationMs = Date.now() - startTime;
      console.log(`[Workflow: ${workflowName}] Finalizado exitosamente en ${durationMs}ms. Pasos: ${completedSteps.join(" -> ")}`);
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(`[Workflow: ${workflowName}] Falló a los ${durationMs}ms:`, err?.message || err);
      throw err;
    }
  };
}
