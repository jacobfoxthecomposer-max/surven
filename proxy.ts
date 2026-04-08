export { proxy } from "./src/proxy";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
