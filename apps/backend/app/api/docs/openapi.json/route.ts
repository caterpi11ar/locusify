import { openApiSpec } from "@/lib/swagger/openapi";

export function GET() {
  return Response.json(openApiSpec);
}
