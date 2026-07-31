import { createCompositionRoot } from "./runtime/composition-root";

const runtime = createCompositionRoot();

export default {
  fetch(request: Request, _env?: unknown, context?: ExecutionContext): Promise<Response> {
    return runtime.app.fetch(request, context);
  },
} satisfies ExportedHandler;