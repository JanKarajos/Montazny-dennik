import { withSupabaseRoute } from "@/lib/supabase-server";

export const runtime = "edge";

export const GET = withSupabaseRoute({ auth: "user" }, async (_request, ctx) => {
  return Response.json({
    message: "Supabase autentifikácia je aktívna.",
    authMode: ctx.authMode,
    user: ctx.userClaims,
    jwt: ctx.jwtClaims,
  });
});
