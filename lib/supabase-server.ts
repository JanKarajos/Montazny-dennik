import { withSupabase, type SupabaseContext, type WithSupabaseConfig } from "@supabase/server";

export type SupabaseRouteHandler<Database = unknown> = (
  request: Request,
  context: SupabaseContext<Database>,
) => Promise<Response>;

export function withSupabaseRoute<Database = unknown>(
  config: WithSupabaseConfig,
  handler: SupabaseRouteHandler<Database>,
): (request: Request) => Promise<Response> {
  const fetchHandler = withSupabase<Database>(config, handler);

  return async (request: Request) => {
    return fetchHandler(request);
  };
}
