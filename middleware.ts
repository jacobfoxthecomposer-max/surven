import { proxy } from "./src/proxy";

export const middleware = proxy;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
