import { FoundationError } from "../core/errors";
import type { RequestContext } from "../core/request-context";

export type RouteHandler = (
  request: Request,
  context: RequestContext,
) => Response | Promise<Response>;

export interface RouteDefinition {
  readonly method: string;
  readonly path: string;
  readonly handler: RouteHandler;
}

export class Router {
  private readonly routes = new Map<string, Map<string, RouteHandler>>();

  register(definition: RouteDefinition): void {
    const method = definition.method.toUpperCase();
    const methods = this.routes.get(definition.path) ?? new Map();
    if (methods.has(method)) {
      throw new TypeError(`Duplicate route definition: ${method}`);
    }
    methods.set(method, definition.handler);
    this.routes.set(definition.path, methods);
  }

  async dispatch(request: Request, context: RequestContext): Promise<Response> {
    const methods = this.routes.get(context.normalizedPathname);
    if (methods === undefined) {
      throw new FoundationError("ROUTE_NOT_FOUND");
    }

    const handler = methods.get(context.method);
    if (handler === undefined) {
      throw new FoundationError("METHOD_NOT_ALLOWED");
    }
    return handler(request, context);
  }

  has(method: string, path: string): boolean {
    return this.routes.get(path)?.has(method.toUpperCase()) ?? false;
  }
}
