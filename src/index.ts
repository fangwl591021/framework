import { createCompositionRoot } from "./runtime/composition-root";

export * from "./platform-traffic";

const runtime = createCompositionRoot();

export default {
  fetch(request: Request, _env?: unknown, context?: ExecutionContext): Promise<Response> {
    return runtime.app.fetch(request, context);
  },
} satisfies ExportedHandler;